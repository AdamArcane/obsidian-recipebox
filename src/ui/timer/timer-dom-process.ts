/**
 * Walks rendered instruction DOM nodes to find duration text and replaces matches
 * with interactive TimerWidget elements.
 */
import { setIcon } from "obsidian";
import { DURATION_RE, matchToSeconds } from "./duration-detect";
import { TimerWidget, TimerOptions } from "./timer-widget";
export type { TimerOptions };

export function processTimerNodes(container: HTMLElement, opts: TimerOptions): void {
	const walker = activeDocument.createTreeWalker(container, NodeFilter.SHOW_TEXT);
	const toReplace: Array<{ node: Text; matches: RegExpExecArray[] }> = [];

	let node: Node | null;
	while ((node = walker.nextNode())) {
		const text = node as Text;
		const content = text.textContent ?? "";
		DURATION_RE.lastIndex = 0;
		if (!DURATION_RE.test(content)) continue;

		DURATION_RE.lastIndex = 0;
		const matches: RegExpExecArray[] = [];
		let m: RegExpExecArray | null;
		while ((m = DURATION_RE.exec(content)) !== null) matches.push(m);
		if (matches.length > 0) toReplace.push({ node: text, matches });
	}

	for (const { node: textNode, matches } of toReplace) {
		const content = textNode.textContent ?? "";
		const frag = activeDocument.createDocumentFragment();
		let cursor = 0;

		for (const match of matches) {
			const matchStart = match.index;
			if (matchStart > cursor) {
				frag.appendChild(activeDocument.createTextNode(content.slice(cursor, matchStart)));
			}

			const seconds = matchToSeconds(match, opts.rangeDefault);
			if (seconds > 0) {
				const btn = createEl("span", { cls: "rb-duration-btn", attr: { role: "button", tabindex: "0" } });
				const iconSpan = btn.createSpan({ cls: "rb-duration-icon" });
				setIcon(iconSpan, "timer");
				btn.appendChild(activeDocument.createTextNode(match[0]));
				btn.addEventListener("click", (e) => {
					e.stopPropagation();
					new TimerWidget(btn, seconds, match[0], opts);
				});
				frag.appendChild(btn);
			} else {
				frag.appendChild(activeDocument.createTextNode(match[0]));
			}

			cursor = matchStart + match[0].length;
		}

		if (cursor < content.length) {
			frag.appendChild(activeDocument.createTextNode(content.slice(cursor)));
		}

		textNode.parentNode?.replaceChild(frag, textNode);
	}
}
