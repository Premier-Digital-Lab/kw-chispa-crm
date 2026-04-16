import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Notification } from "@/components/admin/notification";
import { useConfigurationContext } from "../root/ConfigurationContext";

// Mirror the cache key from authProvider so we can clear it here.
// This must stay in sync with CURRENT_SALE_CACHE_KEY in authProvider.ts.
const CURRENT_SALE_CACHE_KEY = "RaStore.auth.current_sale";

export const PendingApprovalPage = () => {
  const { darkModeLogo: logo, title } = useConfigurationContext();
  const navigate = useNavigate();

  // Clear the cached sale so checkAuth re-reads from the DB on the next
  // navigation. If the admin has approved the account, the fresh DB check
  // will show disabled = false and the user will enter the CRM normally.
  const handleCheckStatus = () => {
    localStorage.removeItem(CURRENT_SALE_CACHE_KEY);
    navigate("/");
  };

  return (
    <div className="h-screen p-8">
      <div className="flex items-center gap-4">
        <img
          src={logo}
          alt={title}
          width={24}
          className="filter brightness-0 invert"
        />
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="h-full">
        <div className="max-w-sm mx-auto h-full flex flex-col justify-center gap-6 text-center">
          <h2 className="text-2xl font-bold">
            Pending Approval
            <br />
            <span className="text-muted-foreground">Aprobación Pendiente</span>
          </h2>

          <div className="space-y-4">
            <p className="text-base">
              Your account is pending approval. An administrator will review
              your application shortly. You'll be able to access the CRM once
              approved.
            </p>
            <p className="text-base text-muted-foreground">
              Tu cuenta está pendiente de aprobación. Un administrador revisará
              tu solicitud pronto. Podrás acceder al CRM una vez que seas
              aprobado/a.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={handleCheckStatus} className="w-full">
              Check Approval Status / Verificar estado
            </Button>
            <Link to="/login" className="text-sm hover:underline">
              Back to Sign In / Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
      <Notification />
    </div>
  );
};

PendingApprovalPage.path = "/pending-approval";
