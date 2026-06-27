function escapePdfText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function asciiSafe(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function pdfLiteral(value) {
  return `(${escapePdfText(asciiSafe(value))})`;
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

function wrapText(text, maxChars) {
  const words = asciiSafe(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (!word) continue;
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function buildPdf(objects) {
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function createContentStream(lines) {
  return lines.join("\n");
}

function generatePdf({ title, html, text }) {
  const rawText = asciiSafe(text || stripHtml(html));
  const lines = rawText.split(/\r?\n/).flatMap((line) => wrapText(line, 92));
  const pages = [];
  const linesPerPage = 38;
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (!pages.length) pages.push([""]);

  const objects = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  pages.forEach((pageLines, index) => {
    const stream = [];
    const y = (top) => 842 - top;
    const t = (x, top, size, value, font = "F1") => {
      stream.push(`BT /${font} ${size} Tf ${x} ${y(top)} Td ${pdfLiteral(value)} Tj ET`);
    };
    const line = (x1, top1, x2, top2, width = 1, color = "0.12 0.18 0.28") => {
      stream.push(`${color} RG`);
      stream.push(`${width} w`);
      stream.push(`${x1} ${y(top1)} m ${x2} ${y(top2)} l S`);
    };

    t(50, 46, 18, "EDC Gym Management", "F2");
    t(50, 62, 10, "Professional contract document", "F1");
    line(50, 76, 545, 76, 1.2, "0.10 0.16 0.28");
    t(50, 100, 14, title || "Document", "F2");

    let cursor = 128;
    pageLines.forEach((lineText) => {
      const size = lineText.startsWith("#") ? 12 : 10;
      const clean = lineText.replace(/^#+\s*/, "");
      t(50, cursor, size, clean, size > 10 ? "F2" : "F1");
      cursor += clean ? 15 : 10;
    });

    line(50, 748, 545, 748, 1, "0.70 0.74 0.80");
    t(50, 770, 9, "Gym representative signature: ______________________________", "F1");
    t(50, 790, 9, "Member / Employee signature: ______________________________", "F1");
    t(500, 812, 8, `Page ${index + 1}/${pages.length}`, "F1");

    const content = createContentStream(stream);
    const contentId = objects.length + 1;
    const pageId = contentId + 1;
    objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  return buildPdf(objects);
}

function buildAuthorizationFallbackPdf(row) {
  const pageHeight = 842;
  const margin = 26;
  const companyName = asciiSafe(row.company_name || row.branch_company_name || "La Ste Olympe Gym");
  const branchName = asciiSafe(row.branch_name || "Gym");
  const contractNumber = asciiSafe(row.contract_number || `SUB-${row.id}`);
  const city = asciiSafe(row.branch_city || "Sousse");
  const deductionDay = Number(row.deduction_day || 5);
  const rib = String(row.bank_account || "").replace(/\D+/g, "");
  const ribChars = rib.split("");
  const dateText = new Date().toLocaleDateString("fr-FR");

  const y = (top) => pageHeight - top;
  const t = (stream, x, top, size, value, font = "F1") => {
    stream.push(`BT /${font} ${size} Tf ${x} ${y(top)} Td ${pdfLiteral(value)} Tj ET`);
  };
  const line = (stream, x1, top1, x2, top2, width = 1, color = "0.64 0.69 0.75") => {
    stream.push(`${color} RG`);
    stream.push(`${width} w`);
    stream.push(`${x1} ${y(top1)} m ${x2} ${y(top2)} l S`);
  };
  const box = (stream, x, top, w, h, stroke = "0.72 0.77 0.82", fill = null, width = 1) => {
    stream.push(`${stroke} RG`);
    stream.push(`${width} w`);
    if (fill) stream.push(`${fill} rg`);
    stream.push(`${x} ${y(top + h)} ${w} ${h} re ${fill ? "B" : "S"}`);
  };

  const stream = [];
  box(stream, margin, 18, 595 - margin * 2, 842 - 36, "0.90 0.91 0.94", null, 1);

  const rightX = 404;
  const metaTop = 56;
  t(stream, rightX, metaTop, 11, "contract No", "F1");
  t(stream, rightX + 54, metaTop, 11, contractNumber, "F2");
  line(stream, rightX + 54, metaTop + 2, rightX + 174, metaTop + 2, 0.8, "0.73 0.76 0.81");
  t(stream, rightX + 10, metaTop + 22, 11, "Branch", "F1");
  t(stream, rightX + 54, metaTop + 22, 11, branchName, "F2");
  line(stream, rightX + 54, metaTop + 24, rightX + 174, metaTop + 24, 0.8, "0.73 0.76 0.81");
  t(stream, rightX - 12, metaTop + 42, 11, "commercial", "F1");
  line(stream, rightX + 54, metaTop + 44, rightX + 174, metaTop + 44, 0.8, "0.73 0.76 0.81");

  box(stream, 198, 94, 404, 40, "0.47 0.51 0.58", null, 1.3);
  t(stream, 245, 118, 18, "Automatic debit authorization", "F2");

  const labelX = 40;
  const valueX = 160;
  let cursor = 166;
  const rowGap = 25;
  const drawRow = (label, value, maxChars = 76) => {
    t(stream, labelX, cursor, 11, label, "F2");
    const lines = wrapText(value, maxChars);
    t(stream, valueX, cursor, 11, lines[0], "F1");
    for (let i = 1; i < lines.length; i += 1) {
      t(stream, valueX, cursor + i * 14, 11, lines[i], "F1");
    }
    cursor += rowGap + (lines.length - 1) * 14;
  };

  drawRow("I, the undersigned", row.full_name || "", 56);
  drawRow("Full name", `${row.full_name || ""} ( contract holder )`, 64);
  drawRow("CIN No.", `${row.cin || ""} issued on ${row.cin_issued_at || ""} at ${row.cin_issued_place || ""}`, 70);
  drawRow("Phone", row.phone || "", 56);

  t(stream, labelX, cursor + 2, 11, "Bank RIB", "F1");
  const ribStartX = 160;
  const ribStartY = cursor - 2;
  const cellW = 24;
  const cellH = 25;
  const cellCount = Math.max(24, ribChars.length || 24);
  for (let i = 0; i < cellCount; i += 1) {
    box(stream, ribStartX + i * cellW, ribStartY, cellW, cellH, "0.49 0.54 0.61", null, 0.9);
    t(stream, ribStartX + i * cellW + 7, ribStartY + 17, 12, ribChars[i] || "", "F1");
  }
  cursor += 38;

  const para1 = `authorizes ${companyName} to execute monthly and irrevocable automatic debits from my account, starting from ${asciiSafe(row.start_date || "")} and ending at ${asciiSafe(row.end_date || "")}.`;
  wrapText(para1, 110).forEach((ln, idx) => t(stream, 40, cursor + idx * 14, 10.8, ln, "F1"));
  cursor += wrapText(para1, 110).length * 14 + 8;

  t(stream, 40, cursor, 11, "either on day 05 of each month", "F1");
  box(stream, 265, cursor - 14, 32, 22, "0.54 0.58 0.64", deductionDay === 5 ? "0.77 0.94 0.60" : null, 1);
  t(stream, 275, cursor + 3, 12, deductionDay === 5 ? "5" : "", "F2");
  t(stream, 308, cursor, 11, "or on day 26 of each month", "F1");
  box(stream, 430, cursor - 14, 32, 22, "0.54 0.58 0.64", deductionDay === 26 ? "0.77 0.94 0.60" : null, 1);
  t(stream, 439, cursor + 3, 12, deductionDay === 26 ? "26" : "", "F2");
  t(stream, 475, cursor, 10, "( mark the selected option )", "F3");
  cursor += 26;

  t(stream, 40, cursor, 11, `monthly amount: ${asciiSafe(row.amount)} DT`, "F1");
  cursor += 18;
  t(stream, 40, cursor, 11, `Company: ${companyName}`, "F1");
  cursor += 18;
  t(stream, 40, cursor, 11, "MF: 1271307F A/V/0000 - address: Immeuble Badr Bloc 8 4th floor - Khezama 47-Sousse.", "F1");
  cursor += 18;
  t(stream, 40, cursor, 11, "bank account opened at Banque Zitouna - Monastir branch.", "F1");
  cursor += 18;
  t(stream, 40, cursor, 11, "Central Bank code: 0127", "F1");
  cursor += 24;

  line(stream, 40, cursor + 12, 285, cursor + 12, 1.2, "0.10 0.12 0.16");
  line(stream, 315, cursor + 12, 560, cursor + 12, 1.2, "0.10 0.12 0.16");
  t(stream, 40, cursor + 30, 10.5, `Done in ${city}, on ${dateText}`, "F2");
  t(stream, 322, cursor + 30, 10.5, `Done in ${branchName}, on ${dateText}`, "F2");
  t(stream, 40, cursor + 66, 10, "Account holder signature", "F1");
  t(stream, 40, cursor + 82, 10, "(read and approved)", "F1");
  t(stream, 322, cursor + 66, 10, "Bank approval", "F1");
  t(stream, 322, cursor + 82, 10, "(stamp and signature)", "F1");
  box(stream, 476, cursor + 34, 100, 100, "0.57 0.66 0.95", null, 1.2);
  t(stream, 506, cursor + 85, 10, "STAMP", "F3");
  t(stream, 40, cursor + 110, 10, "Name: ________________________________", "F1");

  cursor += 128;
  t(stream, 40, cursor, 11, "Special conditions:", "F2");
  cursor += 16;
  [
    "1 - Bank details change:",
    "If bank coordinates change, the subscriber must redo the authorization and submit it again.",
    "2 - Subscription cancellation terms:",
    "The subscription cannot be cancelled or refunded during the minimum period of 12 months.",
    "The subscription is concluded for a minimum of 12 months. This duration is mandatory.",
    "The debit amounts are guaranteed during the minimum subscription period.",
    "The debit amounts may be increased after the minimum commitment period.",
    "In case of a missed installment, Olympe Gym will block the subscription.",
    "The member must regularize the due amount to reactivate the subscription.",
  ].forEach((ln, idx) => {
    const bold = idx === 0 || idx === 2;
    t(stream, 40, cursor, bold ? 10.5 : 9.5, ln, bold ? "F2" : "F1");
    cursor += bold ? 12 : 11;
  });
  t(stream, 40, 786, 10, `Done in ${city}, on ${dateText}. File reference ${contractNumber}.`, "F1");

  const content = createContentStream(stream);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  return buildPdf(objects);
}

module.exports = {
  generatePdf,
  generateAuthorizationFallbackPdf: buildAuthorizationFallbackPdf,
  stripHtml,
};
