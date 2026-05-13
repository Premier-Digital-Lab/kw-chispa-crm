import { useNavigate } from "react-router";
import { useConfigurationContext } from "../root/ConfigurationContext";

const PRIVACY_POLICY_HTML = `<h1>Privacy Policy</h1><p>Content coming soon.</p>`;

const LEGAL_STYLES = `
  .legal-content h1, .legal-content h2, .legal-content h3 {
    color: var(--foreground);
    font-weight: bold;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }
  .legal-content h1 { font-size: 1.5rem; }
  .legal-content h2 { font-size: 1.2rem; }
  .legal-content a { color: #CC0000; text-decoration: underline; }
  .legal-content ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
  .legal-content p { margin-bottom: 0.75rem; }
`;

export const PrivacyPolicyPage = () => {
  const { darkModeLogo, title } = useConfigurationContext();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <style>{LEGAL_STYLES}</style>

      {/* Header */}
      <header className="bg-secondary shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <img src={darkModeLogo} alt={title} className="h-10" />
          <span className="text-secondary-foreground font-semibold text-lg">Central</span>
        </div>
        <div style={{ height: "3px", background: "linear-gradient(90deg, #CC0000 0%, #e6a817 50%, #CC0000 100%)" }} />
      </header>

      {/* Document */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <div
          className="legal-content text-sm leading-relaxed"
          style={{ color: "var(--foreground)" }}
          dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_HTML }}
        />
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-6 text-center border-t">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Go Back
        </button>
      </footer>
    </div>
  );
};

PrivacyPolicyPage.path = "/privacy-policy";
