export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);

  const cleaned = data.text
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "")
    .trim();

  return cleaned;
}