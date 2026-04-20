import { Card, CardContent } from "@/components/ui/card";
import { EditBase, Form, useEditContext, useGetIdentity } from "ra-core";
import { Navigate } from "react-router";

import type { Contact } from "../types";
import { ContactAside } from "./ContactAside";
import { ContactInputs } from "./ContactInputs";
import { FormToolbar } from "../layout/FormToolbar";
import {
  cleanupContactForEdit,
  defaultEmailJsonb,
} from "./contactModel";

export const ContactEdit = () => (
  <EditBase
    redirect="show"
    mutationMode="pessimistic"
    transform={cleanupContactForEdit}
  >
    <ContactEditContent />
  </EditBase>
);

const normalizeContactArrayFields = (record: Contact) => ({
  ...record,
  email_jsonb:
    record.email_jsonb && record.email_jsonb.length > 0
      ? record.email_jsonb
      : defaultEmailJsonb,
});

const ContactEditContent = () => {
  const { isPending, record } = useEditContext<Contact>();
  const { identity } = useGetIdentity();

  if (isPending || !record) return null;

  const isAdmin = identity?.administrator === true;
  const isOwnProfile = record.sales_id === identity?.id;

  if (!isAdmin && !isOwnProfile) {
    return <Navigate to={`/contacts/${record.id}/show`} replace />;
  }

  return (
    <div className="mt-2 flex gap-8">
      <Form
        className="flex flex-1 flex-col gap-4"
        record={normalizeContactArrayFields(record)}
      >
        <Card>
          <CardContent>
            <ContactInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>
      <ContactAside link="show" />
    </div>
  );
};
