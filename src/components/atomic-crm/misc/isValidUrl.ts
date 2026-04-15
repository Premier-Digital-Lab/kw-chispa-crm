export const isValidUrl = (url: string) => {
  if (!url) return;
  try {
    new URL(url);
  } catch {
    return {
      message: "crm.validation.invalid_url",
      args: { _: "Must be a valid URL" },
    };
  }
};
