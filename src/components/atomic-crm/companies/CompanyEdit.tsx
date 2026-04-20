import { EditBase, Form, useEditContext, useGetIdentity } from "ra-core";
import { Navigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";

import type { Company } from "../types";
import { CompanyInputs } from "./CompanyInputs";
import { CompanyAside } from "./CompanyAside";
import { FormToolbar } from "../layout/FormToolbar";

export const CompanyEdit = () => (
  <EditBase
    actions={false}
    redirect="show"
    transform={(values) => {
      if (values.website && !values.website.startsWith("http")) {
        values.website = `https://${values.website}`;
      }
      return values;
    }}
  >
    <CompanyEditContent />
  </EditBase>
);

const CompanyEditContent = () => {
  const { isPending, record } = useEditContext<Company>();
  const { identity } = useGetIdentity();

  if (isPending || !record) return null;

  const isAdmin = identity?.administrator === true;
  if (!isAdmin) {
    return <Navigate to={`/companies/${record.id}/show`} replace />;
  }

  return (
    <div className="mt-2 flex gap-8">
      <Form className="flex flex-1 flex-col gap-4 pb-2">
        <Card>
          <CardContent>
            <CompanyInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>
      <CompanyAside link="show" />
    </div>
  );
};
