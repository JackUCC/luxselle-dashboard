const pdfMake = require('pdfmake');

const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
    },
}

async function run() {
    try {
        pdfMake.setFonts(fonts);
        const docDefinition = {
            content: ['Hello World'],
            defaultStyle: { font: 'Helvetica' }
        };
        const doc = pdfMake.createPdf(docDefinition);
        const buffer = await doc.getBuffer();
        console.log('Success! Buffer length:', buffer.length);
    } catch(e) {
        console.error(e);
    }
}
run();