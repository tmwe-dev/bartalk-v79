/**
 * BarTalk v8.2.1 — AI File Preprocessor
 * POST /api/ai-preprocess-file
 *
 * Riceve testo estratto da un file e lo fa riorganizzare da AI
 * prima di passarlo alla chat. Usa il prompt più leggero possibile
 * per massima velocità e costo minimo.
 *
 * Body JSON:
 * { text: string, filename: string, fileType: string }
 *
 * Response:
 * { text: string, structured: boolean, sections?: string[] }
 */

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
};

// ── Prompt template — minimalista ma efficace ──────────────────────
function buildCleanupPrompt(text, filename, fileType) {
  return `Sei un preprocessore di testo. Il tuo compito è RIORGANIZZARE il testo estratto da un file ${fileType.toUpperCase()} ("${filename}") per renderlo perfettamente leggibile e strutturato.

REGOLE:
1. NON aggiungere informazioni inventate
2. NON riassumere — mantieni TUTTO il contenuto
3. Rimuovi artefatti di parsing (header/footer ripetuti, numeri pagina, caratteri rotti)
4. Correggi spacing rotto, line break nel mezzo di frasi
5. Riconosci e preserva la struttura: titoli, paragrafi, liste, tabelle
6. Se ci sono tabelle in formato CSV/text, riformattale in modo leggibile
7. Se il testo è in più lingue, mantieni tutte le lingue
8. Rispondi SOLO con il testo riorganizzato, nient'altro

TESTO ESTRATTO:
${text.slice(0, 12000)}`;
}

// ── AI call — usa Gemini Flash (più veloce e gratis per light tasks) ─
async function callAI(prompt) {
  // Priorità: Gemini Flash (veloce, gratis) → OpenAI GPT-4o-mini → fallback
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {
      console.warn('[ai-preprocess] Gemini fallback:', e.message);
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 8192,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (e) {
      console.warn('[ai-preprocess] OpenAI fallback:', e.message);
    }
  }

  return null; // nessun AI disponibile
}

// ── Detect sections from structured text ───────────────────────────
function detectSections(text) {
  const lines = text.split('\n');
  const sections = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Detect headers/titles: short lines followed by content, all caps, or numbered
    if (
      trimmed.length > 0 &&
      trimmed.length < 100 &&
      (
        /^#{1,4}\s/.test(trimmed) ||           // markdown headers
        /^[A-Z][A-Z\s]{3,}$/.test(trimmed) ||  // ALL CAPS titles
        /^\d+\.\s+[A-Z]/.test(trimmed) ||      // numbered sections
        /^(Capitolo|Sezione|Parte|Chapter|Section|Part)\s/i.test(trimmed)
      )
    ) {
      sections.push(trimmed.replace(/^#+\s*/, ''));
    }
  }
  return sections.length > 0 ? sections : undefined;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { text, filename, fileType } = req.body || {};

  if (!text || !filename) {
    return res.status(400).json({ error: 'text e filename richiesti' });
  }

  // Se il testo è molto corto o già pulito (txt/md), skip AI
  const isSimpleText = ['txt', 'md', 'csv'].includes(fileType?.toLowerCase());
  const isShort = text.length < 200;

  if (isSimpleText || isShort) {
    return res.status(200).json({
      text: text.trim(),
      structured: false,
      sections: detectSections(text),
    });
  }

  try {
    const prompt = buildCleanupPrompt(text, filename, fileType);
    const enhanced = await callAI(prompt);

    if (enhanced) {
      const sections = detectSections(enhanced);
      return res.status(200).json({
        text: enhanced,
        structured: true,
        sections,
      });
    }

    // AI non disponibile — ritorna testo originale con pulizia base
    const basicClean = text
      .replace(/\f/g, '\n\n')           // form feed → paragraph break
      .replace(/\r\n/g, '\n')           // normalize line endings
      .replace(/\n{4,}/g, '\n\n\n')     // collassa newline eccessivi
      .replace(/[ \t]{3,}/g, '  ')      // collassa spazi eccessivi
      .trim();

    return res.status(200).json({
      text: basicClean,
      structured: false,
      sections: detectSections(basicClean),
    });
  } catch (err) {
    console.error('[ai-preprocess] Errore:', err.message);
    return res.status(200).json({
      text: text.trim(),
      structured: false,
      error: err.message,
    });
  }
}
