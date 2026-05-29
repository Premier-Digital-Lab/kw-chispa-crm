import { useGetIdentity } from "ra-core";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "../providers/supabase/supabase";

const REQUIRED_FIELDS = [
  "id",
  "market_center_name",
  "agent_role",
  "mc_street_address",
  "mc_city",
  "mc_state",
  "mc_zip_code",
  "mc_country",
  "languages_spoken",
  "cities_served",
  "states_served",
] as const;

type ContactRow = Record<(typeof REQUIRED_FIELDS)[number], unknown>;

const isFieldFilled = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined || value === "") return false;
  return true;
};

export const useProfileComplete = () => {
  const { identity, isPending: isPendingIdentity } = useGetIdentity();
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data }) => {
      setAuthUserId(data.session?.user.id ?? null);
    });
  }, []);

  const { data, isPending: isPendingQuery } = useQuery({
    queryKey: ["profile-complete", identity?.id],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<ContactRow | null> => {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return null;
      // sales_id is bigint; look up the sales row first to get the integer id
      const { data: salesRow } = await supabase
        .from("sales")
        .select("id")
        .eq("user_id", uid)
        .single();
      if (!salesRow?.id) return null;
      const { data } = await supabase
        .from("contacts")
        .select(REQUIRED_FIELDS.join(", "))
        .eq("sales_id", salesRow.id)
        .single();
      return data as ContactRow | null;
    },
    enabled: !!identity?.id && !isPendingIdentity,
  });

  const isLoading = isPendingIdentity || (!!identity?.id && isPendingQuery);

  const checkFields = REQUIRED_FIELDS.filter((f) => f !== "id");
  const isComplete =
    !isLoading &&
    !!data &&
    checkFields.every((field) => isFieldFilled((data as ContactRow)[field]));

  const contactId = data ? String((data as ContactRow)["id"]) : null;

  return { isComplete, isLoading, contactId, authUserId };
};
