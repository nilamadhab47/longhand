const DEFAULT_HOST = "https://us.i.posthog.com";

/** Server-only. The project token is a public ingest key (phc_), not a secret. */
export function posthogBrowserConfig() {
  const projectKey =
    process.env.POSTHOG_PROJECT_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
  const host =
    process.env.POSTHOG_HOST ??
    process.env.NEXT_PUBLIC_POSTHOG_HOST ??
    DEFAULT_HOST;
  return { projectKey, host };
}
