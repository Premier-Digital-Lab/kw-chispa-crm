import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
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
      <div className="min-h-screen" style={{
        background: 'var(--crm-bg-gradient)',
      }}>
      <Header />
      <main className="max-w-screen-xl mx-auto pt-4 px-4" id="main-content">
        <ErrorBoundary FallbackComponent={Error}>
          <Suspense fallback={<Skeleton className="h-12 w-12 rounded-full" />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
      <AIChatbot />
      <Notification />
      </div>
    </PendingApprovalGuard>
  );
};
