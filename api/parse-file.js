/**
 * BarTalk v8.2 — File Parse API
 * POST /api/parse-file
 * Riceve un file (base64) e restituisce il testo estratto.
 *
 * Formati supportati:
 * - PDF (via pdf-parse)
 * - DOCX (via mammoth)
 * - XLSX/XLS (via xlsx/sheetjs)
 *
 * Body JSON:
 * { filename: string, data: string (base64), mimeType: string }
 *
 * Response:
 * { text: string, pages?: number, sheets?: string[] }
 */

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { filename, data, mimeType } = req.body || {};

  if (!filename || !data) {
    return res.status(400).json({ error: 'filename e data (base64) richiesti' });
  }

  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const buffer = Buffer.from(data, 'base64');

  try {
    switch (ext) {
      case 'pdf': {
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
        const result = await pdfParse(buffer);
        return res.status(200).json({
          text: result.text?.trim() || '[PDF vuoto o non leggibile]',
          pages: result.numpages || 0,
        });
      }

      case 'docx': {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return res.status(200).json({
          text: result.value?.trim() || '[DOCX vuoto o non leggibile]',
        });
      }

      case 'xlsx':
      case 'xls': {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheets = workbook.SheetNames;
        const textParts = [];

        for (const sheetName of sheets) {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
          if (csv.trim()) {
            textParts.push(`--- Foglio: ${sheetName} ---\n${csv}`);
          }
        }

        return res.status(200).json({
          text: textParts.join('\n\n') || '[Excel vuoto]',
          sheets,
        });
      }

      default:
        return res.status(400).json({ error: `Formato non supportato: .${ext}` });
    }
  } catch (err) {
    console.error(`[parse-file] Errore parsing ${filename}:`, err.message);
    return res.status(500).json({
      error: `Errore parsing ${ext.toUpperCase()}: ${err.message}`,
    });
  }
}
