"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import styles from "./Sidebar.module.css";

type NavItem = {
  href: string;
  label: string;
  status: "live" | "soon";
  icon: "documents" | "chat" | "dashboard" | "settings";
};

const navItems: NavItem[] = [
  { href: "/documents", label: "Documents", status: "live", icon: "documents" },
  { href: "#", label: "AI Chat", status: "soon", icon: "chat" },
  { href: "#", label: "Dashboard", status: "soon", icon: "dashboard" },
  { href: "#", label: "Settings", status: "soon", icon: "settings" },
];

function NavIcon({ name }: { name: NavItem["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "documents":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const labelId = useId();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={styles.mobileMenuButton}
        aria-expanded={mobileOpen}
        aria-controls={labelId}
        onClick={() => setMobileOpen(true)}
      >
        <span className={styles.srOnly}>Open navigation</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <div
        className={`${styles.overlay} ${mobileOpen ? styles.overlayVisible : ""}`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      <div
        className={[
          styles.sidebarSpacer,
          collapsed ? styles.sidebarSpacerCollapsed : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />

      <aside
        id={labelId}
        className={[
          styles.sidebar,
          collapsed ? styles.collapsed : "",
          mobileOpen ? styles.mobileOpen : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Primary"
      >
        <div className={styles.topRow}>
          <div className={styles.brand}>
            <span className={styles.logoMark} aria-hidden="true">
              KB
            </span>
            <div className={styles.brandText}>
              <p className={styles.brandName}>KB Chat</p>
              <p className={styles.brandTag}>AI workspace</p>
            </div>
          </div>

          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setCollapsed((value) => !value)}
            aria-pressed={collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={styles.collapseIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {collapsed ? (
                <path d="M9 6l6 6-6 6" />
              ) : (
                <path d="M15 6l-6 6 6 6" />
              )}
            </svg>
          </button>

          <button
            type="button"
            className={styles.mobileCloseButton}
            onClick={closeMobile}
            aria-label="Close navigation"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className={styles.nav} aria-label="Workspace">
          {navItems.map((item) => {
            const tooltip =
              item.status === "soon" ? `${item.label} (Coming soon)` : item.label;

            if (item.status === "soon") {
              return (
                <span
                  key={item.label}
                  className={`${styles.navItem} ${styles.navSoon}`}
                  aria-disabled="true"
                  data-tooltip={tooltip}
                  title={collapsed ? tooltip : undefined}
                >
                  <span className={styles.navIcon}>
                    <NavIcon name={item.icon} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                  <span className={styles.soonBadge}>Soon</span>
                </span>
              );
            }

            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                data-tooltip={item.label}
                title={collapsed ? item.label : undefined}
                onClick={closeMobile}
              >
                <span className={styles.navIcon}>
                  <NavIcon name={item.icon} />
                </span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
