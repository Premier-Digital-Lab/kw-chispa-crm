import {
  email,
  FieldTitle,
  required,
  useInput,
  useResourceContext,
  useTranslate,
} from "ra-core";
import type { InputProps } from "ra-core";
import type { ClipboardEventHandler, FocusEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BooleanInput } from "@/components/admin/boolean-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";
import { SelectInput } from "@/components/admin/select-input";
import { ArrayInput } from "@/components/admin/array-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";
import { DateInput } from "@/components/admin/date-input";
import {
  FormControl,
  FormError,
  FormField,
  FormLabel,
} from "@/components/admin/form";
import { InputHelperText } from "@/components/admin/input-helper-text";

import { isLinkedinUrl } from "../misc/isLinkedInUrl";
import { isValidUrl } from "../misc/isValidUrl";
import type { Sale } from "../types";
import ImageEditorField from "../misc/ImageEditorField";
import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput.tsx";
import {
  contactGender,
  translateContactGenderLabel,
  translatePersonalInfoTypeLabel,
} from "./contactModel.ts";

// Which tab each validated field belongs to — used to auto-switch on error.
const FIELD_TO_TAB: Record<string, string> = {
  first_name: "identity",
  last_name: "identity",
  cell_number: "identity",
  email_jsonb: "identity",
  background: "identity",
  gender: "identity",
  title: "identity",
  company_id: "identity",
  linkedin_url: "social_media",
  facebook_url: "social_media",
  instagram_url: "social_media",
  tiktok_url: "social_media",
  market_center_name: "kw_info",
  agent_role: "kw_info",
  market_center_team_leader: "kw_info",
  market_center_tl_phone: "kw_info",
  market_center_tl_email: "kw_info",
  mc_street_number: "kw_info",
  mc_street_name: "kw_info",
  mc_suite_unit: "kw_info",
  mc_city: "kw_info",
  mc_state: "kw_info",
  mc_zip_code: "kw_info",
  mc_country: "kw_info",
  languages_spoken: "service_areas",
  cities_served: "service_areas",
  counties_served: "service_areas",
  states_served: "service_areas",
  countries_served: "service_areas",
  membership_tier: "membership",
  join_date: "membership",
  member_status: "membership",
  has_newsletter: "membership",
  sales_id: "membership",
};

const TAB_ORDER = [
  "identity",
  "social_media",
  "kw_info",
  "service_areas",
  "membership",
] as const;

// Edits a Postgres text[] column via a plain text input showing comma-separated
// values. Local state tracks the displayed string character-by-character so
// typing is never destructive. The array is only written to form state on blur,
// which is also when validation runs.
export const CommaSeparatedInput = ({
  source,
  label,
  validate,
  helperText,
  className,
}: {
  source: string;
  label?: InputProps["label"];
  validate?: InputProps["validate"];
  helperText?: InputProps["helperText"];
  className?: string;
}) => {
  const resource = useResourceContext();
  // No format/parse — keep the raw array in form state.
  const { field, id, isRequired } = useInput({ source, validate });

  const arrayToDisplay = (v: string[] | null | undefined) =>
    Array.isArray(v) && v.length > 0 ? v.join(", ") : "";

  const [displayValue, setDisplayValue] = useState(() =>
    arrayToDisplay(field.value),
  );

  // Track whether the input is currently focused so we don't clobber what the
  // user is typing when field.value changes from an external reset.
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setDisplayValue(arrayToDisplay(field.value));
    }
  }, [field.value]);

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleBlur = () => {
    isFocused.current = false;
    const arr = displayValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    field.onChange(arr.length > 0 ? arr : null);
    field.onBlur?.();
  };

  return (
    <FormField id={id} className={className} name={field.name}>
      {label !== false && (
        <FormLabel>
          <FieldTitle
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FormLabel>
      )}
      <FormControl>
        <Input
          id={id}
          value={displayValue}
          onChange={(e) => setDisplayValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </FormControl>
      <InputHelperText helperText={helperText} />
      <FormError />
    </FormField>
  );
};

