import * as tables from "@/db/schema/application";
import { fetchOpenRouterBalance, readAiSettings } from "@/lib/ai/persistence";
import { requireApiAuth } from "@/lib/api-auth";
import type { User } from "@/lib/auth/user";
import type { DatabaseContext } from "@/lib/db/context";
import { maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { NO_STORE_HEADERS } from "@/lib/http-headers";
import { decryptSecret } from "@/lib/secret-crypto";
import { resolveMemberCompanyStrap } from "@/lib/strap-context";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// Live OpenRouter balance for the BYOK settings card. Only meaningful when a
// valid key is saved; returns { balance: null } otherwise (no key, or the
// OpenRouter read failed) so the card can just prompt the user to add one.
// Company-aware: the company BYOK balance is owner-scoped info (like the rest of
// billing), so only the owner sees it - non-owner members get { balance: null }.
// The key itself is never exposed either way.


async function resolveByokKey(client: DatabaseContext, user: User): Promise<string | null> {
  const company = await resolveMemberCompanyStrap(client, user);
  if (company) {
    if (company.role !== "owner") return null;
    const companyId = company.creedId;
    const admin = serviceContext("app/api/app/ai/openrouter-balance/route.ts");
    const { data } = await query(admin, tables.creed_company_ai_settings, "select", (database, scope) => database.select({ encrypted_openrouter_key: tables.creed_company_ai_settings.encrypted_openrouter_key, key_status: tables.creed_company_ai_settings.key_status }).from(tables.creed_company_ai_settings).where(and(scope, eq(tables.creed_company_ai_settings.creed_id, companyId)))).then(maybeOne);
    if (!data?.encrypted_openrouter_key || data.key_status !== "present") return null;
    return decryptSecret(data.encrypted_openrouter_key);
  }

  const settings = await readAiSettings(client, user.id);
  if (!settings?.encrypted_api_key || settings.key_status !== "valid") return null;
  return decryptSecret(settings.encrypted_api_key);
}

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const key = await resolveByokKey(auth.context, auth.user);
  if (!key) {
    return NextResponse.json({ balance: null }, { headers: NO_STORE_HEADERS });
  }

  try {
    const balance = await fetchOpenRouterBalance(key);
    return NextResponse.json({ balance }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ balance: null }, { headers: NO_STORE_HEADERS });
  }
}
