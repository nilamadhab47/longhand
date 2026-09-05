"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({
  children,
  projectKey,
  host,
}: {
  children: React.ReactNode;
  projectKey: string;
  host: string;
}) {
  useEffect(() => {
    if (!projectKey) return;

    posthog.init(projectKey, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      autocapture: true,
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") {
          ph.debug();
        }
      },
    });
  }, [projectKey, host]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
