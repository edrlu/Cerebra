// Next.js startup hook (runs once per server instance, before requests are
// served — see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md).
//
// register() is called in BOTH the Node.js and Edge runtimes, so it must not
// statically reference `node:*` modules — doing so (even behind a runtime guard
// or via dynamic import) pulls them into the Edge bundle and fails the build
// with "module not supported in the Edge Runtime". Per the Next.js docs, the
// Node-only work lives in ./instrumentation-node and is imported only on the
// Node.js pass, so the Edge bundle never sees it.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startRegenWorker } = await import("./instrumentation-node");
  await startRegenWorker();
}
