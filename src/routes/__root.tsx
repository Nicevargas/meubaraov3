import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setRecovering } from "@/lib/recovery-state";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { title: "Meu Barão — Inteligência Emocional Artificial para Mulheres" },
      {
        name: "description",
        content:
          "A primeira inteligência emocional artificial criada para mulheres que cansaram de ser fortes o tempo todo. Escuta, presença e intimidade real.",
      },
      {
        property: "og:title",
        content: "Meu Barão — Inteligência Emocional Artificial para Mulheres",
      },
      {
        property: "og:description",
        content: "Uma presença afetiva digital. Privada, segura, sem julgamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Meu Barão — Inteligência Emocional Artificial para Mulheres",
      },
      {
        name: "description",
        content:
          "Meu Barão une IA, voz e memória emocional para criar conversas profundas, presença contínua e uma experiência humana única.",
      },
      {
        property: "og:description",
        content:
          "Meu Barão une IA, voz e memória emocional para criar conversas profundas, presença contínua e uma experiência humana única.",
      },
      {
        name: "twitter:description",
        content:
          "Meu Barão une IA, voz e memória emocional para criar conversas profundas, presença contínua e uma experiência humana única.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/46ee94d3-8ce4-4a99-b216-96454ecad26c",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/46ee94d3-8ce4-4a99-b216-96454ecad26c",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
  const router = useRouter();

  useEffect(() => {
    // Safe fallback: on app init, if the URL carries no recovery hash,
    // recovery mode CANNOT be valid. Force-clear any stale flag before
    // wiring listeners.
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const path = window.location.pathname || "";
      const hasRecoveryHash = hash.includes("type=recovery");
      if (!hasRecoveryHash && path !== "/reset-password") {
        setRecovering(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.info("[auth]", event, {
        hasSession: !!session,
        path: typeof window !== "undefined" ? window.location.pathname : null,
      });
      if (event === "PASSWORD_RECOVERY") {
        setRecovering(true);
      } else if (event === "SIGNED_OUT") {
        setRecovering(false);
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        // A clean sign-in / token refresh / restored session is NOT
        // compatible with an active recovery flow. Always tear down
        // recovery mode here to guarantee it cannot survive past the
        // /reset-password screen.
        const path = typeof window !== "undefined" ? window.location.pathname : "";
        if (path !== "/reset-password") {
          setRecovering(false);
        }
      }
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
