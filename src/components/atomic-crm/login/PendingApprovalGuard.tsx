import { useEffect, type ReactNode } from "react";
import { useGetIdentity } from "ra-core";
import { useNavigate } from "react-router";

// Must stay in sync with CURRENT_SALE_CACHE_KEY in authProvider.ts
const CURRENT_SALE_CACHE_KEY = "RaStore.auth.current_sale";

/**
 * Renders children only if the authenticated user is not pending approval.
 *
 * This guard runs inside the Admin context on every authenticated route render,
 * so it catches disabled users regardless of how their session was established
 * (login form, email confirmation link, cached session, etc.).
 *
 * When a disabled user is detected, the sale cache is cleared and the user is
 * navigated to /pending-approval. The session is preserved so they can check
 * their approval status later.
 */
export const PendingApprovalGuard = ({ children }: { children: ReactNode }) => {
  const { identity, isPending } = useGetIdentity();
  const navigate = useNavigate();

  const isDisabled = !isPending && identity?.disabled === true;

  useEffect(() => {
    if (isDisabled) {
      console.log("[PendingApprovalGuard] user is disabled — redirecting to /pending-approval");
      localStorage.removeItem(CURRENT_SALE_CACHE_KEY);
      navigate("/pending-approval", { replace: true });
    }
  }, [isDisabled, navigate]);

  // Block render while identity loads or while redirect is in flight
  if (isPending || isDisabled) return null;

  return <>{children}</>;
};
