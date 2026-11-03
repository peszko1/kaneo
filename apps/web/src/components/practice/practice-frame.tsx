import { getApiUrl } from "@/fetchers/get-api-url";
import { useUserPreferencesStore } from "@/store/user-preferences";

// The 120h tracker is a standalone page in public/120h. It talks to
// /api/practice itself and works offline from the service worker's cache.
export function PracticeFrame({ title }: { title: string }) {
  const theme = useUserPreferencesStore((state) => state.theme);
  const params = new URLSearchParams({ api: getApiUrl("").replace(/\/$/, "") });
  if (theme !== "system") params.set("theme", theme);

  return (
    <iframe
      title={title}
      src={`/120h/index.html?${params}`}
      allow="screen-wake-lock; autoplay"
      className="h-full min-h-[calc(100dvh-3rem)] w-full border-0"
    />
  );
}
