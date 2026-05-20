import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useDataProvider,
  useGetList,
  useListContext,
  useNotify,
  useRecordContext,
  useTranslate,
} from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { DateField } from "@/components/admin/date-field";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SearchInput } from "@/components/admin/search-input";
import { ToggleFilterButton } from "@/components/admin/toggle-filter-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import type { CrmDataProvider } from "../providers/types";
import type { Sale } from "../types";
import { TopToolbar } from "../layout/TopToolbar";
import { DataDeletionButton } from "../misc/DataDeletionButton";

// ── Helpers for the profile popup ────────────────────────────────────────────

const ProfileField = ({
  label,
  value,
}: {
  label: string;
  value?: string | string[] | null;
}) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-0.5 text-sm">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="break-words">{display}</span>
    </div>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <div className="mt-5 mb-2">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </p>
    <Separator className="mt-1" />
  </div>
);

const MemberProfileDialog = ({
  open,
  onOpenChange,
  sale,
  contact,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sale: Sale;
  contact: Record<string, any>;
}) => {
  const primaryEmail = Array.isArray(contact.email_jsonb)
    ? contact.email_jsonb[0]?.email
    : null;

  const signupDate = sale.created_at
    ? new Date(sale.created_at).toLocaleDateString([], { dateStyle: "medium" })
    : null;

  const mcAddressParts = [
    contact.mc_street_address,
    contact.mc_suite_unit,
    contact.mc_city && contact.mc_state
      ? `${contact.mc_city}, ${contact.mc_state}`
      : contact.mc_city || contact.mc_state,
    contact.mc_zip_code,
    contact.mc_country,
  ].filter(Boolean);
  const mcAddress = mcAddressParts.length > 0 ? mcAddressParts.join(" · ") : null;

  const hasSocial =
    contact.linkedin_url ||
    contact.facebook_url ||
    contact.instagram_url ||
    contact.tiktok_url;

  const newsletterValue =
    contact.has_newsletter != null
      ? contact.has_newsletter
        ? "Subscribed"
        : "Not subscribed"
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] flex flex-col gap-0 overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="text-xl">
            {contact.first_name} {contact.last_name}
          </DialogTitle>
          {signupDate && (
            <p className="text-sm text-muted-foreground">Signed up {signupDate}</p>
          )}
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 pb-4">
          {/* Contact */}
          <SectionHeader title="Contact" />
          <div className="space-y-2">
            <ProfileField label="Email" value={primaryEmail} />
            <ProfileField label="Cell" value={contact.cell_number} />
            <ProfileField label="KW Website" value={contact.kw_website} />
          </div>

          {/* KW Info */}
          <SectionHeader title="KW Info" />
          <div className="space-y-2">
            <ProfileField label="Market Center" value={contact.market_center_name} />
            <ProfileField label="Agent Role" value={contact.agent_role} />
            <ProfileField label="Team Leader" value={contact.market_center_team_leader} />
            <ProfileField label="TL Phone" value={contact.market_center_tl_phone} />
            <ProfileField label="TL Email" value={contact.market_center_tl_email} />
            <ProfileField label="MC Address" value={mcAddress} />
          </div>

          {/* Service Areas */}
          <SectionHeader title="Service Areas" />
          <div className="space-y-2">
            <ProfileField label="Languages" value={contact.languages_spoken} />
            <ProfileField label="Cities" value={contact.cities_served} />
            <ProfileField label="Counties" value={contact.counties_served} />
            <ProfileField label="States" value={contact.states_served} />
            <ProfileField label="Countries" value={contact.countries_served} />
          </div>

          {/* Profile */}
          <SectionHeader title="Profile" />
          <div className="space-y-2">
            <ProfileField label="Gender" value={contact.gender} />
            <ProfileField label="Title" value={contact.title} />
            <ProfileField label="Background" value={contact.background} />
          </div>

          {/* Social Media — only shown if at least one field exists */}
          {hasSocial && (
            <>
              <SectionHeader title="Social Media" />
              <div className="space-y-2">
                <ProfileField label="LinkedIn" value={contact.linkedin_url} />
                <ProfileField label="Facebook" value={contact.facebook_url} />
                <ProfileField label="Instagram" value={contact.instagram_url} />
                <ProfileField label="TikTok" value={contact.tiktok_url} />
              </div>
            </>
          )}

          {/* Membership */}
          <SectionHeader title="Membership" />
          <div className="space-y-2">
            <ProfileField label="Tier" value={contact.membership_tier} />
            <ProfileField label="Newsletter" value={newsletterValue} />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <DataDeletionButton
            firstName={contact.first_name ?? ""}
            lastName={contact.last_name ?? ""}
            email={primaryEmail ?? sale.email ?? ""}
            id={sale.id}
          />
          <Button
            variant="outline"
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Name cell — opens profile popup on click ──────────────────────────────────

