import PDFDocument from 'pdfkit';

import type { DietPlanContent, ExercisePlanContent } from '../../domain/plans.js';

type PdfPlan =
  | { content: DietPlanContent; createdAt: Date; kind: 'diet' }
  | { content: ExercisePlanContent; createdAt: Date; kind: 'exercise' };

const INK = '#1c1f1a';
const MUTED = '#5c6157';
const GREEN = '#3d5a12';
const LIME = '#b7e36a';
const PALE = '#f2fadf';
const RULE = '#e3e6dc';
const MARGIN = 50;

// The built-in PDF fonts only cover Latin-1 plus a few typographic marks; drop anything else rather
// than render garbage (prompts ask for English, but user-supplied names may not be).
const pdfText = (value: string) => value.replace(/[^ -ÿ–—‘’“”•…]/g, '').trim();

/** Renders a saved plan as an A4 PDF and resolves with its bytes. */
export function renderPlanPdf(plan: PdfPlan, preparedFor: string | null): Promise<Buffer> {
  const doc = new PDFDocument({ info: { Author: 'healthFlip', Title: pdfText(plan.content.title) }, margin: MARGIN, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', chunk => chunks.push(chunk as Buffer));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const width = doc.page.width - MARGIN * 2;
  const ensureSpace = (height: number) => {
    if (doc.y + height > doc.page.height - MARGIN - 40) doc.addPage();
  };

  // Header band
  doc.rect(0, 0, doc.page.width, 92).fill(LIME);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(22).text('healthFlip', MARGIN, 30);
  doc.font('Helvetica').fontSize(11).fillColor(GREEN).text(plan.kind === 'diet' ? 'Meal plan' : 'Workout plan', MARGIN, 58);
  doc.y = 120;

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(pdfText(plan.content.title), MARGIN, doc.y, { width });
  const date = plan.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const name = preparedFor ? pdfText(preparedFor) : '';
  doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor(MUTED).text(name ? `Prepared for ${name} · ${date}` : `Created ${date}`);
  doc.moveDown(0.8).fontSize(11.5).fillColor(INK).text(pdfText(plan.content.summary), { lineGap: 2, width });
  doc.moveDown(1);

  if (plan.kind === 'diet') renderDiet(doc, plan.content, width, ensureSpace);
  else renderExercise(doc, plan.content, width, ensureSpace);

  if (plan.content.tips.length) {
    ensureSpace(60);
    doc.moveDown(0.5).font('Helvetica-Bold').fontSize(13).fillColor(GREEN).text('Tips', MARGIN, doc.y);
    doc.moveDown(0.3).font('Helvetica').fontSize(10.5).fillColor(INK);
    for (const tip of plan.content.tips) {
      ensureSpace(20);
      doc.text(`•  ${pdfText(tip)}`, MARGIN, doc.y, { lineGap: 2, width });
    }
  }

  ensureSpace(40);
  doc.moveDown(1.5).font('Helvetica').fontSize(8.5).fillColor(MUTED).text(
    'General wellness guidance from healthFlip, not medical advice. Check with a qualified professional before major changes to your diet or exercise, especially if you have a health condition.',
    MARGIN,
    doc.y,
    { width },
  );
  doc.end();
  return done;
}

type Doc = InstanceType<typeof PDFDocument>;

function sectionHeader(doc: Doc, title: string, detail: string, width: number) {
  const top = doc.y;
  doc.roundedRect(MARGIN, top, width, 26, 6).fill(PALE);
  doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(12).text(title, MARGIN + 10, top + 8, { continued: false });
  if (detail) doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(detail, MARGIN, top + 9, { align: 'right', width: width - 10 });
  doc.y = top + 34;
}

function renderDiet(doc: Doc, plan: DietPlanContent, width: number, ensureSpace: (height: number) => void) {
  const { macros } = plan;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(
    `Daily target: ${plan.dailyCalories} kcal  ·  Protein ${macros.proteinGrams} g  ·  Carbs ${macros.carbsGrams} g  ·  Fat ${macros.fatGrams} g`,
    MARGIN,
    doc.y,
    { width },
  );
  doc.moveDown(1);

  for (const day of plan.days) {
    // Keep a day's header and meals on one page (each meal row is ~50pt).
    ensureSpace(40 + day.meals.length * 50);
    const total = day.meals.reduce((sum, meal) => sum + meal.calories, 0);
    sectionHeader(doc, pdfText(day.label), `${total} kcal`, width);
    for (const meal of day.meals) {
      ensureSpace(40);
      const top = doc.y;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED).text(meal.type.toUpperCase(), MARGIN + 10, top, { width: 70 });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(pdfText(meal.name), MARGIN + 85, top, { width: width - 175 });
      doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(pdfText(meal.portion), MARGIN + 85, doc.y + 1, { width: width - 175 });
      const bottom = doc.y;
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(`${meal.calories} kcal`, MARGIN, top, { align: 'right', width: width - 10 });
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(`${Math.round(meal.proteinGrams)} g protein`, MARGIN, top + 14, { align: 'right', width: width - 10 });
      doc.y = Math.max(bottom, top + 28) + 8;
      doc.moveTo(MARGIN + 10, doc.y - 4).lineTo(MARGIN + width - 10, doc.y - 4).lineWidth(0.5).strokeColor(RULE).stroke();
    }
    doc.moveDown(0.6);
  }
}

function renderExercise(doc: Doc, plan: ExercisePlanContent, width: number, ensureSpace: (height: number) => void) {
  for (const day of plan.days) {
    ensureSpace(60 + day.exercises.length * 18);
    sectionHeader(doc, pdfText(day.label), day.rest ? 'Rest day' : `${day.durationMinutes} min`, width);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(day.rest ? MUTED : INK).text(pdfText(day.focus), MARGIN + 10, doc.y, { width: width - 20 });
    doc.moveDown(0.3);
    for (const exercise of day.exercises) {
      ensureSpace(20);
      const top = doc.y;
      doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(`•  ${pdfText(exercise.name)}`, MARGIN + 10, top, { width: width - 170 });
      const bottom = doc.y;
      doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(pdfText(exercise.detail), MARGIN, top, { align: 'right', width: width - 10 });
      doc.y = Math.max(bottom, doc.y) + 3;
    }
    doc.moveDown(0.8);
  }
}
