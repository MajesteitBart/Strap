import { loadAppShell } from "@/lib/app-shell";
import { createServerFn } from "@tanstack/react-start";

// Access gate and Strap state for the signed-in app pages.
export const getAppShell = createServerFn({ method: "GET" }).handler(() => loadAppShell());
