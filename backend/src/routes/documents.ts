import { Router } from "express";
import multer, { MulterError } from "multer";
import {
  IngestError,
  ingestDocument,
} from "../services/ingestDocument.js";
import { logInfo } from "../utils/logger.js";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfName = file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdfMime && !isPdfName) {
      callback(new Error("Only PDF files are allowed"));
      return;
    }
    callback(null, true);
  },
});

export const documentsRouter = Router();

/**
 * POST /api/documents/upload
 * multipart/form-data: file (PDF), businessId (existing businesses.id UUID).
 * businessId is a temporary testing selector — not authorization.
 */
documentsRouter.post("/upload", (req, res) => {
  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError instanceof MulterError) {
      if (uploadError.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "PDF exceeds the 10 MB limit" });
        return;
      }
      res.status(400).json({ error: uploadError.message });
      return;
    }

    if (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Upload failed";
      res.status(400).json({ error: message });
      return;
    }

    try {
      logInfo("Validating request");

      const businessId =
        typeof req.body?.businessId === "string" ? req.body.businessId : "";
      if (!businessId.trim()) {
        res.status(400).json({ error: "businessId is required" });
        return;
      }

      if (!req.file?.buffer) {
        res
          .status(400)
          .json({ error: "PDF file is required (field name: file)" });
        return;
      }

      logInfo("Processing PDF document");
      const result = await ingestDocument({
        businessId,
        filename: req.file.originalname,
        fileType: req.file.mimetype || "application/pdf",
        data: req.file.buffer,
      });

      logInfo("Request completed");
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof IngestError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      const message =
        error instanceof Error ? error.message : "Document upload failed";
      console.error("Document upload failed:", message);
      res.status(500).json({ error: "Failed to ingest document" });
    }
  });
});
