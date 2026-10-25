/**
 * Normalizes what a person typed into an origin: adds a scheme and drops a
 * trailing slash and a trailing `/api`, so `kaneo.example.com` and
 * `https://kaneo.example.com/api` both work.
 */
export function normalizeOrigin(input: string): string {
  let url = input.trim().replace(/\/+$/, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (url.endsWith("/api")) url = url.slice(0, -4);
  return url.replace(/\/+$/, "");
}

/** The API base the Hono client calls; a separate API address wins over the web address. */
export function resolveApiBase(webUrl: string, apiUrl: string): string {
  const origin = normalizeOrigin(apiUrl) || normalizeOrigin(webUrl);
  return origin ? `${origin}/api` : "";
}

/** The full task path always resolves, unlike the short ticket path that needs unique project keys. */
export function taskUrl(
  webUrl: string,
  task: { id: string; projectId: string; workspaceId: string },
): string {
  return `${normalizeOrigin(webUrl)}/dashboard/workspace/${task.workspaceId}/project/${task.projectId}/task/${task.id}`;
}
