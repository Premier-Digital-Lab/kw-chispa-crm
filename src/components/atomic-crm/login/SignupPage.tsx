import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Form,
  email as emailValidator,
  required,
  useDataProvider,
  useLogin,
  useNotify,
  useTranslate,
} from "ra-core";
import type { FieldValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { TextInput } from "@/components/admin/text-input";
import { SelectInput } from "@/components/admin/select-input";
import { BooleanInput } from "@/components/admin/boolean-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";

import { CommaSeparatedInput } from "../contacts/ContactInputs";
import {
  contactGender,
  translateContactGenderLabel,
} from "../contacts/contactModel";
import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { SignUpData } from "../types";
import { LoginSkeleton } from "./LoginSkeleton";
import { Notification } from "@/components/admin/notification";
import { ConfirmationRequired } from "./ConfirmationRequired";
import { SSOAuthButton } from "./SSOAuthButton";

// Which tab each validated field belongs to — used to auto-switch on error.
const FIELD_TO_TAB: Record<string, string> = {
  first_name: "account",
  last_name: "account",
  email: "account",
  password: "account",
  cell_number: "account",
  market_center_name: "kw_info",
  agent_role: "kw_info",
  kw_website: "kw_info",
  mc_street_address: "kw_info",
  mc_city: "kw_info",
  mc_state: "kw_info",
  mc_zip_code: "kw_info",
  mc_country: "kw_info",
  languages_spoken: "service_areas",
  cities_served: "service_areas",
  counties_served: "service_areas",
  states_served: "service_areas",
  countries_served: "service_areas",
};

const TAB_ORDER = [
  "account",
  "kw_info",
  "service_areas",
  "profile",
] as const;

export const SignupPage = () => {
  const queryClient = useQueryClient();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const {
    darkModeLogo: logo,
    title,
    googleWorkplaceDomain,
  } = useConfigurationContext();
  const navigate = useNavigate();
  const translate = useTranslate();
  const login = useLogin();
  const notify = useNotify();

  const { data: isInitialized, isPending } = useQuery({
    queryKey: ["init"],
    queryFn: async () => dataProvider.isInitialized(),
  });

  const { isPending: isSignUpPending, mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SignUpData) => dataProvider.signUp(data),
    onSuccess: (data) => {
      login({
        email: data.email,
        password: data.password,
        redirectTo: "/contacts",
      })
        .then(() => {
          notify("crm.auth.signup.account_created", {
            messageArgs: { _: "Account successfully created" },
          });
          queryClient.invalidateQueries({ queryKey: ["auth", "canAccess"] });
        })
        .catch(() => {
          navigate(ConfirmationRequired.path);
        });
    },
    onError: (error) => {
      notify(error.message);
    },
  });

  if (isPending) return <LoginSkeleton />;

  const onSubmit = (data: FieldValues) => {
    mutate(data as SignUpData);
  };

  return (
    <div className="relative min-h-screen">
      {/* Static background image */}
      <img
        src="/signup-bg.jpg"
        alt=""
        aria-hidden="true"
        className="fixed inset-0 w-full h-full object-cover -z-10"
      />
      <div className="fixed inset-0 bg-black/55 -z-10" />

      {/* Scrollable content */}
      <div className="relative z-10 min-h-screen p-6 sm:p-10">
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt={title} className="h-14" />
        </div>

        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-white">
            {translate("crm.auth.welcome_title", {
              _: "Welcome to KW CHISPA Central",
            })}
          </h2>
          <p className="text-base mb-6 text-white/80">
            {isInitialized
              ? translate("crm.auth.signup.create_member_account", {
                  _: "Create your KW CHISPA member account.",
                })
              : translate("crm.auth.signup.create_first_user", {
                  _: "Create the first user account to complete the setup.",
                })}
          </p>

          <div
            className="rounded-xl p-6 sm:p-8"
            style={{
              background: "rgba(0,0,0,0.50)",
              border: "0.5px solid rgba(255,255,255,0.20)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <Form
              onSubmit={onSubmit}
              mode="onChange"
              resource="contacts"
              sanitizeEmptyValues={false}
              defaultValues={{
                membership_tier: "Free",
                has_newsletter: true,
                gender: contactGender[0].value,
              }}
            >
              <SignupFormBody
                isSubmitting={isSignUpPending}
                googleWorkplaceDomain={googleWorkplaceDomain}
              />
            </Form>
          </div>
        </div>
      </div>

      <Notification />
    </div>
  );
};

SignupPage.path = "/sign-up";

// ─── Inner form body — must be a child of <Form> to access useFormContext ────

const SignupFormBody = ({
  isSubmitting,
  googleWorkplaceDomain,
}: {
  isSubmitting: boolean;
  googleWorkplaceDomain?: string;
}) => {
  const translate = useTranslate();
  const [activeTab, setActiveTab] = useState<string>("account");
  const [tabIndex, setTabIndex] = useState(0);
  const { formState } = useFormContext();

  const goToTab = (index: number) => {
    setTabIndex(index);
    setActiveTab(TAB_ORDER[index]);
  };

  // After each failed submit, jump to the first tab that has an error.
  useEffect(() => {
    if (formState.submitCount === 0) return;
    const errorKeys = Object.keys(formState.errors);
    if (errorKeys.length === 0) return;
    const firstErrorTabIndex = TAB_ORDER.findIndex((tab) =>
      errorKeys.some((key) => FIELD_TO_TAB[key] === tab),
    );
    if (firstErrorTabIndex !== -1 && TAB_ORDER[firstErrorTabIndex] !== activeTab) {
      goToTab(firstErrorTabIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.submitCount]);

  const isLastTab = tabIndex === TAB_ORDER.length - 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="[&_input]:bg-white/10 [&_input]:border-white/40 [&_input]:text-white [&_input::placeholder]:text-white/50 [&_label]:text-white [&_label]:font-semibold [&_label]:text-sm [&_select]:bg-white/10 [&_select]:border-white/40 [&_select]:text-white [&_textarea]:bg-white/10 [&_textarea]:border-white/40 [&_textarea]:text-white">
        <Tabs value={activeTab} onValueChange={(val) => {
          const idx = TAB_ORDER.indexOf(val as typeof TAB_ORDER[number]);
          if (idx !== -1) goToTab(idx);
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger
              value="account"
              className="text-xs py-2 whitespace-normal text-center leading-tight"
            >
              {translate("crm.auth.signup.tabs.account", { _: "Account" })}
            </TabsTrigger>
            <TabsTrigger
              value="kw_info"
              className="text-xs py-2 whitespace-normal text-center leading-tight"
            >
              {translate("crm.auth.signup.tabs.kw_info", { _: "KW Info" })}
            </TabsTrigger>
            <TabsTrigger
              value="service_areas"
              className="text-xs py-2 whitespace-normal text-center leading-tight"
            >
              {translate("crm.auth.signup.tabs.service_areas", {
                _: "Service Areas",
              })}
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="text-xs py-2 whitespace-normal text-center leading-tight"
            >
              {translate("crm.auth.signup.tabs.profile", { _: "Profile" })}
            </TabsTrigger>
          </TabsList>

          {/* forceMount keeps every tab's fields in the DOM so validation runs
              across all tabs on every submit, not just the active one. */}
          <TabsContent
            value="account"
            className="mt-4 data-[state=inactive]:hidden"
            forceMount
          >
            <AccountTabInputs />
          </TabsContent>
          <TabsContent
            value="kw_info"
            className="mt-4 data-[state=inactive]:hidden"
            forceMount
          >
            <SignupKwInfoTabInputs />
          </TabsContent>
          <TabsContent
            value="service_areas"
            className="mt-4 data-[state=inactive]:hidden"
            forceMount
          >
            <SignupServiceAreasTabInputs />
          </TabsContent>
          <TabsContent
            value="profile"
            className="mt-4 data-[state=inactive]:hidden"
            forceMount
          >
            <SignupProfileTabInputs />
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex flex-col gap-4">
        {/* Navigation row: Back on left, Next/Create on right */}
        <div className="flex gap-3">
          {tabIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/40 text-white bg-transparent hover:bg-white/10 font-semibold"
              onClick={() => goToTab(tabIndex - 1)}
            >
              ← Back
            </Button>
          )}
          {isLastTab ? (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 font-semibold text-white"
              style={{ backgroundColor: "#CC0000" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {translate("crm.auth.signup.creating", { _: "Creating..." })}
                </>
              ) : (
                translate("crm.auth.signup.create_account", {
                  _: "Create account",
                })
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/40 text-white bg-transparent hover:bg-white/10 font-semibold"
              onClick={() => goToTab(tabIndex + 1)}
            >
              Next →
            </Button>
          )}
        </div>

        {googleWorkplaceDomain ? (
          <SSOAuthButton className="w-full" domain={googleWorkplaceDomain}>
            {translate("crm.auth.sign_in_google_workspace", {
              _: "Sign in with Google Workplace",
            })}
          </SSOAuthButton>
        ) : null}
        <Link to="/login" className="text-sm text-center text-white font-semibold hover:underline">
          {translate("crm.auth.already_have_account", {
            _: "Already have an account? Sign In",
          })}
        </Link>
        <p className="text-xs text-center text-white/70 mt-3">
          By creating an account you agree to our{" "}
          <Link to="/terms-of-use" className="underline text-white/90 hover:text-white">Terms of Use</Link>
          {", "}
          <Link to="/privacy-policy" className="underline text-white/90 hover:text-white">Privacy Policy</Link>
          {", and "}
          <Link to="/cookie-policy" className="underline text-white/90 hover:text-white">Cookie Policy</Link>
          {"."}
        </p>
      </div>
    </div>
  );
};

// ─── Tab content components ───────────────────────────────────────────────────

const AccountTabInputs = () => (
  <div className="flex flex-col gap-4">
    <TextInput source="first_name" validate={required()} helperText={false} />
    <TextInput source="last_name" validate={required()} helperText={false} />
    <TextInput
      source="email"
      type="email"
      label="ra.auth.email"
      validate={[required(), emailValidator()]}
      helperText={false}
    />
    <TextInput
      source="password"
      type="password"
      label="ra.auth.password"
      validate={required()}
      helperText={false}
    />
    <TextInput
      source="cell_number"
      validate={required()}
      helperText={false}
    />
  </div>
);

const httpsUrl = (value: string) =>
  value && !value.startsWith("https://")
    ? 'Must start with "https://"'
    : undefined;

const SignupKwInfoTabInputs = () => {
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
          <TextInput source="mc_street_address" validate={required()} helperText={false} />
          <TextInput source="mc_suite_unit" helperText={false} />
          <div className="grid grid-cols-2 gap-4">
            <TextInput source="mc_city" validate={required()} helperText={false} />
            <TextInput source="mc_state" validate={required()} helperText={false} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextInput source="mc_zip_code" validate={required()} helperText={false} />
            <TextInput source="mc_country" validate={required()} helperText={false} />
          </div>
        </div>
      </div>
      <TextInput
        source="kw_website"
        validate={[required(), httpsUrl]}
        helperText={false}
      />
    </div>
  );
};

const SignupServiceAreasTabInputs = () => (
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

const SignupProfileTabInputs = () => {
  const translate = useTranslate();

  const membershipTierChoices = [
    { id: "Free", name: "Free" },
    { id: "Premier", name: "Premier" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <RadioButtonGroupInput
        label={false}
        row
        source="gender"
        choices={contactGender}
        helperText={false}
        optionText={(choice) => translateContactGenderLabel(choice, translate)}
        translateChoice={false}
        optionValue="value"
      />
      <TextInput source="title" helperText={false} />
      <TextInput source="background" multiline helperText={false} />
      <TextInput source="linkedin_url" helperText={false} />
      <TextInput source="facebook_url" helperText={false} />
      <TextInput source="instagram_url" helperText={false} />
      <TextInput source="tiktok_url" helperText={false} />
      <SelectInput
        source="membership_tier"
        choices={membershipTierChoices}
        helperText={false}
        translateChoice={false}
      />
      <BooleanInput source="has_newsletter" defaultValue={true} helperText={false} />
    </div>
  );
};
