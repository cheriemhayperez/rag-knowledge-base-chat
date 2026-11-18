import { Router } from "express";
import {
  RetrieveError,
  retrieveChunks,
} from "../services/retrieveChunks.js";
import { logInfo } from "../utils/logger.js";

export const retrieveRouter = Router();

/**
 * POST /api/retrieve
 * JSON: { businessId, question, limit? }
 * businessId is a temporary testing selector — not authorization.
 */
retrieveRouter.post("/", async (req, res) => {
  try {
    logInfo("Validating request");

    const businessId =
      typeof req.body?.businessId === "string" ? req.body.businessId : "";
    const question =
      typeof req.body?.question === "string" ? req.body.question : "";
    const limit =
      req.body?.limit === undefined ? undefined : Number(req.body.limit);

    if (req.body?.limit !== undefined && Number.isNaN(limit)) {
      res.status(400).json({ error: "limit must be a positive integer" });
      return;
    }

    logInfo("Retrieving relevant document chunks");
    const result = await retrieveChunks({
      businessId,
      question,
      limit,
    });

    logInfo("Request completed");
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof RetrieveError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error("Chunk retrieval failed:", error);
    res.status(500).json({ error: "Failed to retrieve chunks" });
  }
});
