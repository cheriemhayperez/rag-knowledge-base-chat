import { pool } from "../config/database.js";
import { embedText } from "./embeddings.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_RETRIEVE_LIMIT = 5;
export const MAX_RETRIEVE_LIMIT = 20;

export class RetrieveError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "RetrieveError";
    this.statusCode = statusCode;
  }
}

export type RetrieveChunksInput = {
  /** Temporary testing selector — not authorization. Must exist in businesses. */
  businessId: string;
  question: string;
  limit?: number;
};

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: number;
};

export type RetrieveChunksResult = {
  businessId: string;
  question: string;
  limit: number;
  results: RetrievedChunk[];
};

type RetrieveRow = {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: string | number;
};

function assertUuid(value: string, label: string): string {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) {
    throw new RetrieveError(`${label} must be a valid UUID`, 400);
  }
  return trimmed;
}

function resolveLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_RETRIEVE_LIMIT;
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RetrieveError("limit must be a positive integer", 400);
  }
  if (limit > MAX_RETRIEVE_LIMIT) {
    throw new RetrieveError(
      `limit must be at most ${MAX_RETRIEVE_LIMIT}`,
      400,
    );
  }
  return limit;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/**
 * Embed a question and return the top matching chunks for one business.
 * Filters by business_id and documents.status = 'ready' only.
 */
export async function retrieveChunks(
  input: RetrieveChunksInput,
): Promise<RetrieveChunksResult> {
  const businessId = assertUuid(input.businessId, "businessId");
  const question =
    typeof input.question === "string" ? input.question.trim() : "";
  if (question.length === 0) {
    throw new RetrieveError("question must be a non-empty string", 400);
  }
  const limit = resolveLimit(input.limit);

  const businessResult = await pool.query<{ id: string }>(
    "SELECT id FROM businesses WHERE id = $1",
    [businessId],
  );
  if ((businessResult.rowCount ?? 0) === 0) {
    throw new RetrieveError("Business not found", 404);
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(question, "RETRIEVAL_QUERY");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Embedding request failed";
    if (message.includes("GEMINI_API_KEY")) {
      throw new RetrieveError("Embedding service is not configured", 500);
    }
    console.error("Query embedding failed:", message);
    throw new RetrieveError(
      "Failed to generate query embeddings. Please try again later.",
      502,
    );
  }

  const result = await pool.query<RetrieveRow>(
    `SELECT
       dc.id AS "chunkId",
       dc.document_id AS "documentId",
       d.filename AS "filename",
       dc.chunk_index AS "chunkIndex",
       dc.content AS "content",
       1 - (dc.embedding <=> $1::vector) AS similarity
     FROM document_chunks dc
     INNER JOIN documents d
       ON d.id = dc.document_id
     WHERE dc.business_id = $2::uuid
       AND d.business_id = $2::uuid
       AND d.status = 'ready'
       AND dc.embedding IS NOT NULL
     ORDER BY dc.embedding <=> $1::vector ASC
     LIMIT $3`,
    [toVectorLiteral(queryEmbedding), businessId, limit],
  );

  const results: RetrievedChunk[] = result.rows.map((row) => ({
    chunkId: row.chunkId,
    documentId: row.documentId,
    filename: row.filename,
    chunkIndex: Number(row.chunkIndex),
    content: row.content,
    similarity: Number(row.similarity),
  }));

  return {
    businessId,
    question,
    limit,
    results,
  };
}
