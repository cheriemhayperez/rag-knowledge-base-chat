"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatFileSize, validatePdfFile } from "@/utils/validation";
import { Notice } from "./Notice";
import styles from "./UploadZone.module.css";

const VALIDATION_DISMISS_MS = 5000;

type UploadZoneProps = {
  disabled?: boolean;
  uploading?: boolean;
  activeFileName?: string | null;
  onFileSelected: (file: File) => void;
};

export function UploadZone({
  disabled = false,
  uploading = false,
  activeFileName = null,
  onFileSelected,
}: UploadZoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const mountedRef = useRef(true);
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInteractive = !disabled && !uploading;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (validationTimerRef.current !== null) {
        clearTimeout(validationTimerRef.current);
        validationTimerRef.current = null;
      }
    };
  }, []);

  function clearValidationTimer() {
    if (validationTimerRef.current !== null) {
      clearTimeout(validationTimerRef.current);
      validationTimerRef.current = null;
    }
  }

  function clearValidationError() {
    clearValidationTimer();
    setValidationError(null);
  }

  useEffect(() => {
    if (!uploading) {
      return;
    }

    clearValidationTimer();
    setValidationError(null);
  }, [uploading]);

  function showValidationError(message: string) {
    clearValidationTimer();
    setValidationError(message);
    validationTimerRef.current = setTimeout(() => {
      validationTimerRef.current = null;
      if (!mountedRef.current) {
        return;
      }
      setValidationError(null);
    }, VALIDATION_DISMISS_MS);
  }

  function acceptFile(file: File | undefined) {
    if (!file || !isInteractive) {
      return;
    }

    const message = validatePdfFile(file);
    if (message) {
      setSelectedPreview(null);
      showValidationError(message);
      return;
    }

    clearValidationError();
    setSelectedPreview({ name: file.name, size: file.size });
    onFileSelected(file);
  }

  return (
    <section className={styles.section} aria-labelledby={`${inputId}-title`}>
      <div className={styles.header}>
        <h2 id={`${inputId}-title`} className={styles.title}>
          Upload PDF
        </h2>
        <p className={styles.subtitle}>
          Drag and drop your PDF here, or browse your files.
        </p>
      </div>

      <div
        className={[
          styles.dropzone,
          isDragging ? styles.dragging : "",
          uploading ? styles.uploading : "",
          !isInteractive ? styles.disabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragEnter={(event) => {
          event.preventDefault();
          if (isInteractive) {
            setIsDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          acceptFile(event.dataTransfer.files?.[0]);
        }}
      >
        <div className={styles.icon} aria-hidden="true">
          {uploading ? (
            <span className={styles.spinner} />
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
            </svg>
          )}
        </div>

        <p className={styles.dropTitle}>
          {uploading ? "Uploading and indexing…" : "Drop your PDF here"}
        </p>
        <p id={`${inputId}-hint`} className={styles.dropHint}>
          {uploading && (activeFileName || selectedPreview?.name)
            ? activeFileName || selectedPreview?.name
            : "PDF only · Max 10 MB · Selectable text recommended"}
        </p>

        <label
          className={styles.browseButton}
          htmlFor={inputId}
          aria-disabled={!isInteractive}
        >
          {uploading ? "Uploading…" : "Browse files"}
        </label>
        <input
          id={inputId}
          className={styles.fileInput}
          type="file"
          accept="application/pdf,.pdf"
          disabled={!isInteractive}
          aria-describedby={`${inputId}-hint`}
          onChange={(event) => {
            acceptFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      {selectedPreview && !uploading ? (
        <p className={styles.selection} role="status">
          Selected{" "}
          <span className={styles.selectionName}>{selectedPreview.name}</span>
          <span className={styles.selectionMeta}>
            {" "}
            · {formatFileSize(selectedPreview.size)}
          </span>
        </p>
      ) : null}

      {validationError ? (
        <Notice variant="error" onDismiss={clearValidationError}>
          {validationError}
        </Notice>
      ) : null}
    </section>
  );
}
