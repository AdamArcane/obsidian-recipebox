/**
 * Pre-flight for the import modal: reads the picked files, groups them into
 * recipe units and classifies each, so the user sees "N recipes found, M not
 * recognized" before anything is written.
 */
import { readPickedFiles } from "./file-import-read";
import { groupIntoUnits } from "./file-import-units";
import { detectFormat } from "./file-import-detect";
import type { ImportProblem, ImportUnit } from "./file-import-types";

export interface PreparedImport {
	units: ImportUnit[];
	problems: ImportProblem[];
	warnings: string[];
}

export async function prepareImport(files: File[]): Promise<PreparedImport> {
	const read = await readPickedFiles(files);
	const grouped = groupIntoUnits(read.entries);

	const units: ImportUnit[] = [];
	const problems = [...read.problems, ...grouped.problems];
	for (const unit of grouped.units) {
		const format = detectFormat(unit.data);
		if (format) units.push({ ...unit, format });
		else problems.push({ label: unit.label, reason: "Not a recognized recipe format." });
	}
	return { units, problems, warnings: read.warnings };
}
