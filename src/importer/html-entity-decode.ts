const ENTITY_MAP: Record<string, string> = {
	"&amp;": "&",
	"&nbsp;": " ",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&apos;": "'",
	"&#39;": "'",
	"&#x27;": "'",
	"&rsquo;": "’",
	"&lsquo;": "‘",
	"&rdquo;": "”",
	"&ldquo;": "“",
	"&#47;": "/",
	"&sol;": "/",
};

const ENTITY_RE = /&(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/g;

export function decodeHtmlEntities(text: string): string {
	return text.replace(ENTITY_RE, (match) => ENTITY_MAP[match] ?? match);
}
