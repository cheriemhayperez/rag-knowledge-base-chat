# KnowledgeBaseChat

Multi-business AI Knowledge Base Chat using Retrieval-Augmented Generation (RAG).

Businesses upload documentation into an isolated knowledge base. Users ask questions in chat and receive AI answers grounded in those documents, with retrieved chunk context as sources.

Early-stage portfolio project: PDF ingestion, vector retrieval,
and LLM answer generation are implemented. The document upload
UI is available; the AI chat UI is still planned.

## Problem

Company knowledge is often trapped in PDFs and internal docs. Manual search is slow, and generic chatbots invent answers. KnowledgeBaseChat aims to answer from **each business’s own documents only**.

## Technology stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | Neon PostgreSQL + pgvector |
| Document text | `pdf-parse` (selectable-text PDFs; no OCR) |
| Embeddings / LLM | Google Gemini via `@google/genai` (embed `gemini-embedding-001`; chat `gemini-3.5-flash-lite` via `GEMINI_CHAT_MODEL`) |

Two independent apps (`frontend/`, `backend/`)

## Architecture

```
User → Frontend (Next.js) — document upload UI implemented; chat UI planned
         → REST → Backend (Express)
                     → POST /api/documents/upload
                     → PDF extract → chunk text → embed (RETRIEVAL_DOCUMENT, 768-dim)
                     → Neon transaction: documents + document_chunks
                     → POST /api/retrieve
                     → embed question (RETRIEVAL_QUERY) → pgvector cosine search
                     → POST /api/chat
                     → retrieveChunks → Gemini generateContent → grounded answer + sources
```

## RAG workflow

| Step | Status |
|------|--------|
| 1. Upload PDF | API implemented (`POST /api/documents/upload`) |
| 2. Extract selectable text | Utility implemented |
| 3. Split into overlapping chunks | Utility implemented |
| 4. Create embeddings (`gemini-embedding-001`, 768-dim) | Service implemented |
| 5. Store vectors in `document_chunks` | Implemented (single DB transaction) |
| 6. Retrieve similar chunks | API implemented (`POST /api/retrieve`) |
| 7. LLM answer with citations | API implemented (`POST /api/chat`) |

## Implemented

- Frontend document upload UI (`/documents`)
  - PDF upload with validation and notifications
  - Session-based upload list
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
  - Task types: `RETRIEVAL_DOCUMENT` (chunks), `RETRIEVAL_QUERY` (questions)
- Document ingestion API (`POST /api/documents/upload`)
  - Multipart fields: `businessId` (existing `businesses.id` UUID), `file` (PDF only, max 10 MB)
  - Pipeline: extract → chunk → `embedTexts(..., "RETRIEVAL_DOCUMENT")` → one Neon transaction
  - Saves `documents` (`status: ready`) and all `document_chunks` with embeddings
  - `businessId` is a temporary testing selector — not authentication or authorization
- Vector retrieval API (`POST /api/retrieve`)
  - JSON: `businessId` (required), `question` (required), `limit` (optional; default 5, max 20)
  - Embeds the question with `embedText(..., "RETRIEVAL_QUERY")`
  - pgvector cosine similarity search over `document_chunks`
  - Filters by `business_id` and `documents.status = 'ready'`
  - Returns `chunkId`, `documentId`, `filename`, `chunkIndex`, `content`, `similarity`
  - `businessId` is a temporary testing selector — not authentication or authorization
- RAG chat API (`POST /api/chat`)
  - JSON: `businessId` (required), `question` (required), `limit` (optional; default 5, max 20)
  - Reuses `retrieveChunks` for tenant-scoped retrieval (no separate unscoped chunk query)
  - Generates a grounded answer with Gemini `generateContent` (`GEMINI_CHAT_MODEL`, default `gemini-3.5-flash-lite`)
  - Embedding model stays separate (`gemini-embedding-001`)
  - If retrieval returns no chunks, returns a fixed insufficient-information answer without calling Gemini
  - If chunks are returned but the context does not support an answer, the model is instructed to say so rather than invent facts
  - Returns `answer` plus `sources` with `chunkId`, `documentId`, `filename`, `chunkIndex`, `similarity` (no raw chunk `content`)
  - Chat client uses SDK `httpOptions.retryOptions` for temporary HTTP errors (408, 429, 500, 502, 503, 504; up to 4 attempts)
  - Validation/errors align with retrieve: 400 invalid input, 404 unknown business, 502 Gemini failures (generic client message)
  - `businessId` is a temporary testing selector — not authentication or authorization
