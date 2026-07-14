import { jsPDF } from 'jspdf';
import { useEditor } from '../state/store';
import { safeFilename } from './filename';
import { ensureCjkFont, hasCjk } from './pdfFont';
import { chartText, drawWalkChartsInto } from './pdf';
import { drawWalkSheetsInto } from './walkSheets';

/**
 * Rehearsal pack: ONE printable PDF with everything the team needs at
 * rehearsal — roster page, one walk chart per formation, then one personal
 * walk sheet (route + times + 8-counts) per performer.
 */
export async function exportRehearsalPackPdf(): Promise<void> {
  const s = useEditor.getState();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const badges = s.performers.map((p) => p.badge ?? '').join('');
  const font = await ensureCjkFont(doc, hasCjk(chartText() + badges));

  drawWalkChartsInto(doc, font);
  doc.addPage('a4', 'landscape');
  drawWalkSheetsInto(doc, font);

  doc.save(`${safeFilename(s.performance.title)}-rehearsal-pack.pdf`);
}
