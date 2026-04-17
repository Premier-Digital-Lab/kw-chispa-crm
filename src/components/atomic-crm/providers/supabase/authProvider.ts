import type { AuthProvider } from "ra-core";
import { supabaseAuthProvider } from "ra-supabase-core";

import { canAccess } from "../commons/canAccess";
import { getSupabaseClient } from "./supabase";

const getBaseAuthProvider = () =>
  supabaseAuthProvider(getSupabaseClient(), {
    getIdentity: async () => {
      const sale = await getSale();

      if (sale == null) {
        throw new Error();
      }

      return {
        id: sale.id,
        fullName: `${sale.first_name} ${sale.last_name}`,
        avatar: sale.avatar?.src,
        disabled: sale.disabled,
        administrator: sale.administrator,
      };
    },
  });

// To speed up checks, we cache the initialization state
// and the current sale in the local storage. They are cleared on logout.
const IS_INITIALIZED_CACHE_KEY = "RaStore.auth.is_initialized";
const CURRENT_SALE_CACHE_KEY = "RaStore.auth.current_sale";

function getLocalStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export async function getIsInitialized() {
  const storage = getLocalStorage();
  const cachedValue = storage?.getItem(IS_INITIALIZED_CACHE_KEY);
  if (cachedValue != null) {
    return cachedValue === "true";
  }

  const { data } = await getSupabaseClient()
    .from("init_state")
    .select("is_initialized");
  const isInitialized = data?.at(0)?.is_initialized > 0;

  if (isInitialized) {
    storage?.setItem(IS_INITIALIZED_CACHE_KEY, "true");
  }

  return isInitialized;
}

const getSale = async () => {
  const storage = getLocalStorage();
  const cachedValue = storage?.getItem(CURRENT_SALE_CACHE_KEY);
  if (cachedValue != null) {
    return JSON.parse(cachedValue);
  }

  const { data: dataSession, error: errorSession } =
    await getSupabaseClient().auth.getSession();

  // Shouldn't happen after login but just in case
  if (dataSession?.session?.user == null || errorSession) {
    return undefined;
  }

  const { data: dataSale, error: errorSale } = await getSupabaseClient()
    .from("sales")
    .select("id, first_name, last_name, avatar, administrator, disabled")
    .match({ user_id: dataSession?.session?.user.id })
    .single();

  // Shouldn't happen either as all users are sales but just in case
  if (dataSale == null || errorSale) {
    return undefined;
  }

  storage?.setItem(CURRENT_SALE_CACHE_KEY, JSON.stringify(dataSale));
  return dataSale;
};

function clearCache() {
  const storage = getLocalStorage();
  storage?.removeItem(IS_INITIALIZED_CACHE_KEY);
  storage?.removeItem(CURRENT_SALE_CACHE_KEY);
}

function clearSaleCache() {
  getLocalStorage()?.removeItem(CURRENT_SALE_CACHE_KEY);
}

// When a pending-approval redirect is in flight, the LogoutOnMount component
// (rendered by CoreAdminRoutes when authenticated=false) will call logout().
// We intercept that call to skip supabase.auth.signOut() so the user keeps their
// session and we can redirect them to /pending-approval instead of /login.
let _pendingApprovalRedirectInFlight = false;

export const getAuthProvider = (): AuthProvider => {
  const baseAuthProvider = getBaseAuthProvider();
  return {
    ...baseAuthProvider,
    login: async (params) => {
      if (params.ssoDomain) {
        const { error } = await getSupabaseClient().auth.signInWithSSO({
          domain: params.ssoDomain,
        });
        if (error) {
          throw error;
        }
        return;
      }
      await baseAuthProvider.login(params);

      // After successful login, check immediately if the user is pending approval.
      // Returning { redirectTo } lets useLogin navigate there directly without
      // going through the checkAuth/LogoutOnMount cycle.
      const sale = await getSale();
      if (sale?.disabled) {
        clearSaleCache();
        return { redirectTo: "/pending-approval" };
      }
    },
    logout: async (params) => {
      // If a pending-approval redirect triggered this logout (via LogoutOnMount),
      // skip signing the user out so they keep their session for the status check.
      if (_pendingApprovalRedirectInFlight) {
        _pendingApprovalRedirectInFlight = false;
        return "/pending-approval";
      }
      clearCache();
      return baseAuthProvider.logout(params);
    },
    checkAuth: async (params) => {
      const isExemptPath = (path: string) =>
        window.location.pathname === path ||
        window.location.hash.includes(`#${path}`);

      // These pages are accessible without passing the full auth gate
      if (
        isExemptPath("/set-password") ||
        isExemptPath("/forgot-password") ||
        isExemptPath("/sign-up") ||
        isExemptPath("/pending-approval")
      ) {
        return;
      }

      const isInitialized = await getIsInitialized();

      if (!isInitialized) {
        await getSupabaseClient().auth.signOut();
        throw {
          redirectTo: "/sign-up",
          message: false,
        };
      }

      // Block self-registered members who haven't been approved yet.
      // Their sales row has disabled = true until an admin approves them.
      // Set the flag so our logout() override skips supabase.auth.signOut(),
      // keeping the session alive for the post-approval status check.
      const sale = await getSale();
      if (sale?.disabled) {
        clearSaleCache();
        _pendingApprovalRedirectInFlight = true;
        throw {
          redirectTo: "/pending-approval",
          message: false,
        };
      }

      return baseAuthProvider.checkAuth(params);
    },
    canAccess: async (params) => {
      const isInitialized = await getIsInitialized();
      if (!isInitialized) return false;

      // Get the current user
      const sale = await getSale();
      if (sale == null) return false;

      // Compute access rights from the sale role
      const role = sale.administrator ? "admin" : "user";
      return canAccess(role, params);
    },
    getAuthorizationDetails(authorizationId: string) {
      return getSupabaseClient().auth.oauth.getAuthorizationDetails(
        authorizationId,
      );
    },
    approveAuthorization(authorizationId: string) {
      return getSupabaseClient().auth.oauth.approveAuthorization(
        authorizationId,
      );
    },
    denyAuthorization(authorizationId: string) {
      return getSupabaseClient().auth.oauth.denyAuthorization(authorizationId);
    },
  };
};
