import { requestUrl } from "obsidian";

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * A `fetch` backed by Obsidian's `requestUrl`, which skips CORS, so the plugin
 * reaches bundled and separately hosted APIs without `CORS_ORIGINS` changes.
 */
export async function obsidianFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const response = await requestUrl({
    url: request.url,
    method: request.method,
    headers,
    body: init?.body == null ? undefined : await request.text(),
    throw: false,
  });

  return new Response(
    NULL_BODY_STATUSES.has(response.status) ? null : response.arrayBuffer,
    { status: response.status, headers: response.headers },
  );
}
