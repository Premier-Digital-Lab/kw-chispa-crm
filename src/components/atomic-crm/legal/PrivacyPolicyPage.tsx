import { useNavigate } from "react-router";
import { useConfigurationContext } from "../root/ConfigurationContext";

const SECTIONS = [
  "Who We Are",
  "Information We Collect",
  "How We Use Your Information",
  "Information We Share",
  "Artificial Intelligence Features",
  "Cookies and Tracking Technologies",
  "Mapping Technology",
  "Data Retention",
  "Your Rights",
  "Data Security",
  "Children's Privacy",
  "Changes to This Policy",
  "Contact Us",
];

export const PrivacyPolicyPage = () => {
  const { darkModeLogo, title } = useConfigurationContext();
  const navigate = useNavigate();

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
        <h1 className="text-3xl font-bold mb-1">Privacy Policy</h1>
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
