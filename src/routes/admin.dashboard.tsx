import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/routes/admin.index";

export const Route = createFileRoute("/admin/dashboard")({
  component: OverviewPage,
});
