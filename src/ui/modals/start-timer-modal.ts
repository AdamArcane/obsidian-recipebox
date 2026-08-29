/**
 * Modal for manually starting a countdown timer with a user-chosen duration
 * and name, reached from the ingredients-header button and the command
 * palette rather than the inline duration-detection flow in instruction text.
 */
import { App, Notice } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { parseDurationInput } from "../timer/parse-duration-input";
import { startManualTimer } from "../timer/start-manual-timer";
import { BaseModal } from "./modal-shell";

export class StartTimerModal extends BaseModal {
	private durationInput!: HTMLInputElement;
	private nameInput!: HTMLInputElement;

	constructor(app: App, private readonly settings: RecipeBoxSettings) {
		super(app);
	}

	getTitle(): string { return "Start timer"; }
	getContentClasses(): string[] { return ["rb-start-timer-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		const nameRow = bodyEl.createDiv({ cls: "rb-modal-fields rb-modal-fields--full" });
		const nameField = nameRow.createDiv({ cls: "rb-modal-field rb-modal-field--half" });
		nameField.createEl("label", { cls: "rb-modal-field-label", text: "Name" });
		this.nameInput = nameField.createEl("input", { cls: "rb-modal-input", attr: { type: "text", placeholder: "Optional, e.g. Pasta boil" } });

		const durationRow = bodyEl.createDiv({ cls: "rb-modal-fields rb-modal-fields--full" });
		const durationField = durationRow.createDiv({ cls: "rb-modal-field rb-modal-field--half" });
		durationField.createEl("label", { cls: "rb-modal-field-label", text: "Duration *" });
		this.durationInput = durationField.createEl("input", { cls: "rb-modal-input", attr: { type: "text", placeholder: "Example: 10 min, 1 hour 30 min, 1:30, 90" } });

		const onEnter = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); this.submit(); } };
		this.durationInput.addEventListener("keydown", onEnter);
		this.nameInput.addEventListener("keydown", onEnter);

		this.durationInput.focus();
	}

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());
		footerEl.createEl("button", { cls: "mod-cta", text: "Start" })
			.addEventListener("click", () => this.submit());
	}

	private submit(): void {
		const seconds = parseDurationInput(this.durationInput.value, this.settings.timerRangeDefault);
		if (seconds === null) {
			new Notice("Enter a valid duration, such as 10 min, 1 hour 30 min, 1:30, or 90.");
			return;
		}
		const name = this.nameInput.value.trim() || "Timer";
		startManualTimer(this.app, this.settings, seconds, name);
		this.close();
	}
}
