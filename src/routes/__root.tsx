import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { OrderProvider } from "../lib/order-store";
import { ensureAnonymousSession } from "../lib/supabase";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("common.notFoundTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.notFoundText")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("common.errorTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.errorText")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("common.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KidStory AI — Jouw kind, de held van een echt familieverhaal" },
      {
        name: "description",
        content:
          "Van een echte familieherinnering naar een geïllustreerd sprookjesboek met het gezicht van je kind én de stem van opa via QR-code. €34,99, gratis verzending in NL.",
      },
      { name: "author", content: "KidStory AI" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "KidStory AI — Jouw kind, de held van een echt familieverhaal" },
      { name: "twitter:title", content: "KidStory AI — Jouw kind, de held van een echt familieverhaal" },
      { property: "og:description", content: "Van een echte familieherinnering naar een geïllustreerd sprookjesboek met het gezicht van je kind én de stem van opa via QR-code. €34,99, gratis verzending in NL." },
      { name: "twitter:description", content: "Van een echte familieherinnering naar een geïllustreerd sprookjesboek met het gezicht van je kind én de stem van opa via QR-code. €34,99, gratis verzending in NL." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/513bf6f067af9f0be2dba786bfdfb1e8/id-preview-3553f0b3--130c1919-7769-4538-8608-5d1026b90946.lovable.app-1786105899175.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/513bf6f067af9f0be2dba786bfdfb1e8/id-preview-3553f0b3--130c1919-7769-4538-8608-5d1026b90946.lovable.app-1786105899175.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..800;1,400..700&family=Inter:wght@300..700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Restore the user's language preference after SSR hydration.
  // Must run in useEffect (client-only) to avoid SSR/client HTML mismatch.
  useEffect(() => {
    const stored = localStorage.getItem("kidstory_lang");
    if (stored === "nl" || stored === "en") {
      i18n.changeLanguage(stored);
    }
  }, []);

  // Give every visitor a real Supabase session before any domain-model
  // write happens. Silent and non-blocking: the user must never see this,
  // and the existing prototype flow must keep working even if it fails.
  //
  // Must be a *static* import used from a component that's always in the
  // initial bundle (this one) — a dynamic import() elsewhere pulls
  // supabase.ts into its own lazily-loaded chunk that's only fetched when
  // that call site actually runs, which is never on page load. Verified by
  // building and inspecting the real output: with this static import, this
  // module's code is inlined into the eagerly-loaded root chunk; without
  // it, it lands in a separate chunk that never loads until first user
  // interaction with a feature that dynamically imports it.
  useEffect(() => {
    void ensureAnonymousSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <OrderProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster position="top-center" />
      </OrderProvider>
    </QueryClientProvider>
  );
}
