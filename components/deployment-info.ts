import { useLoaderData } from "@tanstack/react-router";

// Deployment facts loaded once by the root route on the server: whether the
// database and auth are configured, and the running app version.
export function useDeploymentInfo() {
  return useLoaderData({ from: "__root__" });
}
