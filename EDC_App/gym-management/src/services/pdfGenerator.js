function escapePdfText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function toUtf16Hex(value) {
  const text = String(value || "");
  const bytes = [0xfe, 0xff];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code > 0xffff) {
      const high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
      const low = ((code - 0x10000) % 0x400) + 0xdc00;
      bytes.push(high >> 8, high & 0xff, low >> 8, low & 0xff);
    } else {
      bytes.push(code >> 8, code & 0xff);
    }
  }
  return `<${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}>`;
}

function pdfText(value) {
  const text = String(value || "");
  return /[^\x20-\x7E]/.test(text) ? toUtf16Hex(text) : `(${escapePdfText(text)})`;
}

function hasArabic(value) {
  return /[\u0600-\u06FF]/.test(String(value || ""));
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<\/h1>/gi, "\n")
    .replace(/<\/h2>/gi, "\n")
    .replace(/<\/h3>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<\/th>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wrapLine(line, maxChars) {
  const words = String(line || "").split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (!word) continue;
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function buildPageContent(lines, pageNo, totalPages, title) {
  const ops = [];
  ops.push(`BT /F1 18 Tf 50 800 Td ${pdfText("EDC Gym Management")} Tj ET`);
  ops.push(`BT /F2 10 Tf 50 784 Td ${pdfText("Professional contract document")} Tj ET`);
  ops.push("0.1 0.16 0.28 RG 50 772 m 545 772 l S");
  ops.push(`BT /F3 14 Tf 50 748 Td ${pdfText(title)} Tj ET`);

  let y = 722;
  for (const line of lines) {
    const fontSize = line.startsWith("# ") ? 13 : 10;
    const clean = line.replace(/^#+\s*/, "");
    const isArabic = hasArabic(clean);
    const font = isArabic ? "F3" : (fontSize > 10 ? "F1" : "F2");
    const x = 50;
    ops.push(`BT /${font} ${fontSize} Tf ${x} ${y} Td ${pdfText(clean)} Tj ET`);
    y -= line === "" ? 10 : 15;
  }

  ops.push("0.7 0.74 0.8 RG 50 96 m 545 96 l S");
  ops.push(`BT /F2 9 Tf 50 78 Td ${pdfText("Gym representative signature: ______________________________")} Tj ET`);
  ops.push(`BT /F2 9 Tf 50 58 Td ${pdfText("Member / Employee signature: ______________________________")} Tj ET`);
  ops.push(`BT /F2 8 Tf 500 30 Td ${pdfText(`Page ${pageNo}/${totalPages}`)} Tj ET`);
  return ops.join("\n");
}

function generatePdf({ title, html, text }) {
  const rawText = text || stripHtml(html);
  const sourceLines = rawText.split(/\r?\n/).flatMap((line) => wrapLine(line, 92));
  const linesPerPage = 39;
  const pages = [];
  for (let i = 0; i < sourceLines.length; i += linesPerPage) {
    pages.push(sourceLines.slice(i, i + linesPerPage));
  }
  if (!pages.length) pages.push([""]);

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = add("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = add("");
  const fontRegularId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const unicodeFontId = add("<< /Type /Font /Subtype /Type0 /BaseFont /ArialUnicodeMS /Encoding /Identity-H /DescendantFonts [ << /Type /Font /Subtype /CIDFontType2 /BaseFont /ArialUnicodeMS /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 1000 >> ] >>");
  const pageIds = [];

  pages.forEach((pageLines, index) => {
    const content = buildPageContent(pageLines, index + 1, pages.length, title);
    const contentId = add(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontBoldId} 0 R /F2 ${fontRegularId} 0 R /F3 ${unicodeFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

module.exports = { generatePdf, stripHtml };
