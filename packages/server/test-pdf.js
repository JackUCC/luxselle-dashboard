const PdfPrinter = require('pdfmake');
const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
    },
}
try {
  const printer = new PdfPrinter(fonts);
  console.log("Printer created successfully");
} catch (e) {
  console.error(e);
}
