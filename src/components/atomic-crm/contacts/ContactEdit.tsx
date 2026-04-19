import { Component } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EditBase, Form, useEditContext } from "ra-core";

import type { Contact } from "../types";
import { ContactInputs } from "./ContactInputs";
import { FormToolbar } from "../layout/FormToolbar";
import {
  cleanupContactForEdit,
  defaultEmailJsonb,
} from "./contactModel";

class ErrorBoundary extends Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) {
    console.error("CAUGHT ERROR:", error);
    console.error("COMPONENT STACK:", info.componentStack);
  }
  render() {
    if (this.state.error) {
      return <pre style={{color: "red", padding: 20, whiteSpace: "pre-wrap"}}>
        ERROR: {this.state.error.message}{"\n\n"}
        STACK: {this.state.error.stack}
      </pre>;
    }
    return this.props.children;
  }
}

export const ContactEdit = () => (
  <ErrorBoundary>
    <EditBase redirect="show" mutationMode="pessimistic" transform={cleanupContactForEdit}>
      <ContactEditContent />
    </EditBase>
  </ErrorBoundary>
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
    </div>
  );
};