const NameLinkField = (_props: { label?: string | boolean }) => {
  const record = useRecordContext<Sale>();
  const [open, setOpen] = useState(false);
  const { data: contacts } = useGetList(
    "contacts",
    {
      filter: { sales_id: record?.id },
      pagination: { page: 1, perPage: 1 },
      sort: { field: "id", order: "ASC" },
    },
    { enabled: !!record?.id },
  );
  if (!record) return null;
  const name = `${record.first_name} ${record.last_name}`;
  const contact = contacts?.[0];

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="font-medium hover:underline text-left cursor-pointer"
      >
        {name}
      </button>
      {contact && (
        <MemberProfileDialog
          open={open}
          onOpenChange={setOpen}
          sale={record}
          contact={contact}
        />
      )}
    </>
  );
};

const SalesListActions = () => (
  <TopToolbar>
    <ToggleFilterButton label="Pending Approval" value={{ disabled: true }} />
    <ExportButton />
    <CreateButton label="resources.sales.action.new" />
  </TopToolbar>
);

const filters = [<SearchInput source="q" alwaysOn />];

const OptionsField = (_props: { label?: string | boolean }) => {
  const record = useRecordContext();
  const translate = useTranslate();
  if (!record) return null;
  return (
    <div className="flex flex-row gap-1">
      {record.is_super_admin && (
        <Badge
          variant="outline"
          className="border-yellow-400 text-yellow-600 dark:border-yellow-500 dark:text-yellow-400"
        >
          👑 Super Admin
        </Badge>
      )}
      {record.administrator && (
        <Badge
          variant="outline"
          className="border-blue-300 dark:border-blue-700"
        >
          {translate("resources.sales.fields.administrator")}
        </Badge>
      )}
      {record.disabled && (
        <Badge
          variant="outline"
          className="border-orange-300 dark:border-orange-700"
        >
          {translate("resources.sales.fields.disabled")}
        </Badge>
      )}
    </div>
  );
};

const PendingActions = (_props: { label?: string | boolean }) => {
  const record = useRecordContext<Sale>();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { refetch } = useListContext();

  const { mutate: approve, isPending: isApproving } = useMutation({
    // Only send the fields that actually need to change for approval.
    // Omitting email/first_name/last_name avoids triggering a Supabase Auth
    // email re-verification flow for self-registered users (who signed up via
    // signUp(), not via admin invite), which would cause updateUserById to fail.
    mutationFn: () =>
      dataProvider.salesUpdate(record!.id, {
        disabled: false,
        administrator: record!.administrator,
      }),
    onSuccess: () => {
      notify("Member approved!", { type: "success" });
      queryClient.invalidateQueries({ queryKey: ["sales", "getList"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      refetch();
    },
    onError: (error) => {
      console.error("[PendingActions] approve failed:", error);
      notify("Failed to approve member", { type: "error" });
    },
  });

  const { mutate: reject, isPending: isRejecting } = useMutation({
    mutationFn: async () => {
      // Find the linked contact row and mark it as Inactive.
      // We don't change sales.disabled — rejection preserves the login block
      // so the member cannot access the CRM.
      const { data: contacts } = await dataProvider.getList("contacts", {
        filter: { sales_id: (record as any).id },
        pagination: { page: 1, perPage: 1 },
        sort: { field: "id", order: "ASC" },
      });
      if (contacts.length > 0) {
        await dataProvider.update("contacts", {
          id: contacts[0].id,
          data: { member_status: "Inactive" },
          previousData: contacts[0],
        });
      }
    },
    onSuccess: () => {
      notify("Member rejected", { type: "info" });
      queryClient.invalidateQueries({ queryKey: ["sales", "getList"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      refetch();
    },
    onError: (error) => {
      console.error("[PendingActions] reject failed:", error);
      notify("Failed to reject member", { type: "error" });
    },
  });

  if (!record?.disabled) return null;

  const busy = isApproving || isRejecting;

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={(e) => { e.stopPropagation(); approve(); }}
        disabled={busy}
      >
        {isApproving ? "Approving…" : "Approve"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => { e.stopPropagation(); reject(); }}
        disabled={busy}
      >
        {isRejecting ? "Rejecting…" : "Reject"}
      </Button>
    </div>
  );
};

export function SalesList() {
  return (
    <List
      filters={filters}
      actions={<SalesListActions />}
      sort={{ field: "first_name", order: "ASC" }}
    >
      <DataTable>
        <DataTable.Col source="first_name" label="resources.sales.fields.first_name">
          <NameLinkField />
        </DataTable.Col>
        <DataTable.Col source="email" />
        <DataTable.Col source="created_at" label="Signup Date">
          <DateField source="created_at" />
        </DataTable.Col>
        <DataTable.Col label={false}>
          <OptionsField />
        </DataTable.Col>
        <DataTable.Col label={false}>
          <PendingActions />
        </DataTable.Col>
      </DataTable>
    </List>
  );
}
