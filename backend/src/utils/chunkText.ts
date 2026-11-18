export type TextChunk = {
  chunkIndex: number;
  content: string;
};

export type ChunkTextOptions = {
  /** Max characters per chunk. Default: 2000 (~500 tokens). */
  chunkSize?: number;
  /** Characters reused from the previous chunk. Default: 200 (~10%). */
  chunkOverlap?: number;
};

export const DEFAULT_CHUNK_SIZE = 2000;
export const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Split text into overlapping character chunks for RAG ingestion.
 * Preserves the full input (no dropped middle content). Overlap keeps
 * context across boundaries. Prefers breaking near newlines/spaces when possible.
 */
export function chunkText(
  text: string,
  options: ChunkTextOptions = {},
): TextChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw new Error("chunkSize must be a positive number");
  }
  if (!Number.isFinite(chunkOverlap) || chunkOverlap < 0) {
    throw new Error("chunkOverlap must be a non-negative number");
  }
  if (chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap must be smaller than chunkSize");
  }

  if (text.length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const softEnd = findSoftBreak(text, start, end);
      if (softEnd > start) {
        end = softEnd;
      }
    }

    const content = text.slice(start, end);
    if (content.length > 0) {
      chunks.push({ chunkIndex, content });
      chunkIndex += 1;
    }

    if (end >= text.length) {
      break;
    }

    const nextStart = end - chunkOverlap;
    start = nextStart <= start ? end : nextStart;
  }

  return chunks;
}

function findSoftBreak(text: string, start: number, end: number): number {
  const window = text.slice(start, end);
  const minRelative = Math.floor(window.length * 0.5);

  const paragraphBreak = window.lastIndexOf("\n\n");
  if (paragraphBreak >= minRelative) {
    return start + paragraphBreak + 2;
  }

  const lineBreak = window.lastIndexOf("\n");
  if (lineBreak >= minRelative) {
    return start + lineBreak + 1;
  }

  const spaceBreak = window.lastIndexOf(" ");
  if (spaceBreak >= minRelative) {
    return start + spaceBreak + 1;
  }

  return end;
}
