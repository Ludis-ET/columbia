#!/usr/bin/env node
/**
 * Builds public/columbia-care-afh-everett.pdf from confirmed contact details.
 *
 * No extra dependency: a one-page PDF with the standard Times fonts.
 * Re-run if the phone, address or email in source-of-truth.json changes.
 */

import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";

const INK = [0.063, 0.145, 0.29];
const SAGE = [0.369, 0.486, 0.235];
const PAPER = [0.965, 0.961, 0.933];

const W = 252; // 3.5 in
const H = 144; // 2 in

function esc(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function rgb(c) {
  return `${c[0]} ${c[1]} ${c[2]} rg`;
}

const raw = JSON.parse(await readFile("content/source-of-truth.json", "utf8"));
const addr = raw.contact.address.value;
const phone = raw.contact.phonePrimary.value;
const fax = raw.contact.fax.value;
const email = raw.contact.email.value;
const tagline = raw.identity.tagline.value.replace(/\.$/, "");

const lines = [
  `q`,
  `${rgb(PAPER)} 0 0 ${W} ${H} re f`,
  `${rgb(SAGE)} 0 0 10 ${H} re f`,
  `Q`,
  `BT`,
  `/F1 13 Tf`,
  `${rgb(INK)}`,
  `1 0 0 1 22 118 Tm (${esc("Columbia Care")}) Tj`,
  `/F2 8 Tf`,
  `${rgb(SAGE)}`,
  `0 -12 Td (${esc("ADULT FAMILY HOME  ·  EVERETT")}) Tj`,
  `/F2 8 Tf`,
  `${rgb(INK)}`,
  `0 -16 Td (${esc(tagline)}) Tj`,
  `/F2 8 Tf`,
  `0 -18 Td (${esc(`${addr.streetAddress}, ${addr.addressLocality}, ${addr.addressRegion} ${addr.postalCode}`)}) Tj`,
  `0 -12 Td (${esc(phone)}) Tj`,
  `0 -11 Td (${esc(email)}) Tj`,
  `0 -11 Td (${esc(`Fax ${fax}`)}) Tj`,
  `ET`,
];

const stream = lines.join("\n") + "\n";
const streamLen = Buffer.byteLength(stream, "utf8");

const objects = [];
function add(body) {
  objects.push(body);
  return objects.length;
}

const idCatalog = add("<< /Type /Catalog /Pages 2 0 R >>");
const idPages = add(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
const idPage = add(
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
);
const idBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");
const idRoman = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");
const idStream = add(`<< /Length ${streamLen} >>\nstream\n${stream}endstream`);

if (idCatalog !== 1 || idPages !== 2 || idPage !== 3 || idBold !== 4 || idRoman !== 5 || idStream !== 6) {
  throw new Error("PDF object numbering drifted");
}

let pdf = "%PDF-1.4\n";
const offsets = [0];
for (let i = 0; i < objects.length; i += 1) {
  offsets.push(Buffer.byteLength(pdf, "utf8"));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}
const xrefAt = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (let i = 1; i < offsets.length; i += 1) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;

await writeFile("public/columbia-care-afh-everett.pdf", pdf, "utf8");
console.log("Wrote public/columbia-care-afh-everett.pdf");
