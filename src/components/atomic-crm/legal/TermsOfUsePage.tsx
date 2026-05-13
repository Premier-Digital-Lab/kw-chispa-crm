import { Link } from "react-router";
import { useConfigurationContext } from "../root/ConfigurationContext";

const SECTIONS = [
  "Acceptance of Terms",
  "Eligibility",
  "Your Account",
  "Acceptable Use",
  "Member Directory",
  "Membership Tiers",
  "Artificial Intelligence",
  "Cookies",
  "Intellectual Property",
  "Termination",
  "Disclaimers",
  "Limitation of Liability",
  "Governing Law",
  "Changes to Terms",
  "Contact",
];

export const TermsOfUsePage = () => {
  const { darkModeLogo, title } = useConfigurationContext();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-secondary shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <img src={darkModeLogo} alt={title} className="h-10" />
          <span className="text-secondary-foreground font-semibold text-lg">Central</span>
        </div>
        <div style={{ height: "3px", background: "linear-gradient(90deg, #CC0000 0%, #e6a817 50%, #CC0000 100%)" }} />
      </header>

      {/* Document */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <h1 className="text-3xl font-bold mb-1">Terms of Use</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last Updated: [DATE PENDING ATTORNEY REVIEW]
        </p>

        {SECTIONS.map((section) => (
          <section key={section} className="mb-8">
            <h2 className="text-lg font-semibold mb-2">{section}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              [CONTENT PENDING ATTORNEY REVIEW]
            </p>
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-6 text-center border-t">
        <Link to="/login" className="text-sm text-muted-foreground hover:underline">
          ← Back to Sign In
        </Link>
      </footer>
    </div>
  );
};

TermsOfUsePage.path = "/terms-of-use";
