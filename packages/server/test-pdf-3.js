import PdfPrinter from 'pdfmake';
import fs from 'fs';
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
