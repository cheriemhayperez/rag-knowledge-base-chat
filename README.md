# KnowledgeBaseChat

Multi-business AI Knowledge Base Chat using Retrieval-Augmented Generation (RAG).

Businesses upload documentation into an isolated knowledge base. Users ask questions in chat and receive AI answers grounded in those documents, with retrieved chunk context as sources.

Early-stage portfolio project: PDF ingestion into Neon is in place; end-to-end RAG chat is not complete yet.

## Problem

Company knowledge is often trapped in PDFs and internal docs. Manual search is slow, and generic chatbots invent answers. KnowledgeBaseChat aims to answer from **each business’s own documents only**.

## Technology stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | Neon PostgreSQL + pgvector |
| Document text | `pdf-parse` (selectable-text PDFs; no OCR) |
| Embeddings / LLM | Google Gemini via `@google/genai` (embedding + ingest implemented; chat/LLM not built yet) |

Two independent apps (`frontend/`, `backend/`)

## Architecture

```
User → Frontend (Next.js) — upload UI planned
         → REST → Backend (Express)
                     → POST /api/documents/upload
                     → PDF extract → chunk text → embed (RETRIEVAL_DOCUMENT, 768-dim)
                     → Neon transaction: documents + document_chunks
                     → (planned) retrieve vectors → Gemini answer
```

## RAG workflow

| Step | Status |
|------|--------|
| 1. Upload PDF | API implemented (`POST /api/documents/upload`) |
| 2. Extract selectable text | Utility implemented |
| 3. Split into overlapping chunks | Utility implemented |
| 4. Create embeddings (`gemini-embedding-001`, 768-dim) | Service implemented |
| 5. Store vectors in `document_chunks` | Implemented (single DB transaction) |
| 6. Chat: retrieve + LLM answer with citations | Planned |

## Implemented

- Frontend welcome page (`frontend/app`)
- Express `/health` endpoint
- Neon connection helper (`backend/src/config/database.ts`)
- Initial DB schema on Neon: `businesses`, `documents`, `document_chunks`
- pgvector enabled; embeddings column `VECTOR(768)`; HNSW index created
- PDF text extraction (`backend/src/utils/extractPdfText.ts`)
- Text chunking (`backend/src/utils/chunkText.ts`; defaults 2000 / 200 overlap)
- Gemini embedding service (`backend/src/services/embeddings.ts`)
  - `embedText()` / `embedTexts()` via `@google/genai`
  - Model `gemini-embedding-001`, 768 dimensions (must match `document_chunks.embedding vector(768)`)
  - L2-normalized vectors
  - Task types: `RETRIEVAL_DOCUMENT` (chunks), `RETRIEVAL_QUERY` (future questions)
- Document ingestion API (`POST /api/documents/upload`)
  - Multipart fields: `businessId` (existing `businesses.id` UUID), `file` (PDF only, max 10 MB)
  - Pipeline: extract → chunk → `embedTexts(..., "RETRIEVAL_DOCUMENT")` → one Neon transaction
  - Saves `documents` (`status: ready`) and all `document_chunks` with embeddings
  - `businessId` is a temporary testing selector — not authentication or authorization

## Planned

- Auth and business memberships
- Durable PDF file storage (disk/object storage)
- Retrieval + chat API with citations
- Frontend upload and chat UI
- OCR for scanned PDFs (out of scope for v1)

## Project structure

```
KnowledgeBaseChat/
  README.md
  .gitignore
  frontend/
    app/layout.tsx
    app/page.tsx
    package.json
  backend/
    .env.example
    package.json
    src/app.ts
    src/index.ts
    src/config/database.ts
    src/routes/documents.ts
    src/services/embeddings.ts
    src/services/ingestDocument.ts
    src/utils/extractPdfText.ts
    src/utils/chunkText.ts
```

## Setup

**Prerequisites:** Node.js 20+, Neon project, Google Gemini API key (obtainable from Google AI Studio; required for embeddings; chat later). For a fresh Neon database, apply `backend/migrations/001_initial_schema.sql` once. This project’s existing database already has that schema applied. Seed at least one `businesses` row for upload testing.

```bash
cd frontend
npm install

cd ../backend
npm install
cp .env.example .env
```

### Environment variables (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `GEMINI_API_KEY` | Required to call `embedText` / `embedTexts` (backend only; never commit) |
| `GEMINI_EMBEDDING_MODEL` | Embedding model (default `gemini-embedding-001`) |
| `GEMINI_EMBEDDING_DIMENSIONS` | Output dimensions (default `768`; only `768` is supported today — must match DB `vector(768)`; other values are rejected) |
| `PORT` | Backend port (default `4000`) |

Use `RETRIEVAL_DOCUMENT` when embedding document chunks and `RETRIEVAL_QUERY` for user questions.

Never commit `.env`. Only `.env.example` belongs in Git.

## Run

```bash
# Frontend — http://localhost:3000
cd frontend
npm run dev
# production: npm run build && npm start

# Backend — http://localhost:4000
cd backend
npm run dev
curl http://localhost:4000/health
```

### Upload a PDF (Postman)

1. Ensure a business exists and copy its `id`:

```sql
INSERT INTO businesses (name, slug)
VALUES ('Demo Business', 'demo')
RETURNING id;
```

2. `POST http://localhost:4000/api/documents/upload`
   - Body → form-data:
     - `businessId` (Text) = that UUID
     - `file` (File) = a selectable-text PDF (max 10 MB)
3. Expect `201` with `documentId`, `status: "ready"`, and `chunkCount`.
4. Confirm rows in Neon for that document and its `document_chunks` embeddings.

## Security

- Keep secrets in local `.env` only.
- Do not commit API keys, database URLs, or customer PDFs.
- Auth and tenant enforcement in application code are not implemented yet.
- `businessId` on upload only checks that the business exists; it is not authorization.
