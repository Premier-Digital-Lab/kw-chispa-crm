import { useEffect, useRef, useState } from "react";
import { Form, required, useLogin, useNotify, useTranslate } from "ra-core";
import type { SubmitHandler, FieldValues } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/admin/text-input";
import { Notification } from "@/components/admin/notification";
import { useConfigurationContext } from "@/components/atomic-crm/root/ConfigurationContext.tsx";
import { SSOAuthButton } from "./SSOAuthButton";

export const LoginPage = (props: { redirectTo?: string }) => {
  const {
    darkModeLogo,
    title,
    googleWorkplaceDomain,
    disableEmailPasswordAuthentication,
  } = useConfigurationContext();
  const { redirectTo } = props;
  const [loading, setLoading] = useState(false);
  const hasDisplayedRecoveryNotification = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const login = useLogin();
  const notify = useNotify();
  const translate = useTranslate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldNotify = searchParams.get("passwordRecoveryEmailSent") === "1";

    if (!shouldNotify || hasDisplayedRecoveryNotification.current) {
      return;
    }

    hasDisplayedRecoveryNotification.current = true;
    notify("crm.auth.recovery_email_sent", {
      type: "success",
      messageArgs: {
        _: "If you're a registered user, you should receive a password recovery email shortly.",
      },
    });

    searchParams.delete("passwordRecoveryEmailSent");
    const nextSearch = searchParams.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate, notify]);

  const handleSubmit: SubmitHandler<FieldValues> = (values) => {
    setLoading(true);
    login(values, redirectTo)
      .then(() => {
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        notify(
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
              ? "ra.auth.sign_in_error"
              : error.message,
          {
            type: "error",
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
      });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background video */}
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

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-4 py-10 flex flex-col items-center gap-8">
        {/* Logo */}
        <img className="h-24" src={darkModeLogo} alt={title} />

        {/* Frosted glass card */}
        <div
          className="w-full rounded-xl p-8 space-y-5"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "0.5px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <h1 className="text-2xl font-semibold text-white text-center">
            {translate("ra.auth.sign_in")}
          </h1>

          {disableEmailPasswordAuthentication ? null : (
            <div className="[&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input::placeholder]:text-white/50 [&_label]:text-white/80 [&_label]:text-sm">
              <Form className="space-y-4" onSubmit={handleSubmit}>
                <TextInput
                  label="ra.auth.email"
                  source="email"
                  type="email"
                  validate={required()}
                />
                <TextInput
                  label="ra.auth.password"
                  source="password"
                  type="password"
                  validate={required()}
                />
                <div className="flex flex-col gap-3 pt-1">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full cursor-pointer text-white font-semibold"
                    style={{ backgroundColor: "#CC0000" }}
                  >
                    {translate("ra.auth.sign_in")}
                  </Button>
                </div>
              </Form>
            </div>
          )}

          {googleWorkplaceDomain ? (
            <SSOAuthButton className="w-full" domain={googleWorkplaceDomain}>
              {translate("crm.auth.sign_in_google_workspace", {
                _: "Sign in with Google Workplace",
              })}
            </SSOAuthButton>
          ) : null}

          {disableEmailPasswordAuthentication ? null : (
            <Link
              to="/forgot-password"
              className="block text-sm text-center text-white/70 hover:text-white hover:underline"
            >
              {translate("ra-supabase.auth.forgot_password", {
                _: "Forgot password?",
              })}
            </Link>
          )}

          <Link
            to="/sign-up"
            className="block text-sm text-center text-white/70 hover:text-white hover:underline"
          >
            {translate("crm.auth.dont_have_account", {
              _: "Don't have an account? Sign Up",
            })}
          </Link>
        </div>
      </div>

      <Notification />
    </div>
  );
};
