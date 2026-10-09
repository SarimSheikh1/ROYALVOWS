import PDFDocument from "pdfkit";

type Receipt = {
  receiptId: string; bookingId: string; amount: number; method: string;
  reference: string; customer: string; venue: string; event: string;
  eventDate: string; slot: string; reportedAt: Date;
};

export function paymentReceipt(data: Receipt) {
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: "RoyalVows payment receipt", Author: "RoyalVows" } });
  const ink = "#17221E", gold = "#A78042", muted = "#69716C";
  const width = doc.page.width - 96;
  doc.rect(0, 0, doc.page.width, 155).fill(ink);
  doc.fillColor(gold).font("Times-Roman").fontSize(29).text("ROYALVOWS", 48, 42);
  doc.fillColor("#FFFFFF").font("Helvetica").fontSize(10).text("THE ART OF CELEBRATION", 49, 80, { characterSpacing: 2 });
  doc.fontSize(21).text("Payment receipt", 48, 113);
  doc.roundedRect(419, 47, 128, 26, 13).fill("#EDE5D5");
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(9).text("PAYMENT APPROVED", 419, 56, { width: 128, align: "center" });
  let y = 185;
  const row = (label: string, value: string) => {
    const valueHeight = doc.font("Helvetica").fontSize(11).heightOfString(value || "Not provided", { width: width - 145 });
    doc.fillColor(muted).fontSize(9).text(label.toUpperCase(), 48, y + 2, { width: 130 });
    doc.fillColor(ink).fontSize(11).text(value || "Not provided", 193, y, { width: width - 145 });
    y += Math.max(20, valueHeight) + 9;
  };
  row("Receipt number", "RVP-" + data.receiptId);
  row("Booking reference", data.bookingId);
  row("Payment reported", new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(data.reportedAt));
  y += 6;
  doc.moveTo(48, y).lineTo(547, y).strokeColor("#DDD8CD").stroke();
  y += 22;
  row("Customer", data.customer);
  row("Palace", data.venue);
  row("Celebration", [data.event, data.eventDate, data.slot].filter(Boolean).join(" / "));
  row("Payment method", data.method);
  row("Transaction reference", data.reference);
  y += 10;
  doc.roundedRect(48, y, width, 88, 6).fill("#F3EFE6");
  doc.fillColor(muted).font("Helvetica-Bold").fontSize(10).text("AMOUNT RECEIVED", 68, y + 17);
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(25).text("PKR " + (data.amount / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 68, y + 39, { width: width - 40 });
  y += 110;
  doc.fillColor(muted).font("Helvetica").fontSize(10).text("This receipt records an approved payment. It does not by itself confirm the booking or represent full settlement. Refunds are recorded separately.", 48, y, { width, lineGap: 4 });
  doc.moveTo(48, 766).lineTo(547, 766).strokeColor("#DDD8CD").stroke();
  doc.fillColor(gold).fontSize(9).text("ROYALVOWS", 48, 780, { width: 200 });
  doc.fillColor(muted).fontSize(9).text("Payment receipt  |  1 / 1", 347, 780, { width: 200, align: "right" });
  return doc;
}