- Backend request logging (`backend/src/utils/logger.ts`)
  - Startup banner with environment and server URL
  - Per-request method/path, stage INFO lines, final status and duration
  - Does not log API keys, prompts, document contents, or embeddings

## Planned

- Auth and business memberships
- Durable PDF file storage (disk/object storage)
- Frontend AI chat UI
- OCR for scanned PDFs (out of scope for v1)

## Project structure

```
KnowledgeBaseChat/
  README.md
  .gitignore
  frontend/
    app/
      documents/
        DocumentsView.tsx
        page.tsx
        page.module.css
      layout.tsx
      page.tsx
      globals.css
    components/
    hooks/
    lib/
    types/
    utils/
    package.json
  backend/
    .env.example
    package.json
    migrations/
      001_initial_schema.sql
    src/app.ts
    src/index.ts
    src/config/database.ts
    src/routes/documents.ts
    src/routes/retrieve.ts
    src/routes/chat.ts
    src/services/embeddings.ts
    src/services/ingestDocument.ts
    src/services/retrieveChunks.ts
    src/services/answerQuestion.ts
    src/utils/extractPdfText.ts
    src/utils/chunkText.ts
    src/utils/logger.ts
```

## Setup

**Prerequisites:** Node.js 20+, Neon project, Google Gemini API key (obtainable from Google AI Studio; required for embeddings and chat). For a fresh Neon database, apply `backend/migrations/001_initial_schema.sql` once. This project’s existing database already has that schema applied. Seed at least one `businesses` row for upload testing.

```bash
cd frontend
npm install

cd ../backend
npm install
cp .env.example .env
```

For the frontend, copy `frontend/.env.example` to
`frontend/.env.local` and configure:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_BUSINESS_ID`

### Environment variables (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string (use `sslmode=verify-full`) |
| `GEMINI_API_KEY` | Required for embeddings and chat generation (backend only; never commit) |
| `GEMINI_EMBEDDING_MODEL` | Embedding model (default `gemini-embedding-001`) |
| `GEMINI_EMBEDDING_DIMENSIONS` | Output dimensions (default `768`; only `768` is supported today — must match DB `vector(768)`; other values are rejected) |
| `GEMINI_CHAT_MODEL` | Text generation model for `/api/chat` (default `gemini-3.5-flash-lite`) |
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

### Retrieve chunks (Postman)

1. `POST http://localhost:4000/api/retrieve`
2. Body → raw JSON, for example:

```json
{
  "businessId": "<existing-business-uuid>",
  "question": "What is the refund policy?",
  "limit": 5
}
```

3. Expect `200` with `results` containing `chunkId`, `documentId`, `filename`, `chunkIndex`, `content`, and `similarity`.
4. Only chunks for that business and `ready` documents are returned.

### Chat (Postman)

1. `POST http://localhost:4000/api/chat`
2. Body → raw JSON, for example:

```json
{
  "businessId": "<existing-business-uuid>",
  "question": "What is the refund policy?",
  "limit": 5
}
```

3. Expect `200` with `answer` and `sources` (`chunkId`, `documentId`, `filename`, `chunkIndex`, `similarity`; no chunk `content`).
4. Empty retrieval returns a fixed insufficient-information `answer` and `sources: []` without calling Gemini.
5. Only that business’s `ready` documents are used as context.

## Security

- Keep secrets in local `.env` only.
- Do not commit API keys, database URLs, or customer PDFs.
- Prefer `sslmode=verify-full` in `DATABASE_URL` (as in `.env.example`).
- Auth and tenant enforcement in application code are not implemented yet.
- `businessId` on upload, retrieve, and chat only checks that the business exists; it is not authorization.
