import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import nl from "./locales/nl.json";
import en from "./locales/en.json";

// Always start with "nl" so SSR and initial client render match (no hydration mismatch).
// The user's stored preference is applied in RootComponent's useEffect, after hydration.
i18n
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nl },
      en: { translation: en },
    },
    lng: "nl",
    fallbackLng: "nl",
    supportedLngs: ["nl", "en"],
    interpolation: {
      escapeValue: false,
    },
    react: {
      // Prevents useTranslation() from throwing a Suspense Promise.
      // Without this, components inside error boundaries crash because
      // there is no <Suspense> above TanStack Router's error boundary.
      useSuspense: false,
    },
  });

export default i18n;
