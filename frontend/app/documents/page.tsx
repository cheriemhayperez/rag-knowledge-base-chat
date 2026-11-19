import { DocumentsView } from "./DocumentsView";
import styles from "./page.module.css";

export default function DocumentsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Knowledge workspace</p>
        <h1 className={styles.title}>Documents</h1>
        <p className={styles.lead}>
          Upload PDF files to build your knowledge base. Your documents will be
          prepared for AI-powered search.
        </p>
      </header>

      <DocumentsView />
    </div>
  );
}
