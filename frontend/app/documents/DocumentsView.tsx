"use client";

import { DocumentList } from "@/components/DocumentList";
import { Notice } from "@/components/Notice";
import { UploadZone } from "@/components/UploadZone";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import styles from "./page.module.css";

export function DocumentsView() {
  const {
    documents,
    uploading,
    error,
    success,
    activeFileName,
    businessConfigured,
    upload,
    dismissSuccess,
    dismissError,
  } = useDocumentUpload();

  return (
    <>
      {!businessConfigured ? (
        <p className={styles.configError} role="alert">
          Set <code>NEXT_PUBLIC_BUSINESS_ID</code> in{" "}
          <code>frontend/.env.local</code> to an existing business UUID before
          uploading.
        </p>
      ) : null}

      <UploadZone
        disabled={!businessConfigured}
        uploading={uploading}
        activeFileName={activeFileName}
        onFileSelected={upload}
      />

      {error ? (
        <Notice variant="error" onDismiss={dismissError}>
          {error}
        </Notice>
      ) : null}

      {success ? (
        <Notice variant="success" onDismiss={dismissSuccess}>
          {success}
        </Notice>
      ) : null}

      <DocumentList documents={documents} uploading={uploading} />
    </>
  );
}
