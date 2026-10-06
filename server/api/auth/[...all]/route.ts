import { getAuthServer } from "@/lib/auth/server";

export const GET = (request: Request) => getAuthServer().handler(request);
export const POST = (request: Request) => getAuthServer().handler(request);
