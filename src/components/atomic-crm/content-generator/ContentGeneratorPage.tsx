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

const LockScreen = ({ message }: { message: string }) => (
  <div className="max-w-md mx-auto py-24 px-4 text-center">
    <div className="flex justify-center mb-4">
      <div className="rounded-full bg-muted p-5">
        <Lock className="w-10 h-10 text-muted-foreground" />
      </div>
    </div>
    <h2 className="text-xl font-semibold mb-3">Premier Members Only</h2>
    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{message}</p>
    <a
      href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FGR4FB2RJ95CY"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block px-5 py-2.5 rounded-md text-sm font-medium bg-[#CC0000] text-white hover:bg-[#aa0000] transition-colors"
    >
      Upgrade to Premier
    </a>
  </div>
);
