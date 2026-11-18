import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { retrieveChunks, type RetrievedChunk } from "./retrieveChunks.js";

export const DEFAULT_CHAT_MODEL = "gemini-3.5-flash-lite";

export const INSUFFICIENT_INFORMATION_ANSWER =
  "I don't have enough information in the available documents to answer that question.";

export class ChatError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ChatError";
    this.statusCode = statusCode;
  }
}

export type AnswerQuestionInput = {
  /** Temporary testing selector — not authorization. Must exist in businesses. */
  businessId: string;
  question: string;
  limit?: number;
};

export type AnswerSource = {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  similarity: number;
};

export type AnswerQuestionResult = {
  businessId: string;
  question: string;
  answer: string;
  sources: AnswerSource[];
};

let client: GoogleGenAI | undefined;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return apiKey;
}

function getChatModel(): string {
  const model = process.env.GEMINI_CHAT_MODEL?.trim();
  return model && model.length > 0 ? model : DEFAULT_CHAT_MODEL;
}

function getClient(): GoogleGenAI {
  if (!client) {
    // HttpRetryOptions delays are in seconds (1 = 1000ms, 8 = 8000ms).
    client = new GoogleGenAI({
      apiKey: getApiKey(),
      httpOptions: {
        retryOptions: {
          attempts: 4,
          initialDelay: 1,
          maxDelay: 8,
          expBase: 2,
          jitter: 1,
          httpStatusCodes: [408, 429, 500, 502, 503, 504],
        },
      },
    });
  }
  return client;
}

function toSources(chunks: RetrievedChunk[]): AnswerSource[] {
  return chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    filename: chunk.filename,
    chunkIndex: chunk.chunkIndex,
    similarity: chunk.similarity,
  }));
}

function buildPrompt(question: string, chunks: RetrievedChunk[]): string {
  const contextBlocks = chunks
    .map((chunk, index) => {
      const n = index + 1;
      return `[${n}] filename=${JSON.stringify(chunk.filename)} chunkIndex=${chunk.chunkIndex}\n${chunk.content}`;
    })
    .join("\n\n");

  return `You are a helpful assistant for a business knowledge base.
Answer using ONLY the CONTEXT below.
If the context is insufficient to answer the question, say you do not have enough information in the available documents.
Do not invent facts. Do not use outside knowledge. Be concise.

CONTEXT:
${contextBlocks}

QUESTION:
${question}`;
}

/**
 * Retrieve tenant-scoped chunks, then generate a grounded answer with Gemini.
 * Does not query document chunks except through retrieveChunks.
 */
export async function answerQuestion(
  input: AnswerQuestionInput,
): Promise<AnswerQuestionResult> {
  const retrieved = await retrieveChunks({
    businessId: input.businessId,
    question: input.question,
    limit: input.limit,
  });

  const sources = toSources(retrieved.results);

  if (retrieved.results.length === 0) {
    return {
      businessId: retrieved.businessId,
      question: retrieved.question,
      answer: INSUFFICIENT_INFORMATION_ANSWER,
      sources,
    };
  }

  const prompt = buildPrompt(retrieved.question, retrieved.results);

  let answer: string;
  try {
    const response = await getClient().models.generateContent({
      model: getChatModel(),
      contents: prompt,
    });
    answer = typeof response.text === "string" ? response.text.trim() : "";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat generation request failed";
    if (message.includes("GEMINI_API_KEY")) {
      throw new ChatError("Chat service is not configured", 500);
    }
    console.error("Chat generation failed:", message);
    throw new ChatError(
      "Failed to generate an answer. Please try again later.",
      502,
    );
  }

  if (answer.length === 0) {
    console.error("Chat generation failed: empty model response");
    throw new ChatError(
      "Failed to generate an answer. Please try again later.",
      502,
    );
  }

  return {
    businessId: retrieved.businessId,
    question: retrieved.question,
    answer,
    sources,
  };
}
