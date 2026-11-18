import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KnowledgeBaseChat",
  description:
    "Ask questions and get AI answers grounded in your knowledge base documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#0f1419",
          color: "#e7ecf3",
        }}
      >
        {children}
      </body>
    </html>
  );
}
