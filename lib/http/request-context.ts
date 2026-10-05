import { getRequest, setCookie } from "@tanstack/react-start/server";
import "server-only";
import { readCookie, type CookieOptions } from "./cookies";

// The incoming request for the current server render, server function or
// server route. Only valid while Start is handling a request.
export function currentRequest(): Request {
  return getRequest();
}

export function currentRequestHeaders(): Headers {
  return currentRequest().headers;
}

export function currentRequestCookie(name: string): string | undefined {
  return readCookie(currentRequest(), name);
}

// Adds a Set-Cookie header to whatever response the current request returns.
export function setResponseCookie(name: string, value: string, options: CookieOptions) {
  setCookie(name, value, options);
}
