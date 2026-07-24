// Keep canonical and compatibility paths on one authorization and rate-limit
// implementation so aliases cannot drift or double the caller's allowance.
export { POST } from "@/app/api/creed/write/route";
