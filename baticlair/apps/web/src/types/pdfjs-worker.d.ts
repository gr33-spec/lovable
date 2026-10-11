// Le module « worker » de pdf.js n'a pas de déclaration de types : il est seulement importé pour être fourni à pdf.js
// (voir `components/pdf-pages.tsx`), comme côté API.
declare module "pdfjs-dist/legacy/build/pdf.worker.min.mjs";
