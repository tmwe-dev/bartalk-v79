import { callProxy } from './proxy';
import { resolveApiKeyOrThrow } from './apiKeyResolver';

export interface LessonSection {
  heading: string;
  content: string;       // paragraphs of teaching text
  imagePrompt?: string;  // optional prompt for image generation
}

export interface LessonContent {
  introduction: string;
  sections: LessonSection[];
  summary: string;
  keyTakeaways: string[];
}

export async function generateLessonContent(
  lessonTitle: string,
  lessonDescription: string,
  objectives: string[],
  courseTopic: string,
  courseLevel: string,
  language: string
): Promise<LessonContent> {
  const apiConfig = resolveApiKeyOrThrow();

  const langLabel = language === 'it' ? 'italiano' : language === 'en' ? 'inglese' : language;

  const systemPrompt = `Sei un insegnante esperto. Genera il contenuto completo di una lezione educativa in ${langLabel}.

CORSO: ${courseTopic}
LIVELLO: ${courseLevel}
LEZIONE: ${lessonTitle}
DESCRIZIONE: ${lessonDescription}
OBIETTIVI: ${objectives.join('; ')}

Genera una lezione completa e coinvolgente. Rispondi SOLO con JSON valido nel formato:
{
  "introduction": "Introduzione accattivante (2-3 frasi)",
  "sections": [
    {
      "heading": "Titolo sezione",
      "content": "Contenuto educativo dettagliato (3-5 paragrafi per sezione). Usa esempi concreti, analogie, e spiegazioni chiare.",
      "imagePrompt": "Breve descrizione per un'immagine illustrativa (opzionale)"
    }
  ],
  "summary": "Riassunto di 2-3 frasi",
  "keyTakeaways": ["punto chiave 1", "punto chiave 2", "punto chiave 3"]
}

REGOLE:
- 3-5 sezioni per lezione
- Ogni sezione deve insegnare un concetto specifico
- Usa un tono adatto al livello (${courseLevel})
- Includi esempi pratici
- Il contenuto deve coprire tutti gli obiettivi
- RISPONDI SOLO CON IL JSON`;

  const response = await callProxy({
    provider: apiConfig.provider,
    model: apiConfig.model,
    messages: [{ role: 'user', content: `Genera il contenuto della lezione: ${lessonTitle}` }],
    systemPrompt,
    temperature: 0.4,
    apiKey: apiConfig.apiKey,
  });

  if (response.error) {
    throw new Error(`Errore generazione contenuto: ${response.error}`);
  }

  // Parse JSON from response
  let jsonStr = response.content.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Risposta AI non contiene JSON valido');
  jsonStr = jsonStr.slice(start, end + 1);

  const parsed = JSON.parse(jsonStr);

  return {
    introduction: parsed.introduction || '',
    sections: (parsed.sections || []).map((s: Record<string, unknown>) => ({
      heading: (s.heading as string) || '',
      content: (s.content as string) || '',
      imagePrompt: (s.imagePrompt as string) || undefined,
    })),
    summary: parsed.summary || '',
    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
  };
}
