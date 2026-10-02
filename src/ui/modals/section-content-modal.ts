/**
 * Lightweight modal that renders one trailing recipe section as markdown.
 * Used by recipe view section buttons so extra content opens on demand.
 */
import { App, Component, HoverParent, HoverPopover, MarkdownRenderer } from "obsidian";
import { BaseModal } from "./modal-shell";
import { registerLinkHandlers } from "../recipe-view/link-handlers";
import { RECIPE_VIEW_TYPE } from "../recipe-view/recipe-view-type";

export class SectionContentModal extends BaseModal implements HoverParent {
    hoverPopover: HoverPopover | null = null;
    // Own component so the link listeners are removed when the modal closes,
    // rather than piling up on the long-lived view component per open.
    private linkComponent: Component | null = null;

    constructor(
        app: App,
        private readonly sectionHeading: string,
        private readonly sectionMarkdown: string,
        private readonly sourcePath: string,
        private readonly markdownComponent: Component,
        private readonly onEditSection?: (heading: string) => void,
    ) {
        super(app);
    }

    getTitle(): string {
        return this.sectionHeading;
    }

    getIcon(): string {
        return "file-text";
    }

    async renderBody(bodyEl: HTMLElement): Promise<void> {
        await MarkdownRenderer.render(this.app, this.sectionMarkdown, bodyEl, this.sourcePath, this.markdownComponent);
        this.linkComponent = new Component();
        this.linkComponent.load();
        // Close first on a navigating click so the opened note is not hidden
        // behind this modal.
        registerLinkHandlers(this.app, this.linkComponent, bodyEl, () => this.sourcePath, {
            hoverSource: RECIPE_VIEW_TYPE,
            hoverParent: this,
            onNavigate: () => this.close(),
        });
    }

    onClose(): void {
        this.linkComponent?.unload();
        this.linkComponent = null;
        super.onClose();
    }

    renderFooter(footerEl: HTMLElement): void {

        if (this.onEditSection) {
            footerEl.createEl("button", { text: "Edit section" }).addEventListener("click", () => {
                this.close();
                this.onEditSection?.(this.sectionHeading);
            });
        }
        footerEl.createEl("button", { cls: "mod-cta", text: "Close" }).addEventListener("click", () => this.close());
    }
}
