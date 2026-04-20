import { useState } from "react";
import type { ReactNode } from "react";
import {
  CanAccess,
  InfiniteListBase,
  RecordRepresentation,
  ShowBase,
  useCanAccess,
  useGetIdentity,
  useShowContext,
  useTranslate,
} from "ra-core";
import type { ShowBaseProps } from "ra-core";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router";

import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { CompanyAvatar } from "../companies/CompanyAvatar";
import { NoteCreate, NotesIterator, NotesIteratorMobile } from "../notes";
import { NoteCreateSheet } from "../notes/NoteCreateSheet";
import { TagsListEdit } from "./TagsListEdit";
import { ContactEditSheet } from "./ContactEditSheet";
import { ContactPersonalInfo } from "./ContactPersonalInfo";
import { ContactBackgroundInfo } from "./ContactBackgroundInfo";
import { ContactTasksList } from "./ContactTasksList";
import type { Contact } from "../types";
import { Avatar } from "./Avatar";
import { ContactAside } from "./ContactAside";
import { MobileBackButton } from "../misc/MobileBackButton";

export const ContactShow = (props: ShowBaseProps = {}) => {
  const isMobile = useIsMobile();

  return (
    <ShowBase
      queryOptions={{
        onError: isMobile
          ? () => {
              {
                /** Disable error notification as the content handles offline */
              }
            }
          : undefined,
      }}
      {...props}
    >
      {isMobile ? <ContactShowContentMobile /> : <ContactShowContent />}
    </ShowBase>
  );
};

const ContactShowContentMobile = () => {
  const translate = useTranslate();
  const { defaultTitle, record, isPending } = useShowContext<Contact>();
  const [noteCreateOpen, setNoteCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { canAccess: canSeeNotes } = useCanAccess({
    resource: "contact_notes",
    action: "list",
  });
  const { identity } = useGetIdentity();
  const isAdmin = identity?.administrator === true;
  const isOwnProfile = record?.sales_id === identity?.id;
  const canEdit = isAdmin || isOwnProfile;

  if (isPending || !record) return null;

  const taskCount = record.nb_tasks ?? 0;

  return (
    <>
      {/* We need to repeat the note creation sheet here to support the note
      create button that is rendered when there are no notes. */}
      {canSeeNotes && (
        <NoteCreateSheet
          open={noteCreateOpen}
          onOpenChange={setNoteCreateOpen}
          contact_id={record.id}
        />
      )}
      {canEdit && (
        <ContactEditSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          contactId={record.id}
        />
      )}
      <MobileHeader>
        <MobileBackButton />
        <div className="flex flex-1 min-w-0">
          <Link to="/contacts" className="flex-1 min-w-0">
            <h1 className="truncate text-xl font-semibold">{defaultTitle}</h1>
          </Link>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={translate("ra.action.edit")}
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-5" />
          </Button>
        )}
      </MobileHeader>
      <MobileContent>
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Avatar />
            <div className="mx-3 flex-1">
              <h2 className="text-2xl font-bold">
                <RecordRepresentation />
              </h2>
              <div className="text-sm text-muted-foreground">
                {record.title && record.company_id != null
                  ? `${translate("resources.contacts.position_at", {
                      title: record.title,
                    })} `
                  : record.title}
                {record.company_id != null && (
                  <ReferenceField
                    source="company_id"
                    reference="companies"
                    link="show"
                  >
                    <TextField source="name" className="underline" />
                  </ReferenceField>
                )}
              </div>
            </div>
            <div>
              <ReferenceField
                source="company_id"
                reference="companies"
                link="show"
                className="no-underline"
              >
                <CompanyAvatar />
              </ReferenceField>
            </div>
          </div>
        </div>

        <Tabs defaultValue={canSeeNotes ? "notes" : "details"} className="w-full">
          <TabsList className={`grid w-full h-10 ${canSeeNotes ? "grid-cols-3" : "grid-cols-2"}`}>
            {canSeeNotes && (
              <TabsTrigger value="notes">
                {translate("resources.notes.name", { smart_count: 2 })}
              </TabsTrigger>
            )}
            <TabsTrigger value="tasks">
              {translate("crm.common.task_count", {
                smart_count: taskCount ?? 0,
              })}
            </TabsTrigger>
            <TabsTrigger value="details">
              {translate("crm.common.details")}
            </TabsTrigger>
          </TabsList>

          {canSeeNotes && (
            <TabsContent value="notes" className="mt-2">
              <InfiniteListBase
                resource="contact_notes"
                filter={{ contact_id: record.id }}
                sort={{ field: "date", order: "DESC" }}
                perPage={25}
                disableSyncWithLocation
                storeKey={false}
                empty={
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      {translate("resources.notes.empty")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setNoteCreateOpen(true)}
                    >
                      {translate("resources.notes.action.add")}
                    </Button>
                  </div>
                }
                loading={false}
                error={false}
                queryOptions={{
                  onError: () => {
                    /** override to hide notification as error case is handled by NotesIteratorMobile */
                  },
                }}
              >
                <NotesIteratorMobile contactId={record.id} showStatus />
              </InfiniteListBase>
            </TabsContent>
          )}

          <TabsContent value="tasks" className="mt-4">
            <ContactTasksList />
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">
                  {translate(
                    "resources.contacts.field_categories.personal_info",
                  )}
                </h3>
                <Separator />
                <div className="mt-3">
                  <ContactPersonalInfo />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {translate(
                    "resources.contacts.field_categories.background_info",
                  )}
                </h3>
                <Separator />
                <div className="mt-3">
                  <ContactBackgroundInfo />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {translate("resources.tags.name", { smart_count: 2 })}
                </h3>
                <Separator />
                <div className="mt-3">
                  <TagsListEdit />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </MobileContent>
    </>
  );
};

