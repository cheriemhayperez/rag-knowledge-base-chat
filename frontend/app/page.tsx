export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "4rem 1.5rem",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", lineHeight: 1.15, margin: 0 }}>
        KnowledgeBaseChat
      </h1>
      <p
        style={{
          marginTop: "1rem",
          fontSize: "1.125rem",
          lineHeight: 1.6,
          color: "#9aa6b2",
          maxWidth: 560,
        }}
      >
        Upload your documentation and chat with an AI assistant grounded in
        your knowledge base. Scaffold only — RAG features come next.
      </p>
    </main>
  );
}
