import { useNavigate } from "react-router";
import { useConfigurationContext } from "../root/ConfigurationContext";

const TERMS_HTML = `
<h1>TERMS OF USE</h1>
<p><strong>Effective Date:</strong> May 12, 2026<br/><strong>Last Updated:</strong> May 12, 2026</p>

<h2>1. Acceptance of Terms</h2>
<p>By creating an account on KW CHISPA Central, you agree to these Terms of Use. If you do not agree, please do not use the platform.</p>

<h2>2. Eligibility</h2>
<p>KW CHISPA Central is a private membership platform for the members of KW CHISPA. Membership is subject to approval by KW CHISPA LLC administrators.</p>

<h2>3. Your Account</h2>
<p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information and to keep your profile up to date. KW CHISPA LLC reserves the right to suspend or terminate accounts that contain false or misleading information.</p>

<h2>4. Acceptable Use</h2>
<p>You agree not to:</p>
<ul>
<li>Use the platform or member directory for solicitation, spam, or unauthorized commercial purposes</li>
<li>Share, copy, or distribute other members' contact information without their consent</li>
<li>Attempt to access areas of the platform you are not authorized to access</li>
<li>Impersonate another member or person</li>
<li>Use the platform in any way that violates applicable law</li>
</ul>

<h2>5. Member Directory</h2>
<p>Your profile information will be visible to other approved members of KW CHISPA Central. By completing your profile, you consent to this visibility. You may update or remove information from your profile at any time through your account settings.</p>

<h2>6. Membership Tiers</h2>
<p>KW CHISPA Central offers Free and Premier membership tiers. Premier membership requires a paid subscription processed through PayPal. Subscription fees are subject to change with notice. Refund policies are governed by PayPal's terms of service and KW CHISPA LLC.</p>

<h2>7. Artificial Intelligence</h2>
<p>KW CHISPA Central uses AI-powered features including a member search chatbot and content generator. By using these features, you consent to your queries and relevant data being processed by our AI service providers (Anthropic, OpenRouter, and Kie.ai) solely for the purpose of generating responses. You agree not to input sensitive personal information, confidential client data, or any information you are not authorized to share when using AI features.</p>

<h2>8. Cookies</h2>
<p>By using KW CHISPA Central, you consent to our use of essential session cookies required for platform functionality. We do not use advertising, tracking, or analytics cookies. For more information, see the Cookie Policy.</p>

<h2>9. Intellectual Property</h2>
<p>All content provided by KW CHISPA LLC on this platform, including logos, training materials, and resources, is the property of KW CHISPA LLC or its licensors. Members may not reproduce, distribute, or create derivative works without written permission.</p>

<h2>10. Termination</h2>
<p>KW CHISPA LLC reserves the right to suspend or terminate any membership at its discretion, including for violation of these Terms, conduct unbecoming of a KW CHISPA member, or any reason deemed appropriate by KW CHISPA leadership.</p>

<h2>11. Disclaimers</h2>
<p>KW CHISPA Central is provided "as is" without warranties of any kind. KW CHISPA LLC is not responsible for the accuracy of member-provided information, AI-generated content, or for any disputes between members.</p>

<h2>12. Limitation of Liability</h2>
<p>To the fullest extent permitted by law, KW CHISPA LLC shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including damages arising from AI-generated content.</p>

<h2>13. Governing Law</h2>
<p>These Terms are governed by the laws of the State of New Jersey, without regard to conflict of law principles.</p>

<h2>14. Changes to Terms</h2>
<p>We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated Terms.</p>

<h2>15. Contact</h2>
<p>KW CHISPA LLC<br/>Email: <a href="mailto:info@kwchispa.com">info@kwchispa.com</a></p>
`;

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

export const TermsOfUsePage = () => {
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
          dangerouslySetInnerHTML={{ __html: TERMS_HTML }}
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

TermsOfUsePage.path = "/terms-of-use";