const ReadOnlyRow = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="text-muted-foreground min-w-36 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
};

const ReadOnlySection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div>
    <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>
    <Separator className="mb-3" />
    <div>{children}</div>
  </div>
);

const ContactReadOnlyProfile = ({ record }: { record: Contact }) => {
  const translate = useTranslate();

  const mcAddressParts = [
    record.mc_street_address,
    record.mc_suite_unit,
    record.mc_city,
    record.mc_state,
    record.mc_zip_code,
    record.mc_country,
  ]
    .filter(Boolean)
    .join(", ");

  const formatArray = (arr: string[] | null | undefined) =>
    arr && arr.length > 0 ? arr.join(", ") : null;

  const hasPersonalInfo =
    record.cell_number ||
    record.email_jsonb?.length > 0 ||
    record.linkedin_url ||
    record.facebook_url ||
    record.instagram_url ||
    record.tiktok_url;

  const hasKwInfo =
    record.market_center_name ||
    record.agent_role ||
    record.market_center_team_leader ||
    record.market_center_tl_email ||
    record.market_center_tl_phone ||
    mcAddressParts;

  const hasServiceAreas =
    formatArray(record.languages_spoken) ||
    formatArray(record.cities_served) ||
    formatArray(record.counties_served) ||
    formatArray(record.countries_served);

  return (
    <div className="mt-4 space-y-6">
      {hasServiceAreas && (
        <ReadOnlySection
          title={translate("resources.contacts.field_categories.service_areas")}
        >
          <ReadOnlyRow
            label={translate("resources.contacts.fields.languages_spoken")}
            value={formatArray(record.languages_spoken)}
          />
          <ReadOnlyRow
            label={translate("resources.contacts.fields.cities_served")}
            value={formatArray(record.cities_served)}
          />
          <ReadOnlyRow
            label={translate("resources.contacts.fields.counties_served")}
            value={formatArray(record.counties_served)}
          />
          <ReadOnlyRow
            label={translate("resources.contacts.fields.countries_served")}
            value={formatArray(record.countries_served)}
          />
        </ReadOnlySection>
      )}

      {hasPersonalInfo && (
        <ReadOnlySection
          title={translate("resources.contacts.field_categories.personal_info")}
        >
          <ReadOnlyRow
            label={translate("resources.contacts.fields.cell_number")}
            value={record.cell_number}
          />
          {record.email_jsonb?.map((entry, i) => (
            <div key={i} className="flex gap-2 py-1 text-sm">
              <span className="text-muted-foreground min-w-36 shrink-0">
                {translate("resources.contacts.fields.email")}
                {record.email_jsonb.length > 1 ? ` ${i + 1}` : ""}
              </span>
              <a
                href={`mailto:${entry.email}`}
                className="underline hover:no-underline"
              >
                {entry.email}
              </a>
            </div>
          ))}
          {record.linkedin_url && (
            <div className="flex gap-2 py-1 text-sm">
              <span className="text-muted-foreground min-w-36 shrink-0">LinkedIn</span>
              <a
                href={record.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                {record.linkedin_url}
              </a>
            </div>
          )}
          {record.facebook_url && (
            <div className="flex gap-2 py-1 text-sm">
              <span className="text-muted-foreground min-w-36 shrink-0">Facebook</span>
              <a
                href={record.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                {record.facebook_url}
              </a>
            </div>
          )}
          {record.instagram_url && (
            <div className="flex gap-2 py-1 text-sm">
              <span className="text-muted-foreground min-w-36 shrink-0">Instagram</span>
              <a
                href={record.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                {record.instagram_url}
              </a>
            </div>
          )}
          {record.tiktok_url && (
            <div className="flex gap-2 py-1 text-sm">
              <span className="text-muted-foreground min-w-36 shrink-0">TikTok</span>
              <a
                href={record.tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                {record.tiktok_url}
              </a>
            </div>
          )}
        </ReadOnlySection>
      )}

      {hasKwInfo && (
        <ReadOnlySection
          title={translate("resources.contacts.field_categories.kw_info")}
        >
          <ReadOnlyRow
            label={translate("resources.contacts.fields.market_center_name")}
            value={record.market_center_name}
          />
          <ReadOnlyRow
            label={translate("resources.contacts.fields.agent_role")}
            value={record.agent_role}
          />
          <ReadOnlyRow
            label={translate("resources.contacts.fields.market_center_team_leader")}
            value={record.market_center_team_leader}
          />
          <ReadOnlyRow
            label={translate("resources.contacts.fields.market_center_tl_email")}
            value={record.market_center_tl_email}
          />
          <ReadOnlyRow
            label={translate("resources.contacts.fields.market_center_tl_phone")}
            value={record.market_center_tl_phone}
          />
          <ReadOnlyRow
            label={translate("resources.contacts.field_categories.mc_address")}
            value={mcAddressParts || null}
          />
        </ReadOnlySection>
      )}

      {record.background && (
        <ReadOnlySection
          title={translate("resources.contacts.field_categories.background_info")}
        >
          <p className="text-sm">{record.background}</p>
        </ReadOnlySection>
      )}
    </div>
  );
};

const ContactShowContent = () => {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { record, isPending } = useShowContext<Contact>();
  const { identity } = useGetIdentity();
  if (isPending || !record) return null;

  const isAdmin = identity?.administrator === true;
  const isOwnProfile = record.sales_id === identity?.id;
  const canEdit = isAdmin || isOwnProfile;

  const hasSearchResults = (() => {
    try {
      return !!sessionStorage.getItem("find-agent-search-state");
    } catch {
      return false;
    }
  })();
  const showReturnLink = !canEdit && hasSearchResults;

  const companyLink = canEdit ? "show" : false;

  const identityHeader = (
    <div className="flex">
      <Avatar />
      <div className="ml-2 flex-1">
        <h5 className="text-xl font-semibold">
          <RecordRepresentation />
        </h5>
        <div className="inline-flex text-sm text-muted-foreground">
          {record.title && record.company_id != null
            ? `${translate("resources.contacts.position_at", {
                title: record.title,
              })} `
            : record.title}
          {record.company_id != null && (
            <ReferenceField
              source="company_id"
              reference="companies"
              link={companyLink}
            >
              &nbsp;
              <TextField source="name" />
            </ReferenceField>
          )}
        </div>
      </div>
      <div>
        <ReferenceField
          source="company_id"
          reference="companies"
          link={companyLink}
          className="no-underline"
        >
          <CompanyAvatar />
        </ReferenceField>
      </div>
    </div>
  );

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        {showReturnLink && (
          <button
            type="button"
            onClick={() => navigate("/find-agent")}
            className="text-sm text-muted-foreground hover:text-foreground mb-3 block"
          >
            {translate("crm.find_agent.return_to_results")}
          </button>
        )}
        <Card>
          <CardContent>
            {identityHeader}
            {canEdit ? (
              <CanAccess resource="contact_notes" action="list">
                <InfiniteListBase
                  resource="contact_notes"
                  filter={{ contact_id: record.id }}
                  sort={{ field: "date", order: "DESC" }}
                  perPage={25}
                  disableSyncWithLocation
                  storeKey={false}
                  empty={
                    <NoteCreate reference="contacts" showStatus className="mt-4" />
                  }
                >
                  <NotesIterator reference="contacts" showStatus />
                </InfiniteListBase>
              </CanAccess>
            ) : (
              <ContactReadOnlyProfile record={record} />
            )}
          </CardContent>
        </Card>
      </div>
      <ContactAside />
    </div>
  );
};
