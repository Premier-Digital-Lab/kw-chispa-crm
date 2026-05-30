import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Link } from "react-router";
import { Notification } from "@/components/admin/notification";
import { Error } from "@/components/admin/error";
import { Skeleton } from "@/components/ui/skeleton";

import { useConfigurationLoader } from "../root/useConfigurationLoader";
import { PendingApprovalGuard } from "../login/PendingApprovalGuard";
import Header from "./Header";
import AIChatbot from "@/components/AIChatbot";

export const Layout = ({ children }: { children: ReactNode }) => {
  useConfigurationLoader();
  return (
    <PendingApprovalGuard>
      <div className="min-h-screen flex flex-col" style={{
        background: 'var(--crm-bg-gradient)',
      }}>
        <Header />
        <main className="flex-1 max-w-screen-xl mx-auto pt-4 px-4 w-full" id="main-content">
          <ErrorBoundary FallbackComponent={Error}>
            <Suspense fallback={<Skeleton className="h-12 w-12 rounded-full" />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
        <AIChatbot />
        <footer className="mt-8 py-4 border-t text-center text-xs text-muted-foreground/60">
          <Link to="/privacy-policy" className="hover:text-muted-foreground transition-colors">Privacy Policy</Link>
          {" · "}
          <Link to="/terms-of-use" className="hover:text-muted-foreground transition-colors">Terms of Use</Link>
          {" · "}
          <Link to="/cookie-policy" className="hover:text-muted-foreground transition-colors">Cookie Policy</Link>
          {" · "}
          <Link to="/faq" className="hover:text-muted-foreground transition-colors">FAQ</Link>
        </footer>
        <Notification />
      </div>
    </PendingApprovalGuard>
  );
};
