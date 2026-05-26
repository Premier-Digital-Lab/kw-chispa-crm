import { useQuery } from "@tanstack/react-query";
import { useCanAccess, useGetIdentity, useGetList, useTranslate } from "ra-core";
import { Link, useNavigate } from "react-router";
import { MessageCircle, UserCheck, AlertTriangle } from "lucide-react";
import { useProfileComplete } from "../hooks/useProfileComplete";

import { getSupabaseClient } from "@/components/atomic-crm/providers/supabase/supabase";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { Contact, ContactNote } from "../types";
import { DashboardStepper } from "./DashboardStepper";
import { DealsChart } from "./DealsChart";
import { SendNewsletterButton } from "./SendNewsletterButton";
import { TasksList } from "./TasksList";
import { UpcomingEvents } from "./UpcomingEvents";
import { RecurringEvents } from "../events/RecurringEvents";
import { Welcome } from "./Welcome";

const ProfileIncompleteBanner = () => {
  const { isComplete, isLoading, authUserId } = useProfileComplete();
  const translate = useTranslate();
  const navigate = useNavigate();

  if (isLoading || isComplete) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-500 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-300">
      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">
          {translate("crm.profileCompletion.banner_title", {
            _: "Your profile is incomplete. Please complete your profile to access all features of KW CHISPA Central.",
          })}
        </p>
        <p className="text-sm mt-1 text-red-700 dark:text-red-400">
          {translate("crm.profileCompletion.banner_title_es", {
            _: "Tu perfil está incompleto. Por favor completa tu perfil para acceder a todas las funciones de KW CHISPA Central.",
          })}
        </p>
      </div>
      {authUserId && (
        <button
          onClick={() => navigate('/profile')}
          className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <span className="block">
            {translate("crm.profileCompletion.complete_profile", {
              _: "Complete Profile",
            })}
          </span>
          <span className="block text-red-200">
            {translate("crm.profileCompletion.complete_profile_es", {
              _: "Completar perfil",
            })}
          </span>
        </button>
      )}
    </div>
  );
};

/**
 * Shown to approved non-admin members in place of the admin dashboard.
 * Directs them to use the chat assistant to search for other members.
 */
const MemberWelcomeDashboard = () => (
  <div className="max-w-lg mx-auto mt-16 flex flex-col items-center gap-6 text-center px-4">
    <MessageCircle className="w-12 h-12 text-muted-foreground" />
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-bold">Welcome to KW CHISPA!</h2>
      <p className="text-muted-foreground text-base">
        ¡Bienvenido/a a KW CHISPA!
      </p>
    </div>
    <Card className="p-6 w-full text-left">
      <p className="text-sm mb-2">
        Use the chat assistant to search for members by city, state, language,
        or Market Center.
      </p>
      <p className="text-sm text-muted-foreground">
        Usa el asistente de chat para buscar miembros por ciudad, estado,
        idioma o Market Center.
      </p>
    </Card>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Click the chat bubble in the bottom-right corner to get started</span>
      <span>→</span>
    </div>
  </div>
);

/**
 * Shown only to admins when there are self-registered members waiting for approval.
 * Links directly to the Users list with the "Pending Approval" filter pre-applied.
 */
const PendingApprovalsCard = () => {
  const { canAccess: isAdmin, isPending: isPendingAccess } = useCanAccess({
    resource: "sales",
    action: "list",
  });

  const { data: total, isPending: isPendingCount } = useQuery({
    queryKey: ["pending-approvals-count"],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { count } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("disabled", true)
        .eq("review_status", "pending");
      return count ?? 0;
    },
    enabled: !isPendingAccess && isAdmin,
    refetchInterval: 3000,
    staleTime: 0,
  });

  // Hide while loading, hide for non-admins, hide when nothing is pending
  if (isPendingAccess || isPendingCount || !isAdmin || !total) return null;

  const filterParam = encodeURIComponent(JSON.stringify({ disabled: true, review_status: "pending" }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="mr-3 flex">
          <UserCheck className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground flex-1">
          Pending Approvals
        </h2>
        <span className="text-2xl font-bold">{total}</span>
      </div>
      <Card className="p-4 mb-2">
        <p className="text-sm text-muted-foreground mb-3">
          {total === 1
            ? "1 member is waiting for approval."
            : `${total} members are waiting for approval.`}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/sales?filter=${filterParam}`}>Review members</Link>
        </Button>
      </Card>
    </div>
  );
};

export const Dashboard = () => {
  const { identity, isPending: isPendingIdentity } = useGetIdentity();
  const { canAccess: canSeeNotes, isPending: isPendingCanSeeNotes } =
    useCanAccess({ resource: "contact_notes", action: "list" });

  const {
    data: dataContact,
    total: totalContact,
    isPending: isPendingContact,
  } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 1 },
  });

  const { total: totalContactNotes, isPending: isPendingContactNotes } =
    useGetList<ContactNote>(
      "contact_notes",
      { pagination: { page: 1, perPage: 1 } },
      { enabled: canSeeNotes },
    );

  const { total: totalDeal, isPending: isPendingDeal } = useGetList<Contact>(
    "deals",
    {
      pagination: { page: 1, perPage: 1 },
    },
  );

  const isPending =
    isPendingIdentity ||
    isPendingCanSeeNotes ||
    isPendingContact ||
    (canSeeNotes && isPendingContactNotes) ||
    isPendingDeal;

  if (isPending) {
    return null;
  }

  // Non-admin members see a simplified welcome page that directs them to the chat assistant.
  if (!identity?.administrator) {
    return (
      <div className="flex flex-col gap-6 mt-1">
        <ProfileIncompleteBanner />
        <MemberWelcomeDashboard />
        <UpcomingEvents />
        <RecurringEvents />
      </div>
    );
  }

  if (!totalContact) {
    return <DashboardStepper step={1} />;
  }

  if (canSeeNotes && !totalContactNotes) {
    return <DashboardStepper step={2} contactId={dataContact?.[0]?.id} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-1">
      <div className="md:col-span-9">
        <div className="flex flex-col gap-6">
          {import.meta.env.VITE_IS_DEMO === "true" ? <Welcome /> : null}
          {totalDeal ? <DealsChart /> : null}
          <UpcomingEvents />
          <RecurringEvents />
        </div>
      </div>

      <div className="md:col-span-3">
        <div className="flex flex-col gap-6">
          <PendingApprovalsCard />
          <SendNewsletterButton />
          <TasksList />
        </div>
      </div>
    </div>
  );
};
