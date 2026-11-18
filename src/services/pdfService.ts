import type { jsPDF as JsPDF } from 'jspdf';
import type { Product, ProductConfiguration, Quote } from '@shared/types';
import { describePanels, describeSelections, getActivePanels, getPanelColor } from '@shared/configuration';
import { formatMoney } from '@shared/utils/format';
import { preloadImages } from '@/utils/imageCache';
import { renderPanelToCanvas } from '@/utils/panelRenderer';

export interface PdfInput {
  product: Product;
  configuration: ProductConfiguration;
  quote: Quote;
  /** PNG data URL of the 3D preview, if available. */
  previewImage: string | null;
}

const PAGE = { width: 612, height: 792, margin: 40 };
const INK = '#1b1a18';
const MUTED = '#7a766e';
const RULE = '#e2e0dc';
const ACCENT = '#2f5bea';
const PDF_PIXELS_PER_INCH = 6;

const CATEGORY_LABELS: Record<string, string> = {
  base: 'Canopy',
  frame: 'Frame',
  sideWalls: 'Side walls',
  halfWalls: 'Half walls',
  printing: 'Printing',
  customization: 'Customization',
};

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 4, h: 3 });
    img.src = dataUrl;
  });
}

function fit(w: number, h: number, maxW: number, maxH: number) {
  const s = Math.min(maxW / w, maxH / h);
  return { w: w * s, h: h * s };
}

class PdfWriter {
  y = PAGE.margin;
  constructor(public doc: JsPDF, private readonly configId: string) {}

  get contentWidth() {
    return PAGE.width - PAGE.margin * 2;
  }

  ensureSpace(height: number) {
    if (this.y + height > PAGE.height - 56) {
      this.doc.addPage();
      this.y = PAGE.margin;
    }
  }

  heading(text: string) {
    this.ensureSpace(36);
    this.doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(INK);
    this.doc.text(text.toUpperCase(), PAGE.margin, this.y, { charSpace: 0.6 });
    this.y += 8;
    this.doc.setDrawColor(RULE).setLineWidth(0.75).line(PAGE.margin, this.y, PAGE.width - PAGE.margin, this.y);
    this.y += 16;
  }

  footer() {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      this.doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED);
      this.doc.text(
        `Configuration ${this.configId} - quote this reference with your order.`,
        PAGE.margin,
        PAGE.height - 24,
      );
      this.doc.text(`Page ${i} of ${total}`, PAGE.width - PAGE.margin, PAGE.height - 24, { align: 'right' });
    }
  }
}

