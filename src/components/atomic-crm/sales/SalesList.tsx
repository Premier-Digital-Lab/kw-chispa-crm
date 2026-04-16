import { useMutation } from "@tanstack/react-query";
import {
  useDataProvider,
  useNotify,
  useRecordContext,
  useRefresh,
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

import type { CrmDataProvider } from "../providers/types";
import type { Sale } from "../types";
import { TopToolbar } from "../layout/TopToolbar";

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
  const refresh = useRefresh();

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
      refresh();
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
      refresh();
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
        onClick={() => approve()}
        disabled={busy}
      >
        {isApproving ? "Approving…" : "Approve"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => reject()}
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
        <DataTable.Col source="first_name" />
        <DataTable.Col source="last_name" />
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
