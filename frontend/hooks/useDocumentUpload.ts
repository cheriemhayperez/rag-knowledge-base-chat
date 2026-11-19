"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, uploadDocument } from "@/lib/api/documents";
import { getBusinessId } from "@/lib/config";
import type { DocumentListItem } from "@/types/documents";

const SUCCESS_DISMISS_MS = 4000;
const API_ERROR_DISMISS_MS = 6000;

export function useDocumentUpload() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const uploadingRef = useRef(false);
  const mountedRef = useRef(true);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const businessConfigured = getBusinessId().length > 0;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, []);

  function clearDismissTimer() {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }

  function clearNotifications() {
    clearDismissTimer();
    setError(null);
    setSuccess(null);
  }

  function scheduleDismiss(
    kind: "success" | "error",
    delayMs: number,
  ) {
    clearDismissTimer();
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      if (!mountedRef.current) {
        return;
      }

      if (kind === "success") {
        setSuccess(null);
      } else {
        setError(null);
      }
    }, delayMs);
  }

  function dismissSuccess() {
    clearDismissTimer();
    setSuccess(null);
  }

  function dismissError() {
    clearDismissTimer();
    setError(null);
  }

  async function upload(file: File) {
    if (uploadingRef.current) {
      return;
    }

    uploadingRef.current = true;
    setUploading(true);
    clearNotifications();
    setActiveFileName(file.name);

    try {
      const result = await uploadDocument(file);
      const item: DocumentListItem = {
        documentId: result.documentId,
        filename: result.filename,
        status: result.status,
        chunkCount: result.chunkCount,
        uploadedAt: new Date().toISOString(),
      };

      if (!mountedRef.current) {
        return;
      }

      setDocuments((current) => [item, ...current]);
      setSuccess(
        `Uploaded “${result.filename}” successfully (${result.chunkCount} chunks).`,
      );
      scheduleDismiss("success", SUCCESS_DISMISS_MS);
    } catch (err) {
      if (!mountedRef.current) {
        return;
      }

      if (err instanceof ApiError || err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to upload document.");
      }
      scheduleDismiss("error", API_ERROR_DISMISS_MS);
    } finally {
      uploadingRef.current = false;
      if (mountedRef.current) {
        setUploading(false);
        setActiveFileName(null);
      }
    }
  }

  return {
    documents,
    uploading,
    error,
    success,
    activeFileName,
    businessConfigured,
    upload,
    dismissSuccess,
    dismissError,
  };
}
