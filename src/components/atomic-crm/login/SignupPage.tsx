import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/admin/text-input";
import { BooleanInput } from "@/components/admin/boolean-input";

import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { SignUpData } from "../types";
import { LoginSkeleton } from "./LoginSkeleton";
import { Notification } from "@/components/admin/notification";
import { ConfirmationRequired } from "./ConfirmationRequired";
import { SSOAuthButton } from "./SSOAuthButton";

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

// ─── Inner form body — must be a child of <Form> to access form context ───────

const httpsUrl = (value: string) =>
  value && !value.startsWith("https://")
    ? 'Must start with "https://"'
    : undefined;

const SignupFormBody = ({
  isSubmitting,
  googleWorkplaceDomain,
}: {
  isSubmitting: boolean;
  googleWorkplaceDomain?: string;
}) => {
  const translate = useTranslate();

  return (
    <div className="flex flex-col gap-6">
      <div className="[&_input]:bg-white/10 [&_input]:border-white/40 [&_input]:text-white [&_input::placeholder]:text-white/50 [&_label]:text-white [&_label]:font-semibold [&_label]:text-sm [&_select]:bg-white/10 [&_select]:border-white/40 [&_select]:text-white [&_textarea]:bg-white/10 [&_textarea]:border-white/40 [&_textarea]:text-white">
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
          <TextInput
            source="kw_website"
            validate={[required(), httpsUrl]}
            helperText={false}
          />
          <BooleanInput source="has_newsletter" defaultValue={true} helperText={false} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-semibold text-white"
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
