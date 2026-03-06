#!/usr/bin/env node
/**
 * Pre-compile JSX in index.html → pure JS
 * Eliminates the need for babel-standalone (3.2MB) at runtime.
 *
 * Usage: node scripts/build-precompile.js
 *
 * What it does:
 * 1. Reads index.html
 * 2. Extracts the JSX source from <script type="text/plain" id="app-source">
 * 3. Compiles JSX → JS using @babel/standalone (at build time, not runtime)
 * 4. Replaces loader + app-source with a single <script> containing compiled JS
 * 5. Removes babel-standalone references from the HTML
 * 6. Writes the optimized index.html back
 */

const fs = require("fs");
const path = require("path");

const HTML_PATH = path.resolve(__dirname, "..", "index.html");

// Read the source HTML
let html = fs.readFileSync(HTML_PATH, "utf8");
console.log(`Source index.html: ${html.length} chars (${(html.length / 1024).toFixed(0)}KB)`);

// Step 1: Extract JSX source from <script type="text/plain" id="app-source">...</script>
const srcStart = html.indexOf('id="app-source">');
if (srcStart === -1) {
  console.log("No app-source block found — already compiled or different format. Skipping.");
  process.exit(0);
}
const srcContentStart = srcStart + 'id="app-source">'.length;
const srcEnd = html.indexOf("</script>", srcContentStart);
if (srcEnd === -1) {
  console.error("ERROR: Could not find closing </script> for app-source");
  process.exit(1);
}
const jsxSource = html.substring(srcContentStart, srcEnd);
console.log(`Extracted JSX source: ${jsxSource.length} chars (${(jsxSource.length / 1024).toFixed(0)}KB)`);

// Step 2: Compile JSX → JS using Babel
const Babel = require("@babel/standalone");
console.log("Compiling JSX → JS with Babel...");
const startTime = Date.now();
const compiled = Babel.transform(jsxSource, {
  presets: ["react"],
  filename: "app.jsx"
});
const jsCode = compiled.code;
const elapsed = Date.now() - startTime;
console.log(`Compiled: ${jsCode.length} chars (${(jsCode.length / 1024).toFixed(0)}KB) in ${elapsed}ms`);

// Step 3: Find the loader script start and app-source script end
// These are adjacent: <script>...loader...</script><script type="text/plain" id="app-source">...JSX...</script>
const loaderComment = "// Async loader: load Babel + Chart.js in parallel";
const loaderPos = html.indexOf(loaderComment);
if (loaderPos === -1) {
  console.error("ERROR: Async loader script not found");
  process.exit(1);
}
const loaderScriptStart = html.lastIndexOf("<script>", loaderPos);
const appSourceEnd = srcEnd + "</script>".length;

// Step 4: Replace both loader + app-source with compiled JS
const replacement = `<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" async><\/script>
<script>
${jsCode}
<\/script>`;

html = html.substring(0, loaderScriptStart) + replacement + html.substring(appSourceEnd);

// Step 5: Clean up Babel-related lines from <head>
html = html.replace('<!-- Babel + Chart.js loaded async by loader script below -->\n', '');
html = html.replace(/<!-- Instant loading screen.*?-->\n/s, '');

// Step 6: Replace inline loading screen with simple root div
// (React mounts immediately now — no need for loading screen)
html = html.replace(
  /<div id="root"><div style="display:flex[^]*?<\/div><\/div>/,
  '<div id="root"></div>'
);

// Step 7: Write back
fs.writeFileSync(HTML_PATH, html, "utf8");
console.log(`\nOptimized index.html written: ${html.length} chars (${(html.length / 1024).toFixed(0)}KB)`);
console.log(`Savings: ${((1 - html.length / fs.readFileSync(HTML_PATH, "utf8").length) * 100).toFixed(1)}% smaller HTML`);
console.log("✓ Babel-standalone (3.2MB) eliminated from runtime");
console.log("✓ Chart.js loaded async");
console.log("✓ Loading screen removed (React renders immediately)");
