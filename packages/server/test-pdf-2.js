const PdfPrinter = require('pdfmake');
const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
    },
};
const printer = new PdfPrinter(fonts);
try {
  const docDefinition = {
    content: ['Hello'],
    defaultStyle: { font: 'Helvetica' }
  };
  const generator = printer.createPdfKitDocument(docDefinition);
  console.log("Success with Helvetica fonts object");
} catch (e) {
  console.error("Failed with fonts object:", e.message);
}

try {
  const printer2 = new PdfPrinter({});
  const docDefinition2 = {
    content: ['Hello'],
    defaultStyle: { font: 'Helvetica' }
  };
  const generator2 = printer2.createPdfKitDocument(docDefinition2);
  console.log("Success with empty fonts object");
} catch (e) {
  console.error("Failed with empty fonts object:", e.message);
}
