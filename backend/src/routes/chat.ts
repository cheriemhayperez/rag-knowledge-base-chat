import { Router } from "express";
import { ChatError, answerQuestion } from "../services/answerQuestion.js";
import { RetrieveError } from "../services/retrieveChunks.js";
import { logInfo } from "../utils/logger.js";

export const chatRouter = Router();

/**
 * POST /api/chat
 * JSON: { businessId, question, limit? }
 * businessId is a temporary testing selector — not authorization.
 */
chatRouter.post("/", async (req, res) => {
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

    const result = await answerQuestion({
      businessId,
      question,
      limit,
    });

    logInfo("Request completed");
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof RetrieveError || error instanceof ChatError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error("Chat request failed:", error);
    res.status(500).json({ error: "Failed to generate chat answer" });
  }
});
