import { Link } from "react-router";
import { useConfigurationContext } from "../root/ConfigurationContext";

const SECTIONS = [
  "What Are Cookies",
  "How KW CHISPA Central Uses Cookies",
  "Cookies We Use",
  "What We Do NOT Use",
  "Email Communications",
  "Mapping Technology",
  "How to Control Cookies",
  "Third-Party Service Providers",
  "Children's Privacy",
  "Changes to This Cookie Policy",
  "Contact Us",
];

export const CookiePolicyPage = () => {
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
        <h1 className="text-3xl font-bold mb-1">Cookie Policy</h1>
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

CookiePolicyPage.path = "/cookie-policy";
