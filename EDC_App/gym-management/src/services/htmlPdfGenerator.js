const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function hasArabic(value) {
  return /[\u0600-\u06FF]/.test(String(value || ""));
}

function findBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function buildPrintableHtml({ title, html, language, showHeader = true, showSignatures = true, pageMargin = "18mm 16mm" }) {
  const rtl = language === "ar" || hasArabic(html) || hasArabic(title);
  return `<!doctype html>
<html lang="${language || "fr"}" dir="${rtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8" />
  <title>${title || "Contract"}</title>
  <style>
    @page { size: A4; margin: ${pageMargin}; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      font-family: ${rtl ? '"Arial", "Tahoma", "Segoe UI", sans-serif' : '"Segoe UI", Arial, sans-serif'};
      font-size: 13px;
      line-height: 1.72;
      direction: ${rtl ? "rtl" : "ltr"};
      text-align: ${rtl ? "right" : "left"};
    }
    header {
      border-bottom: 2px solid #172033;
      padding-bottom: 12px;
      margin-bottom: 22px;
      direction: ltr;
      text-align: left;
    }
    .brand { font-size: 24px; font-weight: 800; letter-spacing: 0; }
    .subtitle { font-size: 12px; color: #475569; margin-top: 2px; }
    h1 { font-size: 22px; margin: 0 0 16px; color: #0f172a; }
    h2 { font-size: 16px; margin: 18px 0 8px; color: #172033; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 14px; margin: 12px 0 4px; color: #1f2937; }
    p { margin: 7px 0; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; direction: ${rtl ? "rtl" : "ltr"}; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; vertical-align: top; }
    th { width: 34%; background: #f8fafc; color: #334155; font-weight: 700; }
    ul, ol { margin-top: 6px; }
    .signatures {
      margin-top: 38px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      direction: ltr;
      text-align: left;
      page-break-inside: avoid;
    }
    .signature-box {
      border-top: 1px solid #111827;
      padding-top: 8px;
      min-height: 56px;
      color: #334155;
    }
  </style>
</head>
<body>
  ${showHeader ? `<header>
    <div class="brand">EDC Gym Management</div>
    <div class="subtitle">Professional contract document</div>
  </header>` : ""}
  <main>${html || ""}</main>
  ${showSignatures ? `<section class="signatures">
    <div class="signature-box">Gym representative signature<br/>Date: ____ / ____ / ________</div>
    <div class="signature-box">Member / Employee signature<br/>Date: ____ / ____ / ________</div>
  </section>` : ""}
</body>
</html>`;
}

function runBrowserPrint(browserPath, inputHtmlPath, outputPdfPath) {
  return new Promise((resolve, reject) => {
    const userDataDir = path.join(os.tmpdir(), `gym_chrome_profile_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    const child = spawn(browserPath, [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--print-to-pdf=${outputPdfPath}`,
      `file:///${inputHtmlPath.replace(/\\/g, "/")}`,
    ], { windowsHide: true });

    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("exit", (code) => {
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_e) {}
      if (code === 0 && fs.existsSync(outputPdfPath)) return resolve();
      reject(new Error(stderr || `Browser PDF export failed with code ${code}`));
    });
  });
}

async function generatePdfFromHtml({ title, html, language, showHeader, showSignatures, pageMargin }) {
  const browserPath = findBrowserExecutable();
  if (!browserPath) return null;

  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const inputHtmlPath = path.join(os.tmpdir(), `gym_contract_${id}.html`);
  const outputPdfPath = path.join(os.tmpdir(), `gym_contract_${id}.pdf`);

  try {
    fs.writeFileSync(inputHtmlPath, buildPrintableHtml({ title, html, language, showHeader, showSignatures, pageMargin }), "utf8");
    await runBrowserPrint(browserPath, inputHtmlPath, outputPdfPath);
    return fs.readFileSync(outputPdfPath);
  } finally {
    try { fs.unlinkSync(inputHtmlPath); } catch (_e) {}
    try { fs.unlinkSync(outputPdfPath); } catch (_e) {}
  }
}

module.exports = { generatePdfFromHtml, hasArabic };
