import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "../providers/supabase/supabase";

const CURRENT_SALE_CACHE_KEY = "RaStore.auth.current_sale";

export const PendingApprovalPage = () => {
  const navigate = useNavigate();
  const supabase = getSupabaseClient();

  const handleCheckStatus = () => {
    localStorage.removeItem(CURRENT_SALE_CACHE_KEY);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 mb-10">
        <img
          src="/logo-white-transparent.png"
          alt="KW CHISPA"
          className="w-64 h-auto"
        />
        <span className="text-2xl font-semibold tracking-wide text-foreground">
          KW CHISPA Central
        </span>
      </div>

      <div className="w-full max-w-md text-center flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Pending Approval</h1>
          <p className="text-xl text-muted-foreground font-medium">Aprobación Pendiente</p>
        </div>

        <div className="flex flex-col gap-3 text-base">
          <p>
            Your account is pending approval. An administrator will review your
            application shortly. You'll be able to access KW CHISPA Central once
            approved.
          </p>
          <p className="text-muted-foreground">
            Tu cuenta está pendiente de aprobación. Un administrador revisará tu
            solicitud pronto. Podrás acceder a KW CHISPA Central una vez que seas
            aprobado/a.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleCheckStatus} className="w-full">
            Check Approval Status / Verificar estado
          </Button>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate("/login"))}
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to Sign In / Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
};

PendingApprovalPage.path = "/pending-approval";
