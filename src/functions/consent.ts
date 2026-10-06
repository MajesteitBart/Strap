import { loadAuthorizeView, loadDeviceView, loadInviteView, type SearchValues } from "@/lib/consent-pages";
import { createServerFn } from "@tanstack/react-start";

// Query values arrive as plain strings; anything else is dropped.
function searchValues(input: unknown): SearchValues {
  const values: SearchValues = {};
  if (!input || typeof input !== "object") return values;
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

export const getAuthorizeView = createServerFn({ method: "GET" })
  .validator(searchValues)
  .handler(({ data }) => loadAuthorizeView(data));

export const getDeviceView = createServerFn({ method: "GET" })
  .validator(searchValues)
  .handler(({ data }) => loadDeviceView(data));

export const getInviteView = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => ({ token: typeof input?.token === "string" ? input.token : "" }))
  .handler(({ data }) => loadInviteView(data.token));
