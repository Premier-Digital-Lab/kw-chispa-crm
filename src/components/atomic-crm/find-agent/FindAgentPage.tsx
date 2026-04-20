import { useState, useCallback } from "react";
import { useTranslate } from "ra-core";
import { Search, MessageCircle, MapPin, Building2, Phone, Mail, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { getSupabaseClient } from "../providers/supabase/supabase";
import type { Contact } from "../types";

type SearchFields = {
  name: string;
  city: string;
  state: string;
  county: string;
  language: string;
  marketCenter: string;
  agentRole: string;
  countriesServed: string;
};

const emptyFields: SearchFields = {
  name: "",
  city: "",
  state: "",
  county: "",
  language: "",
  marketCenter: "",
  agentRole: "",
  countriesServed: "",
};

const isAnyFieldFilled = (fields: SearchFields) =>
  Object.values(fields).some((v) => v.trim() !== "");

const useAgentSearch = () => {
  const [results, setResults] = useState<Contact[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (fields: SearchFields) => {
    setIsSearching(true);
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from("contacts")
        .select(
          "id,first_name,last_name,agent_role,market_center_name,mc_city,mc_state," +
          "languages_spoken,cities_served,counties_served,countries_served,cell_number,email_jsonb,background"
        )
        .eq("member_status", "Active")
        .order("last_name", { ascending: true })
        .limit(25);

      if (fields.name.trim()) {
        const n = fields.name.trim();
        query = query.or(`first_name.ilike.%${n}%,last_name.ilike.%${n}%`);
      }
      if (fields.city.trim()) {
        const city = fields.city.trim();
        query = query.or(`mc_city.ilike.%${city}%,cities_served.cs.{"${city}"}`);
      }
      if (fields.state.trim()) {
        const state = fields.state.trim();
        query = query.or(`mc_state.ilike.%${state}%,states_served.cs.{"${state}"}`);
      }
      if (fields.county.trim()) {
        query = query.contains("counties_served", [fields.county.trim()]);
      }
      if (fields.language.trim()) {
        query = query.contains("languages_spoken", [fields.language.trim()]);
      }
      if (fields.marketCenter.trim()) {
        query = query.ilike("market_center_name", `%${fields.marketCenter.trim()}%`);
      }
      if (fields.agentRole) {
        query = query.eq("agent_role", fields.agentRole);
      }
      if (fields.countriesServed.trim()) {
        query = query.contains("countries_served", [fields.countriesServed.trim()]);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Agent search error:", error.message);
        setResults([]);
      } else {
        setResults((data ?? []) as Contact[]);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  return { results, isSearching, search };
};

export const FindAgentPage = () => {
  const translate = useTranslate();
  const [fields, setFields] = useState<SearchFields>(emptyFields);
  const [hasSearched, setHasSearched] = useState(false);
  const { results, isSearching, search } = useAgentSearch();

  const canSearch = isAnyFieldFilled(fields);

  const handleSearch = () => {
    if (!canSearch || isSearching) return;
    setHasSearched(true);
    search(fields);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSearch) handleSearch();
  };

  const handleFieldChange = (key: keyof SearchFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-1">
        {translate("crm.find_agent.title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {translate("crm.find_agent.subtitle")}
      </p>

      {/* Search form */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SearchField
              label={translate("crm.find_agent.form.name")}
              value={fields.name}
              onChange={(v) => handleFieldChange("name", v)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Maria Garcia"
            />
            <SearchField
              label={translate("crm.find_agent.form.market_center")}
              value={fields.marketCenter}
              onChange={(v) => handleFieldChange("marketCenter", v)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. KW Austin"
            />
            <SearchField
              label={translate("crm.find_agent.form.language")}
              value={fields.language}
              onChange={(v) => handleFieldChange("language", v)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Spanish"
            />
            <SearchField
              label={translate("crm.find_agent.form.city")}
              value={fields.city}
              onChange={(v) => handleFieldChange("city", v)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Austin"
            />
            <SearchField
              label={translate("crm.find_agent.form.state")}
              value={fields.state}
              onChange={(v) => handleFieldChange("state", v)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. TX"
            />
            <SearchField
              label={translate("crm.find_agent.form.county")}
              value={fields.county}
              onChange={(v) => handleFieldChange("county", v)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Travis"
            />
            <SearchField
              label={translate("crm.find_agent.form.countries_served")}
              value={fields.countriesServed}
              onChange={(v) => handleFieldChange("countriesServed", v)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Mexico"
            />
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">
                {translate("crm.find_agent.form.agent_role")}
              </Label>
              <Select
                value={fields.agentRole}
                onValueChange={(v) => handleFieldChange("agentRole", v === "_all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={translate("crm.find_agent.form.agent_role_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{translate("crm.find_agent.form.agent_role_all")}</SelectItem>
                  <SelectItem value="Solo Agent">Solo Agent</SelectItem>
                  <SelectItem value="Team Member">Team Member</SelectItem>
                  <SelectItem value="Team Lead">Team Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handleSearch}
                disabled={!canSearch || isSearching}
              >
                <Search className="w-4 h-4 mr-2" />
                {isSearching
                  ? translate("crm.common.loading")
                  : translate("crm.find_agent.form.search")}
              </Button>
            </div>
          </div>

          {!canSearch && (
            <p className="text-xs text-muted-foreground mt-3">
              {translate("crm.find_agent.form.at_least_one_required")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chat assistant hint */}
      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-6 px-1">
        <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{translate("crm.find_agent.chat_hint")}</span>
      </div>

      {/* Results */}
      {hasSearched && !isSearching && (
        <>
          {results && results.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {translate("crm.find_agent.results.count", {
                  smart_count: results.length,
                  _: `${results.length} member(s) found`,
                })}
              </p>
              {results.map((contact) => (
                <AgentCard key={contact.id} contact={contact} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">
                {translate("crm.find_agent.results.no_results")}
              </p>
              <p className="text-sm mt-1">
                {translate("crm.find_agent.results.no_results_hint")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

FindAgentPage.path = "/find-agent";

// ─── Sub-components ───────────────────────────────────────────────────────────

const SearchField = ({
  label,
  value,
  onChange,
  onKeyDown,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
    />
  </div>
);

const AgentCard = ({ contact }: { contact: Contact }) => {
  const firstEmail = contact.email_jsonb?.[0]?.email;
  const locationParts = [contact.mc_city, contact.mc_state].filter(Boolean);
  const location = locationParts.join(", ");

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <a
              href={`/contacts/${contact.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold hover:underline"
            >
              {contact.first_name} {contact.last_name}
            </a>
            {contact.agent_role && (
              <p className="text-sm text-muted-foreground">{contact.agent_role}</p>
            )}

            {contact.market_center_name && (
              <div className="flex items-center gap-1.5 mt-1.5 text-sm">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{contact.market_center_name}</span>
              </div>
            )}

            {location && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{location}</span>
              </div>
            )}

            <ArrayBadges items={contact.languages_spoken} label="Languages" />
            <ArrayBadges items={contact.cities_served} label="Cities Served" />
            {contact.mc_state && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">State / Province / Region:</span>{" "}
                {contact.mc_state}
              </p>
            )}
            <ArrayBadges items={contact.countries_served} label="Countries Served" />

            {contact.background && (
              <>
                <Separator className="my-2" />
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {contact.background}
                </p>
              </>
            )}
          </div>

          {/* Contact info */}
          <div className="flex flex-col gap-1.5 text-sm shrink-0">
            {contact.cell_number && (
              <a
                href={`tel:${contact.cell_number}`}
                className="flex items-center gap-1.5 hover:underline"
              >
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                {contact.cell_number}
              </a>
            )}
            {firstEmail && (
              <a
                href={`mailto:${firstEmail}`}
                className="flex items-center gap-1.5 hover:underline truncate max-w-[200px]"
              >
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                {firstEmail}
              </a>
            )}
            <a
              href={`/contacts/${contact.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-1"
            >
              View Profile →
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ArrayBadges = ({
  items,
  label,
}: {
  items?: string[] | null;
  label: string;
}) => {
  if (!items || items.length === 0) return null;
  return (
    <p className="text-sm text-muted-foreground mt-1">
      <span className="font-medium text-foreground">{label}:</span>{" "}
      {items.join(", ")}
    </p>
  );
};
