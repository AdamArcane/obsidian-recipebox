/**
 * Share/unshare modal, styled like the familiar Google-Docs/Notion
 * share-link pattern. Renders one of three views in place (no separate
 * modal instances): the create-share form, the just-created result (link +
 * copy + expiry), or the already-shared view (existing link + re-share +
 * unshare). Re-share always deletes the old share before creating a new
 * one -- see unshare-recipe.ts / share-recipe.ts -- never updates in place.
 */
import { App, Notice, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { BaseModal } from "./modal-shell";
import { getShareData, ShareData } from "../../sharing/share-frontmatter";
import { getShareStatus, ShareStatus } from "../../sharing/share-status";
import { shareRecipe } from "../../sharing/share-recipe";
import { unshareRecipe } from "../../sharing/unshare-recipe";
import { CreateShareResponse } from "../../sharing/share-worker-client";

interface ShareResultView {
	share: CreateShareResponse;
	imageOmittedReason: string | null;
	warnings: string[];
}

const EXPIRY_OPTIONS = [7, 30, 90] as const;
type ExpiryDays = (typeof EXPIRY_OPTIONS)[number];

type ModalView = "form" | "result" | "shared";

function buildShareUrl(settings: RecipeBoxSettings, slug: string): string {
	if (!settings.shareServerUrl) {
		throw new Error("shareServerUrl is not configured");
	}
	return `${(settings.shareServerUrl).replace(/\/$/, "")}/${settings.userShortId}/${slug}`;
}

function formatExpiry(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function copyToClipboard(text: string): void {
	void navigator.clipboard.writeText(text);
	new Notice("Link copied to clipboard.");
}

export class ShareRecipeModal extends BaseModal {
	private view: ModalView;
	private shareData: ShareData | null;
	private status: ShareStatus;
	private isReshare = false;
	private resultData: ShareResultView | null = null;

	private bodyEl!: HTMLElement;
	private footerEl!: HTMLElement;
	private nameInput!: HTMLInputElement;
	private visibilitySelect!: HTMLSelectElement;
	private expiresSelect!: HTMLSelectElement;
	private submitBtn!: HTMLButtonElement;

	constructor(
		app: App,
		private readonly file: TFile,
		private readonly settings: RecipeBoxSettings,
		private readonly saveSettings: () => Promise<void>,
	) {
		super(app);
		const cache = app.metadataCache.getFileCache(file);
		this.shareData = getShareData(cache, settings);
		this.status = getShareStatus(this.shareData);
		this.view = this.status.kind === "shared" ? "shared" : "form";
	}

	getTitle(): string { return "Share recipe"; }

	renderBody(bodyEl: HTMLElement): void {
		this.bodyEl = bodyEl;
		this.renderCurrentView();
	}

	renderFooter(footerEl: HTMLElement): void {
		this.footerEl = footerEl;
		this.renderCurrentFooter();
	}

	private renderCurrentView(): void {
		this.bodyEl.empty();
		if (this.view === "form") this.renderFormView(this.bodyEl);
		else if (this.view === "result") this.renderResultView(this.bodyEl);
		else this.renderSharedView(this.bodyEl);
	}

	private renderCurrentFooter(): void {
		this.footerEl.empty();
		if (this.view === "form") this.renderFormFooter(this.footerEl);
		else if (this.view === "result") this.renderResultFooter(this.footerEl);
		else this.renderSharedFooter(this.footerEl);
	}

	private renderFormView(bodyEl: HTMLElement): void {
		const fields = bodyEl.createDiv({ cls: "rb-modal-fields" });

		// Explicit expectation-setting: a header photo often has faces, home
		// interiors, or other identifying details in frame that the user never
		// thought of as "public" -- this line exists so they get a real moment
		// to reconsider before sharing, not just a generic "link" disclaimer.
		fields.createEl("p", {
			cls: "rb-modal-section-desc",
			text: "Anyone with the link can view this recipe and its photo, if it has one.",
		});

		const nameRow = fields.createDiv({ cls: "rb-share-form-row rb-share-form-row--full" });
		const nameField = nameRow.createDiv({ cls: "rb-modal-field rb-modal-field--grow" });
		nameField.createEl("label", { text: "Name" });
		this.nameInput = nameField.createEl("input", {
			cls: "rb-modal-input",
			type: "text",
			value: this.file.basename,
		});

		const optionsRow = fields.createDiv({ cls: "rb-share-form-row" });

		const visField = optionsRow.createDiv({ cls: "rb-modal-field rb-share-form-visibility" });
		visField.createEl("label", { text: "Visibility" });
		this.visibilitySelect = visField.createEl("select", { cls: "rb-modal-select" });
		this.visibilitySelect.createEl("option", { value: "anyone", text: "Anyone with the link" });
		this.visibilitySelect.createEl("option", {
			value: "specific-people",
			text: "Specific people (coming soon)",
			attr: { disabled: "true" },
		});

		const expiresField = optionsRow.createDiv({ cls: "rb-modal-field rb-share-form-expiry" });
		expiresField.createEl("label", { text: "Expires in" });
		this.expiresSelect = expiresField.createEl("select", { cls: "rb-modal-select" });
		for (const days of EXPIRY_OPTIONS) {
			const opt = this.expiresSelect.createEl("option", { value: String(days), text: `${days} days` });
			if (days === 90) opt.selected = true;
		}

		const notice = bodyEl.createDiv({ cls: "rb-share-scope-notice" });

		const includedLine = notice.createEl("p");
		includedLine.createEl("strong", { text: "Included: " });
		includedLine.appendText("ingredients, instructions, times, nutrition, and the recipe photo.");

		const excludedLine = notice.createEl("p");
		excludedLine.createEl("strong", { text: "Not included: " });
		excludedLine.appendText("your personal notes, tags, or other vault content.");
	

	}

	private renderFormFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());
		this.submitBtn = footerEl.createEl("button", { cls: "mod-cta", text: this.isReshare ? "Re-share" : "Create link" });
		this.submitBtn.addEventListener("click", () => { void this.handleSubmit(); });
	}

	private renderResultView(bodyEl: HTMLElement): void {
		const result = this.resultData;
		if (!result) return;
		const box = bodyEl.createDiv({ cls: "rb-modal-section" });
		box.createDiv({ cls: "rb-modal-section-heading", text: "Link ready" });

		const linkRow = box.createDiv({ cls: "rb-share-link-row" });
		linkRow.createEl("input", { cls: "rb-modal-input", type: "text", attr: { readonly: "true" }, value: result.share.url });
		linkRow.createEl("button", { cls: "rb-modal-link-btn", text: "Copy" })
			.addEventListener("click", () => copyToClipboard(result.share.url));

		box.createEl("p", { cls: "rb-modal-section-desc", text: `Expires ${formatExpiry(result.share.expiresAt)}` });

		const allWarnings = [
			...(result.imageOmittedReason ? [result.imageOmittedReason] : []),
			...result.warnings,
		];
		for (const w of allWarnings) {
			box.createEl("p", { cls: "rb-modal-section-desc rb-share-warning", text: w });
		}
	}

	private renderResultFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "mod-cta", text: "Done" })
			.addEventListener("click", () => this.close());
	}

	private renderSharedView(bodyEl: HTMLElement): void {
		const data = this.shareData;
		if (!data) return;
		const url = buildShareUrl(this.settings, data.slug);

		const box = bodyEl.createDiv({ cls: "rb-modal-section" });
		box.createDiv({ cls: "rb-modal-section-heading", text: "Already shared" });

		const linkRow = box.createDiv({ cls: "rb-share-link-row" });
		linkRow.createEl("input", { cls: "rb-modal-input", type: "text", attr: { readonly: "true" }, value: url });
		linkRow.createEl("button", { cls: "rb-modal-link-btn", text: "Copy" })
			.addEventListener("click", () => copyToClipboard(url));

		const statusText = this.status.kind === "shared"
			? `${this.status.daysLeft} day${this.status.daysLeft === 1 ? "" : "s"} left`
			: "";
		box.createEl("p", { cls: "rb-modal-section-desc", text: statusText });
	}

	private renderSharedFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());
		footerEl.createEl("button", { cls: "mod-warning", text: "Unshare" })
			.addEventListener("click", (e) => { void this.handleUnshare(e.currentTarget as HTMLButtonElement); });
		footerEl.createEl("button", { cls: "mod-cta", text: "Re-share" })
			.addEventListener("click", () => {
				this.isReshare = true;
				this.view = "form";
				this.renderCurrentView();
				this.renderCurrentFooter();
			});
	}

	private async handleSubmit(): Promise<void> {
		this.submitBtn.disabled = true;
		try {
			const name = this.nameInput.value.trim() || this.file.basename;
			const expiresInDays = Number(this.expiresSelect.value) as ExpiryDays;
			if (this.isReshare) {
				await unshareRecipe(this.app, this.file, this.settings, this.saveSettings);
			}
			const { share, imageOmittedReason, warnings } = await shareRecipe(this.app, this.file, this.settings, this.saveSettings, { name, expiresInDays });
			this.resultData = { share, imageOmittedReason, warnings };
			this.view = "result";
			this.renderCurrentView();
			this.renderCurrentFooter();
		} catch (err) {
			new Notice(`Failed to share recipe: ${err instanceof Error ? err.message : String(err)}`);
			this.submitBtn.disabled = false;
		}
	}

	private async handleUnshare(btn: HTMLButtonElement): Promise<void> {
		btn.disabled = true;
		try {
			await unshareRecipe(this.app, this.file, this.settings, this.saveSettings);
			new Notice("Recipe unshared.");
			this.close();
		} catch (err) {
			new Notice(`Failed to unshare recipe: ${err instanceof Error ? err.message : String(err)}`);
			btn.disabled = false;
		}
	}
}
