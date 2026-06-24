export type ExportFormat = "plain" | "checklist" | "grouped";

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
	plain: "Plain text",
	checklist: "Markdown checklist",
	grouped: "Markdown grouped by category",
};
