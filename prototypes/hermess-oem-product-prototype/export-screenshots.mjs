import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "screenshots");
const htmlUrl = `file://${path.join(__dirname, "index.html")}`;

const screens = [
  "overview",
  "login",
  "chat",
  "history",
  "group",
  "jobs",
  "kanban",
  "channels",
  "skills",
  "memory",
  "models",
  "usage",
  "logs",
  "profiles",
  "files",
  "terminal",
  "settings",
  "mobile",
];

await fs.mkdir(outputDir, { recursive: true });

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let launchOptions = {};
try {
  await fs.access(chromePath);
  launchOptions = { executablePath: chromePath };
} catch {
  launchOptions = {};
}

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
await page.goto(htmlUrl);

for (const screen of screens) {
  await page.click(`[data-screen="${screen}"]`);
  await page.screenshot({
    path: path.join(outputDir, `${screen}.png`),
    fullPage: true,
  });
}

await browser.close();
console.log(`Exported ${screens.length} screenshots to ${outputDir}`);
