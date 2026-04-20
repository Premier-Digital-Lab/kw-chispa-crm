import { Notification } from "@/components/admin/notification";
import { useTranslate } from "ra-core";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const ConfirmationRequired = () => {
  const translate = useTranslate();
  const { darkModeLogo: logo, title } = useConfigurationContext();

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
      <div className="absolute inset-0 bg-black/55" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 py-12 text-center max-w-sm mx-auto">
        <img src={logo} alt={title} className="h-20 mb-8" />
        <div
          className="w-full rounded-xl p-8 space-y-4"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "0.5px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <h1 className="text-2xl font-bold text-white">
            {translate("crm.auth.welcome_title", {
              _: "Welcome to KW CHISPA Central",
            })}
          </h1>
          <p className="text-base text-white/80">
            {translate("crm.auth.confirmation_required", {
              _: "Please follow the link we just sent you by email to confirm your account.",
            })}
          </p>
        </div>
      </div>

      <Notification />
    </div>
  );
};

ConfirmationRequired.path = "/sign-up/confirm";
