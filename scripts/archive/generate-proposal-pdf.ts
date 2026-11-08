/**
 * Generates the TNF league proposal PDF (same spirit as the original briefing doc).
 * Run: npx tsx scripts/generate-proposal-pdf.ts
 */
import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import path from "path";
import {
  awards,
  benefits,
  fees,
  fines,
  fixturesByWeek,
  panelLaws,
  pitchRules,
  pointsSystem,
  proposalStory,
  redCardRules,
  rosterRules,
  tiebreakers,
  venue,
  yellowAccumulation,
} from "../src/data/league";
import {
  PAYMENT_ACCOUNT,
  PAYMENT_CYCLE,
  WHATSAPP,
} from "../src/lib/league-db";

const outPath = path.join(
  process.cwd(),
  "public",
  "tnf-league-proposal.pdf",
);

function naira(s: string) {
  return s.replace(/₦/g, "NGN ");
}

function main() {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 54, bottom: 54, left: 54, right: 54 },
    info: {
      Title: "Thursday Night Football — League Proposal",
      Author: "Thursday Night Football",
      Subject: "Time-capped league system & disciplinary framework",
    },
  });

  const stream = createWriteStream(outPath);
  doc.pipe(stream);

  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  function ensureSpace(need = 80) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - need) {
      doc.addPage();
    }
  }

  function h1(text: string) {
    ensureSpace(100);
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#0c281c")
      .text(text, { width: pageWidth });
    doc.moveDown(0.4);
  }

  function h2(text: string) {
    ensureSpace(70);
    doc.moveDown(0.6);
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#0c281c")
      .text(text.toUpperCase(), { width: pageWidth });
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor("#c9a227")
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.5);
  }

  function h3(text: string) {
    ensureSpace(50);
    doc.moveDown(0.35);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#1a5c3c")
      .text(text, { width: pageWidth });
    doc.moveDown(0.25);
  }

  function body(text: string) {
    ensureSpace(40);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#222")
      .text(naira(text), { width: pageWidth, align: "left", lineGap: 2 });
    doc.moveDown(0.35);
  }

  function bullet(text: string) {
    ensureSpace(36);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#222")
      .text(`•  ${naira(text)}`, {
        width: pageWidth,
        indent: 0,
        lineGap: 2,
      });
    doc.moveDown(0.2);
  }

  function numbered(i: number, text: string) {
    ensureSpace(36);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#222")
      .text(`${i}.  ${naira(text)}`, { width: pageWidth, lineGap: 2 });
    doc.moveDown(0.25);
  }

  // —— Cover ——
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#c9a227")
    .text("THURSDAY NIGHT FOOTBALL", { align: "left" });
  doc.moveDown(0.3);
  doc
    .font("Helvetica-Bold")
    .fontSize(26)
    .fillColor("#0c281c")
    .text("League System &\nDisciplinary Framework", {
      width: pageWidth,
      lineGap: 4,
    });
  doc.moveDown(0.6);
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#444")
    .text(
      "A proposal to replace winner-stays-on with a time-capped league so every paid player gets equal, guaranteed minutes.",
      { width: pageWidth, lineGap: 3 },
    );
  doc.moveDown(0.8);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#333")
    .text(`${venue.name}  ·  ${venue.session}`);
  doc.text(`Cycle: ${PAYMENT_CYCLE.label}`);
  doc.text("Living document — rules can be audited after each four-week cycle.");
  doc.moveDown(1);
  doc
    .font("Helvetica-Oblique")
    .fontSize(9)
    .fillColor("#666")
    .text(
      "Internal squad briefing. Share with players before Matchday 1.",
    );

  // —— Executive summary ——
  h2("01 — Executive summary");
  h1(proposalStory.title);
  body(proposalStory.intro);

  h3(proposalStory.problemTitle);
  proposalStory.problem.forEach(bullet);

  h3(proposalStory.proposalTitle);
  proposalStory.proposal.forEach((p, i) => numbered(i + 1, p));

  h3(proposalStory.nightTitle);
  proposalStory.night.forEach(bullet);

  h3(proposalStory.cycleTitle);
  proposalStory.cycle.forEach(bullet);

  h3(proposalStory.askTitle);
  body(proposalStory.ask);

  h3("What this fixes");
  for (const b of benefits) {
    ensureSpace(40);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0c281c").text(b.title);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#333")
      .text(naira(b.copy), { width: pageWidth });
    doc.moveDown(0.35);
  }

  // —— Roster ——
  h2("02 — Roster management");
  body(
    "Players are drafted into four balanced teams at the start of each month. Early drafts are imperfect — balance stays flexible for one week only.",
  );
  for (const r of rosterRules) {
    h3(r.title);
    body(r.copy);
  }

  // —— Officiating ——
  h2("03 — Peer-led matchday panel");
  body(
    "Every resting team supplies 1–2 players to run the night. Four hard laws protect the data and the session.",
  );
  for (const law of panelLaws) {
    h3(law.title);
    body(law.copy);
  }

  // —— Fees & table ——
  h2("04 — Venue, fees & league table");
  body(`${venue.name}. ${venue.session}.`);
  h3("Session fees");
  for (const f of fees) {
    ensureSpace(40);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#0c281c")
      .text(`${f.title} — ${naira(f.amount)}`);
    body(f.detail);
  }
  h3("Pay into");
  body(
    `${PAYMENT_ACCOUNT.bank}  ${PAYMENT_ACCOUNT.accountNumber}  ·  ${PAYMENT_ACCOUNT.accountName}`,
  );
  body(
    `After transfer, send proof of payment with your full name to the WhatsApp group (${WHATSAPP.groupUrl}) or WhatsApp Aji (${WHATSAPP.adminPhone}).`,
  );
  h3("Points");
  for (const p of pointsSystem) {
    bullet(`${p.result}: ${p.points} point(s)`);
  }
  h3("Tiebreakers (in order)");
  for (const t of tiebreakers) {
    bullet(`${t.rank} ${t.title} — ${t.copy}`);
  }

  // —— Pitch ——
  h2("05 — Pitch laws");
  for (const r of pitchRules) {
    h3(r.title);
    body(r.copy);
  }

  // —— Discipline ——
  h2("06 — Discipline & fines");
  for (const f of fines) {
    ensureSpace(50);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#0c281c")
      .text(`${f.infraction} — ${naira(f.amount)}`);
    body(f.consequence);
  }
  h3("Yellow card accumulation");
  for (const y of yellowAccumulation) {
    h3(y.title);
    body(y.copy);
  }
  h3("Red cards");
  for (const r of redCardRules) {
    h3(r.title);
    body(r.copy);
  }

  // —— Awards ——
  h2("07 — Monthly accolades");
  for (const a of awards) {
    ensureSpace(36);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0c281c").text(a.name);
    body(a.copy);
  }

  // —— Fixtures week 1 sample ——
  h2("08 — Sample fixtures (Week 1)");
  body(
    "Six matches per night. Full rotation for weeks 2–4 is on the website Rules page.",
  );
  for (const row of fixturesByWeek[1]) {
    bullet(
      `Match ${row.match}  ${row.time}  ·  ${row.fixture}  ·  Officiating: ${row.officiating}`,
    );
  }

  // —— Close ——
  h2("09 — Next steps");
  numbered(1, "Register on the site with your phone number.");
  numbered(2, "Pay the monthly fee (or visitor fee) into the published account.");
  numbered(
    3,
    "Send proof of payment with your full name to the WhatsApp group or to Aji.",
  );
  numbered(4, "Show up on time. Respect the panel. Chase the table — not the pitch.");
  doc.moveDown(1);
  doc
    .font("Helvetica-Oblique")
    .fontSize(9)
    .fillColor("#666")
    .text(
      "Generated for Thursday Night Football · Living document · See /rules on the live site for the latest version.",
      { width: pageWidth },
    );

  doc.end();

  stream.on("finish", () => {
    console.log(`Wrote ${outPath}`);
  });
}

main();
