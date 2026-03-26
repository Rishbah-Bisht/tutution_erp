const PDFDocument = require('pdfkit');

/**
 * Generates a professional fee receipt PDF.
 * @param {Object} data - Contains student info, payment info, and institute info.
 * @returns {Promise<Buffer>} - Resolves with the PDF data as a buffer.
 */
exports.generateFeeReceiptPdf = ({ student, payment, fee, admin }) => {
    return new Promise((resolve, reject) => {
        try {
            // A4 size standard dimensions: 595.28 x 841.89
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Color Palette for consistent premium look
            const colors = {
                primary: '#0f172a',    // Slate 900
                secondary: '#64748b',  // Slate 500
                accent: '#4f46e5',     // Indigo 600
                success: '#059669',    // Emerald 600
                border: '#e2e8f0',     // Slate 200
                bgLight: '#f8fafc'     // Slate 50
            };

            // 1. TOP HEADER (Split Design)
            doc.fillColor(colors.primary)
                .fontSize(22)
                .font('Helvetica-Bold')
                .text(admin?.coachingName || 'The Institute', 50, 50);

            doc.fillColor(colors.accent)
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('OFFICIAL FEE RECEIPT', 400, 56, { align: 'right', width: 145 });

            doc.fillColor(colors.secondary)
                .fontSize(9)
                .font('Helvetica')
                .text(admin?.instituteAddress || 'Address not provided', 50, 78);

            doc.text(`Ph: ${admin?.institutePhone || 'N/A'}  |  Email: ${admin?.instituteEmail || 'N/A'}`, 50, 92);

            // Divider Line
            doc.strokeColor(colors.border).lineWidth(1).moveTo(50, 115).lineTo(545, 115).stroke();

            // 2. INFORMATION GRID (Bill To & Receipt Details)
            const gridTop = 135;

            // Left Column: Student Details
            doc.fillColor(colors.secondary).fontSize(8).font('Helvetica-Bold').text('BILLED TO', 50, gridTop);
            doc.fillColor(colors.primary).fontSize(12).font('Helvetica-Bold').text(student.name, 50, gridTop + 15);
            doc.fillColor(colors.secondary).fontSize(9).font('Helvetica')
                .text(`Roll No: ${student.rollNo || 'N/A'}`, 50, gridTop + 32)
                .text(`Class: ${student.className || 'N/A'}`, 50, gridTop + 46);

            // Right Column: Receipt Details
            doc.fillColor(colors.secondary).fontSize(8).font('Helvetica-Bold').text('RECEIPT DETAILS', 350, gridTop);

            doc.fillColor(colors.secondary).fontSize(9).font('Helvetica').text('Receipt No:', 350, gridTop + 16);
            doc.fillColor(colors.primary).font('Helvetica-Bold').text(payment.receiptNo, 420, gridTop + 16);

            doc.fillColor(colors.secondary).font('Helvetica').text('Date:', 350, gridTop + 31);
            doc.fillColor(colors.primary).font('Helvetica-Bold').text(new Date(payment.date).toLocaleDateString('en-IN'), 420, gridTop + 31);

            doc.fillColor(colors.secondary).font('Helvetica').text('Status:', 350, gridTop + 46);
            doc.fillColor(colors.success).font('Helvetica-Bold').text('PAID', 420, gridTop + 46);

            doc.fillColor(colors.secondary).font('Helvetica').text('Fee Type:', 350, gridTop + 61);
            doc.fillColor(colors.primary).font('Helvetica-Bold').text(payment.remarks || 'Monthly Tuition Fee', 420, gridTop + 61);

            // 3. TABLE SECTION
            const tableTop = 235;

            // Table Header Background
            doc.rect(50, tableTop, 495, 25).fill(colors.bgLight);

            // Table Header Text
            doc.fillColor(colors.secondary).font('Helvetica-Bold').fontSize(9);
            doc.text('DESCRIPTION', 65, tableTop + 8);
            doc.text('AMOUNT (INR)', 430, tableTop + 8, { width: 100, align: 'right' });

            // Table Row
            const rowTop = tableTop + 40;
            doc.fillColor(colors.primary).font('Helvetica').fontSize(10);
            doc.text(`Tuition Fee - ${fee.month} ${fee.year}`, 65, rowTop);

            // Using INR instead of ₹ because default PDFKit Helvetica doesn't support the ₹ symbol
            const formattedAmount = payment.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
            doc.text(formattedAmount, 430, rowTop, { width: 100, align: 'right' });

            // Subtle row border
            doc.strokeColor(colors.border).lineWidth(1).moveTo(50, rowTop + 20).lineTo(545, rowTop + 20).stroke();

            // 4. SUMMARY & PAYMENT DETAILS
            const summaryTop = rowTop + 45;

            // Payment Details (Left Side)
            doc.fillColor(colors.secondary).fontSize(8).font('Helvetica-Bold').text('PAYMENT METHOD', 50, summaryTop);
            doc.fillColor(colors.primary).fontSize(10).font('Helvetica').text(payment.paymentMethod || 'N/A', 50, summaryTop + 12);

            if (payment.transactionId) {
                doc.fillColor(colors.secondary).fontSize(8).font('Helvetica-Bold').text('TRANSACTION ID', 50, summaryTop + 35);
                doc.fillColor(colors.primary).fontSize(10).font('Helvetica').text(payment.transactionId, 50, summaryTop + 47);
            }

            // Highlighted Total Box (Right Side)
            doc.rect(330, summaryTop, 215, 36).fill(colors.bgLight);
            doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(11).text('TOTAL PAID:', 345, summaryTop + 13);
            doc.fillColor(colors.success).fontSize(12).text(`INR ${formattedAmount}`, 430, summaryTop + 12, { width: 100, align: 'right' });

            // 5. FOOTER
            // Placing footer dynamically near the bottom of A4 page
            const bottomY = 750;
            doc.strokeColor(colors.border).lineWidth(1).moveTo(50, bottomY).lineTo(545, bottomY).stroke();

            doc.fillColor(colors.secondary).fontSize(8).font('Helvetica')
                .text('This is a computer-generated receipt and does not require a physical signature.', 50, bottomY + 15, { align: 'center', width: 495 })
                .text(`Generated on ${new Date().toLocaleString('en-IN')}`, 50, bottomY + 28, { align: 'center', width: 495 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};