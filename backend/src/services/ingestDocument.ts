import { pool } from "../config/database.js";
import { chunkText } from "../utils/chunkText.js";
import { extractTextFromPdfData } from "../utils/extractPdfText.js";
import { embedTexts } from "./embeddings.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class IngestError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "IngestError";
    this.statusCode = statusCode;
  }
}

export type IngestDocumentInput = {
  /** Temporary testing selector — not authorization. Must exist in businesses. */
  businessId: string;
  filename: string;
  fileType: string;
  data: Buffer;
};

export type IngestDocumentResult = {
  documentId: string;
  businessId: string;
  filename: string;
  fileType: string;
  status: "ready";
  chunkCount: number;
};

function assertUuid(value: string, label: string): string {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) {
    throw new IngestError(`${label} must be a valid UUID`, 400);
  }
  return trimmed;
}

/** Format a float vector for pgvector: '[0.1,0.2,...]'::vector */
function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/**
 * Extract, chunk, embed, then persist a PDF in one DB transaction.
 * Embeddings are generated before any writes so failures leave no partial rows.
 */
export async function ingestDocument(
  input: IngestDocumentInput,
): Promise<IngestDocumentResult> {
  const businessId = assertUuid(input.businessId, "businessId");

  if (!Buffer.isBuffer(input.data) || input.data.length === 0) {
    throw new IngestError("PDF file is empty", 400);
  }

  const businessResult = await pool.query<{ id: string }>(
    "SELECT id FROM businesses WHERE id = $1",
    [businessId],
  );
  if ((businessResult.rowCount ?? 0) === 0) {
    throw new IngestError("Business not found", 404);
  }

  let text: string;
  try {
    text = await extractTextFromPdfData(input.data);
  } catch {
    throw new IngestError(
      "Failed to extract text from PDF. Use a selectable-text PDF (OCR is not supported).",
      400,
    );
  }

  if (text.trim().length === 0) {
    throw new IngestError(
      "No selectable text found in PDF. Scanned or image-only PDFs are not supported.",
      400,
    );
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new IngestError("PDF produced no text chunks", 400);
  }

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(
      chunks.map((chunk) => chunk.content),
      "RETRIEVAL_DOCUMENT",
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Embedding request failed";
    if (message.includes("GEMINI_API_KEY")) {
      throw new IngestError("Embedding service is not configured", 500);
    }
    console.error("Document embedding failed:", message);
    throw new IngestError(
      "Failed to generate document embeddings. Please try again later.",
      502,
    );
  }

  if (embeddings.length !== chunks.length) {
    throw new IngestError("Embedding count does not match chunk count", 502);
  }

  const filename = input.filename.trim() || "upload.pdf";
  const fileType = input.fileType.trim() || "application/pdf";
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const documentResult = await client.query<{ id: string }>(
      `INSERT INTO documents (business_id, filename, file_type, status)
       VALUES ($1, $2, $3, 'ready')
       RETURNING id`,
      [businessId, filename, fileType],
    );
    const documentId = documentResult.rows[0]?.id;
    if (!documentId) {
      throw new Error("Document insert did not return an id");
    }

    const values: unknown[] = [];
    const placeholders: string[] = [];
    let param = 1;

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index]!;
      const embedding = embeddings[index]!;
      placeholders.push(
        `($${param}, $${param + 1}, $${param + 2}, $${param + 3}, $${param + 4}::vector)`,
      );
      param += 5;
      values.push(
        documentId,
        businessId,
        chunk.chunkIndex,
        chunk.content,
        toVectorLiteral(embedding),
      );
    }

    await client.query(
      `INSERT INTO document_chunks
         (document_id, business_id, chunk_index, content, embedding)
       VALUES ${placeholders.join(", ")}`,
      values,
    );

    await client.query("COMMIT");

    return {
      documentId,
      businessId,
      filename,
      fileType,
      status: "ready",
      chunkCount: chunks.length,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback errors; connection will be released below.
    }
    throw error;
  } finally {
    client.release();
  }
}
