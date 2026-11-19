import type { DocumentListItem } from "@/types/documents";
import { DocumentRow } from "./DocumentRow";
import styles from "./DocumentList.module.css";

type DocumentListProps = {
  documents: DocumentListItem[];
  uploading: boolean;
};

export function DocumentList({ documents, uploading }: DocumentListProps) {
  return (
    <section className={styles.section} aria-labelledby="session-docs-heading">
      <div className={styles.header}>
        <div>
          <h2 id="session-docs-heading" className={styles.title}>
            Recent uploads
          </h2>
          <p className={styles.subtitle}>
            Documents successfully uploaded during this session. This list
            clears when you refresh the page.
          </p>
        </div>
        <p className={styles.count} aria-live="polite">
          {documents.length}{" "}
          {documents.length === 1 ? "document" : "documents"}
        </p>
      </div>

      {uploading ? (
        <p className={styles.banner} role="status" aria-live="polite">
          Uploading and indexing PDF…
        </p>
      ) : null}

      {documents.length === 0 && !uploading ? (
        <div className={styles.empty} role="status">
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>No uploads yet</p>
          <p className={styles.emptyText}>
            Successful uploads appear here with filename, time, chunk count, and
            ready status from the API.
          </p>
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Uploaded</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <DocumentRow key={document.documentId} document={document} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
