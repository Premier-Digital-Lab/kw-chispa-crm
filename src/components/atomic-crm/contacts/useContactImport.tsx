import { useDataProvider, useGetIdentity, type DataProvider } from "ra-core";
import { useCallback, useMemo } from "react";

import type { Company, Tag } from "../types";

export type ContactImportSchema = {
  first_name: string;
  last_name: string;
  gender: string;
  title: string;
  company: string;
  email_work: string;
  email_home: string;
  email_other: string;
  background: string;
  avatar: string;
  first_seen: string;
  last_seen: string;
  has_newsletter: string;
  tags: string;
  linkedin_url: string;
  cell_number: string;
  agent_role: string;
  market_center_name: string;
  mc_street_address: string;
  mc_city: string;
  mc_state: string;
  mc_zip_code: string;
  market_center_team_leader: string;
  market_center_tl_phone: string;
  market_center_tl_email: string;
  languages_spoken: string;
  countries_served: string;
  cities_served: string;
  counties_served: string;
  states_served: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  kw_website: string;
  membership_tier: string;
  join_date: string;
  member_status: string;
};

export function useContactImport() {
  const today = new Date().toISOString();
  const user = useGetIdentity();
  const dataProvider = useDataProvider();

  // company cache to avoid creating the same company multiple times and costly roundtrips
  // Cache is dependent of dataProvider, so it's safe to use it as a dependency
  const companiesCache = useMemo(
    () => new Map<string, Company>(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataProvider],
  );
  const getCompanies = useCallback(
    async (names: string[]) =>
      fetchRecordsWithCache<Company>(
        "companies",
        companiesCache,
        names,
        (name) => ({
          name,
          created_at: new Date().toISOString(),
          sales_id: user?.identity?.id,
        }),
        dataProvider,
      ),
    [companiesCache, user?.identity?.id, dataProvider],
  );

  // Tags cache to avoid creating the same tag multiple times and costly roundtrips
  // Cache is dependent of dataProvider, so it's safe to use it as a dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tagsCache = useMemo(() => new Map<string, Tag>(), [dataProvider]);
  const getTags = useCallback(
    async (names: string[]) =>
      fetchRecordsWithCache<Tag>(
        "tags",
        tagsCache,
        names,
        (name) => ({
          name,
          color: "#f9f9f9",
        }),
        dataProvider,
      ),
    [tagsCache, dataProvider],
  );

  const processBatch = useCallback(
    async (batch: ContactImportSchema[]) => {
      const [companies, tags] = await Promise.all([
        getCompanies(
          batch
            .map((contact) => contact.company?.trim())
            .filter((name) => name),
        ),
        getTags(batch.flatMap((batch) => parseTags(batch.tags))),
      ]);

      await Promise.all(
        batch.map(
          async ({
            first_name,
            last_name,
            gender,
            title,
            email_work,
            email_home,
            email_other,
            background,
            first_seen,
            last_seen,
            has_newsletter,
            company: companyName,
            tags: tagNames,
            linkedin_url,
            cell_number,
            agent_role,
            market_center_name,
            mc_street_address,
            mc_city,
            mc_state,
            mc_zip_code,
            market_center_team_leader,
            market_center_tl_phone,
            market_center_tl_email,
            languages_spoken,
            countries_served,
            cities_served,
            counties_served,
            states_served,
            facebook_url,
            instagram_url,
            tiktok_url,
            kw_website,
            membership_tier,
            join_date,
            member_status,
          }) => {
            const email_jsonb = [
              { email: email_work, type: "Work" },
              { email: email_home, type: "Home" },
              { email: email_other, type: "Other" },
            ].filter(({ email }) => email);
            const company = companyName?.trim()
              ? companies.get(companyName.trim())
              : undefined;
            const tagList = parseTags(tagNames)
              .map((name) => tags.get(name))
              .filter((tag): tag is Tag => !!tag);

            return dataProvider.create("contacts", {
              data: {
                first_name,
                last_name,
                gender,
                title,
                email_jsonb,
                background,
                first_seen: first_seen
                  ? new Date(first_seen).toISOString()
                  : today,
                last_seen: last_seen
                  ? new Date(last_seen).toISOString()
                  : today,
                has_newsletter,
                company_id: company?.id,
                tags: tagList.map((tag) => tag.id),
                sales_id: user?.identity?.id,
                linkedin_url: linkedin_url || undefined,
                cell_number: cell_number || undefined,
                agent_role: agent_role || undefined,
                market_center_name: market_center_name || undefined,
                mc_street_address: mc_street_address || undefined,
                mc_city: mc_city || undefined,
                mc_state: mc_state || undefined,
                mc_zip_code: mc_zip_code || undefined,
                market_center_team_leader: market_center_team_leader || undefined,
                market_center_tl_phone: market_center_tl_phone || undefined,
                market_center_tl_email: market_center_tl_email || undefined,
                languages_spoken: parseArray(languages_spoken),
                countries_served: parseArray(countries_served),
                cities_served: parseArray(cities_served),
                counties_served: parseArray(counties_served),
                states_served: parseArray(states_served),
                facebook_url: facebook_url || undefined,
                instagram_url: instagram_url || undefined,
                tiktok_url: tiktok_url || undefined,
                kw_website: kw_website || undefined,
                membership_tier: membership_tier || undefined,
                join_date: join_date || undefined,
                member_status: member_status || undefined,
              },
            });
          },
        ),
      );
    },
    [dataProvider, getCompanies, getTags, user?.identity?.id, today],
  );

  return processBatch;
}

const fetchRecordsWithCache = async function <T>(
  resource: string,
  cache: Map<string, T>,
  names: string[],
  getCreateData: (name: string) => Partial<T>,
  dataProvider: DataProvider,
) {
  const trimmedNames = [...new Set(names.map((name) => name.trim()))];
  const uncachedRecordNames = trimmedNames.filter((name) => !cache.has(name));

  // check the backend for existing records
  if (uncachedRecordNames.length > 0) {
    const response = await dataProvider.getList(resource, {
      filter: {
        "name@in": `(${uncachedRecordNames
          .map((name) => `"${name}"`)
          .join(",")})`,
      },
      pagination: { page: 1, perPage: trimmedNames.length },
      sort: { field: "id", order: "ASC" },
    });
    for (const record of response.data) {
      cache.set(record.name.trim(), record);
    }
  }

  // create missing records in parallel
  await Promise.all(
    uncachedRecordNames.map(async (name) => {
      if (cache.has(name)) return;
      const response = await dataProvider.create(resource, {
        data: getCreateData(name),
      });
      cache.set(name, response.data);
    }),
  );

  // now all records are in cache, return a map of all records
  return trimmedNames.reduce((acc, name) => {
    acc.set(name, cache.get(name) as T);
    return acc;
  }, new Map<string, T>());
};

const parseTags = (tags: string) =>
  tags
    ?.split(",")
    ?.map((tag: string) => tag.trim())
    ?.filter((tag: string) => tag) ?? [];

const parseArray = (value: string): string[] =>
  value?.split("|").map((s) => s.trim()).filter(Boolean) ?? [];
