import { useNavigate } from "react-router";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const CookiePolicyPage = () => {
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
        <h1 className="text-3xl font-bold mb-1">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last Updated: May 12, 2026
        </p>

        {/* 1 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">What Are Cookies?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cookies are small text files that are placed on your device (computer, tablet, or mobile
            phone) when you visit a website or use a web application. They allow the platform to
            recognize your device and remember certain information about your visit, such as your
            login status. Cookies are widely used to make websites and apps work more efficiently
            and to provide a better user experience.
          </p>
        </section>

        {/* 2 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">How KW CHISPA Central Uses Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            KW CHISPA Central uses only essential cookies. We do not use advertising cookies,
            analytics cookies, or any third-party tracking technologies on our platform. Essential
            cookies are strictly necessary for the platform to function. Without these cookies, you
            would not be able to log in or use KW CHISPA Central. Because these cookies are
            essential, they do not require your consent under most privacy laws; however, by using
            our platform, you acknowledge their use.
          </p>
        </section>

        {/* 3 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Cookies We Use</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            The following cookies are used by KW CHISPA Central:
          </p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">Cookie Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Purpose</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Provider</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">sb-access-token</td>
                  <td className="px-4 py-3 text-muted-foreground">Essential</td>
                  <td className="px-4 py-3 text-muted-foreground">Keeps you logged in to KW CHISPA Central</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">Session (expires on logout or browser close)</td>
                  <td className="px-4 py-3 text-muted-foreground">Supabase</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">sb-refresh-token</td>
                  <td className="px-4 py-3 text-muted-foreground">Essential</td>
                  <td className="px-4 py-3 text-muted-foreground">Refreshes your login session automatically</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">Up to 1 hour of inactivity</td>
                  <td className="px-4 py-3 text-muted-foreground">Supabase</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Note: Cookie names and durations may vary slightly depending on your browser and device settings.
          </p>
        </section>

        {/* 4 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">What We Do NOT Use</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            KW CHISPA Central does not use the following:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
            <li>Advertising or marketing cookies</li>
            <li>Analytics cookies (e.g. Google Analytics, Mixpanel)</li>
            <li>Social media tracking cookies (e.g. Facebook Pixel)</li>
            <li>Google Maps APIs or Google tracking technologies</li>
            <li>Web beacons or tracking pixels on the platform itself</li>
            <li>Third-party behavioral tracking of any kind</li>
          </ul>
        </section>

        {/* 5 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Email Communications</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Emails sent to members via MailerLite (our email marketing provider) may include a
            standard open-tracking pixel. This is a tiny invisible image embedded in the email that
            allows MailerLite to record whether the email was opened and on what device. This
            tracking occurs within the email itself, not on the KW CHISPA Central platform.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may opt out of marketing emails at any time by clicking "Unsubscribe" at the bottom
            of any email we send. Transactional emails (such as account verification and approval
            notifications) cannot be opted out of while your account is active.
          </p>
        </section>

        {/* 6 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Mapping Technology</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our member directory includes an interactive map. This map is powered by Leaflet and
            OpenStreetMap, which are open-source mapping tools. Unlike Google Maps, these
            technologies do not place cookies on your device and do not collect or transmit personal
            data to any third party.
          </p>
        </section>

        {/* 7 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">How to Control Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Since we only use essential cookies, disabling them through your browser will prevent
            you from logging in and using KW CHISPA Central. However, you have the right to manage
            cookies through your browser settings.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Instructions for managing cookies in common browsers:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside leading-relaxed mb-3">
            <li>Google Chrome: Settings → Privacy and Security → Cookies and other site data</li>
            <li>Safari: Preferences → Privacy → Manage Website Data</li>
            <li>Firefox: Options → Privacy &amp; Security → Cookies and Site Data</li>
            <li>Microsoft Edge: Settings → Privacy, search, and services → Cookies</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please note that restricting essential cookies will impair the functionality of KW
            CHISPA Central and may prevent you from logging in.
          </p>
        </section>

        {/* 8 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Third-Party Service Providers</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Our platform uses the following third-party services that may process data as part of
            their operation. These services have their own privacy and cookie policies:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
            <li>
              Supabase (database and authentication) —{" "}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                supabase.com/privacy
              </a>
            </li>
            <li>
              Netlify (web hosting) —{" "}
              <a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                netlify.com/privacy
              </a>
            </li>
            <li>
              Postmark (transactional email) —{" "}
              <a href="https://postmarkapp.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                postmarkapp.com/privacy-policy
              </a>
            </li>
            <li>
              MailerLite (newsletter email) —{" "}
              <a href="https://www.mailerlite.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                mailerlite.com/privacy-policy
              </a>
            </li>
            <li>
              Anthropic (AI chat assistant) —{" "}
              <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                anthropic.com/privacy
              </a>
            </li>
            <li>
              PayPal (payment processing) —{" "}
              <a href="https://www.paypal.com/us/legalhub/privacy-full" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                paypal.com/privacy
              </a>
            </li>
          </ul>
        </section>

        {/* 9 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Children's Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            KW CHISPA Central is intended for real estate professionals and is not directed at
            children under 13. We do not knowingly collect information from children through cookies
            or any other means.
          </p>
        </section>

        {/* 10 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Changes to This Cookie Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Cookie Policy from time to time to reflect changes in technology,
            law, or our platform. We will notify members of significant changes via email or a
            notice on the platform. The "Last Updated" date at the top of this policy reflects the
            most recent revision.
          </p>
        </section>

        {/* 11 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Contact Us</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p className="font-semibold text-foreground">KW CHISPA LLC</p>
            <p>
              Email:{" "}
              <a href="mailto:info@kwchispa.com" className="underline hover:text-foreground">
                info@kwchispa.com
              </a>
            </p>
            <p>
              Website:{" "}
              <a href="https://kw-chispa-crm.netlify.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                kw-chispa-crm.netlify.app
              </a>
            </p>
          </div>
        </section>
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

CookiePolicyPage.path = "/cookie-policy";
