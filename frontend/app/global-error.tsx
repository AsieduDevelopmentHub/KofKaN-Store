"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "32px",
          background: "#FAF7F1",
          color: "#3B2A25",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          gap: "12px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8A7A74",
            margin: 0,
          }}
        >
          Error 500
        </p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "28px", margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ maxWidth: 420, color: "#6F5F5A", margin: 0 }}>
          A critical error prevented the page from loading.
          {error.digest ? (
            <>
              <br />
              <span style={{ fontSize: "11px", color: "#8A7A74" }}>
                Reference: {error.digest}
              </span>
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 8,
            padding: "10px 20px",
            borderRadius: 10,
            background: "#C9A24C",
            color: "#fff",
            border: 0,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
