import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

// Last-resort guard: whatever throws during render (translator DOM
// corruption, unexpected data, a future regression), the user gets a
// recovery screen instead of a blank page.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          background: "#141210",
          color: "#f5f5f4",
          fontFamily: "Georgia, serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#cc6512", fontSize: "28px", margin: 0 }}>
          Une erreur est survenue / Something went wrong
        </h1>
        <p style={{ maxWidth: "480px", lineHeight: 1.6, opacity: 0.85, margin: 0 }}>
          Si vous utilisez la traduction automatique du navigateur, elle peut
          interférer avec l'application. L'app est déjà disponible en FR et EN
          via le sélecteur de langue.
          <br />
          If you are using the browser's auto-translate, it can break the app.
          FR and EN are available natively via the language selector.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#cc6512",
            color: "#ffffff",
            border: "none",
            padding: "12px 28px",
            fontWeight: "bold",
            letterSpacing: "2px",
            textTransform: "uppercase",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Recharger / Reload
        </button>
        {this.state.message && (
          <p style={{ fontSize: "11px", opacity: 0.4, maxWidth: "480px", margin: 0 }}>
            {this.state.message}
          </p>
        )}
      </div>
    );
  }
}
