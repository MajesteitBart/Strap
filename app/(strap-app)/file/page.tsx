import type { Metadata } from "next";
import { FileScreen } from "@/components/strap/file-screen";

export const metadata: Metadata = {
  title: "File",
};

export default function FilePage() {
  return <FileScreen />;
}