/** Builds the configuration PDF. Pricing comes from the server-validated quote. */
export async function createConfigurationPdf(input: PdfInput): Promise<JsPDF> {
  const { product, configuration, quote, previewImage } = input;
  const { jsPDF } = await import('jspdf');
  await Promise.all([
    preloadImages(Object.values(configuration.assets).flatMap((a) => (a.dataUrl ? [a.dataUrl] : []))),
    document.fonts?.ready,
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  doc.setProperties({ title: `${product.name} - ${configuration.id}`, subject: 'Product configuration' });
  const w = new PdfWriter(doc, configuration.id);
  const M = PAGE.margin;

  // Header band
  doc.setFillColor(INK).rect(0, 0, PAGE.width, 92, 'F');
  doc.setFillColor(ACCENT).rect(0, 92, PAGE.width, 3, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor('#a29e96');
  doc.text('CANOPY CONFIGURATION', M, 34, { charSpace: 1 });
  doc.setFontSize(20).setTextColor('#ffffff').text(product.name, M, 60);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor('#cbc8c2');
  doc.text(`ID ${configuration.id}`, PAGE.width - M, 34, { align: 'right' });
  doc.text(new Date(quote.calculatedAt).toLocaleString('en-US'), PAGE.width - M, 48, { align: 'right' });
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor('#ffffff');
  doc.text(formatMoney(quote.total), PAGE.width - M, 70, { align: 'right' });
  w.y = 124;

  // Preview + options side by side
  const previewBox = { x: M, y: w.y, w: 300, h: 230 };
  doc.setFillColor('#f7f7f6').roundedRect(previewBox.x, previewBox.y, previewBox.w, previewBox.h, 6, 6, 'F');
  if (previewImage) {
    const size = await imageSize(previewImage);
    const f = fit(size.w, size.h, previewBox.w - 16, previewBox.h - 16);
    doc.addImage(previewImage, 'PNG', previewBox.x + (previewBox.w - f.w) / 2, previewBox.y + (previewBox.h - f.h) / 2, f.w, f.h);
  } else {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(MUTED);
    doc.text('3D preview unavailable', previewBox.x + previewBox.w / 2, previewBox.y + previewBox.h / 2, { align: 'center' });
  }

  const colX = M + 324;
  const colW = PAGE.width - M - colX;
  let oy = w.y + 6;
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(INK).text('SELECTED OPTIONS', colX, oy, { charSpace: 0.6 });
  oy += 18;
  const rows = [
    ...describeSelections(product, configuration).map((r) => [r.label, r.value] as const),
    ['Quantity', String(configuration.quantity)] as const,
  ];
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED).text(label.toUpperCase(), colX, oy);
    oy += 12;
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(INK);
    const lines = doc.splitTextToSize(value, colW) as string[];
    doc.text(lines, colX, oy);
    oy += lines.length * 12 + 8;
  }
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED).text('CANOPY COLOR', colX, oy);
  oy += 6;
  doc.setFillColor(configuration.colors.base).setDrawColor(RULE).roundedRect(colX, oy, 18, 18, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(INK).text(configuration.colors.base.toUpperCase(), colX + 26, oy + 13);
  w.y = Math.max(previewBox.y + previewBox.h, oy + 18) + 28;

  // Pricing table
  w.heading('Itemized pricing (per canopy)');
  const cols = { item: M, qty: M + 330, unit: M + 400, amount: PAGE.width - M };
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED);
  doc.text('ITEM', cols.item, w.y);
  doc.text('QTY', cols.qty, w.y, { align: 'right' });
  doc.text('UNIT', cols.unit + 50, w.y, { align: 'right' });
  doc.text('AMOUNT', cols.amount, w.y, { align: 'right' });
  w.y += 14;
  for (const line of quote.lines) {
    w.ensureSpace(20);
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(INK);
    doc.text(line.label, cols.item, w.y);
    doc.setFontSize(7.5).setTextColor(MUTED).text(CATEGORY_LABELS[line.category] ?? line.category, cols.item, w.y + 10);
    doc.setFontSize(9.5).setTextColor(INK);
    doc.text(String(line.quantity), cols.qty, w.y, { align: 'right' });
    doc.text(formatMoney(line.unitPrice), cols.unit + 50, w.y, { align: 'right' });
    doc.text(formatMoney(line.amount), cols.amount, w.y, { align: 'right' });
    w.y += 22;
  }
  doc.setDrawColor(RULE).line(M, w.y - 8, PAGE.width - M, w.y - 8);

  const totalRow = (label: string, value: string, strong = false) => {
    w.ensureSpace(18);
    doc.setFont('helvetica', strong ? 'bold' : 'normal').setFontSize(strong ? 12 : 9.5).setTextColor(strong ? INK : '#45433f');
    doc.text(label, cols.unit - 40, w.y);
    doc.text(value, cols.amount, w.y, { align: 'right' });
    w.y += strong ? 22 : 16;
  };
  totalRow('Price per canopy', formatMoney(quote.unitPrice));
  totalRow(`Quantity`, `x ${quote.quantity}`);
  totalRow('Subtotal', formatMoney(quote.subtotal));
  if (quote.discount) totalRow(quote.discount.label, `- ${formatMoney(quote.discount.amount)}`);
  w.y += 4;
  totalRow('Total', formatMoney(quote.total), true);
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(MUTED);
  doc.text(
    `Prices validated by the pricing server (price book ${quote.priceBookVersion}). Sample prices for demonstration. Taxes and shipping calculated at checkout.`,
    M,
    w.y,
    { maxWidth: w.contentWidth },
  );
  w.y += 28;

  // Panel artwork
  doc.addPage();
  w.y = PAGE.margin;
  w.heading('Panel artwork & colors');
  const summaries = new Map(describePanels(product, configuration).map((p) => [p.panelId, p]));
  const panels = getActivePanels(product, configuration.selections);
  const cardW = (w.contentWidth - 20) / 2;
  let column = 0;
  let rowHeight = 0;
  for (const panel of panels) {
    const summary = summaries.get(panel.id);
    const canvas = renderPanelToCanvas(
      { panel, color: getPanelColor(configuration, panel.id), elements: configuration.designs[panel.id] ?? [], assets: configuration.assets },
      PDF_PIXELS_PER_INCH,
      { outline: true },
    );
    const img = fit(canvas.width, canvas.height, cardW, 120);
    const details = [
      `Color ${getPanelColor(configuration, panel.id).toUpperCase()}${summary?.colorOverridden ? ' (custom panel color)' : ''}`,
      ...(summary?.texts.length ? [`Text: ${summary.texts.map((t) => `"${t.replace(/\n/g, ' ')}"`).join(', ')}`] : []),
      ...(summary?.imageNames.length ? [`Artwork: ${summary.imageNames.join(', ')}`] : []),
    ];
    doc.setFontSize(8);
    const detailLines = details.flatMap((d) => doc.splitTextToSize(d, cardW) as string[]);
    const cardH = img.h + 26 + detailLines.length * 10 + 14;

    if (column === 0) w.ensureSpace(cardH);
    const x = M + column * (cardW + 20);
    const top = w.y;
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', x + (cardW - img.w) / 2, top, img.w, img.h);
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(INK).text(panel.label, x, top + img.h + 16);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor('#5c5953').text(detailLines, x, top + img.h + 28);
    rowHeight = Math.max(rowHeight, cardH);
    if (column === 1) {
      w.y += rowHeight + 10;
      rowHeight = 0;
    }
    column = column === 0 ? 1 : 0;
  }
  if (column === 1) w.y += rowHeight + 10;

  // Uploaded artwork
  const assets = Object.values(configuration.assets).filter((a) => a.dataUrl);
  if (assets.length) {
    w.heading('Uploaded artwork');
    let x = M;
    for (const asset of assets) {
      const f = fit(asset.width, asset.height, 96, 72);
      if (x + 110 > PAGE.width - M) {
        x = M;
        w.y += 110;
      }
      w.ensureSpace(110);
      doc.setFillColor('#f7f7f6').roundedRect(x, w.y, 104, 80, 4, 4, 'F');
      doc.addImage(asset.dataUrl as string, asset.mimeType === 'image/jpeg' ? 'JPEG' : 'PNG', x + (104 - f.w) / 2, w.y + (80 - f.h) / 2, f.w, f.h);
      doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(MUTED);
      doc.text(doc.splitTextToSize(`${asset.name} (${asset.width}x${asset.height}px)`, 104) as string[], x, w.y + 92);
      x += 116;
    }
    w.y += 116;
  }

  w.footer();
  return doc;
}

export async function downloadConfigurationPdf(input: PdfInput): Promise<void> {
  const doc = await createConfigurationPdf(input);
  doc.save(`${input.configuration.id}-canopy-configuration.pdf`);
}
