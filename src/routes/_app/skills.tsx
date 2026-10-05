import { SkillsScreen } from "@/components/strap/skills-screen";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/skills")({
  component: SkillsScreen,
});
