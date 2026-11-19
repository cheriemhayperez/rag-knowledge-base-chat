import type { ReactNode } from "react";
import styles from "./Notice.module.css";

type NoticeProps = {
  variant: "success" | "error";
  children: ReactNode;
  onDismiss: () => void;
  role?: "status" | "alert";
};

export function Notice({
  variant,
  children,
  onDismiss,
  role = variant === "error" ? "alert" : "status",
}: NoticeProps) {
  return (
    <div
      className={`${styles.notice} ${
        variant === "success" ? styles.success : styles.error
      }`}
      role={role}
    >
      <p className={styles.message}>{children}</p>
      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
