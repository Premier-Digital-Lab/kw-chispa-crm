import { useEffect } from "react";
import { mergeTranslations, useLocaleState } from "ra-core";
import polyglotI18nProvider from "ra-i18n-polyglot";
import englishMessages from "ra-language-english";
import { raSupabaseEnglishMessages } from "ra-supabase-language-english";
import { englishCrmMessages } from "./englishCrmMessages";
import { spanishCrmMessages } from "./spanishCrmMessages";
import { raSpanishMessages } from "./raSpanishMessages";

const raSupabaseEnglishMessagesOverride = {
  "ra-supabase": {
    auth: {
      password_reset: "Check your emails for a Reset Password message.",
    },
  },
};

const englishCatalog = mergeTranslations(
  englishMessages,
  raSupabaseEnglishMessages,
  raSupabaseEnglishMessagesOverride,
  englishCrmMessages,
);

const spanishCatalog = mergeTranslations(
  englishCatalog,
  raSpanishMessages,
  spanishCrmMessages,
);

export const getInitialLocale = (): "en" | "es" => {
  if (typeof navigator === "undefined") {
    return "en";
  }

  const browserLocale = navigator.languages?.[0] ?? navigator.language;
  if (browserLocale?.toLowerCase().startsWith("es")) {
    return "es";
  }

  return "en";
};

export const i18nProvider = polyglotI18nProvider(
  (locale) => {
    if (locale === "es") {
      return spanishCatalog;
    }
    return englishCatalog;
  },
  getInitialLocale(),
  [
    { locale: "en", name: "English" },
    { locale: "es", name: "Español" },
  ],
  { allowMissing: true },
);

// French support was removed; coerce any locale still persisted from before
// (browser-detected or user-selected) so the language selector doesn't render blank.
const UNSUPPORTED_LOCALES = ["fr"];

export const useCoerceUnsupportedLocale = () => {
  const [locale, setLocale] = useLocaleState();
  useEffect(() => {
    if (UNSUPPORTED_LOCALES.includes(locale)) {
      setLocale("en");
    }
  }, [locale, setLocale]);
};

export const testI18nProvider = polyglotI18nProvider(
  () => englishCatalog,
  "en",
  [{ locale: "en", name: "English" }],
  { allowMissing: true },
);
