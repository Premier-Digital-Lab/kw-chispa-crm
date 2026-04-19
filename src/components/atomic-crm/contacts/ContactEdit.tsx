import { Card, CardContent } from "@/components/ui/card";
import { EditBase, Form, useEditContext, type MutationMode } from "ra-core";

import type { Contact } from "../types";
import { ContactAside } from "./ContactAside";
import { ContactInputs } from "./ContactInputs";
import { FormToolbar } from "../layout/FormToolbar";
import {
  cleanupContactForEdit,
  defaultEmailJsonb,
} from "./contactModel";

export const ContactEdit = ({
  mutationMode,
}: {
  mutationMode?: MutationMode;
}) => (
  <EditBase
    redirect="show"
    transform={(data) => {
      try {
        console.log("Transform input:", JSON.stringify(data, null, 2));
        const result = cleanupContactForEdit(data);
        console.log("Transform output:", JSON.stringify(result, null, 2));
        return result;
      } catch (e) {
        console.error("Transform error:", e);
        throw e;
      }
    }}
    mutationMode={mutationMode}
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
  if (isPending || !record) return null;
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
