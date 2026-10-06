import { BackendSetupScreen } from "@/components/auth/backend-setup-screen";
import { useDeploymentInfo } from "@/components/deployment-info";
import { AppPending } from "@/components/strap/app-pending";
import { AppShellLayout } from "@/components/strap/app-shell-layout";
import { AppVersionNotifier } from "@/components/strap/app-version-notifier";
import { StrapProvider } from "@/components/strap/strap-provider";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAppShell } from "../functions/app";

// Layout for the signed-in app (/file, /skills, /connections, /vault,
// /settings, /account). The page shell is static HTML; the access gate and the
// user's Strap load in one server call when the app is entered. Moving between
// app pages afterwards never goes back to the server for the layout, because
// StrapProvider keeps the state on the client.
export const Route = createFileRoute("/_app")({
  ssr: false,
  loader: async () => {
    const shell = await getAppShell();
    if (shell.kind === "redirect") throw redirect({ href: shell.to, replace: true });
    // The provider skips its mount-time sync when this is recent. A hover
    // preload can be up to 30 s old by the time it renders; that one syncs.
    return { ...shell, loadedAt: Date.now() };
  },
  // The router reloads this when the app is entered (reusing a hover preload
  // under 30s old) and never on moves within it. Dropping the data on leaving
  // means re-entering cannot show an earlier visit's state.
  gcTime: 0,
  pendingComponent: AppPending,
  component: AppLayout,
});

function AppLayout() {
  const shell = Route.useLoaderData();
  const { appVersion } = useDeploymentInfo();

  if (shell.kind === "missing-schema") {
    return <BackendSetupScreen errorMessage={shell.message} />;
  }

  return (
    <StrapProvider initialState={shell.initialState} persistenceEnabled={shell.persistenceEnabled} initialStateLoadedAt={shell.loadedAt}>
      <AppShellLayout showWelcome={shell.showWelcome} welcomePaidAt={shell.welcomePaidAt}>
        <Outlet />
      </AppShellLayout>
      <AppVersionNotifier initialVersion={appVersion} />
    </StrapProvider>
  );
}
