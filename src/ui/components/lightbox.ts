export function openLightbox(src: string): void {
	const overlay = activeDocument.body.createDiv({ cls: "rb-lightbox-overlay" });

	const closeBtn = overlay.createEl("button", { cls: "rb-lightbox-close", text: "×" });
	const img = overlay.createEl("img", { cls: "rb-lightbox-img", attr: { src } });

	const close = () => overlay.remove();
	closeBtn.addEventListener("click", close);

	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) close();
	});

	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			close();
			activeDocument.removeEventListener("keydown", onKey);
		}
	};
	activeDocument.addEventListener("keydown", onKey);

	img.addEventListener("click", (e) => e.stopPropagation());
}

export function makeLightboxable(img: HTMLImageElement): void {
	img.addClass("rb-lightbox-trigger");
	img.addEventListener("click", () => openLightbox(img.src));
}

export function attachLightboxToImages(container: HTMLElement): void {
	container.querySelectorAll<HTMLImageElement>("img").forEach(makeLightboxable);
}
