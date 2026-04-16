import { email, required, useGetIdentity, useRecordContext } from "ra-core";
import { BooleanInput } from "@/components/admin/boolean-input";
import { TextInput } from "@/components/admin/text-input";
import { Badge } from "@/components/ui/badge";

import type { Sale } from "../types";

export function SalesInputs() {
  const { identity } = useGetIdentity();
  const record = useRecordContext<Sale>();
  const isSuperAdmin = record?.is_super_admin ?? false;
  return (
    <div className="space-y-4 w-full">
      {isSuperAdmin && (
        <Badge
          variant="outline"
          className="border-yellow-400 text-yellow-600 dark:border-yellow-500 dark:text-yellow-400"
        >
          👑 Super Admin
        </Badge>
      )}
      <TextInput source="first_name" validate={required()} helperText={false} />
      <TextInput source="last_name" validate={required()} helperText={false} />
      <TextInput
        source="email"
        validate={[required(), email()]}
        helperText={false}
      />
      <BooleanInput
        source="administrator"
        readOnly={isSuperAdmin || record?.id === identity?.id}
        helperText={false}
      />
      <BooleanInput
        source="disabled"
        readOnly={isSuperAdmin || record?.id === identity?.id}
        helperText={false}
      />
    </div>
  );
}
