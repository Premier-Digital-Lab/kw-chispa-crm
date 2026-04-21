import { useState } from "react";
import type { ValidateForm } from "ra-core";
import { Form, required, useNotify, useRedirect, useTranslate } from "ra-core";
import { useSetPassword, useSupabaseAccessToken } from "ra-supabase-core";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/admin/text-input";
import { Notification } from "@/components/admin/notification";
import { useConfigurationContext } from "@/components/atomic-crm/root/ConfigurationContext";

interface FormData {
  password: string;
  confirmPassword: string;
}

export const SetPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const { darkModeLogo, title } = useConfigurationContext();

  const access_token = useSupabaseAccessToken();
  const refresh_token = useSupabaseAccessToken({
    parameterName: "refresh_token",
  });

  const notify = useNotify();
  const redirect = useRedirect();
  const translate = useTranslate();
  const [, { mutateAsync: setPassword }] = useSetPassword();

  const validate = (values: FormData) => {
    if (values.password !== values.confirmPassword) {
      return {
        password: "ra-supabase.validation.password_mismatch",
        confirmPassword: "ra-supabase.validation.password_mismatch",
      };
    }
    return {};
  };

  const submit = async (values: FormData) => {
    if (!access_token || !refresh_token) return;
    try {
      setLoading(true);
      await setPassword({
        access_token,
        refresh_token,
        password: values.password,
      });
      redirect("/login");
    } catch (error: any) {
      notify(
        typeof error === "string"
          ? error
          : typeof error === "undefined" || !error.message
            ? "ra.auth.sign_in_error"
            : error.message,
        {
          type: "warning",
          messageArgs: {
            _:
              typeof error === "string"
                ? error
                : error && error.message
                  ? error.message
                  : undefined,
          },
        },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          background:
            "linear-gradient(135deg, #1a1a1a 0%, #2d0a0a 40%, #CC0000 100%)",
        }}
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 w-full max-w-sm px-4 py-10 flex flex-col items-center gap-8">
        <img className="h-24" src={darkModeLogo} alt={title} />

        <div
          className="w-full rounded-xl p-8 space-y-5"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "0.5px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          {!access_token || !refresh_token ? (
            <p className="text-white/80 text-sm text-center">
              {translate("ra-supabase.auth.missing_tokens", {
                _: "This link is invalid or has expired. Please request a new password reset.",
              })}
            </p>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-white text-center">
                {translate("ra-supabase.set_password.new_password", {
                  _: "Set new password",
                })}
              </h1>

              <div className="[&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input::placeholder]:text-white/50 [&_label]:text-white/80 [&_label]:text-sm">
                <Form<FormData>
                  className="space-y-4"
                  onSubmit={submit as SubmitHandler<FieldValues>}
                  validate={validate as ValidateForm}
                >
                  <TextInput
                    label={translate("ra.auth.password", { _: "New Password" })}
                    autoComplete="new-password"
                    source="password"
                    type="password"
                    validate={required()}
                  />
                  <TextInput
                    label={translate("crm.auth.confirm_password", {
                      _: "Confirm Password",
                    })}
                    source="confirmPassword"
                    type="password"
                    validate={required()}
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full cursor-pointer text-white font-semibold"
                    style={{ backgroundColor: "#CC0000" }}
                  >
                    {translate("crm.auth.set_new_password", {
                      _: "Update Password",
                    })}
                  </Button>
                </Form>
              </div>
            </>
          )}

          <Link
            to="/forgot-password"
            className="block text-sm text-center text-white/70 hover:text-white hover:underline"
          >
            {translate("crm.auth.request_new_reset_link", {
              _: "Request a new reset link",
            })}
          </Link>
        </div>
      </div>

      <Notification />
    </div>
  );
};

SetPasswordPage.path = "set-password";
