import { FileScreen } from "@/components/strap/file-screen";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";
import FileLoading from "./-file-loading";

export const Route = createFileRoute("/_app/file")({
  head: () => pageHead({ title: "File" }),
  component: FileScreen,
  // Shown only when this page's code is slow to arrive.
  pendingComponent: FileLoading,
});
