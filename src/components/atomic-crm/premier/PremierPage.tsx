import { useState, useEffect, useCallback } from "react";
import { useGetIdentity, useTranslate, useNotify } from "ra-core";
import {
  FileText,
  Video,
  FileCode,
  Lock,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getSupabaseClient } from "../providers/supabase/supabase";

type ResourceType = "document" | "recording" | "template";

type PremierResource = {
  id: number;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  url: string;
  is_published: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

type ResourceFormData = {
  title: string;
  description: string;
  resource_type: ResourceType;
  url: string;
};

const emptyForm: ResourceFormData = {
  title: "",
  description: "",
  resource_type: "document",
  url: "",
};

const TABS: ResourceType[] = ["document", "recording", "template"];

const ResourceIcon = ({ type }: { type: ResourceType }) => {
  if (type === "document") return <FileText className="w-5 h-5 shrink-0 text-blue-500" />;
  if (type === "recording") return <Video className="w-5 h-5 shrink-0 text-purple-500" />;
  return <FileCode className="w-5 h-5 shrink-0 text-green-500" />;
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

export const PremierPage = () => {
  const translate = useTranslate();
  const notify = useNotify();
  const { identity, isPending: identityPending } = useGetIdentity();

  const isAdmin = !!identity?.administrator;
  const { isPremier, isChecking } = usePremierAccess(identity?.id, isAdmin);

  const [activeTab, setActiveTab] = useState<ResourceType>("document");
  const [resources, setResources] = useState<PremierResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<PremierResource | null>(null);
  const [form, setForm] = useState<ResourceFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("premier_resources")
      .select("*")
      .eq("resource_type", activeTab)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching premier resources:", error.message);
    } else {
      setResources((data ?? []) as PremierResource[]);
    }
    setIsLoading(false);
  }, [activeTab]);

  useEffect(() => {
    if (isPremier) fetchResources();
  }, [isPremier, fetchResources]);

  const openAddDialog = () => {
    setEditingResource(null);
    setForm({ ...emptyForm, resource_type: activeTab });
    setDialogOpen(true);
  };

  const openEditDialog = (resource: PremierResource) => {
    setEditingResource(resource);
    setForm({
      title: resource.title,
      description: resource.description ?? "",
      resource_type: resource.resource_type,
      url: resource.url,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setIsSaving(true);
    const supabase = getSupabaseClient();

    if (editingResource) {
      const { error } = await supabase
        .from("premier_resources")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editingResource.id);
      if (error) {
        notify("ra.notification.http_error", { type: "error" });
      } else {
        notify("ra.notification.updated", { type: "success", messageArgs: { smart_count: 1 } });
        setDialogOpen(false);
        fetchResources();
      }
    } else {
      const { error } = await supabase
        .from("premier_resources")
        .insert({ ...form, created_by: identity?.id ?? null });
      if (error) {
        notify("ra.notification.http_error", { type: "error" });
      } else {
        notify("ra.notification.created", { type: "success" });
        setDialogOpen(false);
        fetchResources();
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: number) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("premier_resources")
      .delete()
      .eq("id", id);
    if (error) {
      notify("ra.notification.http_error", { type: "error" });
    } else {
      notify("ra.notification.deleted", { type: "success", messageArgs: { smart_count: 1 } });
      setDeleteTargetId(null);
      fetchResources();
    }
  };

  if (identityPending || isChecking) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 text-muted-foreground text-sm">
        {translate("crm.common.loading")}
      </div>
    );
  }

  if (!isPremier) {
    return <LockScreen message={translate("crm.premier.locked_message")} />;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{translate("crm.premier.title")}</h1>
        </div>
        {isAdmin && (
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            {translate("crm.premier.add_resource")}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {translate(`crm.premier.tabs.${tab}s` as `crm.premier.tabs.${string}`)}
          </button>
        ))}
      </div>

      {/* Resource list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{translate("crm.common.loading")}</p>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ResourceIcon type={activeTab} />
          <p className="mt-3 text-sm">{translate("crm.premier.empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isAdmin={isAdmin}
              onEdit={openEditDialog}
              onDelete={(id) => setDeleteTargetId(id)}
              translate={translate}
            />
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingResource
                ? translate("crm.premier.form.edit_title")
                : translate("crm.premier.form.add_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label>{translate("crm.premier.form.title_label")}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{translate("crm.premier.form.description")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{translate("crm.premier.form.type")}</Label>
              <Select
                value={form.resource_type}
                onValueChange={(v) => setForm((f) => ({ ...f, resource_type: v as ResourceType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">
                    {translate("crm.premier.form.type_document")}
                  </SelectItem>
                  <SelectItem value="recording">
                    {translate("crm.premier.form.type_recording")}
                  </SelectItem>
                  <SelectItem value="template">
                    {translate("crm.premier.form.type_template")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{translate("crm.premier.form.url")}</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {translate("crm.premier.form.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !form.title.trim() || !form.url.trim()}
              >
                {isSaving ? translate("crm.common.loading") : translate("crm.premier.form.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteTargetId !== null} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{translate("crm.premier.delete_confirm")}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              {translate("crm.premier.form.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTargetId !== null && handleDelete(deleteTargetId)}
            >
              {translate("crm.premier.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

PremierPage.path = "/premier";

// ─── Sub-components ───────────────────────────────────────────────────────────

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
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
    script.onload = () => setSdkReady(true);
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

const ResourceCard = ({
  resource,
  isAdmin,
  onEdit,
  onDelete,
  translate,
}: {
  resource: PremierResource;
  isAdmin: boolean;
  onEdit: (r: PremierResource) => void;
  onDelete: (id: number) => void;
  translate: (key: string) => string;
}) => (
  <Card className="hover:bg-muted/40 transition-colors border-l-4 border-l-[#CC0000]">
    <CardContent className="py-4 px-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <ResourceIcon type={resource.resource_type} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base">{resource.title}</p>
          {resource.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {resource.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(resource.url, "_blank", "noopener,noreferrer")}
            className="gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {translate("crm.premier.open")}
          </Button>
          {isAdmin && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(resource)}
                aria-label={translate("crm.premier.edit")}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(resource.id)}
                aria-label={translate("crm.premier.delete")}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);
