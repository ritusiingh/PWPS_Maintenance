const PDFDocument = require('pdfkit');

function generateInvoicePDF(billData, flat, charges, paymentInfo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).fillColor('#0f766e').text('Apartment Maintenance Invoice', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#64748b').text('Bangalore Residential Society', { align: 'center' });
    doc.moveDown(0.5);

    // Line separator
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);

    // Invoice details
    doc.fontSize(10).fillColor('#334155');
    const startY = doc.y;
    doc.text(`Invoice No: INV-${billData.id.toString().padStart(6, '0')}`, 50);
    doc.text(`Bill Date: ${billData.bill_date}`, 50);
    doc.text(`Due Date: ${billData.due_date}`, 50);
    doc.text(`Month: ${billData.bill_month} ${billData.bill_year}`, 50);

    doc.y = startY;
    doc.text(`Flat: ${flat.flat_number}`, 350);
    doc.text(`Owner: ${flat.owner_name}`, 350);
    doc.text(`BHK: ${flat.bhk_type}`, 350);
    doc.text(`Area: ${flat.super_buildup_sqft || flat.carpet_area_sqft} sq.ft`, 350);
    doc.moveDown(1);

    // Method badge
    const method = billData.calculation_method.toUpperCase();
    doc.fontSize(9).fillColor('#0f766e')
      .text(`Calculation Method: ${method}`, 50);
    doc.moveDown(0.5);

    // Charges table header
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#14b8a6').stroke();
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#0f766e');
    doc.text('Service', 50, doc.y, { width: 200 });
    doc.text('Total Cost', 260, doc.y - 12, { width: 90, align: 'right' });
    doc.text('Your Share', 370, doc.y - 12, { width: 90, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.3);

    // Parse breakdown
    let details = [];
    try {
      details = JSON.parse(billData.bill_details || '[]');
    } catch (e) {
      details = [];
    }

    doc.fontSize(9).fillColor('#334155');
    details.forEach((item) => {
      doc.text(item.service, 50, doc.y, { width: 200 });
      doc.text(`\u20b9${item.totalCost?.toLocaleString('en-IN') || '0'}`, 260, doc.y - 12, { width: 90, align: 'right' });
      doc.text(`\u20b9${item.share?.toFixed(2) || '0'}`, 370, doc.y - 12, { width: 90, align: 'right' });
      doc.moveDown(0.2);
    });

    // Total
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#14b8a6').stroke();
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#0f766e');
    doc.text('Total Amount:', 50);
    doc.text(`\u20b9${billData.total_amount.toLocaleString('en-IN')}`, 370, doc.y - 14, { width: 90, align: 'right' });
    doc.moveDown(0.5);

    // Status
    const statusColor = billData.status === 'paid' ? '#16a34a' : '#dc2626';
    doc.fontSize(11).fillColor(statusColor)
      .text(`Status: ${billData.status.toUpperCase()}`, { align: 'center' });

    // Payment info
    if (paymentInfo) {
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#64748b');
      doc.text(`Payment Date: ${paymentInfo.payment_date}`);
      doc.text(`Mode: ${paymentInfo.payment_mode}`);
      if (paymentInfo.transaction_id) {
        doc.text(`Transaction ID: ${paymentInfo.transaction_id}`);
      }
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#94a3b8')
      .text('This is a computer-generated invoice. No signature required.', { align: 'center' });
    doc.text('For queries, contact your apartment maintenance office.', { align: 'center' });

    doc.end();
  });
}

module.exports = { generateInvoicePDF };
