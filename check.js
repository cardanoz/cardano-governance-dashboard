const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const m = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!m) { console.log("No script"); process.exit(1); }
const s = m[1];
console.log("{}", (s.match(/\{/g)||[]).length + "/" + (s.match(/\}/g)||[]).length);
console.log("()", (s.match(/\(/g)||[]).length + "/" + (s.match(/\)/g)||[]).length);
console.log("[]", (s.match(/\[/g)||[]).length + "/" + (s.match(/\]/g)||[]).length);
