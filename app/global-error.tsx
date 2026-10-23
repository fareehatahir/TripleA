"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center", color: "#3A3D42" }}>
        <div>
          <h1 style={{ color: "#C8102E", fontSize: "3rem", margin: 0 }}>Oops</h1>
          <p>Something went wrong. Please try again.</p>
          <button onClick={reset} style={{ background: "#C8102E", color: "#fff", border: 0, padding: "12px 24px", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
