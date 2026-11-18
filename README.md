# KnowledgeBaseChat

Multi-business AI Knowledge Base Chat using Retrieval-Augmented Generation (RAG).

Businesses upload documentation into an isolated knowledge base. Users ask questions in chat and receive AI answers grounded in those documents, with retrieved chunk context as sources.

Early-stage portfolio project: infrastructure and ingestion utilities are in place; end-to-end RAG chat is not complete yet.

## Problem

Company knowledge is often trapped in PDFs and internal docs. Manual search is slow, and generic chatbots invent answers. KnowledgeBaseChat aims to answer from **each business’s own documents only**.

## Technology stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | Neon PostgreSQL + pgvector |
| Document text | `pdf-parse` (selectable-text PDFs; no OCR) |
| Embeddings / LLM | Google Gemini (env configured; app integration not built yet) |

Two independent apps (`frontend/`, `backend/`) 

## Architecture

```
User → Frontend (Next.js)
         → REST → Backend (Express)
                     → PDF extract → chunk text
                     → (planned) embed → pgvector retrieve → Gemini answer
                     → Neon PostgreSQL
```

## RAG workflow

| Step | Status |
|------|--------|
| 1. Upload PDF | Planned |
| 2. Extract selectable text | Utility implemented |
| 3. Split into overlapping chunks | Utility implemented |
| 4. Create embeddings (`gemini-embedding-001`, 768-dim) | Planned (DB ready) |
| 5. Store vectors in `document_chunks` | Planned (table ready) |
| 6. Chat: retrieve + LLM answer with citations | Planned |

## Implemented

- Frontend welcome page (`frontend/app`)  
- Express `/health` endpoint  
- Neon connection helper (`backend/src/config/database.ts`)  
- Initial DB schema on Neon: `businesses`, `documents`, `document_chunks`  
- pgvector enabled; embeddings column `VECTOR(768)`; HNSW index created  
- PDF text extraction (`backend/src/utils/extractPdfText.ts`)  
- Text chunking (`backend/src/utils/chunkText.ts`; defaults 2000 / 200 overlap)  
- Env placeholders for Gemini (not used by routes yet)

## Planned

- Auth and business memberships  
- Document upload API and file storage  
- Embedding pipeline writing to `document_chunks`  
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
    src/utils/extractPdfText.ts
    src/utils/chunkText.ts
```

## Setup

**Prerequisites:** Node.js 20+, Neon project (schema already applied for this project), Google AI Studio API key (for later embedding/chat).

```bash
cd frontend && npm install
cd ../backend && npm install
cp .env.example .env   # from backend/
```

### Environment variables (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `GEMINI_API_KEY` | Gemini API key (future use) |
| `GEMINI_EMBEDDING_MODEL` | e.g. `gemini-embedding-001` |
| `GEMINI_EMBEDDING_DIMENSIONS` | `768` (must match DB `VECTOR(768)`) |
| `PORT` | Backend port (default `4000`) |

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

## Security

- Keep secrets in local `.env` only.  
- Do not commit API keys, database URLs, or customer PDFs.  
- Auth and tenant enforcement in application code are not implemented yet.
