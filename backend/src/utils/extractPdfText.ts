import { PDFParse } from "pdf-parse";

/**
 * Extract plain text from PDF bytes (e.g. upload buffers).
 * Does not perform OCR — scanned/image-only PDFs will return little or no text.
 */
export async function extractTextFromPdfData(
  data: Buffer | Uint8Array,
): Promise<string> {
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}
