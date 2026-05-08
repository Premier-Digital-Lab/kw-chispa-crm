import { useState, useEffect } from "react";
import { useGetIdentity, useTranslate } from "ra-core";
import { Lock, Sparkles, Copy, Check, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { getSupabaseClient } from "../providers/supabase/supabase";

type GeneratedContent = {
  english: string;
  spanish: string;
};

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

  const isAdmin = !!identity?.administrator;
  const { isPremier, isChecking } = usePremierAccess(identity?.id, isAdmin);

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch("/.netlify/functions/content-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.english && data.spanish) {
        setResult({ english: data.english, spanish: data.spanish });
      } else {
        throw new Error("Invalid response format");
      }
    } catch {
      setError(translate("crm.content_generator.error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

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
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-1">
        <Sparkles className="w-6 h-6 text-[#CC0000]" />
        <h1 className="text-2xl font-bold">{translate("crm.content_generator.title")}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 ml-9">
        Generate bilingual social media posts for real estate topics.
      </p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">
              {translate("crm.content_generator.prompt_label")}
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={translate("crm.content_generator.prompt_placeholder")}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">⌘ Enter to generate</p>
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="self-start gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating
                ? translate("crm.content_generator.generating")
                : translate("crm.content_generator.generate")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <PostCard
            label={translate("crm.content_generator.result_english")}
            content={result.english}
            copyLabel={translate("crm.content_generator.copy")}
            copiedLabel={translate("crm.content_generator.copied")}
          />
          <PostCard
            label={translate("crm.content_generator.result_spanish")}
            content={result.spanish}
            copyLabel={translate("crm.content_generator.copy")}
            copiedLabel={translate("crm.content_generator.copied")}
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => { setResult(null); setPrompt(""); }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {translate("crm.content_generator.try_another")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

ContentGeneratorPage.path = "/content-generator";

// ─── Sub-components ───────────────────────────────────────────────────────────

const LockScreen = ({ message }: { message: string }) => (
  <div className="max-w-md mx-auto py-24 px-4 text-center">
    <div className="flex justify-center mb-4">
      <div className="rounded-full bg-muted p-5">
        <Lock className="w-10 h-10 text-muted-foreground" />
      </div>
    </div>
    <h2 className="text-xl font-semibold mb-3">Premier Members Only</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
  </div>
);

const PostCard = ({
  label,
  content,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  content: string;
  copyLabel: string;
  copiedLabel: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="gap-1.5 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                {copiedLabel}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                {copyLabel}
              </>
            )}
          </Button>
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
      </CardContent>
    </Card>
  );
};
