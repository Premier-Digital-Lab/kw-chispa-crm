import { useCanAccess, useGetList } from "ra-core";
import { Link } from "react-router";
import { UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { Contact, ContactNote } from "../types";
import { DashboardActivityLog } from "./DashboardActivityLog";
import { DashboardStepper } from "./DashboardStepper";
import { DealsChart } from "./DealsChart";
import { TasksList } from "./TasksList";
import { Welcome } from "./Welcome";

/**
 * Shown only to admins when there are self-registered members waiting for approval.
 * Links directly to the Users list with the "Pending Approval" filter pre-applied.
 */
const PendingApprovalsCard = () => {
  const { canAccess: isAdmin, isPending: isPendingAccess } = useCanAccess({
    resource: "sales",
    action: "list",
  });

  const { total, isPending: isPendingCount } = useGetList(
    "sales",
    {
      filter: { disabled: true },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !isPendingAccess && isAdmin },
  );

  // Hide while loading, hide for non-admins, hide when nothing is pending
  if (isPendingAccess || isPendingCount || !isAdmin || !total) return null;

  const filterParam = encodeURIComponent(JSON.stringify({ disabled: true }));

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
    isPendingCanSeeNotes ||
    isPendingContact ||
    (canSeeNotes && isPendingContactNotes) ||
    isPendingDeal;

  if (isPending) {
    return null;
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
          <DashboardActivityLog />
        </div>
      </div>

      <div className="md:col-span-3">
        <div className="flex flex-col gap-6">
          <PendingApprovalsCard />
          <TasksList />
        </div>
      </div>
    </div>
  );
};
