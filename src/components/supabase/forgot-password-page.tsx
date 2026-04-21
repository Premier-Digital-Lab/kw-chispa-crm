import { useState } from "react";
import { useResetPassword } from "ra-supabase-core";
import { Form, required, useNotify, useRedirect, useTranslate } from "ra-core";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import { Link } from "react-router";
import { TextInput } from "@/components/admin/text-input";
import { Button } from "@/components/ui/button";
import { Notification } from "@/components/admin/notification";
import { useConfigurationContext } from "@/components/atomic-crm/root/ConfigurationContext";

interface FormData {
  email: string;
}

export const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const { darkModeLogo, title } = useConfigurationContext();

  const notify = useNotify();
  const redirect = useRedirect();
  const translate = useTranslate();
  const [, { mutateAsync: resetPassword }] = useResetPassword({
    onSuccess: () => {
      redirect("/login?passwordRecoveryEmailSent=1");
    },
    onError: () => undefined,
  });

  const submit = async (values: FormData) => {
    try {
      setLoading(true);
      await resetPassword({ email: values.email });
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
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold text-white">
              {translate("ra-supabase.reset_password.forgot_password", {
                _: "Forgot password?",
              })}
            </h1>
            <p className="text-sm text-white/70">
              {translate(
                "ra-supabase.reset_password.forgot_password_details",
                { _: "Enter your email to receive a reset password link." },
              )}
            </p>
          </div>

          <div className="[&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input::placeholder]:text-white/50 [&_label]:text-white/80 [&_label]:text-sm">
            <Form<FormData>
              className="space-y-4"
              onSubmit={submit as SubmitHandler<FieldValues>}
            >
              <TextInput
                source="email"
                label={translate("ra.auth.email", { _: "Email" })}
                autoComplete="email"
                validate={required()}
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer text-white font-semibold"
                style={{ backgroundColor: "#CC0000" }}
              >
                {translate("crm.action.reset_password", {
                  _: "Reset password",
                })}
              </Button>
            </Form>
          </div>

          <Link
            to="/login"
            className="block text-sm text-center text-white/70 hover:text-white hover:underline"
          >
            {translate("crm.auth.back_to_sign_in", { _: "Back to Sign In" })}
          </Link>
        </div>
      </div>

      <Notification />
    </div>
  );
};

ForgotPasswordPage.path = "forgot-password";
