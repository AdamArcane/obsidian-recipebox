import esbuild from "esbuild";
import { builtinModules } from "node:module";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", ...builtinModules],
  format: "cjs",
  target: "es2018",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
  // Plugins ship only main.js, manifest.json and styles.css, so images must be inlined.
  loader: { ".png": "dataurl" },
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
