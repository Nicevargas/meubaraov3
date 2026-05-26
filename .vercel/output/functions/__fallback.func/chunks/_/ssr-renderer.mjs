function ssrRenderer({ req }) {
  return fetch(req, { viteEnv: "ssr" });
}
export {
  ssrRenderer as default
};
