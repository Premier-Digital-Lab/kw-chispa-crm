import { useState, useEffect } from "react";
import { useGetIdentity, useTranslate } from "ra-core";
import { Lock } from "lucide-react";

import { getSupabaseClient } from "../providers/supabase/supabase";

const usePremierAccess = (identityId: number | undefined, isAdmin: boolean) => {
  const [isPremier, setIsPremier] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      setIsPremier(true);
      setIsChecking(false);
      return;
    }
    if (!identityId) return;

    const supabase = getSupabaseClient();
    supabase
      .from("contacts")
      .select("membership_tier, member_status")
      .eq("sales_id", identityId)
      .maybeSingle()
      .then(({ data }) => {
        setIsPremier(
          data?.membership_tier === "Premier" && data?.member_status === "Active"
        );
        setIsChecking(false);
      });
  }, [identityId, isAdmin]);

  return { isPremier, isChecking };
};

export const ContentGeneratorPage = () => {
  const translate = useTranslate();
  const { identity, isPending: identityPending } = useGetIdentity();
  const [authUUID, setAuthUUID] = useState<string>("");

  useEffect(() => {
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        setAuthUUID(data.session?.user?.id ?? "");
      });
  }, []);

  const isAdmin = !!identity?.administrator;
  const { isPremier, isChecking } = usePremierAccess(identity?.id, isAdmin);

  if (identityPending || isChecking) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 text-muted-foreground text-sm">
        {translate("crm.common.loading")}
      </div>
    );
  }

  if (!isPremier) {
    return <LockScreen message={translate("crm.content_generator.locked_message")} />;
  }

  return (
    <div style={{ position: "fixed", top: "51px", left: 0, right: 0, bottom: 0 }}>
      <iframe
        src={`https://web-production-283a7.up.railway.app?user_id=${authUUID}`}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        title="Content Generator"
      />
    </div>
  );
};

ContentGeneratorPage.path = "/content-generator";

const PAYPAL_PLAN_ID = "P-827282237D6907028MLSAPII";

const LockScreen = ({ message }: { message: string }) => {
  const [success, setSuccess] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (document.getElementById("paypal-sdk")) {
      setSdkReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=AQwl-kcSXaZ8ymAlMl-LCzUsKXDdKm92lyIKoOds5C-Y5T_NVauwPFGN4Y2Y9sbJstBGduucFDwsLkS7&vault=true&intent=subscription`;
    script.onload = () => setSdkReady(true);
    script.onerror = () => console.error('PayPal SDK failed to load');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!sdkReady || success) return;
    // @ts-expect-error paypal global injected by SDK script
    window.paypal
      .Buttons({
        createSubscription: (
          _data: unknown,
          actions: { subscription: { create: (o: { plan_id: string }) => Promise<string> } },
        ) => actions.subscription.create({ plan_id: PAYPAL_PLAN_ID }),
        onApprove: () => setSuccess(true),
        style: { color: "blue", shape: "rect", label: "subscribe" },
      })
      .render("#paypal-button-container");
  }, [sdkReady, success]);

  if (success) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center">
        <p className="text-sm text-green-600 font-medium leading-relaxed">
          Payment successful! Your Premier membership is being activated. Please
          refresh the page in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-24 px-4 text-center">
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-muted p-5">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-3">Premier Members Only</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">{message}</p>
      <div id="paypal-button-container" />
    </div>
  );
};
