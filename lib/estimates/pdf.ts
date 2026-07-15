import PDFDocument from "pdfkit";

type PdfLineItem = { description: string; quantity: unknown; unitCost: unknown; markup: unknown };

export function generateEstimatePdf(input: {
  companyName: string;
  projectName: string;
  projectAddress: string;
  clientName: string;
  status: string;
  createdAt: Date;
  lineItems: PdfLineItem[];
  total: unknown;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).fillColor("#16324F").text(input.companyName);
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor("#1E293B").text("Estimate");
    doc.moveDown();

    doc.fontSize(10).fillColor("#1E293B");
    doc.text(`Project: ${input.projectName}`);
    doc.text(`Address: ${input.projectAddress}`);
    doc.text(`Client: ${input.clientName}`);
    doc.text(`Status: ${input.status}`);
    doc.text(`Date: ${input.createdAt.toLocaleDateString()}`);
    doc.moveDown();

    const startX = 50;
    let y = doc.y;
    doc.font("Helvetica-Bold");
    doc.text("Description", startX, y, { width: 190 });
    doc.text("Qty", startX + 190, y, { width: 50 });
    doc.text("Unit Cost", startX + 240, y, { width: 80 });
    doc.text("Markup %", startX + 320, y, { width: 70 });
    doc.text("Line Total", startX + 390, y, { width: 80 });
    doc.font("Helvetica");
    y += 18;
    doc.moveTo(startX, y).lineTo(startX + 470, y).strokeColor("#CBD5E1").stroke();
    y += 6;

    for (const item of input.lineItems) {
      const quantity = Number(item.quantity);
      const unitCost = Number(item.unitCost);
      const markup = Number(item.markup);
      const lineTotal = quantity * unitCost * (1 + markup / 100);

      doc.text(item.description, startX, y, { width: 190 });
      doc.text(String(quantity), startX + 190, y, { width: 50 });
      doc.text(`$${unitCost.toFixed(2)}`, startX + 240, y, { width: 80 });
      doc.text(`${markup.toFixed(2)}%`, startX + 320, y, { width: 70 });
      doc.text(`$${lineTotal.toFixed(2)}`, startX + 390, y, { width: 80 });
      y += 20;
    }

    y += 10;
    doc.moveTo(startX, y).lineTo(startX + 470, y).strokeColor("#CBD5E1").stroke();
    y += 10;
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`Total: $${Number(input.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, startX, y, {
        width: 470,
        align: "right",
      });

    doc.end();
  });
}
