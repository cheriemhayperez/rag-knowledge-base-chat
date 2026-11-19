import type { DocumentListItem } from "@/types/documents";
import styles from "./DocumentRow.module.css";

function formatUploadedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function DocumentRow({ document }: { document: DocumentListItem }) {
  return (
    <tr className={styles.row}>
      <td className={styles.nameCell}>
        <span className={styles.fileBadge} aria-hidden="true">
          PDF
        </span>
        <div className={styles.nameBlock}>
          <p className={styles.filename}>{document.filename}</p>
          <p className={styles.meta}>
            <span className={styles.mono}>{document.chunkCount}</span> chunks
            indexed
          </p>
        </div>
      </td>
      <td className={styles.dateCell}>
        <time dateTime={document.uploadedAt} className={styles.mono}>
          {formatUploadedAt(document.uploadedAt)}
        </time>
      </td>
      <td>
        <span className={styles.statusReady}>
          <span className={styles.dot} aria-hidden="true" />
          Ready
        </span>
      </td>
    </tr>
  );
}
