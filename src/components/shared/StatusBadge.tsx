import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { EmployeeStatus, ProjectStatus, RequirementStatus } from "@/types";

type AnyStatus = EmployeeStatus | ProjectStatus | RequirementStatus;

const variantMap: Record<AnyStatus, "success" | "warning" | "info" | "outline" | "secondary" | "purple"> = {
  active: "success",
  inactive: "secondary",
  planning: "info",
  completed: "success",
  on_hold: "warning",
  todo: "secondary",
  in_progress: "info",
  done: "success",
};

const i18nKeyMap: Record<AnyStatus, string> = {
  active: "status.active",
  inactive: "status.inactive",
  planning: "status.planning",
  completed: "status.completed",
  on_hold: "status.on_hold",
  todo: "status.todo",
  in_progress: "status.in_progress",
  done: "status.done",
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={variantMap[status] ?? "secondary"}>
      {t(i18nKeyMap[status] ?? status)}
    </Badge>
  );
}