export const ContactInputs = () => {
  const translate = useTranslate();
  const [activeTab, setActiveTab] = useState<string>("identity");
  const { formState } = useFormContext();

  // After each failed submit, jump to the first tab that has an error so the
  // user immediately sees what needs fixing.
  useEffect(() => {
    if (formState.submitCount === 0) return;
    const errorKeys = Object.keys(formState.errors);
    if (errorKeys.length === 0) return;

    const firstErrorTab = TAB_ORDER.find((tab) =>
      errorKeys.some((key) => FIELD_TO_TAB[key] === tab),
    );
    if (firstErrorTab && firstErrorTab !== activeTab) {
      setActiveTab(firstErrorTab);
    }
    // We intentionally depend on submitCount so this runs once per submit
    // attempt, not on every render where errors change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.submitCount]);

  return (
    <div className="flex flex-col gap-4 p-1">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger
            value="identity"
            className="text-xs py-2 whitespace-normal text-center leading-tight"
          >
            {translate("resources.contacts.field_categories.identity", {
              _: "Identity",
            })}
          </TabsTrigger>
          <TabsTrigger
            value="social_media"
            className="text-xs py-2 whitespace-normal text-center leading-tight"
          >
            {translate("resources.contacts.field_categories.social_media", {
              _: "Social Media",
            })}
          </TabsTrigger>
          <TabsTrigger
            value="kw_info"
            className="text-xs py-2 whitespace-normal text-center leading-tight"
          >
            {translate("resources.contacts.field_categories.kw_info", {
              _: "KW Info",
            })}
          </TabsTrigger>
          <TabsTrigger
            value="service_areas"
            className="text-xs py-2 whitespace-normal text-center leading-tight"
          >
            {translate("resources.contacts.field_categories.service_areas", {
              _: "Service Areas",
            })}
          </TabsTrigger>
          <TabsTrigger
            value="membership"
            className="text-xs py-2 whitespace-normal text-center leading-tight"
          >
            {translate("resources.contacts.field_categories.membership", {
              _: "Membership",
            })}
          </TabsTrigger>
        </TabsList>

        {/* forceMount keeps every tab's fields in the DOM at all times so that
            react-hook-form validation runs across all tabs on every submit,
            not just the currently visible one. Radix sets hidden="" on inactive
            content, which applies display:none without unmounting. */}
        <TabsContent value="identity" className="mt-4 data-[state=inactive]:hidden" forceMount>
          <IdentityTabInputs />
        </TabsContent>
        <TabsContent value="social_media" className="mt-4 data-[state=inactive]:hidden" forceMount>
          <SocialMediaTabInputs />
        </TabsContent>
        <TabsContent value="kw_info" className="mt-4 data-[state=inactive]:hidden" forceMount>
          <KwInfoTabInputs />
        </TabsContent>
        <TabsContent value="service_areas" className="mt-4 data-[state=inactive]:hidden" forceMount>
          <ServiceAreasTabInputs />
        </TabsContent>
        <TabsContent value="membership" className="mt-4 data-[state=inactive]:hidden" forceMount>
          <MembershipTabInputs />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const IdentityTabInputs = () => {
  const translate = useTranslate();
  const { getValues, setValue } = useFormContext();
  const firstName = useWatch({ name: "first_name" });
  const lastName = useWatch({ name: "last_name" });
  const initials = `${(firstName ?? "").charAt(0)}${(lastName ?? "").charAt(0)}`.toUpperCase();

  const personalInfoTypes = [
    { id: "Work", name: translatePersonalInfoTypeLabel("Work", translate) },
    { id: "Home", name: translatePersonalInfoTypeLabel("Home", translate) },
    { id: "Other", name: translatePersonalInfoTypeLabel("Other", translate) },
  ];

  const handleEmailChange = (emailValue: string) => {
    const { first_name, last_name } = getValues();
    if (first_name || last_name || !emailValue) return;
    const [first, last] = emailValue.split("@")[0].split(".");
    setValue("first_name", first.charAt(0).toUpperCase() + first.slice(1));
    setValue(
      "last_name",
      last ? last.charAt(0).toUpperCase() + last.slice(1) : "",
    );
  };

  const handleEmailPaste: ClipboardEventHandler<
    HTMLTextAreaElement | HTMLInputElement
  > = (e) => {
    handleEmailChange(e.clipboardData?.getData("text/plain") ?? "");
  };

  const handleEmailBlur = (
    e: FocusEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    handleEmailChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ImageEditorField
          source="avatar"
          type="avatar"
          emptyText={initials || undefined}
          linkPosition="bottom"
        />
      </div>
      <RadioButtonGroupInput
        label={false}
        row
        source="gender"
        choices={contactGender}
        helperText={false}
        optionText={(choice) => translateContactGenderLabel(choice, translate)}
        translateChoice={false}
        optionValue="value"
        defaultValue={contactGender[0].value}
      />
      <TextInput source="first_name" validate={required()} helperText={false} />
      <TextInput source="last_name" validate={required()} helperText={false} />
      <TextInput source="title" helperText={false} />
      <ReferenceInput source="company_id" reference="companies" perPage={10}>
        <AutocompleteCompanyInput label="resources.contacts.fields.company_id" />
      </ReferenceInput>
      <TextInput
        source="cell_number"
        validate={required()}
        helperText={false}
      />

      <ArrayInput source="email_jsonb" helperText={false}>
        <SimpleFormIterator
          inline
          disableReordering
          disableClear
          className="[&>ul>li]:border-b-0 [&>ul>li]:pb-0"
        >
          <TextInput
            source="email"
            className="w-full"
            helperText={false}
            label={false}
            placeholder={translate("resources.contacts.fields.email")}
            validate={email()}
            onPaste={handleEmailPaste}
            onBlur={handleEmailBlur}
          />
          <SelectInput
            source="type"
            helperText={false}
            label={false}
            optionText="name"
            choices={personalInfoTypes}
            defaultValue="Work"
            className="w-24 min-w-24"
          />
        </SimpleFormIterator>
      </ArrayInput>

      <TextInput source="background" multiline helperText={false} />
    </div>
  );
};

const SocialMediaTabInputs = () => (
  <div className="flex flex-col gap-4">
    <TextInput
      source="linkedin_url"
      helperText={false}
      validate={isLinkedinUrl}
    />
    <TextInput
      source="facebook_url"
      helperText={false}
      validate={isValidUrl}
    />
    <TextInput
      source="instagram_url"
      helperText={false}
      validate={isValidUrl}
    />
    <TextInput
      source="tiktok_url"
      helperText={false}
      validate={isValidUrl}
    />
  </div>
);

const KwInfoTabInputs = () => {
  const translate = useTranslate();

  const agentRoleChoices = [
    { id: "Solo Agent", name: "Solo Agent" },
    { id: "Team Member", name: "Team Member" },
    { id: "Team Lead", name: "Team Lead" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        source="market_center_name"
        validate={required()}
        helperText={false}
      />
      <SelectInput
        source="agent_role"
        choices={agentRoleChoices}
        validate={required()}
        helperText={false}
        translateChoice={false}
      />
      <TextInput source="market_center_team_leader" helperText={false} />
      <TextInput source="market_center_tl_phone" helperText={false} />
      <TextInput source="market_center_tl_email" helperText={false} />

      <div>
        <h6 className="text-sm font-semibold mb-2">
          {translate("resources.contacts.field_categories.mc_address", {
            _: "Market Center Address",
          })}
        </h6>
        <Separator className="mb-4" />
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <TextInput source="mc_street_number" helperText={false} />
            <TextInput source="mc_suite_unit" helperText={false} />
          </div>
          <TextInput source="mc_street_name" helperText={false} />
          <div className="grid grid-cols-2 gap-4">
            <TextInput source="mc_city" helperText={false} />
            <TextInput source="mc_state" helperText={false} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextInput source="mc_zip_code" helperText={false} />
            <TextInput source="mc_country" helperText={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ServiceAreasTabInputs = () => (
  <div className="flex flex-col gap-4">
    <CommaSeparatedInput
      source="languages_spoken"
      validate={required()}
      helperText={false}
    />
    <CommaSeparatedInput
      source="cities_served"
      validate={required()}
      helperText={false}
    />
    <CommaSeparatedInput
      source="counties_served"
      validate={required()}
      helperText={false}
    />
    <CommaSeparatedInput
      source="states_served"
      validate={required()}
      helperText={false}
    />
    <CommaSeparatedInput
      source="countries_served"
      validate={required()}
      helperText={false}
    />
  </div>
);

const MembershipTabInputs = () => {
  const membershipTierChoices = [
    { id: "Free", name: "Free" },
    { id: "Premier", name: "Premier" },
  ];

  const memberStatusChoices = [
    { id: "Active", name: "Active" },
    { id: "Inactive", name: "Inactive" },
    { id: "Pending", name: "Pending" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SelectInput
        source="membership_tier"
        choices={membershipTierChoices}
        helperText={false}
        translateChoice={false}
        defaultValue="Free"
      />
      <DateInput source="join_date" helperText={false} />
      <SelectInput
        source="member_status"
        choices={memberStatusChoices}
        helperText={false}
        translateChoice={false}
        defaultValue="Pending"
      />
      <BooleanInput source="has_newsletter" helperText={false} />
      <ReferenceInput
        reference="sales"
        source="sales_id"
        sort={{ field: "last_name", order: "ASC" }}
        filter={{ "disabled@neq": true }}
      >
        <SelectInput
          helperText={false}
          optionText={saleOptionRenderer}
          validate={required()}
        />
      </ReferenceInput>
    </div>
  );
};

const saleOptionRenderer = (choice: Sale) =>
  `${choice.first_name} ${choice.last_name}`;
