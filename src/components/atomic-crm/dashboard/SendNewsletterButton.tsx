import { useState } from "react";
import { useDataProvider, useGetIdentity, useTranslate } from "ra-core";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmDataProvider, MailerLiteCampaign } from "../providers/supabase/dataProvider";

type Status = "idle" | "loading" | "ready" | "sending" | "success" | "error";

export const SendNewsletterButton = () => {
  const { identity, isPending } = useGetIdentity();
  const translate = useTranslate();
  const dataProvider = useDataProvider<CrmDataProvider>();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [campaigns, setCampaigns] = useState<MailerLiteCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (isPending || !identity?.administrator) return null;

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (!next) {
      setStatus("idle");
      setCampaigns([]);
      setSelectedId("");
      setErrorMessage("");
      return;
    }
    setStatus("loading");
    try {
      const data = await dataProvider.getNewsletterCampaigns();
      setCampaigns(data);
      setStatus(data.length === 0 ? "ready" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load campaigns",
      );
      setStatus("error");
    }
  };

  const handleSend = async () => {
    if (!selectedId) return;
    setStatus("sending");
    try {
      await dataProvider.sendNewsletterCampaign(selectedId);
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to send campaign",
      );
      setStatus("error");
    }
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Send className="w-4 h-4" />
          {translate("crm.dashboard.send_newsletter", {
            _: "Send Newsletter",
          })}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {translate("crm.dashboard.send_newsletter", {
              _: "Send Newsletter",
            })}
          </DialogTitle>
          <DialogDescription>
            {translate("crm.dashboard.send_newsletter_description", {
              _: "Select a draft MailerLite campaign to send instantly to all subscribers.",
            })}
          </DialogDescription>
        </DialogHeader>

        {status === "loading" && (
          <p className="text-sm text-muted-foreground py-2">
            {translate("crm.dashboard.loading_campaigns", {
              _: "Loading campaigns…",
            })}
          </p>
        )}

        {(status === "ready" || status === "sending") && (
          <div className="flex flex-col gap-3">
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {translate("crm.dashboard.no_draft_campaigns", {
                  _: "No draft campaigns found in MailerLite.",
                })}
              </p>
            ) : (
              <>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={translate(
                        "crm.dashboard.select_campaign_placeholder",
                        { _: "Select a campaign…" },
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.subject ? (
                          <span className="text-muted-foreground ml-1">
                            — {c.subject}
                          </span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCampaign?.subject && (
                  <p className="text-xs text-muted-foreground">
                    Subject: {selectedCampaign.subject}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {status === "success" && (
          <p className="text-sm text-green-600">
            {translate("crm.dashboard.newsletter_sent", {
              _: "Campaign sent successfully!",
            })}
          </p>
        )}

        {status === "error" && (
          <p className="text-sm text-destructive">
            {errorMessage ||
              translate("crm.dashboard.newsletter_error", {
                _: "Something went wrong. Please try again.",
              })}
          </p>
        )}

        <DialogFooter>
          {status === "success" || status === "error" ? (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {translate("ra.action.close", { _: "Close" })}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {translate("ra.action.cancel", { _: "Cancel" })}
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  !selectedId ||
                  status === "sending" ||
                  status === "loading" ||
                  campaigns.length === 0
                }
              >
                {status === "sending"
                  ? translate("crm.dashboard.sending", { _: "Sending…" })
                  : translate("crm.dashboard.send", { _: "Send" })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
