"use client";

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    return (
        <html lang="en">
            <body>
                <div
                    style={{
                        display: "flex",
                        minHeight: "100vh",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "system-ui, sans-serif",
                    }}
                >
                    <div style={{ maxWidth: "28rem", textAlign: "center" }}>
                        <h1
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: 700,
                            }}
                        >
                            Something went wrong
                        </h1>
                        <p
                            style={{
                                marginTop: "0.5rem",
                                fontSize: "0.875rem",
                                color: "#71717a",
                            }}
                        >
                            {error.message ||
                                "A critical error occurred. Please try again."}
                        </p>
                        <button
                            type="button"
                            onClick={reset}
                            style={{
                                marginTop: "1rem",
                                padding: "0.5rem 1rem",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                borderRadius: "0.5rem",
                                border: "1px solid #d4d4d8",
                                background: "#18181b",
                                color: "#fafafa",
                                cursor: "pointer",
                            }}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
