/**
 * Defines the available grocery-list export format types and their display labels.
 */
export type ExportFormat = "plain" | "checklist" | "grouped";

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
	plain: "Plain text",
	checklist: "Markdown checklist",
	grouped: "Markdown grouped by category",
};
