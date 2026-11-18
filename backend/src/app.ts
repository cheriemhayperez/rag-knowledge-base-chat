import cors from "cors";
import express from "express";
import helmet from "helmet";
import { documentsRouter } from "./routes/documents.js";
import { retrieveRouter } from "./routes/retrieve.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "knowledgebasechat-backend" });
  });

  app.use("/api/documents", documentsRouter);
  app.use("/api/retrieve", retrieveRouter);

  return app;
}
