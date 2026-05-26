import { useGetIdentity } from "ra-core";
import { useQuery } from "@tanstack/react-query";
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
  "market_center_team_leader",
  "mc_tl_phone",
  "mc_tl_email",
  "languages_spoken",
  "cities_served",
  "states_served",
  "title",
] as const;

type ContactRow = Record<(typeof REQUIRED_FIELDS)[number], unknown>;

const isFieldFilled = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined || value === "") return false;
  return true;
};

export const useProfileComplete = () => {
  const { identity, isPending: isPendingIdentity } = useGetIdentity();

  const { data, isPending: isPendingQuery } = useQuery({
    queryKey: ["profile-complete", identity?.id],
    queryFn: async (): Promise<ContactRow | null> => {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("contacts")
        .select(REQUIRED_FIELDS.join(", "))
        .eq("sales_id", identity!.id)
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

  return { isComplete, isLoading, contactId };
};
