import { useState, useEffect, useCallback } from "react";
import { useGetIdentity, useTranslate, useNotify } from "ra-core";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Users,
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

import { getSupabaseClient } from "../providers/supabase/supabase";

type ChapterLeaderResource = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string | null;
  subcategory: string | null;
  created_at: string;
  created_by: number | null;
  sort_order: number;
};

type ResourceFormData = {
  title: string;
  description: string;
  url: string;
  category: string;
  subcategory: string;
};

const emptyForm: ResourceFormData = {
  title: "",
  description: "",
  url: "",
  category: "",
  subcategory: "",
};

const useChapterLeaderAccess = (identityId: number | undefined, isAdmin: boolean) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      setHasAccess(true);
      setIsChecking(false);
      return;
    }
    if (!identityId) return;

    const supabase = getSupabaseClient();
    supabase
      .from("contacts")
      .select("is_chapter_leader")
      .eq("sales_id", identityId)
      .maybeSingle()
      .then(({ data }) => {
        setHasAccess(data?.is_chapter_leader === true);
        setIsChecking(false);
      });
  }, [identityId, isAdmin]);

  return { hasAccess, isChecking };
};

export const ChapterLeadersPage = () => {
  const translate = useTranslate();
  const notify = useNotify();
  const { identity, isPending: identityPending } = useGetIdentity();

  const isAdmin = !!identity?.administrator;
  const { hasAccess, isChecking } = useChapterLeaderAccess(identity?.id, isAdmin);

  const [resources, setResources] = useState<ChapterLeaderResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // null = Level 1 (categories)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // null = Level 2 (subcategories or direct links); string = Level 3 (links)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ChapterLeaderResource | null>(null);
  const [form, setForm] = useState<ResourceFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [manualsExpanded, setManualsExpanded] = useState(false);

  const resetNav = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("chapter_leader_resources")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching chapter leader resources:", error.message);
    } else {
      setResources((data ?? []) as ChapterLeaderResource[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess) fetchResources();
  }, [hasAccess, fetchResources]);

  const openAddDialog = () => {
    setEditingResource(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (resource: ChapterLeaderResource) => {
    setEditingResource(resource);
    setForm({
      title: resource.title,
      description: resource.description ?? "",
      url: resource.url,
      category: resource.category ?? "",
      subcategory: resource.subcategory ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setIsSaving(true);
    const supabase = getSupabaseClient();

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      url: form.url.trim(),
      category: form.category.trim() || null,
      subcategory: form.subcategory.trim() || null,
    };

    if (editingResource) {
      const { error } = await supabase
        .from("chapter_leader_resources")
        .update(payload)
        .eq("id", editingResource.id);
      if (error) {
        notify("ra.notification.http_error", { type: "error" });
      } else {
        notify("ra.notification.updated", { type: "success", messageArgs: { smart_count: 1 } });
        setDialogOpen(false);
        resetNav();
        fetchResources();
      }
    } else {
      const { error } = await supabase
        .from("chapter_leader_resources")
        .insert({ ...payload, created_by: identity?.id ?? null });
      if (error) {
        notify("ra.notification.http_error", { type: "error" });
      } else {
        notify("ra.notification.created", { type: "success" });
        setDialogOpen(false);
        resetNav();
        fetchResources();
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("chapter_leader_resources")
      .delete()
      .eq("id", id);
    if (error) {
      notify("ra.notification.http_error", { type: "error" });
    } else {
      notify("ra.notification.deleted", { type: "success", messageArgs: { smart_count: 1 } });
      setDeleteTargetId(null);
      resetNav();
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

  if (!hasAccess) {
    return <LockScreen />;
  }

  const uncategorizedLabel = translate("crm.chapter_leaders.uncategorized");

  // Level 1: group all resources by category
  const grouped = resources.reduce<Record<string, ChapterLeaderResource[]>>((acc, r) => {
    const key = r.category ?? uncategorizedLabel;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort();
  const pinnedCategories = new Set(["Chapter Logos", "Marketing Request", "Marketing Request Form"]);
  const filteredGroupKeys = groupKeys.filter(k => !pinnedCategories.has(k));

  // Level 2: resources in the selected category
  const categoryResources = selectedCategory ? (grouped[selectedCategory] ?? []) : [];
  const hasSubcategories = categoryResources.some(r => r.subcategory);

  // Level 2 subcategory grouping (used only when hasSubcategories)
  const subgrouped = categoryResources.reduce<Record<string, ChapterLeaderResource[]>>((acc, r) => {
    const key = r.subcategory ?? uncategorizedLabel;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});
  const subgroupKeys = Object.keys(subgrouped).sort();

  // Level 3: resources matching both category and subcategory
  const level3Resources = (selectedCategory && selectedSubcategory)
    ? categoryResources.filter(r => (r.subcategory ?? uncategorizedLabel) === selectedSubcategory)
    : [];

  const isLevel1 = selectedCategory === null;
  const isLevel2 = selectedCategory !== null && selectedSubcategory === null;
  const isLevel3 = selectedCategory !== null && selectedSubcategory !== null;

  const resourceCount = (items: ChapterLeaderResource[]) =>
    `${items.length} ${items.length === 1
      ? translate("crm.chapter_leaders.resource_singular")
      : translate("crm.chapter_leaders.resource_plural")}`;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      {isLevel1 && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{translate("crm.chapter_leaders.title")}</h1>
          {isAdmin && (
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              {translate("crm.chapter_leaders.add_resource")}
            </Button>
          )}
        </div>
      )}

      {isLevel2 && (
        <div className="mb-6">
          <Button
            variant="ghost"
            className="-ml-2 mb-3 gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedCategory(null)}
          >
            <ChevronLeft className="w-4 h-4" />
            {translate("crm.chapter_leaders.back_to_categories")}
          </Button>
          <h1 className="text-2xl font-bold">{selectedCategory}</h1>
        </div>
      )}

      {isLevel3 && (
        <div className="mb-6">
          <Button
            variant="ghost"
            className="-ml-2 mb-3 gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedSubcategory(null)}
          >
            <ChevronLeft className="w-4 h-4" />
            {translate("crm.chapter_leaders.back_to_category", { category: selectedCategory })}
          </Button>
          <h1 className="text-2xl font-bold">{selectedSubcategory}</h1>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {isLoading && (
        <p className="text-sm text-muted-foreground">{translate("crm.common.loading")}</p>
      )}

      {/* ── Static Chapter Resources ─────────────────────────────────────── */}
      {!isLoading && isLevel1 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Chapter Resources
          </h2>
          <div className="grid grid-cols-2 gap-4">

            {/* Column 1, Row 1: KW CHISPA Chapter Leaders Roster */}
            <Card
              style={{ gridColumn: 1, gridRow: 1 }}
              className="cursor-pointer hover:bg-muted/40 transition-colors border-l-4 border-l-[#CC0000]"
              onClick={() =>
                window.open(
                  "https://docs.google.com/spreadsheets/d/1Cj9GSyJks3joujS3IsMDcrWtac0C5SrU5TyxZv1kqXo/edit?usp=sharing",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              <CardContent className="py-2 px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                    <p className="font-semibold text-base truncate">
                      KW CHISPA Chapter Leaders Roster
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>

            {/* Column 1, Row 2: KW CHISPA Chapter Leadership Manuals */}
            <Card
              style={{ gridColumn: 1, gridRow: 2 }}
              className="cursor-pointer hover:bg-muted/40 transition-colors border-l-4 border-l-[#CC0000]"
              onClick={() => setManualsExpanded((v) => !v)}
            >
              <CardContent className="py-2 px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <p className="font-semibold text-base truncate">
                      KW CHISPA Chapter Leadership Manuals
                    </p>
                  </div>
                  {manualsExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </div>
                {manualsExpanded && (
                  <div className="mt-3 flex flex-col gap-2 pl-7">
                    <a
                      href="https://yxebmtukofvfthkzaknc.supabase.co/storage/v1/object/public/chapter-leader-resources/KW%20CHISPA%20Chapter%20Leadership%20Council%20Covenant.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      CLC Covenant
                    </a>
                    <a
                      href="https://yxebmtukofvfthkzaknc.supabase.co/storage/v1/object/public/chapter-leader-resources/KW%20CHISPA%20%20Chapter%20Leadership%20Council%20(CLC)%20Policies%20and%20Guidelines%20Manual.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      CLC Policies and Guidelines Manual
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column 1, Row 3: Chapter Logos (dynamic — category from DB) */}
            {grouped["Chapter Logos"] && (
              <Card
                style={{ gridColumn: 1, gridRow: 3 }}
                className="cursor-pointer hover:bg-muted/40 transition-colors border-l-4 border-l-[#CC0000]"
                onClick={() => setSelectedCategory("Chapter Logos")}
              >
                <CardContent className="py-2 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-base truncate">Chapter Logos</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {resourceCount(grouped["Chapter Logos"])}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Column 2, Row 1: KW CHISPA Regions Calendar */}
            <Card
              style={{ gridColumn: 2, gridRow: 1 }}
              className="cursor-pointer hover:bg-muted/40 transition-colors border-l-4 border-l-[#CC0000]"
              onClick={() =>
                window.open(
                  "https://docs.google.com/spreadsheets/d/1TkCCKKLcbGqStRhhYXyFIHJpDdGkFPyq/edit?gid=214935856#gid=214935856",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              <CardContent className="py-2 px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                    <p className="font-semibold text-base truncate">
                      KW CHISPA Regions Calendar
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>

            {/* Column 2, Row 2: Eventbrite Templates Coming Soon (static, not clickable) */}
            <Card
              style={{ gridColumn: 2, gridRow: 2 }}
              className="border-l-4 border-l-[#CC0000]"
            >
              <CardContent className="py-2 px-5">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-semibold text-base">Eventbrite Templates Coming Soon</p>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 2, Row 3: Marketing Request Form (dynamic — category from DB) */}
            {(() => {
              const mrKey = grouped["Marketing Request Form"]
                ? "Marketing Request Form"
                : grouped["Marketing Request"]
                ? "Marketing Request"
                : null;
              if (!mrKey) return null;
              return (
                <Card
                  style={{ gridColumn: 2, gridRow: 3 }}
                  className="cursor-pointer hover:bg-muted/40 transition-colors border-l-4 border-l-[#CC0000]"
                  onClick={() => setSelectedCategory(mrKey)}
                >
                  <CardContent className="py-2 px-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-base truncate">{mrKey}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {resourceCount(grouped[mrKey])}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
      )}

      {/* Level 1: remaining category cards (pinned categories are shown in Chapter Resources above) */}
      {!isLoading && isLevel1 && (
        resources.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">{translate("crm.chapter_leaders.empty")}</p>
          </div>
        ) : filteredGroupKeys.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredGroupKeys.map((category) => (
              <Card
                key={category}
                className="cursor-pointer hover:bg-muted/40 transition-colors border-l-4 border-l-[#CC0000]"
                onClick={() => setSelectedCategory(category)}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-base truncate">{category}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {resourceCount(grouped[category])}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null
      )}

      {/* Level 2a: subcategory cards (when category has subcategories) */}
      {!isLoading && isLevel2 && hasSubcategories && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subgroupKeys.map((subcategory) => (
            <Card
              key={subcategory}
              className="cursor-pointer hover:bg-muted/40 transition-colors border-l-4 border-l-[#CC0000]"
              onClick={() => setSelectedSubcategory(subcategory)}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-base truncate">{subcategory}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {resourceCount(subgrouped[subcategory])}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Level 2b: resource list directly (when category has no subcategories) */}
      {!isLoading && isLevel2 && !hasSubcategories && (
        categoryResources.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">{translate("crm.chapter_leaders.empty")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {categoryResources.map((resource) => (
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
        )
      )}

      {/* Level 3: resource list for selected category + subcategory */}
      {!isLoading && isLevel3 && (
        level3Resources.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">{translate("crm.chapter_leaders.empty")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {level3Resources.map((resource) => (
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
        )
      )}

      {/* ── Add / Edit dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingResource
                ? translate("crm.chapter_leaders.form.edit_title")
                : translate("crm.chapter_leaders.form.add_title")}
            </DialogTitle>
          </DialogHeader>
          <ResourceFormFields form={form} setForm={setForm} translate={translate} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {translate("crm.chapter_leaders.form.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.title.trim() || !form.url.trim()}
            >
              {isSaving
                ? translate("crm.common.loading")
                : translate("crm.chapter_leaders.form.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ─────────────────────────────────────────── */}
      <Dialog open={deleteTargetId !== null} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{translate("crm.chapter_leaders.delete_confirm")}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              {translate("crm.chapter_leaders.form.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTargetId !== null && handleDelete(deleteTargetId)}
            >
              {translate("crm.chapter_leaders.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

ChapterLeadersPage.path = "/chapter-leaders";

// ─── Sub-components ───────────────────────────────────────────────────────────

const ResourceFormFields = ({
  form,
  setForm,
  translate,
}: {
  form: ResourceFormData;
  setForm: React.Dispatch<React.SetStateAction<ResourceFormData>>;
  translate: (key: string) => string;
}) => (
  <div className="flex flex-col gap-4 pt-2">
    <div className="flex flex-col gap-1.5">
      <Label>{translate("crm.chapter_leaders.form.title_label")}</Label>
      <Input
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label>{translate("crm.chapter_leaders.form.category")}</Label>
      <Input
        value={form.category}
        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        placeholder={translate("crm.chapter_leaders.form.category_placeholder")}
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label>{translate("crm.chapter_leaders.form.subcategory")}</Label>
      <Input
        value={form.subcategory}
        onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
        placeholder={translate("crm.chapter_leaders.form.subcategory_placeholder")}
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label>{translate("crm.chapter_leaders.form.description")}</Label>
      <Textarea
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        rows={3}
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label>{translate("crm.chapter_leaders.form.url")}</Label>
      <Input
        value={form.url}
        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
        placeholder="https://"
      />
    </div>
  </div>
);

const LockScreen = () => {
  const translate = useTranslate();
  return (
    <div className="max-w-md mx-auto py-24 px-4 text-center">
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-muted p-5">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-3">
        {translate("crm.chapter_leaders.locked_title")}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {translate("crm.chapter_leaders.locked_message")}
      </p>
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
  resource: ChapterLeaderResource;
  isAdmin: boolean;
  onEdit: (r: ChapterLeaderResource) => void;
  onDelete: (id: string) => void;
  translate: (key: string) => string;
}) => (
  <Card className="hover:bg-muted/40 transition-colors border-l-4 border-l-[#CC0000]">
    <CardContent className="py-2 px-5">
      <div className="flex items-start gap-3">
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
            {translate("crm.chapter_leaders.open")}
          </Button>
          {isAdmin && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(resource)}
                aria-label={translate("crm.chapter_leaders.edit")}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(resource.id)}
                aria-label={translate("crm.chapter_leaders.delete")}
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
