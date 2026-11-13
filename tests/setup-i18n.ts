/** Supplies the Obsidian language API to otherwise runtime-free unit tests. */
import { vi } from "vitest";
vi.mock("obsidian", () => ({ getLanguage: () => "en" }));
