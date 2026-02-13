# Stored Invoice PDFs

This folder holds invoice PDFs for the Luxselle Dashboard.

## Currently stored

- Invoice - Order #158105SAV_with_VAT.pdf
- Invoice - Order #5105854842_with_VAT.pdf
- Invoice - Order #5600193552_with_VAT.pdf
- Invoice - Order #BA9191_with_VAT.pdf
- Invoice - Order #S783_with_VAT.pdf

## Import into dashboard

To upload these PDFs to Firebase Storage and create invoice records in Firestore:

1. Start emulators and server: `npm run dev`
2. In another terminal: `npm run import-invoice-pdfs`

Or specify a source directory:

```bash
npm run import-invoice-pdfs -- "/path/to/invoice/folder"
```
