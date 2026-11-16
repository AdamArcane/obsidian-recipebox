import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		setupFiles: ["tests/setup-i18n.ts"],
		include: ["tests/**/*.test.ts"],
		environment: "node",
	},
});
