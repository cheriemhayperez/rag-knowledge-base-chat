import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
export const DEFAULT_EMBEDDING_DIMENSIONS = 768;

/** Task types used with gemini-embedding-001 for RAG. */
export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const ALLOWED_TASK_TYPES: ReadonlySet<EmbeddingTaskType> = new Set([
  "RETRIEVAL_DOCUMENT",
  "RETRIEVAL_QUERY",
]);

let client: GoogleGenAI | undefined;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return apiKey;
}

function getModel(): string {
  const model = process.env.GEMINI_EMBEDDING_MODEL?.trim();
  return model && model.length > 0 ? model : DEFAULT_EMBEDDING_MODEL;
}

/**
 * Dimensions must stay at 768 to match document_chunks.embedding vector(768).
 * Missing env falls back to 768; a different value fails with a clear error.
 */
function getDimensions(): number {
  const raw = process.env.GEMINI_EMBEDDING_DIMENSIONS?.trim();
  if (!raw) {
    return DEFAULT_EMBEDDING_DIMENSIONS;
  }

  const dimensions = Number(raw);
  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new Error(
      `GEMINI_EMBEDDING_DIMENSIONS must be a positive integer, got: ${raw}`,
    );
  }
  if (dimensions !== DEFAULT_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `GEMINI_EMBEDDING_DIMENSIONS must be ${DEFAULT_EMBEDDING_DIMENSIONS} to match document_chunks.embedding vector(${DEFAULT_EMBEDDING_DIMENSIONS})`,
    );
  }
  return dimensions;
}

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return client;
}

function assertTaskType(taskType: EmbeddingTaskType): void {
  if (!ALLOWED_TASK_TYPES.has(taskType)) {
    throw new Error(
      `taskType must be RETRIEVAL_DOCUMENT or RETRIEVAL_QUERY, got: ${String(taskType)}`,
    );
  }
}

function assertNonEmptyText(text: string, label: string): void {
  if (typeof text !== "string") {
    throw new Error(`${label} must be a string`);
  }
  if (text.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

/** L2-normalize — required for gemini-embedding-001 when dimensions < 3072. */
function l2Normalize(values: number[]): number[] {
  let sumSquares = 0;
  for (const value of values) {
    sumSquares += value * value;
  }

  const norm = Math.sqrt(sumSquares);
  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error("Cannot normalize a zero or invalid embedding vector");
  }

  return values.map((value) => value / norm);
}

function finalizeEmbedding(
  values: number[] | undefined,
  expectedLength: number,
  label: string,
): number[] {
  if (!values) {
    throw new Error(`Missing ${label} values in API response`);
  }
  if (values.length === 0) {
    throw new Error(`${label} is empty`);
  }
  if (values.length !== expectedLength) {
    throw new Error(
      `expected ${label} length ${expectedLength}, received ${values.length}`,
    );
  }
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${label} contains invalid numbers`);
    }
  }
  return l2Normalize(values);
}

/**
 * Embed a single string for RAG (document indexing or future queries).
 * Returns an L2-normalized vector of length 768.
 */
export async function embedText(
  text: string,
  taskType: EmbeddingTaskType,
): Promise<number[]> {
  assertNonEmptyText(text, "text");
  assertTaskType(taskType);

  const dimensions = getDimensions();
  const response = await getClient().models.embedContent({
    model: getModel(),
    contents: text,
    config: {
      outputDimensionality: dimensions,
      taskType,
    },
  });

  const embeddings = response.embeddings;
  if (!embeddings || embeddings.length !== 1) {
    throw new Error(
      `expected 1 embedding in API response, received ${embeddings?.length ?? 0}`,
    );
  }

  return finalizeEmbedding(embeddings[0]?.values, dimensions, "embedding");
}

/**
 * Embed many strings (e.g. document chunks) with the same task type.
 * Returns L2-normalized vectors of length 768, in input order.
 */
export async function embedTexts(
  texts: string[],
  taskType: EmbeddingTaskType,
): Promise<number[][]> {
  if (!Array.isArray(texts)) {
    throw new Error("texts must be an array of strings");
  }
  if (texts.length === 0) {
    return [];
  }

  assertTaskType(taskType);
  for (let index = 0; index < texts.length; index += 1) {
    assertNonEmptyText(texts[index]!, `texts[${index}]`);
  }

  const dimensions = getDimensions();
  const response = await getClient().models.embedContent({
    model: getModel(),
    contents: texts,
    config: {
      outputDimensionality: dimensions,
      taskType,
    },
  });

  const embeddings = response.embeddings;
  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error(
      `expected ${texts.length} embeddings in API response, received ${embeddings?.length ?? 0}`,
    );
  }

  return embeddings.map((embedding, index) =>
    finalizeEmbedding(
      embedding.values,
      dimensions,
      `embedding at index ${index}`,
    ),
  );
}
