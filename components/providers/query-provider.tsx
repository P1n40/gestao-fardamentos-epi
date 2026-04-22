"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Corporate backoffice data changes through explicit actions; keep it fresh enough
            // while avoiding immediate refetches after SSR has already delivered the first view.
            staleTime: 60 * 1000,
            // Keep recently visited lists warm for common back-and-forth navigation.
            gcTime: 10 * 60 * 1000,
            // Avoid aggressive retries against protected/internal APIs.
            retry: 1,
            // Route transitions and explicit invalidations are enough for these screens.
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
