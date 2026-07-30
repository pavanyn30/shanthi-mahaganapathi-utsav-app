import fs from "fs";
import path from "path";

const outputPublicDir = path.resolve(process.cwd(), ".output/public");
const assetsDir = path.join(outputPublicDir, "assets");
const indexHtmlPath = path.join(outputPublicDir, "index.html");

if (!fs.existsSync(indexHtmlPath)) {
  console.error("post-build: .output/public/index.html does not exist");
  process.exit(0);
}

let html = fs.readFileSync(indexHtmlPath, "utf-8");

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const cssFile = files.find((f) => f.startsWith("styles-") && f.endsWith(".css"));
  const jsFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js")) || files.find((f) => f.endsWith(".js") && !f.includes("chunk"));

  console.log("Found post-build assets:", { cssFile, jsFile });

  // 1. Inject CSS link if missing
  if (cssFile && !html.includes(cssFile)) {
    const cssTag = `\n    <link rel="stylesheet" href="/assets/${cssFile}" />`;
    html = html.replace("</head>", `${cssTag}\n  </head>`);
  }

  // 2. Replace uncompiled src script tag with compiled production JS bundle
  if (jsFile) {
    if (html.includes("/src/main.tsx")) {
      html = html.replace('/src/main.tsx', `/assets/${jsFile}`);
    } else if (html.includes("/src/entry-client.tsx")) {
      html = html.replace('/src/entry-client.tsx', `/assets/${jsFile}`);
    } else if (!html.includes(jsFile)) {
      const jsTag = `\n    <script type="module" src="/assets/${jsFile}"></script>`;
      html = html.replace("</body>", `${jsTag}\n  </body>`);
    }
  }
}

fs.writeFileSync(indexHtmlPath, html, "utf-8");
console.log("Successfully prepared .output/public/index.html for Firebase Hosting Deployment!");
