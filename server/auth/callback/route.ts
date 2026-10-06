import { redirectResponse } from "@/lib/http/responses";
// Old confirmation links cannot establish an application-owned session.
// Better Auth handles new links under /api/auth; retain a safe landing route.
export async function GET(request: Request) {
  return redirectResponse(new URL("/login", request.url));
}
