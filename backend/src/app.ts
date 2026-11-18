import cors from "cors";
import express from "express";
import helmet from "helmet";
import { chatRouter } from "./routes/chat.js";
import { documentsRouter } from "./routes/documents.js";
import { retrieveRouter } from "./routes/retrieve.js";
import {
  logRequestEnd,
  logRequestStart,
  requestPath,
} from "./utils/logger.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    const path = requestPath(req.originalUrl || req.url);
    if (path === "/health") {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();
    logRequestStart(req.method, path);

    res.on("finish", () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logRequestEnd(res.statusCode, req.method, path, durationMs);
    });

    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "knowledgebasechat-backend" });
  });

  app.use("/api/documents", documentsRouter);
  app.use("/api/retrieve", retrieveRouter);
  app.use("/api/chat", chatRouter);

  return app;
}
