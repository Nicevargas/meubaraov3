globalThis.__nitro_main__ = import.meta.url; globalThis.__nitro_main__ = import.meta.url;
function setupVite({ manifest: manifest2, services: services2 }) {
  globalThis.__VITE_MANIFEST__ = manifest2;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function nitroViteFetch(input, init) {
    const viteEnvName = getViteEnv(init) || getViteEnv(input);
    if (!viteEnvName) {
      return originalFetch(input, init);
    }
    const viteEnv = services2[viteEnvName];
    if (!viteEnv) {
      throw httpError(404);
    }
    if (typeof input === "string" && input[0] === "/") {
      input = new URL(input, "http://localhost");
    }
    const headers2 = new Headers(init?.headers || {});
    headers2.set("x-vite-env", viteEnvName);
    if (!(input instanceof Request) || init && Object.keys(init).join("") !== "viteEnv") {
      input = new Request(input, init);
    }
    return viteEnv.fetch(input);
  };
}
function getViteEnv(input) {
  if (!input || typeof input !== "object") {
    return;
  }
  if ("viteEnv" in input) {
    return input.viteEnv;
  }
  if (input.headers) {
    return input.headers["x-vite-env"] || input.headers.get?.("x-vite-env") || Array.isArray(input.headers) && input.headers.find((h) => h[0].toLowerCase() === "x-vite-env")?.[1];
  }
}
const manifest = { "node_modules/react/cjs/react-jsx-runtime.production.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/react/jsx-runtime.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/react/cjs/react.production.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/react/index.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/scheduler/cjs/scheduler.production.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/scheduler/index.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/react-dom/cjs/react-dom.production.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/react-dom/index.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/react-dom/cjs/react-dom-client.production.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/react-dom/client.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/constants.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/getStartOptions.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/isServer/client.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/utils.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/invariant.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/lru-cache.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/new-process-route-tree.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/path.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/not-found.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/scroll-restoration.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/qss.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/searchParams.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/root.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/redirect.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/rewrite.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/stores.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/load-matches.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/history/dist/esm/index.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/router.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/defer.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/link.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/manifest.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/route.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/hash-scroll.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/seroval/dist/esm/production/index.mjs": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/ssr/serializer/transformer.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/ssr/serializer/RawStream.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/ssr/serializer/ShallowErrorPlugin.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/seroval-plugins/dist/esm/production/web.mjs": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/ssr/serializer/seroval-plugins.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/getDefaultSerovalPlugins.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/client-rpc/frame-decoder.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/client-rpc/serverFnFetcher.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/client-rpc/createClientRpc.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/client/ServerFunctionSerializationAdapter.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/cookie-es/dist/index.mjs": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/ssr/headers.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/ssr/ssr-match-id.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/ssr/ssr-client.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/utils.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/awaited.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/CatchBoundary.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/ClientOnly.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/routerContext.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/useRouter.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/matchContext.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/store/dist/esm/alien.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/store/dist/esm/atom.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.production.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/use-sync-external-store/shim/index.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.production.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/use-sync-external-store/shim/with-selector.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-store/dist/esm/useStore.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/useMatch.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/useLoaderData.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/useLoaderDeps.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/useParams.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/useSearch.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/useNavigate.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/useRouteContext.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/link.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/route.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/fileRoute.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/lazyRouteComponent.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/not-found.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/SafeFragment.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/renderRouteNotFound.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/router-core/dist/esm/scroll-restoration-script/client.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/scroll-restoration.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/Match.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/Transitioner.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/Matches.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/routerStores.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/router.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/RouterProvider.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/Asset.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/headContentUtils.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/HeadContent.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-router/dist/esm/Scripts.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-start/dist/esm/useServerFn.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/safeObjectMerge.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/getStartContextServerOnly.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/createServerFn.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/createMiddleware.js": { "file": "server.js" }, "node_modules/@tanstack/start-client-core/dist/esm/createStart.js": { "file": "server.js" }, "node_modules/tslib/tslib.es6.mjs": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@supabase/functions-js/dist/module/helper.js": { "file": "server.js" }, "node_modules/@supabase/functions-js/dist/module/types.js": { "file": "server.js" }, "node_modules/@supabase/functions-js/dist/module/FunctionsClient.js": { "file": "server.js" }, "node_modules/@supabase/postgrest-js/dist/index.mjs": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/lib/version.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/lib/constants.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/lib/serializer.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/lib/transformers.js": { "file": "server.js" }, "node_modules/@supabase/phoenix/priv/static/phoenix.mjs": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/phoenix/presenceAdapter.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/RealtimePresence.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/lib/normalizeChannelError.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/phoenix/channelAdapter.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/phoenix/socketAdapter.js": { "file": "server.js" }, "node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js": { "file": "server.js" }, "node_modules/iceberg-js/dist/index.mjs": { "file": "server.js" }, "node_modules/@supabase/storage-js/dist/index.mjs": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/version.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/constants.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/errors.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/base64url.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/helpers.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/fetch.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/types.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/local-storage.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/locks.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/polyfills.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/web3/ethereum.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/webauthn.errors.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/lib/webauthn.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/GoTrueClient.js": { "file": "server.js" }, "node_modules/@supabase/auth-js/dist/module/AuthClient.js": { "file": "server.js" }, "node_modules/@supabase/supabase-js/dist/index.mjs": { "file": "server.js" }, "src/integrations/supabase/connection.ts": { "file": "server.js" }, "src/integrations/supabase/client.ts": { "file": "server.js" }, "src/integrations/supabase/auth-attacher.ts": { "file": "server.js" }, "src/integrations/supabase/admin-client.ts": { "file": "server.js" }, "src/integrations/supabase/admin-auth-attacher.ts": { "file": "server.js" }, "src/start.ts": { "file": "server.js" }, "node_modules/@tanstack/query-core/build/modern/subscribable.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/focusManager.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/timeoutManager.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/utils.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/environmentManager.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/thenable.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/notifyManager.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/onlineManager.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/retryer.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/removable.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/infiniteQueryBehavior.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/query.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/queryObserver.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/mutation.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/mutationCache.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/queryCache.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/query-core/build/modern/queryClient.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-query/build/modern/IsRestoringProvider.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-query/build/modern/QueryErrorResetBoundary.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-query/build/modern/errorBoundaryUtils.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-query/build/modern/suspense.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-query/build/modern/useBaseQuery.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-query/build/modern/useQuery.js": { "file": "assets/index-CHfEt10I.js" }, "src/lib/recovery-state.ts": { "file": "assets/index-CHfEt10I.js" }, "src/styles.css?transform-only": { "file": "assets/index-CHfEt10I.js" }, "src/styles.css?url": { "file": "assets/index-CHfEt10I.js" }, "src/routes/__root.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/terms.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/assets/silence-hero.jpg": { "file": "assets/index-CHfEt10I.js" }, "src/routes/silence.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/signup.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/reset-password.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/privacy.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/planos.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/maintenance.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/login.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/contato.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/blocked.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/_authenticated.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/index.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/integrations/supabase/auth-middleware.ts": { "file": "assets/index-CHfEt10I.js" }, "src/lib/admin.functions.ts": { "file": "assets/index-CHfEt10I.js" }, "src/lib/admin-ops.functions.ts": { "file": "assets/index-CHfEt10I.js" }, "node_modules/clsx/dist/clsx.mjs": { "file": "assets/index-CHfEt10I.js" }, "node_modules/tailwind-merge/dist/bundle-mjs.mjs": { "file": "assets/index-CHfEt10I.js" }, "src/lib/utils.ts": { "file": "assets/index-CHfEt10I.js" }, "src/components/admin/StatCard.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/components/admin/SectionTitle.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.index.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.webhooks.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.users.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.system.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.segments.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.safety.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.retention.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.recovery.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.recover.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.plans.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.memory.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.login.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.heatmap.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.health.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.emotional.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.dashboard.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.cost.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.billing.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.audit.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.ai-health.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.admins.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.actions.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/_authenticated/ritual.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/_authenticated/profile.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/_authenticated/plans.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/_authenticated/memories.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/_authenticated/mandatory-consent.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/_authenticated/app.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/admin.users.$userId.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/_authenticated/checkout.$plan.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routeTree.gen.ts": { "file": "assets/index-CHfEt10I.js" }, "src/router.tsx": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/start-client-core/dist/esm/client/hydrateStart.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-start-client/dist/esm/hydrateStart.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-start-client/dist/esm/StartClient.js": { "file": "assets/index-CHfEt10I.js" }, "node_modules/@tanstack/react-start/dist/plugin/default-entry/client.tsx": { "file": "assets/index-CHfEt10I.js" }, "src/routes/terms.tsx?tsr-split=component": { "file": "assets/terms-BEkS0Y4v.js" }, "src/assets/silence-barao.jpg": { "file": "assets/silence-CHA66SNI.js" }, "src/assets/silence-hand.jpg": { "file": "assets/silence-CHA66SNI.js" }, "src/assets/silence-corridor.jpg": { "file": "assets/silence-CHA66SNI.js" }, "src/assets/silence-eyes.jpg": { "file": "assets/silence-CHA66SNI.js" }, "src/assets/silence-strength.jpg": { "file": "assets/silence-CHA66SNI.js" }, "src/routes/silence.tsx?tsr-split=component": { "file": "assets/silence-CHA66SNI.js" }, "src/routes/signup.tsx?tsr-split=component": { "file": "assets/signup-DuKH__ZS.js" }, "src/routes/reset-password.tsx?tsr-split=component": { "file": "assets/reset-password-CtTir_BF.js" }, "src/routes/privacy.tsx?tsr-split=component": { "file": "assets/privacy-D6jxm8Mt.js" }, "src/routes/planos.tsx?tsr-split=component": { "file": "assets/planos-KqQHcMA1.js" }, "src/routes/maintenance.tsx?tsr-split=component": { "file": "assets/maintenance-diLnxnUz.js" }, "src/routes/login.tsx?tsr-split=component": { "file": "assets/login-CYJEIOSA.js" }, "src/routes/contato.tsx?tsr-split=component": { "file": "assets/contato-CTDaScM5.js" }, "src/routes/blocked.tsx?tsr-split=component": { "file": "assets/blocked-zsJRrUxP.js" }, "node_modules/lucide-react/dist/esm/icons/activity.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/brain.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/credit-card.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/dollar-sign.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/flame.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/heart-pulse.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/layers.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/layout-dashboard.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/list-checks.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/menu.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/user-cog.js": { "file": "assets/admin-BaEOPoIV.js" }, "node_modules/lucide-react/dist/esm/icons/webhook.js": { "file": "assets/admin-BaEOPoIV.js" }, "src/components/admin/ForcePasswordChangeModal.tsx": { "file": "assets/admin-BaEOPoIV.js" }, "src/components/admin/AdminShell.tsx": { "file": "assets/admin-BaEOPoIV.js" }, "src/routes/admin.tsx?tsr-split=component": { "file": "assets/admin-BaEOPoIV.js" }, "src/lib/account-status.functions.ts": { "file": "assets/_authenticated-CO5bLMcJ.js" }, "src/routes/_authenticated.tsx?tsr-split=component": { "file": "assets/_authenticated-CO5bLMcJ.js" }, "node_modules/@tanstack/react-router/dist/esm/useLocation.js": { "file": "assets/useLocation-DnFmIXnL.js" }, "src/components/LiveChat.tsx": { "file": "assets/index-snAKmAaP.js" }, "src/assets/hero-window.jpg": { "file": "assets/index-snAKmAaP.js" }, "src/assets/hand-glass.jpg": { "file": "assets/index-snAKmAaP.js" }, "src/assets/barao.jpg": { "file": "assets/index-snAKmAaP.js" }, "src/routes/index.tsx?tsr-split=component": { "file": "assets/index-snAKmAaP.js" }, "src/assets/eyes-close.jpg": { "file": "assets/eyes-close-BuT1VrfZ.js" }, "src/assets/silk.jpg": { "file": "assets/silk-BuolN4zP.js" }, "src/assets/logo.png": { "file": "assets/logo-BydUzQ2H.js" }, "src/components/Atmosphere.tsx": { "file": "assets/Atmosphere-0YrXNUg3.js" }, "src/routes/admin.webhooks.tsx?tsr-split=component": { "file": "assets/admin.webhooks--R3z0lBp.js" }, "node_modules/lucide-react/dist/esm/icons/chevron-right.js": { "file": "assets/admin.users-lGwRB6GZ.js" }, "node_modules/lucide-react/dist/esm/icons/circle.js": { "file": "assets/admin.users-lGwRB6GZ.js" }, "node_modules/lucide-react/dist/esm/icons/ellipsis.js": { "file": "assets/admin.users-lGwRB6GZ.js" }, "node_modules/lucide-react/dist/esm/icons/log-in.js": { "file": "assets/admin.users-lGwRB6GZ.js" }, "node_modules/@radix-ui/react-menu/node_modules/@radix-ui/react-slot/dist/index.mjs": { "file": "assets/admin.users-lGwRB6GZ.js" }, "node_modules/@radix-ui/react-menu/dist/index.mjs": { "file": "assets/admin.users-lGwRB6GZ.js" }, "node_modules/@radix-ui/react-dropdown-menu/dist/index.mjs": { "file": "assets/admin.users-lGwRB6GZ.js" }, "src/components/ui/dropdown-menu.tsx": { "file": "assets/admin.users-lGwRB6GZ.js" }, "src/routes/admin.users.tsx?tsr-split=component": { "file": "assets/admin.users-lGwRB6GZ.js" }, "src/routes/admin.system.tsx?tsr-split=component": { "file": "assets/admin.system-P1mmsMiC.js" }, "src/routes/admin.segments.tsx?tsr-split=component": { "file": "assets/admin.segments-CI_3cn3T.js" }, "src/routes/admin.safety.tsx?tsr-split=component": { "file": "assets/admin.safety-BVQynMey.js" }, "src/lib/admin-retention.functions.ts": { "file": "assets/admin.retention-BixWDWaE.js" }, "src/routes/admin.retention.tsx?tsr-split=component": { "file": "assets/admin.retention-BixWDWaE.js" }, "src/routes/admin.recovery.tsx?tsr-split=component": { "file": "assets/admin.recovery-B7enSLdO.js" }, "src/routes/admin.recover.tsx?tsr-split=component": { "file": "assets/admin.recover-DhwK3Qn3.js" }, "node_modules/lucide-react/dist/esm/icons/chevron-down.js": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/lucide-react/dist/esm/icons/chevron-up.js": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/lucide-react/dist/esm/icons/pencil.js": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/lucide-react/dist/esm/icons/settings-2.js": { "file": "assets/admin.plans-DHTOp1MS.js" }, "src/components/ui/badge.tsx": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/@radix-ui/react-label/node_modules/@radix-ui/react-primitive/dist/index.mjs": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/@radix-ui/react-label/dist/index.mjs": { "file": "assets/admin.plans-DHTOp1MS.js" }, "src/components/ui/label.tsx": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/@radix-ui/react-tabs/dist/index.mjs": { "file": "assets/admin.plans-DHTOp1MS.js" }, "src/components/ui/tabs.tsx": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/@radix-ui/react-select/node_modules/@radix-ui/react-slot/dist/index.mjs": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/@radix-ui/react-visually-hidden/dist/index.mjs": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/@radix-ui/react-select/dist/index.mjs": { "file": "assets/admin.plans-DHTOp1MS.js" }, "src/components/ui/select.tsx": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/@radix-ui/react-collapsible/dist/index.mjs": { "file": "assets/admin.plans-DHTOp1MS.js" }, "src/components/ui/collapsible.tsx": { "file": "assets/admin.plans-DHTOp1MS.js" }, "src/routes/admin.plans.tsx?tsr-split=component": { "file": "assets/admin.plans-DHTOp1MS.js" }, "node_modules/lucide-react/dist/esm/icons/users.js": { "file": "assets/users-BmQ5626O.js" }, "node_modules/@radix-ui/react-id/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-use-escape-keydown/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-dismissable-layer/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-focus-scope/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-portal/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-presence/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-focus-guards/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll-bar/dist/es2015/constants.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/use-callback-ref/dist/es2015/assignRef.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/use-callback-ref/dist/es2015/useRef.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/use-callback-ref/dist/es2015/useMergeRef.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/use-sidecar/dist/es2015/medium.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/use-sidecar/dist/es2015/exports.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll/dist/es2015/medium.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll/dist/es2015/UI.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/get-nonce/dist/es2015/index.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-style-singleton/dist/es2015/singleton.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-style-singleton/dist/es2015/hook.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-style-singleton/dist/es2015/component.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll-bar/dist/es2015/utils.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll-bar/dist/es2015/component.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll/dist/es2015/aggresiveCapture.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll/dist/es2015/handleScroll.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll/dist/es2015/SideEffect.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll/dist/es2015/sidecar.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/react-remove-scroll/dist/es2015/Combination.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/aria-hidden/dist/es2015/index.js": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-dialog/node_modules/@radix-ui/react-slot/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-dialog/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "src/components/ui/dialog.tsx": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@floating-ui/core/dist/floating-ui.core.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-arrow/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-popper/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-roving-focus/dist/index.mjs": { "file": "assets/index-C6giWCjR.js" }, "node_modules/@radix-ui/react-switch/dist/index.mjs": { "file": "assets/switch-DQFS2Ehy.js" }, "src/components/ui/switch.tsx": { "file": "assets/switch-DQFS2Ehy.js" }, "src/lib/admin-memory.functions.ts": { "file": "assets/admin.memory-O7gYIuOz.js" }, "src/routes/admin.memory.tsx?tsr-split=component": { "file": "assets/admin.memory-O7gYIuOz.js" }, "src/lib/admin-login.functions.ts": { "file": "assets/admin.login-Dn4QkLZ-.js" }, "src/routes/admin.login.tsx?tsr-split=component": { "file": "assets/admin.login-Dn4QkLZ-.js" }, "src/lib/auth-messages.ts": { "file": "assets/auth-messages-BsotbC8U.js" }, "src/lib/admin-bootstrap.functions.ts": { "file": "assets/admin-bootstrap.functions-DMB4z3AQ.js" }, "src/routes/admin.heatmap.tsx?tsr-split=component": { "file": "assets/admin.heatmap-Bi18SGW6.js" }, "src/lib/admin-observability.functions.ts": { "file": "assets/admin.health-CajCzAKj.js" }, "src/routes/admin.health.tsx?tsr-split=component": { "file": "assets/admin.health-CajCzAKj.js" }, "src/routes/admin.emotional.tsx?tsr-split=component": { "file": "assets/admin.emotional-BcqK4vRr.js" }, "src/routes/admin.dashboard.tsx?tsr-split=component": { "file": "assets/admin.dashboard-Cn5Z7GO4.js" }, "src/routes/admin.cost.tsx?tsr-split=component": { "file": "assets/admin.cost-B10L5iJV.js" }, "src/routes/admin.billing.tsx?tsr-split=component": { "file": "assets/admin.billing-CDBDzMqR.js" }, "src/lib/admin-audit.functions.ts": { "file": "assets/admin.audit-DH7Z3hRm.js" }, "src/routes/admin.audit.tsx?tsr-split=component": { "file": "assets/admin.audit-DH7Z3hRm.js" }, "src/hooks/use-admin-auth.tsx": { "file": "assets/use-admin-auth-DZoL0tDp.js" }, "node_modules/lucide-react/dist/esm/icons/shield.js": { "file": "assets/admin-management.functions-H-XbMA7K.js" }, "src/components/admin/AdminRoleBadge.tsx": { "file": "assets/admin-management.functions-H-XbMA7K.js" }, "src/lib/admin-management.functions.ts": { "file": "assets/admin-management.functions-H-XbMA7K.js" }, "node_modules/lucide-react/dist/esm/icons/shield-check.js": { "file": "assets/shield-check-C0q375H4.js" }, "node_modules/lucide-react/dist/esm/icons/shield-alert.js": { "file": "assets/shield-alert-kgwdAySv.js" }, "node_modules/lucide-react/dist/esm/icons/rotate-ccw.js": { "file": "assets/rotate-ccw-YpJYXw87.js" }, "node_modules/lucide-react/dist/esm/icons/sparkles.js": { "file": "assets/sparkles-Boa3MVM0.js" }, "node_modules/lucide-react/dist/esm/icons/log-out.js": { "file": "assets/log-out-DqegVOtb.js" }, "node_modules/lucide-react/dist/esm/icons/x.js": { "file": "assets/x-BiDyQvkh.js" }, "node_modules/lucide-react/dist/esm/icons/user.js": { "file": "assets/user-frs1jaLS.js" }, "node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.js": { "file": "assets/createLucideIcon-C4Df68Fb.js" }, "node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.js": { "file": "assets/createLucideIcon-C4Df68Fb.js" }, "node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.js": { "file": "assets/createLucideIcon-C4Df68Fb.js" }, "node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.js": { "file": "assets/createLucideIcon-C4Df68Fb.js" }, "node_modules/lucide-react/dist/esm/defaultAttributes.js": { "file": "assets/createLucideIcon-C4Df68Fb.js" }, "node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.js": { "file": "assets/createLucideIcon-C4Df68Fb.js" }, "node_modules/lucide-react/dist/esm/Icon.js": { "file": "assets/createLucideIcon-C4Df68Fb.js" }, "node_modules/lucide-react/dist/esm/createLucideIcon.js": { "file": "assets/createLucideIcon-C4Df68Fb.js" }, "src/hooks/use-auth.tsx": { "file": "assets/use-auth-9zSR0Z5P.js" }, "src/lib/admin-advanced.functions.ts": { "file": "assets/admin-advanced.functions-BB9V1n07.js" }, "src/components/ui/input.tsx": { "file": "assets/input-CAiOLll3.js" }, "node_modules/@tanstack/query-core/build/modern/mutationObserver.js": { "file": "assets/useMutation-CxKpM5Jw.js" }, "node_modules/@tanstack/react-query/build/modern/useMutation.js": { "file": "assets/useMutation-CxKpM5Jw.js" }, "node_modules/sonner/dist/index.mjs": { "file": "assets/index-C54W9wyC.js" }, "node_modules/lucide-react/dist/esm/icons/crown.js": { "file": "assets/PlanAssignmentFlow-C4vNJORZ.js" }, "node_modules/lucide-react/dist/esm/icons/loader-circle.js": { "file": "assets/PlanAssignmentFlow-C4vNJORZ.js" }, "src/lib/admin-users.functions.ts": { "file": "assets/PlanAssignmentFlow-C4vNJORZ.js" }, "src/components/admin/PlanAssignmentFlow.tsx": { "file": "assets/PlanAssignmentFlow-C4vNJORZ.js" }, "node_modules/lucide-react/dist/esm/icons/plus.js": { "file": "assets/plus-DXriv6-2.js" }, "src/components/ui/textarea.tsx": { "file": "assets/textarea-DrHe5jcE.js" }, "node_modules/lucide-react/dist/esm/icons/check.js": { "file": "assets/check-nZVpUqRr.js" }, "node_modules/lucide-react/dist/esm/icons/triangle-alert.js": { "file": "assets/triangle-alert-D8mSNQ3R.js" }, "node_modules/@radix-ui/primitive/dist/index.mjs": { "file": "assets/index-cOb5XvDh.js" }, "node_modules/@radix-ui/react-context/dist/index.mjs": { "file": "assets/index-cOb5XvDh.js" }, "node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs": { "file": "assets/index-cOb5XvDh.js" }, "node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs": { "file": "assets/index-cOb5XvDh.js" }, "node_modules/@radix-ui/react-primitive/node_modules/@radix-ui/react-slot/dist/index.mjs": { "file": "assets/index-cOb5XvDh.js" }, "node_modules/@radix-ui/react-primitive/dist/index.mjs": { "file": "assets/index-cOb5XvDh.js" }, "node_modules/@radix-ui/react-use-size/dist/index.mjs": { "file": "assets/index-cOb5XvDh.js" }, "node_modules/@radix-ui/react-compose-refs/dist/index.mjs": { "file": "assets/index-DIarDpVY.js" }, "node_modules/@radix-ui/react-collection/node_modules/@radix-ui/react-slot/dist/index.mjs": { "file": "assets/index-CVwaz8tU.js" }, "node_modules/@radix-ui/react-collection/dist/index.mjs": { "file": "assets/index-CVwaz8tU.js" }, "node_modules/@radix-ui/react-direction/dist/index.mjs": { "file": "assets/index-CVwaz8tU.js" }, "node_modules/@radix-ui/react-slot/dist/index.mjs": { "file": "assets/button-BSVoJbx5.js" }, "node_modules/class-variance-authority/dist/index.mjs": { "file": "assets/button-BSVoJbx5.js" }, "src/components/ui/button.tsx": { "file": "assets/button-BSVoJbx5.js" }, "node_modules/@radix-ui/react-use-previous/dist/index.mjs": { "file": "assets/index-BpGKKw78.js" }, "node_modules/zod/v3/helpers/util.js": { "file": "assets/products.functions-D9B9ut8V.js" }, "node_modules/zod/v3/ZodError.js": { "file": "assets/products.functions-D9B9ut8V.js" }, "node_modules/zod/v3/locales/en.js": { "file": "assets/products.functions-D9B9ut8V.js" }, "node_modules/zod/v3/errors.js": { "file": "assets/products.functions-D9B9ut8V.js" }, "node_modules/zod/v3/helpers/parseUtil.js": { "file": "assets/products.functions-D9B9ut8V.js" }, "node_modules/zod/v3/helpers/errorUtil.js": { "file": "assets/products.functions-D9B9ut8V.js" }, "node_modules/zod/v3/types.js": { "file": "assets/products.functions-D9B9ut8V.js" }, "src/integrations/supabase/client.server.ts": { "file": "assets/products.functions-D9B9ut8V.js" }, "src/lib/products.functions.ts": { "file": "assets/products.functions-D9B9ut8V.js" }, "node_modules/@radix-ui/number/dist/index.mjs": { "file": "assets/index-BdQq_4o_.js" }, "src/routes/admin.ai-health.tsx?tsr-split=component": { "file": "assets/admin.ai-health-Dotg37KN.js" }, "node_modules/lucide-react/dist/esm/icons/arrow-down.js": { "file": "assets/admin.admins-Db2y09qI.js" }, "node_modules/lucide-react/dist/esm/icons/arrow-up.js": { "file": "assets/admin.admins-Db2y09qI.js" }, "node_modules/lucide-react/dist/esm/icons/shield-off.js": { "file": "assets/admin.admins-Db2y09qI.js" }, "src/routes/admin.admins.tsx?tsr-split=component": { "file": "assets/admin.admins-Db2y09qI.js" }, "src/components/admin/ConfirmDialog.tsx": { "file": "assets/ConfirmDialog-KoEyTkql.js" }, "src/routes/admin.actions.tsx?tsr-split=component": { "file": "assets/admin.actions-C-Eal86-.js" }, "node_modules/@radix-ui/react-slider/dist/index.mjs": { "file": "assets/ritual-r-5JSstt.js" }, "src/components/ui/slider.tsx": { "file": "assets/ritual-r-5JSstt.js" }, "src/routes/_authenticated/ritual.tsx?tsr-split=component": { "file": "assets/ritual-r-5JSstt.js" }, "src/routes/_authenticated/profile.tsx?tsr-split=component": { "file": "assets/profile-C68hoiPs.js" }, "src/lib/mercadopago.functions.ts": { "file": "assets/mercadopago.functions-c2A0wWiL.js" }, "node_modules/lucide-react/dist/esm/icons/heart.js": { "file": "assets/lock-B6YbguWw.js" }, "node_modules/lucide-react/dist/esm/icons/lock.js": { "file": "assets/lock-B6YbguWw.js" }, "node_modules/lucide-react/dist/esm/icons/trash-2.js": { "file": "assets/trash-2-IMDimHDw.js" }, "src/routes/_authenticated/plans.tsx?tsr-split=component": { "file": "assets/plans-agZdMgaj.js" }, "src/routes/_authenticated/memories.tsx?tsr-split=component": { "file": "assets/memories-DsYeyoLZ.js" }, "src/lib/memories.functions.ts": { "file": "assets/memories.functions-Do6LyDCE.js" }, "src/routes/_authenticated/mandatory-consent.tsx?tsr-split=component": { "file": "assets/mandatory-consent-B5exfkbt.js" }, "node_modules/lucide-react/dist/esm/icons/lock-open.js": { "file": "assets/app-BWcvv-yp.js" }, "src/routes/_authenticated/app.tsx?tsr-split=component": { "file": "assets/app-BWcvv-yp.js" }, "node_modules/lucide-react/dist/esm/icons/arrow-left.js": { "file": "assets/admin.users._userId-OfhBxba1.js" }, "node_modules/lucide-react/dist/esm/icons/pin-off.js": { "file": "assets/admin.users._userId-OfhBxba1.js" }, "node_modules/lucide-react/dist/esm/icons/pin.js": { "file": "assets/admin.users._userId-OfhBxba1.js" }, "src/routes/admin.users.$userId.tsx?tsr-split=component": { "file": "assets/admin.users._userId-OfhBxba1.js" }, "src/routes/_authenticated/checkout.$plan.tsx?tsr-split=errorComponent": { "file": "assets/checkout._plan-BL4W4uMM.js" }, "src/routes/_authenticated/checkout.$plan.tsx?tsr-split=component": { "file": "assets/checkout._plan-idDSwghf.js" }, "src/lib/error-page.ts": { "file": "server.js" }, "node_modules/tslib/tslib.js": { "file": "server.js" }, "node_modules/tslib/modules/index.js": { "file": "server.js" }, "src/server.ts": { "file": "server.js" } };
function lazyService(loader) {
  let promise, mod;
  return {
    fetch(req) {
      if (mod) {
        return mod.fetch(req);
      }
      if (!promise) {
        promise = loader().then((_mod) => mod = _mod.default || _mod);
      }
      return promise.then((mod2) => mod2.fetch(req));
    }
  };
}
const services = {
  ["ssr"]: lazyService(() => import("./chunks/build/server.mjs"))
};
setupVite({ manifest, services });
function defineNitroErrorHandler(handler) {
  return handler;
}
const NullProtoObj = /* @__PURE__ */ (() => {
  const e = function() {
  };
  return e.prototype = /* @__PURE__ */ Object.create(null), Object.freeze(e.prototype), e;
})();
function splitSetCookieString$1(cookiesString) {
  if (Array.isArray(cookiesString)) return cookiesString.flatMap((c) => splitSetCookieString$1(c));
  if (typeof cookiesString !== "string") return [];
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) pos += 1;
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) pos += 1;
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else pos = lastComma + 1;
      } else pos += 1;
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) cookiesStrings.push(cookiesString.slice(start));
  }
  return cookiesStrings;
}
function lazyInherit$1(target, source, sourceKey) {
  for (const key of Object.getOwnPropertyNames(source)) {
    if (key === "constructor") continue;
    const targetDesc = Object.getOwnPropertyDescriptor(target, key);
    const desc = Object.getOwnPropertyDescriptor(source, key);
    let modified = false;
    if (desc.get) {
      modified = true;
      desc.get = targetDesc?.get || function() {
        return this[sourceKey][key];
      };
    }
    if (desc.set) {
      modified = true;
      desc.set = targetDesc?.set || function(value) {
        this[sourceKey][key] = value;
      };
    }
    if (typeof desc.value === "function") {
      modified = true;
      desc.value = function(...args) {
        return this[sourceKey][key](...args);
      };
    }
    if (modified) Object.defineProperty(target, key, desc);
  }
}
const FastURL = /* @__PURE__ */ (() => {
  const NativeURL = globalThis.URL;
  const FastURL$1 = class URL {
    #url;
    #href;
    #protocol;
    #host;
    #pathname;
    #search;
    #searchParams;
    #pos;
    constructor(url) {
      if (typeof url === "string") this.#href = url;
      else {
        this.#protocol = url.protocol;
        this.#host = url.host;
        this.#pathname = url.pathname;
        this.#search = url.search;
      }
    }
    get _url() {
      if (this.#url) return this.#url;
      this.#url = new NativeURL(this.href);
      this.#href = void 0;
      this.#protocol = void 0;
      this.#host = void 0;
      this.#pathname = void 0;
      this.#search = void 0;
      this.#searchParams = void 0;
      this.#pos = void 0;
      return this.#url;
    }
    get href() {
      if (this.#url) return this.#url.href;
      if (!this.#href) this.#href = `${this.#protocol || "http:"}//${this.#host || "localhost"}${this.#pathname || "/"}${this.#search || ""}`;
      return this.#href;
    }
    #getPos() {
      if (!this.#pos) {
        const url = this.href;
        const protoIndex = url.indexOf("://");
        const pathnameIndex = protoIndex === -1 ? -1 : url.indexOf("/", protoIndex + 4);
        const qIndex = pathnameIndex === -1 ? -1 : url.indexOf("?", pathnameIndex);
        this.#pos = [
          protoIndex,
          pathnameIndex,
          qIndex
        ];
      }
      return this.#pos;
    }
    get pathname() {
      if (this.#url) return this.#url.pathname;
      if (this.#pathname === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.pathname;
        this.#pathname = this.href.slice(pathnameIndex, queryIndex === -1 ? void 0 : queryIndex);
      }
      return this.#pathname;
    }
    get search() {
      if (this.#url) return this.#url.search;
      if (this.#search === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.search;
        const url = this.href;
        this.#search = queryIndex === -1 || queryIndex === url.length - 1 ? "" : url.slice(queryIndex);
      }
      return this.#search;
    }
    get searchParams() {
      if (this.#url) return this.#url.searchParams;
      if (!this.#searchParams) this.#searchParams = new URLSearchParams(this.search);
      return this.#searchParams;
    }
    get protocol() {
      if (this.#url) return this.#url.protocol;
      if (this.#protocol === void 0) {
        const [protocolIndex] = this.#getPos();
        if (protocolIndex === -1) return this._url.protocol;
        const url = this.href;
        this.#protocol = url.slice(0, protocolIndex + 1);
      }
      return this.#protocol;
    }
    toString() {
      return this.href;
    }
    toJSON() {
      return this.href;
    }
  };
  lazyInherit$1(FastURL$1.prototype, NativeURL.prototype, "_url");
  Object.setPrototypeOf(FastURL$1.prototype, NativeURL.prototype);
  Object.setPrototypeOf(FastURL$1, NativeURL);
  return FastURL$1;
})();
const NodeResponse$1 = /* @__PURE__ */ (() => {
  const NativeResponse = globalThis.Response;
  const STATUS_CODES = globalThis.process?.getBuiltinModule?.("node:http")?.STATUS_CODES || {};
  class NodeResponse$12 {
    #body;
    #init;
    #headers;
    #response;
    constructor(body, init) {
      this.#body = body;
      this.#init = init;
    }
    get status() {
      return this.#response?.status || this.#init?.status || 200;
    }
    get statusText() {
      return this.#response?.statusText || this.#init?.statusText || STATUS_CODES[this.status] || "";
    }
    get headers() {
      if (this.#response) return this.#response.headers;
      if (this.#headers) return this.#headers;
      const initHeaders = this.#init?.headers;
      return this.#headers = initHeaders instanceof Headers ? initHeaders : new Headers(initHeaders);
    }
    get ok() {
      if (this.#response) return this.#response.ok;
      const status = this.status;
      return status >= 200 && status < 300;
    }
    get _response() {
      if (this.#response) return this.#response;
      this.#response = new NativeResponse(this.#body, this.#headers ? {
        ...this.#init,
        headers: this.#headers
      } : this.#init);
      this.#init = void 0;
      this.#headers = void 0;
      this.#body = void 0;
      return this.#response;
    }
    nodeResponse() {
      const status = this.status;
      const statusText = this.statusText;
      let body;
      let contentType;
      let contentLength;
      if (this.#response) body = this.#response.body;
      else if (this.#body) if (this.#body instanceof ReadableStream) body = this.#body;
      else if (typeof this.#body === "string") {
        body = this.#body;
        contentType = "text/plain; charset=UTF-8";
        contentLength = Buffer.byteLength(this.#body);
      } else if (this.#body instanceof ArrayBuffer) {
        body = Buffer.from(this.#body);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Uint8Array) {
        body = this.#body;
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof DataView) {
        body = Buffer.from(this.#body.buffer);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Blob) {
        body = this.#body.stream();
        contentType = this.#body.type;
        contentLength = this.#body.size;
      } else if (typeof this.#body.pipe === "function") body = this.#body;
      else body = this._response.body;
      const rawNodeHeaders = [];
      const initHeaders = this.#init?.headers;
      const headerEntries = this.#response?.headers || this.#headers || (initHeaders ? Array.isArray(initHeaders) ? initHeaders : initHeaders?.entries ? initHeaders.entries() : Object.entries(initHeaders).map(([k, v]) => [k.toLowerCase(), v]) : void 0);
      let hasContentTypeHeader;
      let hasContentLength;
      if (headerEntries) for (const [key, value] of headerEntries) {
        if (key === "set-cookie") {
          for (const setCookie of splitSetCookieString$1(value)) rawNodeHeaders.push(["set-cookie", setCookie]);
          continue;
        }
        rawNodeHeaders.push([key, value]);
        if (key === "content-type") hasContentTypeHeader = true;
        else if (key === "content-length") hasContentLength = true;
      }
      if (contentType && !hasContentTypeHeader) rawNodeHeaders.push(["content-type", contentType]);
      if (contentLength && !hasContentLength) rawNodeHeaders.push(["content-length", String(contentLength)]);
      this.#init = void 0;
      this.#headers = void 0;
      this.#response = void 0;
      this.#body = void 0;
      return {
        status,
        statusText,
        headers: rawNodeHeaders,
        body
      };
    }
  }
  lazyInherit$1(NodeResponse$12.prototype, NativeResponse.prototype, "_response");
  Object.setPrototypeOf(NodeResponse$12, NativeResponse);
  Object.setPrototypeOf(NodeResponse$12.prototype, NativeResponse.prototype);
  return NodeResponse$12;
})();
const kEventNS = "h3.internal.event.";
const kEventRes = /* @__PURE__ */ Symbol.for(`${kEventNS}res`);
const kEventResHeaders = /* @__PURE__ */ Symbol.for(`${kEventNS}res.headers`);
var H3Event = class {
  /**
  * Access to the H3 application instance.
  */
  app;
  /**
  * Incoming HTTP request info.
  *
  * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Request)
  */
  req;
  /**
  * Access to the parsed request URL.
  *
  * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/URL)
  */
  url;
  /**
  * Event context.
  */
  context;
  /**
  * @internal
  */
  static __is_event__ = true;
  constructor(req, context, app) {
    this.context = context || req.context || new NullProtoObj();
    this.req = req;
    this.app = app;
    const _url = req._url;
    this.url = _url && _url instanceof URL ? _url : new FastURL(req.url);
  }
  /**
  * Prepared HTTP response.
  */
  get res() {
    return this[kEventRes] ||= new H3EventResponse();
  }
  /**
  * Access to runtime specific additional context.
  *
  */
  get runtime() {
    return this.req.runtime;
  }
  /**
  * Tell the runtime about an ongoing operation that shouldn't close until the promise resolves.
  */
  waitUntil(promise) {
    this.req.waitUntil?.(promise);
  }
  toString() {
    return `[${this.req.method}] ${this.req.url}`;
  }
  toJSON() {
    return this.toString();
  }
  /**
  * Access to the raw Node.js req/res objects.
  *
  * @deprecated Use `event.runtime.{node|deno|bun|...}.` instead.
  */
  get node() {
    return this.req.runtime?.node;
  }
  /**
  * Access to the incoming request headers.
  *
  * @deprecated Use `event.req.headers` instead.
  *
  */
  get headers() {
    return this.req.headers;
  }
  /**
  * Access to the incoming request url (pathname+search).
  *
  * @deprecated Use `event.url.pathname + event.url.search` instead.
  *
  * Example: `/api/hello?name=world`
  * */
  get path() {
    return this.url.pathname + this.url.search;
  }
  /**
  * Access to the incoming request method.
  *
  * @deprecated Use `event.req.method` instead.
  */
  get method() {
    return this.req.method;
  }
};
var H3EventResponse = class {
  status;
  statusText;
  get headers() {
    return this[kEventResHeaders] ||= new Headers();
  }
};
const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) return defaultStatusCode;
  if (typeof statusCode === "string") statusCode = +statusCode;
  if (statusCode < 100 || statusCode > 599) return defaultStatusCode;
  return statusCode;
}
var HTTPError = class HTTPError2 extends Error {
  get name() {
    return "HTTPError";
  }
  /**
  * HTTP status code in range [200...599]
  */
  status;
  /**
  * HTTP status text
  *
  * **NOTE:** This should be short (max 512 to 1024 characters).
  * Allowed characters are tabs, spaces, visible ASCII characters, and extended characters (byte value 128–255).
  *
  * **TIP:** Use `message` for longer error descriptions in JSON body.
  */
  statusText;
  /**
  * Additional HTTP headers to be sent in error response.
  */
  headers;
  /**
  * Original error object that caused this error.
  */
  cause;
  /**
  * Additional data attached in the error JSON body under `data` key.
  */
  data;
  /**
  * Additional top level JSON body properties to attach in the error JSON body.
  */
  body;
  /**
  * Flag to indicate that the error was not handled by the application.
  *
  * Unhandled error stack trace, data and message are hidden in non debug mode for security reasons.
  */
  unhandled;
  /**
  * Check if the input is an instance of HTTPError using its constructor name.
  *
  * It is safer than using `instanceof` because it works across different contexts (e.g., if the error was thrown in a different module).
  */
  static isError(input) {
    return input instanceof Error && input?.name === "HTTPError";
  }
  /**
  * Create a new HTTPError with the given status code and optional status text and details.
  *
  * @example
  *
  * HTTPError.status(404)
  * HTTPError.status(418, "I'm a teapot")
  * HTTPError.status(403, "Forbidden", { message: "Not authenticated" })
  */
  static status(status, statusText, details) {
    return new HTTPError2({
      ...details,
      statusText,
      status
    });
  }
  constructor(arg1, arg2) {
    let messageInput;
    let details;
    if (typeof arg1 === "string") {
      messageInput = arg1;
      details = arg2;
    } else details = arg1;
    const status = sanitizeStatusCode(details?.status || details?.cause?.status || details?.status || details?.statusCode, 500);
    const statusText = sanitizeStatusMessage(details?.statusText || details?.cause?.statusText || details?.statusText || details?.statusMessage);
    const message = messageInput || details?.message || details?.cause?.message || details?.statusText || details?.statusMessage || [
      "HTTPError",
      status,
      statusText
    ].filter(Boolean).join(" ");
    super(message, { cause: details });
    this.cause = details;
    Error.captureStackTrace?.(this, this.constructor);
    this.status = status;
    this.statusText = statusText || void 0;
    const rawHeaders = details?.headers || details?.cause?.headers;
    this.headers = rawHeaders ? new Headers(rawHeaders) : void 0;
    this.unhandled = details?.unhandled ?? details?.cause?.unhandled ?? void 0;
    this.data = details?.data;
    this.body = details?.body;
  }
  /**
  * @deprecated Use `status`
  */
  get statusCode() {
    return this.status;
  }
  /**
  * @deprecated Use `statusText`
  */
  get statusMessage() {
    return this.statusText;
  }
  toJSON() {
    const unhandled = this.unhandled;
    return {
      status: this.status,
      statusText: this.statusText,
      unhandled,
      message: unhandled ? "HTTPError" : this.message,
      data: unhandled ? void 0 : this.data,
      ...unhandled ? void 0 : this.body
    };
  }
};
function isJSONSerializable(value, _type) {
  if (value === null || value === void 0) return true;
  if (_type !== "object") return _type === "boolean" || _type === "number" || _type === "string";
  if (typeof value.toJSON === "function") return true;
  if (Array.isArray(value)) return true;
  if (typeof value.pipe === "function" || typeof value.pipeTo === "function") return false;
  if (value instanceof NullProtoObj) return true;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
const kNotFound = /* @__PURE__ */ Symbol.for("h3.notFound");
const kHandled = /* @__PURE__ */ Symbol.for("h3.handled");
function toResponse(val, event, config = {}) {
  if (typeof val?.then === "function") return (val.catch?.((error) => error) || Promise.resolve(val)).then((resolvedVal) => toResponse(resolvedVal, event, config));
  const response = prepareResponse(val, event, config);
  if (typeof response?.then === "function") return toResponse(response, event, config);
  const { onResponse: onResponse$1 } = config;
  return onResponse$1 ? Promise.resolve(onResponse$1(response, event)).then(() => response) : response;
}
var HTTPResponse = class {
  #headers;
  #init;
  body;
  constructor(body, init) {
    this.body = body;
    this.#init = init;
  }
  get status() {
    return this.#init?.status || 200;
  }
  get statusText() {
    return this.#init?.statusText || "OK";
  }
  get headers() {
    return this.#headers ||= new Headers(this.#init?.headers);
  }
};
function prepareResponse(val, event, config, nested) {
  if (val === kHandled) return new NodeResponse$1(null);
  if (val === kNotFound) val = new HTTPError({
    status: 404,
    message: `Cannot find any route matching [${event.req.method}] ${event.url}`
  });
  if (val && val instanceof Error) {
    const isHTTPError = HTTPError.isError(val);
    const error = isHTTPError ? val : new HTTPError(val);
    if (!isHTTPError) {
      error.unhandled = true;
      if (val?.stack) error.stack = val.stack;
    }
    if (error.unhandled && !config.silent) console.error(error);
    const { onError: onError$1 } = config;
    return onError$1 && !nested ? Promise.resolve(onError$1(error, event)).catch((error$1) => error$1).then((newVal) => prepareResponse(newVal ?? val, event, config, true)) : errorResponse(error, config.debug);
  }
  const preparedRes = event[kEventRes];
  const preparedHeaders = preparedRes?.[kEventResHeaders];
  if (!(val instanceof Response)) {
    const res = prepareResponseBody(val, event, config);
    const status = res.status || preparedRes?.status;
    return new NodeResponse$1(nullBody(event.req.method, status) ? null : res.body, {
      status,
      statusText: res.statusText || preparedRes?.statusText,
      headers: res.headers && preparedHeaders ? mergeHeaders$1(res.headers, preparedHeaders) : res.headers || preparedHeaders
    });
  }
  if (!preparedHeaders) return val;
  try {
    mergeHeaders$1(val.headers, preparedHeaders, val.headers);
    return val;
  } catch {
    return new NodeResponse$1(nullBody(event.req.method, val.status) ? null : val.body, {
      status: val.status,
      statusText: val.statusText,
      headers: mergeHeaders$1(val.headers, preparedHeaders)
    });
  }
}
function mergeHeaders$1(base, overrides, target = new Headers(base)) {
  for (const [name, value] of overrides) if (name === "set-cookie") target.append(name, value);
  else target.set(name, value);
  return target;
}
const emptyHeaders = /* @__PURE__ */ new Headers({ "content-length": "0" });
const jsonHeaders = /* @__PURE__ */ new Headers({ "content-type": "application/json;charset=UTF-8" });
function prepareResponseBody(val, event, config) {
  if (val === null || val === void 0) return {
    body: "",
    headers: emptyHeaders
  };
  const valType = typeof val;
  if (valType === "string") return { body: val };
  if (val instanceof Uint8Array) {
    event.res.headers.set("content-length", val.byteLength.toString());
    return { body: val };
  }
  if (val instanceof HTTPResponse || val?.constructor?.name === "HTTPResponse") return val;
  if (isJSONSerializable(val, valType)) return {
    body: JSON.stringify(val, void 0, config.debug ? 2 : void 0),
    headers: jsonHeaders
  };
  if (valType === "bigint") return {
    body: val.toString(),
    headers: jsonHeaders
  };
  if (val instanceof Blob) {
    const headers2 = new Headers({
      "content-type": val.type,
      "content-length": val.size.toString()
    });
    let filename = val.name;
    if (filename) {
      filename = encodeURIComponent(filename);
      headers2.set("content-disposition", `filename="${filename}"; filename*=UTF-8''${filename}`);
    }
    return {
      body: val.stream(),
      headers: headers2
    };
  }
  if (valType === "symbol") return { body: val.toString() };
  if (valType === "function") return { body: `${val.name}()` };
  return { body: val };
}
function nullBody(method, status) {
  return method === "HEAD" || status === 100 || status === 101 || status === 102 || status === 204 || status === 205 || status === 304;
}
function errorResponse(error, debug) {
  return new NodeResponse$1(JSON.stringify({
    ...error.toJSON(),
    stack: debug && error.stack ? error.stack.split("\n").map((l) => l.trim()) : void 0
  }, void 0, debug ? 2 : void 0), {
    status: error.status,
    statusText: error.statusText,
    headers: error.headers ? mergeHeaders$1(jsonHeaders, error.headers) : jsonHeaders
  });
}
function callMiddleware(event, middleware, handler, index = 0) {
  if (index === middleware.length) return handler(event);
  const fn = middleware[index];
  let nextCalled;
  let nextResult;
  const next = () => {
    if (nextCalled) return nextResult;
    nextCalled = true;
    nextResult = callMiddleware(event, middleware, handler, index + 1);
    return nextResult;
  };
  const ret = fn(event, next);
  return is404(ret) ? next() : typeof ret?.then === "function" ? ret.then((resolved) => is404(resolved) ? next() : resolved) : ret;
}
function is404(val) {
  return val === void 0 || val === kNotFound || val?.status === 404 && val instanceof Response;
}
function toRequest(input, options) {
  if (typeof input === "string") {
    let url = input;
    if (url[0] === "/") {
      const headers2 = options?.headers ? new Headers(options.headers) : void 0;
      const host = headers2?.get("host") || "localhost";
      const proto = headers2?.get("x-forwarded-proto") === "https" ? "https" : "http";
      url = `${proto}://${host}${url}`;
    }
    return new Request(url, options);
  } else if (options || input instanceof URL) return new Request(input, options);
  return input;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.req.headers.get("x-forwarded-host");
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) return xForwardedHost;
  }
  return event.req.headers.get("host") || "";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false) {
    const forwardedProto = event.req.headers.get("x-forwarded-proto");
    if (forwardedProto === "https") return "https";
    if (forwardedProto === "http") return "http";
  }
  const url = event.url || new URL(event.req.url);
  return url.protocol.slice(0, -1);
}
function getRequestURL(event, opts = {}) {
  const url = new URL(event.url || event.req.url);
  url.protocol = getRequestProtocol(event, opts);
  if (opts.xForwardedHost) {
    const host = getRequestHost(event, opts);
    if (host) {
      url.host = host;
      if (!host.includes(":")) url.port = "";
    }
  }
  return url;
}
function defineHandler(input) {
  if (typeof input === "function") return handlerWithFetch(input);
  const handler = input.handler || (input.fetch ? function _fetchHandler(event) {
    return input.fetch(event.req);
  } : NoHandler);
  return Object.assign(handlerWithFetch(input.middleware?.length ? function _handlerMiddleware(event) {
    return callMiddleware(event, input.middleware, handler);
  } : handler), input);
}
function handlerWithFetch(handler) {
  if ("fetch" in handler) return handler;
  return Object.assign(handler, { fetch: (req) => {
    if (typeof req === "string") req = new URL(req, "http://_");
    if (req instanceof URL) req = new Request(req);
    const event = new H3Event(req);
    try {
      return Promise.resolve(toResponse(handler(event), event));
    } catch (error) {
      return Promise.resolve(toResponse(error, event));
    }
  } });
}
function defineLazyEventHandler(loader) {
  let handler;
  let promise;
  const resolveLazyHandler = () => {
    if (handler) return Promise.resolve(handler);
    return promise ??= Promise.resolve(loader()).then((r) => {
      handler = toEventHandler(r) || toEventHandler(r.default);
      if (typeof handler !== "function") throw new TypeError("Invalid lazy handler", { cause: { resolved: r } });
      return handler;
    });
  };
  return defineHandler(function lazyHandler(event) {
    return handler ? handler(event) : resolveLazyHandler().then((r) => r(event));
  });
}
function toEventHandler(handler) {
  if (typeof handler === "function") return handler;
  if (typeof handler?.handler === "function") return handler.handler;
  if (typeof handler?.fetch === "function") return function _fetchHandler(event) {
    return handler.fetch(event.req);
  };
}
const NoHandler = () => kNotFound;
const H3Core = /* @__PURE__ */ (() => {
  const HTTPMethods = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
    "OPTIONS",
    "CONNECT",
    "TRACE"
  ];
  class H3Core$1 {
    _middleware;
    _routes = [];
    config;
    constructor(config = {}) {
      this._middleware = [];
      this.config = config;
      this.fetch = this.fetch.bind(this);
      this.request = this.request.bind(this);
      this.handler = this.handler.bind(this);
      config.plugins?.forEach((plugin) => plugin(this));
    }
    fetch(request) {
      return this._request(request);
    }
    request(_req, _init, context) {
      return this._request(toRequest(_req, _init), context);
    }
    _request(request, context) {
      const event = new H3Event(request, context, this);
      let handlerRes;
      try {
        if (this.config.onRequest) {
          const hookRes = this.config.onRequest(event);
          handlerRes = typeof hookRes?.then === "function" ? hookRes.then(() => this.handler(event)) : this.handler(event);
        } else handlerRes = this.handler(event);
      } catch (error) {
        handlerRes = Promise.reject(error);
      }
      return toResponse(handlerRes, event, this.config);
    }
    /**
    * Immediately register an H3 plugin.
    */
    register(plugin) {
      plugin(this);
      return this;
    }
    _findRoute(_event) {
    }
    _addRoute(_route) {
      this._routes.push(_route);
    }
    _getMiddleware(_event, route) {
      return route?.data.middleware ? [...this._middleware, ...route.data.middleware] : this._middleware;
    }
    handler(event) {
      const route = this._findRoute(event);
      if (route) {
        event.context.params = route.params;
        event.context.matchedRoute = route.data;
      }
      const routeHandler = route?.data.handler || NoHandler;
      const middleware = this._getMiddleware(event, route);
      return middleware.length > 0 ? callMiddleware(event, middleware, routeHandler) : routeHandler(event);
    }
    mount(base, input) {
      if ("handler" in input) {
        if (input._middleware.length > 0) this._middleware.push((event, next) => {
          return event.url.pathname.startsWith(base) ? callMiddleware(event, input._middleware, next) : next();
        });
        for (const r of input._routes) this._addRoute({
          ...r,
          route: base + r.route
        });
      } else {
        const fetchHandler = "fetch" in input ? input.fetch : input;
        this.all(`${base}/**`, function _mountedMiddleware(event) {
          const url = new URL(event.url);
          url.pathname = url.pathname.slice(base.length) || "/";
          return fetchHandler(new Request(url, event.req));
        });
      }
      return this;
    }
    all(route, handler, opts) {
      return this.on("", route, handler, opts);
    }
    on(method, route, handler, opts) {
      const _method = (method || "").toUpperCase();
      route = new URL(route, "http://_").pathname;
      this._addRoute({
        method: _method,
        route,
        handler: toEventHandler(handler),
        middleware: opts?.middleware,
        meta: {
          ...handler.meta,
          ...opts?.meta
        }
      });
      return this;
    }
    _normalizeMiddleware(fn, _opts) {
      return fn;
    }
    use(arg1, arg2, arg3) {
      let route;
      let fn;
      let opts;
      if (typeof arg1 === "string") {
        route = arg1;
        fn = arg2;
        opts = arg3;
      } else {
        fn = arg1;
        opts = arg2;
      }
      this._middleware.push(this._normalizeMiddleware(fn, {
        ...opts,
        route
      }));
      return this;
    }
  }
  for (const method of HTTPMethods) H3Core$1.prototype[method.toLowerCase()] = function(route, handler, opts) {
    return this.on(method, route, handler, opts);
  };
  return H3Core$1;
})();
function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}
class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}
function splitSetCookieString(cookiesString) {
  if (Array.isArray(cookiesString)) return cookiesString.flatMap((c) => splitSetCookieString(c));
  if (typeof cookiesString !== "string") return [];
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) pos += 1;
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) pos += 1;
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else pos = lastComma + 1;
      } else pos += 1;
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) cookiesStrings.push(cookiesString.slice(start));
  }
  return cookiesStrings;
}
function lazyInherit(target, source, sourceKey) {
  for (const key of Object.getOwnPropertyNames(source)) {
    if (key === "constructor") continue;
    const targetDesc = Object.getOwnPropertyDescriptor(target, key);
    const desc = Object.getOwnPropertyDescriptor(source, key);
    let modified = false;
    if (desc.get) {
      modified = true;
      desc.get = targetDesc?.get || function() {
        return this[sourceKey][key];
      };
    }
    if (desc.set) {
      modified = true;
      desc.set = targetDesc?.set || function(value) {
        this[sourceKey][key] = value;
      };
    }
    if (typeof desc.value === "function") {
      modified = true;
      desc.value = function(...args) {
        return this[sourceKey][key](...args);
      };
    }
    if (modified) Object.defineProperty(target, key, desc);
  }
}
const NodeResponse = /* @__PURE__ */ (() => {
  const NativeResponse = globalThis.Response;
  const STATUS_CODES = globalThis.process?.getBuiltinModule?.("node:http")?.STATUS_CODES || {};
  class NodeResponse$12 {
    #body;
    #init;
    #headers;
    #response;
    constructor(body, init) {
      this.#body = body;
      this.#init = init;
    }
    get status() {
      return this.#response?.status || this.#init?.status || 200;
    }
    get statusText() {
      return this.#response?.statusText || this.#init?.statusText || STATUS_CODES[this.status] || "";
    }
    get headers() {
      if (this.#response) return this.#response.headers;
      if (this.#headers) return this.#headers;
      const initHeaders = this.#init?.headers;
      return this.#headers = initHeaders instanceof Headers ? initHeaders : new Headers(initHeaders);
    }
    get ok() {
      if (this.#response) return this.#response.ok;
      const status = this.status;
      return status >= 200 && status < 300;
    }
    get _response() {
      if (this.#response) return this.#response;
      this.#response = new NativeResponse(this.#body, this.#headers ? {
        ...this.#init,
        headers: this.#headers
      } : this.#init);
      this.#init = void 0;
      this.#headers = void 0;
      this.#body = void 0;
      return this.#response;
    }
    nodeResponse() {
      const status = this.status;
      const statusText = this.statusText;
      let body;
      let contentType;
      let contentLength;
      if (this.#response) body = this.#response.body;
      else if (this.#body) if (this.#body instanceof ReadableStream) body = this.#body;
      else if (typeof this.#body === "string") {
        body = this.#body;
        contentType = "text/plain; charset=UTF-8";
        contentLength = Buffer.byteLength(this.#body);
      } else if (this.#body instanceof ArrayBuffer) {
        body = Buffer.from(this.#body);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Uint8Array) {
        body = this.#body;
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof DataView) {
        body = Buffer.from(this.#body.buffer);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Blob) {
        body = this.#body.stream();
        contentType = this.#body.type;
        contentLength = this.#body.size;
      } else if (typeof this.#body.pipe === "function") body = this.#body;
      else body = this._response.body;
      const rawNodeHeaders = [];
      const initHeaders = this.#init?.headers;
      const headerEntries = this.#response?.headers || this.#headers || (initHeaders ? Array.isArray(initHeaders) ? initHeaders : initHeaders?.entries ? initHeaders.entries() : Object.entries(initHeaders).map(([k, v]) => [k.toLowerCase(), v]) : void 0);
      let hasContentTypeHeader;
      let hasContentLength;
      if (headerEntries) for (const [key, value] of headerEntries) {
        if (key === "set-cookie") {
          for (const setCookie of splitSetCookieString(value)) rawNodeHeaders.push(["set-cookie", setCookie]);
          continue;
        }
        rawNodeHeaders.push([key, value]);
        if (key === "content-type") hasContentTypeHeader = true;
        else if (key === "content-length") hasContentLength = true;
      }
      if (contentType && !hasContentTypeHeader) rawNodeHeaders.push(["content-type", contentType]);
      if (contentLength && !hasContentLength) rawNodeHeaders.push(["content-length", String(contentLength)]);
      this.#init = void 0;
      this.#headers = void 0;
      this.#response = void 0;
      this.#body = void 0;
      return {
        status,
        statusText,
        headers: rawNodeHeaders,
        body
      };
    }
  }
  lazyInherit(NodeResponse$12.prototype, NativeResponse.prototype, "_response");
  Object.setPrototypeOf(NodeResponse$12, NativeResponse);
  Object.setPrototypeOf(NodeResponse$12.prototype, NativeResponse.prototype);
  return NodeResponse$12;
})();
const errorHandler$0 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    return new NodeResponse(JSON.stringify(res.body, null, 2), res);
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled;
  const status = error.status || 500;
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (status === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]"].filter(Boolean).join(" ");
    console.error(
      `[request error] ${tags} [${event.req.method}] ${url}
`,
      error
    );
  }
  const headers2 = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  if (status === 404 || !event.res.headers.has("cache-control")) {
    headers2["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    status,
    statusText: error.statusText,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status,
    statusText: error.statusText,
    headers: headers2,
    body
  };
}
const errorHandlers = [errorHandler$0];
async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      const response = await handler(error, event, { defaultHandler });
      if (response) {
        return response;
      }
    } catch (error2) {
      console.error(error2);
    }
  }
}
const plugins = [];
const headers = ((m) => function headersRouteRule(event) {
  for (const [key, value] of Object.entries(m.options || {})) {
    event.res.headers.set(key, value);
  }
});
const findRouteRules = (m, p) => {
  let r = [];
  if (p[p.length - 1] === "/") p = p.slice(0, -1) || "/";
  let s = p.split("/");
  s.length - 1;
  if (s[1] === "assets") {
    r.unshift({ data: [{ name: "headers", route: "/assets/**", handler: headers, options: { "cache-control": "public, max-age=31536000, immutable" } }], params: { "_": s.slice(2).join("/") } });
  }
  return r;
};
const _lazy_1SSd7l = defineLazyEventHandler(() => import("./chunks/_/ssr-renderer.mjs"));
const findRoute = (m, p) => {
  if (p[p.length - 1] === "/") p = p.slice(0, -1) || "/";
  let s = p.split("/");
  s.length - 1;
  return { data: { route: "/**", handler: _lazy_1SSd7l }, params: { "_": s.slice(1).join("/") } };
};
const findRoutedMiddleware = (m, p) => {
  return [];
};
const globalMiddleware = [];
function useNitroApp() {
  return useNitroApp.__instance__ ??= initNitroApp();
}
function initNitroApp() {
  const nitroApp2 = createNitroApp();
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
  return nitroApp2;
}
function createNitroApp() {
  const hooks = createHooks();
  const captureError = (error, errorCtx) => {
    const promise = hooks.callHookParallel("error", error, errorCtx).catch((hookError) => {
      console.error("Error while capturing another error", hookError);
    });
    if (errorCtx?.event) {
      const errors = errorCtx.event.req.context?.nitro?.errors;
      if (errors) {
        errors.push({ error, context: errorCtx });
      }
      if (typeof errorCtx.event.req.waitUntil === "function") {
        errorCtx.event.req.waitUntil(promise);
      }
    }
  };
  const h3App = createH3App(captureError);
  let fetchHandler = async (req) => {
    req.context ??= {};
    req.context.nitro = req.context.nitro || { errors: [] };
    const event = { req };
    const nitroApp2 = useNitroApp();
    await nitroApp2.hooks.callHook("request", event).catch((error) => {
      captureError(error, { event, tags: ["request"] });
    });
    const response = await h3App.request(req, void 0, req.context);
    await nitroApp2.hooks.callHook("response", response, event).catch((error) => {
      captureError(error, { event, tags: ["request", "response"] });
    });
    return response;
  };
  const requestHandler = (input, init, context) => {
    const req = toRequest(input, init);
    req.context = { ...req.context, ...context };
    return Promise.resolve(fetchHandler(req));
  };
  const originalFetch = globalThis.fetch;
  const nitroFetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/")) {
      return requestHandler(input, init);
    }
    if (input instanceof Request && "_request" in input) {
      input = input._request;
    }
    return originalFetch(input, init);
  };
  globalThis.fetch = nitroFetch;
  const app = {
    _h3: h3App,
    hooks,
    fetch: requestHandler,
    captureError
  };
  return app;
}
function createH3App(captureError) {
  const DEBUG_MODE = ["1", "true", "TRUE"].includes("false");
  const h3App = new H3Core({
    debug: DEBUG_MODE,
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    }
  });
  h3App._findRoute = (event) => findRoute(event.req.method, event.url.pathname);
  h3App._getMiddleware = (event, route) => {
    const pathname = event.url.pathname;
    const method = event.req.method;
    const { routeRules, routeRuleMiddleware } = getRouteRules(method, pathname);
    event.context.routeRules = routeRules;
    return [
      ...routeRuleMiddleware,
      ...globalMiddleware,
      ...findRoutedMiddleware().map((r) => r.data),
      ...route?.data?.middleware || []
    ].filter(Boolean);
  };
  return h3App;
}
function getRouteRules(method, pathname) {
  const m = findRouteRules(method, pathname);
  if (!m?.length) {
    return { routeRuleMiddleware: [] };
  }
  const routeRules = {};
  for (const layer of m) {
    for (const rule of layer.data) {
      const currentRule = routeRules[rule.name];
      if (currentRule) {
        if (rule.options === false) {
          delete routeRules[rule.name];
          continue;
        }
        if (typeof currentRule.options === "object" && typeof rule.options === "object") {
          currentRule.options = { ...currentRule.options, ...rule.options };
        } else {
          currentRule.options = rule.options;
        }
        currentRule.route = rule.route;
        currentRule.params = { ...currentRule.params, ...layer.params };
      } else if (rule.options !== false) {
        routeRules[rule.name] = { ...rule, params: layer.params };
      }
    }
  }
  const middleware = [];
  for (const rule of Object.values(routeRules)) {
    if (rule.options === false || !rule.handler) {
      continue;
    }
    middleware.push(rule.handler(rule));
  }
  return {
    routeRules,
    routeRuleMiddleware: middleware
  };
}
const nitroApp = useNitroApp();
const vercel = {
  fetch(req, context) {
    const isrRoute = req.headers.get("x-now-route-matches");
    if (isrRoute) {
      const url = new URL(req.url);
      url.pathname = decodeURIComponent(isrRoute);
      req = new Request(url.toString(), req);
    }
    req.runtime ??= { name: "vercel" };
    req.runtime.vercel = { context };
    req.waitUntil = context?.waitUntil;
    return nitroApp.fetch(req);
  }
};
export {
  vercel as default
};
