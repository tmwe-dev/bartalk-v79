import type { ProviderType } from './agents';
import type { ConversationMode, TurnStrategy } from './conversation';

export interface APIKeyEntry {
  provider: ProviderType | 'elevenlabs';
  apiKey: string;
  model?: string;
}

export interface VoiceConfig {
  [agentName: string]: string; // agentName → ElevenLabs voiceId
}

/**
 * Lingue supportate da BarTalk v8.
 *
 * Copertura:
 * - 6 lingue originali (IT, EN, ES, FR, DE, PT)
 * - Thai, Cinese, Giapponese (richiesti)
 * - Top 20 lingue mondiali per numero di parlanti
 * - Tutte le lingue ElevenLabs v3 / Multilingual v2 / Flash v2.5
 *
 * Ogni lingua ha: codice ISO, label nativa, flag, BCP-47, istruzione prompt, UI tradotta.
 */
export type AppLanguage =
  // Originali
  | 'it' | 'en' | 'es' | 'fr' | 'de' | 'pt'
  // Richieste esplicitamente
  | 'th' | 'zh' | 'ja'
  // Top 20 mondiali + ElevenLabs
  | 'ar' | 'hi' | 'bn' | 'ru' | 'ko' | 'tr' | 'vi' | 'pl' | 'uk' | 'nl'
  | 'ro' | 'el' | 'cs' | 'hu' | 'sv' | 'da' | 'fi' | 'no' | 'sk' | 'bg'
  | 'hr' | 'sr' | 'sl' | 'lt' | 'lv' | 'et' | 'id' | 'ms' | 'tl' | 'sw'
  | 'he' | 'fa' | 'ur' | 'ta' | 'te' | 'ml' | 'kn' | 'gu' | 'mr' | 'pa'
  | 'ne' | 'si' | 'my' | 'km' | 'lo' | 'ka' | 'hy' | 'az' | 'kk' | 'uz'
  | 'mk' | 'bs' | 'sq' | 'is' | 'ga' | 'cy' | 'gl' | 'ca' | 'eu'
  | 'af' | 'am' | 'ha' | 'ig' | 'yo' | 'zu' | 'xh'
  | 'mn' | 'lb' | 'mt' | 'eo';

export interface LanguageConfig {
  value: AppLanguage;
  label: string;
  flag: string;
  bcp47: string;
  instruction: string;
  /** Gruppo per UI dropdown: 'primary' (top 6), 'major' (top 20), 'elevenlabs' (supported TTS), 'other' */
  group: 'primary' | 'major' | 'elevenlabs' | 'other';
  ui: {
    placeholder: string;
    listening: string;
    waiting: string;
    micUnsupported: string;
    stopRecording: string;
    speak: string;
  };
}

// Helper: crea UI generica per lingue dove non serve traduzione specifica
function genericUI(lang: string): LanguageConfig['ui'] {
  return {
    placeholder: `Type a message... (${lang})`,
    listening: 'Listening...',
    waiting: 'Agents are responding...',
    micUnsupported: 'Microphone not supported',
    stopRecording: 'Stop',
    speak: 'Speak',
  };
}

export const LANGUAGES: LanguageConfig[] = [
  // ══════════════════════════════════════════════════════════════════
  // PRIMARY — Le 6 lingue originali (UI completamente tradotta)
  // ══════════════════════════════════════════════════════════════════
  {
    value: 'it', label: 'Italiano', flag: '🇮🇹', bcp47: 'it-IT', group: 'primary',
    instruction: 'Rispondi in italiano in modo naturale e conversazionale.',
    ui: { placeholder: 'Scrivi un messaggio...', listening: 'Sto ascoltando...', waiting: 'Gli agenti stanno rispondendo...', micUnsupported: 'Microfono non supportato', stopRecording: 'Ferma registrazione', speak: 'Parla' },
  },
  {
    value: 'en', label: 'English', flag: '🇬🇧', bcp47: 'en-US', group: 'primary',
    instruction: 'Reply in English in a natural and conversational way.',
    ui: { placeholder: 'Type a message...', listening: 'Listening...', waiting: 'Agents are responding...', micUnsupported: 'Microphone not supported', stopRecording: 'Stop recording', speak: 'Speak' },
  },
  {
    value: 'es', label: 'Español', flag: '🇪🇸', bcp47: 'es-ES', group: 'primary',
    instruction: 'Responde en español de forma natural y conversacional.',
    ui: { placeholder: 'Escribe un mensaje...', listening: 'Escuchando...', waiting: 'Los agentes están respondiendo...', micUnsupported: 'Micrófono no soportado', stopRecording: 'Detener grabación', speak: 'Habla' },
  },
  {
    value: 'fr', label: 'Français', flag: '🇫🇷', bcp47: 'fr-FR', group: 'primary',
    instruction: 'Réponds en français de manière naturelle et conversationnelle.',
    ui: { placeholder: 'Écris un message...', listening: 'J\'écoute...', waiting: 'Les agents répondent...', micUnsupported: 'Micro non supporté', stopRecording: 'Arrêter l\'enregistrement', speak: 'Parle' },
  },
  {
    value: 'de', label: 'Deutsch', flag: '🇩🇪', bcp47: 'de-DE', group: 'primary',
    instruction: 'Antworte auf Deutsch auf natürliche und konversationelle Weise.',
    ui: { placeholder: 'Nachricht schreiben...', listening: 'Höre zu...', waiting: 'Die Agenten antworten...', micUnsupported: 'Mikrofon nicht unterstützt', stopRecording: 'Aufnahme stoppen', speak: 'Sprechen' },
  },
  {
    value: 'pt', label: 'Português', flag: '🇧🇷', bcp47: 'pt-BR', group: 'primary',
    instruction: 'Responda em português de forma natural e conversacional.',
    ui: { placeholder: 'Escreva uma mensagem...', listening: 'Ouvindo...', waiting: 'Os agentes estão respondendo...', micUnsupported: 'Microfone não suportado', stopRecording: 'Parar gravação', speak: 'Fale' },
  },

  // ══════════════════════════════════════════════════════════════════
  // MAJOR — Richieste + Top 20 mondiali (UI tradotta)
  // ══════════════════════════════════════════════════════════════════
  {
    value: 'zh', label: '中文', flag: '🇨🇳', bcp47: 'zh-CN', group: 'major',
    instruction: '请用中文自然且对话式地回答。',
    ui: { placeholder: '输入消息...', listening: '正在聆听...', waiting: '智能体正在回应...', micUnsupported: '不支持麦克风', stopRecording: '停止录音', speak: '说话' },
  },
  {
    value: 'ja', label: '日本語', flag: '🇯🇵', bcp47: 'ja-JP', group: 'major',
    instruction: '日本語で自然な会話形式で答えてください。',
    ui: { placeholder: 'メッセージを入力...', listening: '聞いています...', waiting: 'エージェントが応答中...', micUnsupported: 'マイク非対応', stopRecording: '録音停止', speak: '話す' },
  },
  {
    value: 'ko', label: '한국어', flag: '🇰🇷', bcp47: 'ko-KR', group: 'major',
    instruction: '한국어로 자연스럽고 대화하듯이 답해주세요.',
    ui: { placeholder: '메시지 입력...', listening: '듣고 있습니다...', waiting: '에이전트가 응답 중...', micUnsupported: '마이크 미지원', stopRecording: '녹음 중지', speak: '말하기' },
  },
  {
    value: 'th', label: 'ไทย', flag: '🇹🇭', bcp47: 'th-TH', group: 'major',
    instruction: 'ตอบเป็นภาษาไทยอย่างเป็นธรรมชาติและเป็นกันเอง',
    ui: { placeholder: 'พิมพ์ข้อความ...', listening: 'กำลังฟัง...', waiting: 'เอเจนต์กำลังตอบ...', micUnsupported: 'ไม่รองรับไมโครโฟน', stopRecording: 'หยุดบันทึก', speak: 'พูด' },
  },
  {
    value: 'ar', label: 'العربية', flag: '🇸🇦', bcp47: 'ar-SA', group: 'major',
    instruction: 'أجب باللغة العربية بطريقة طبيعية ومحادثة.',
    ui: { placeholder: 'اكتب رسالة...', listening: 'أستمع...', waiting: 'الوكلاء يردون...', micUnsupported: 'الميكروفون غير مدعوم', stopRecording: 'إيقاف التسجيل', speak: 'تحدث' },
  },
  {
    value: 'hi', label: 'हिन्दी', flag: '🇮🇳', bcp47: 'hi-IN', group: 'major',
    instruction: 'हिन्दी में स्वाभाविक और बातचीत के तरीके से जवाब दें।',
    ui: { placeholder: 'संदेश लिखें...', listening: 'सुन रहा हूँ...', waiting: 'एजेंट जवाब दे रहे हैं...', micUnsupported: 'माइक्रोफ़ोन समर्थित नहीं', stopRecording: 'रिकॉर्डिंग रोकें', speak: 'बोलें' },
  },
  {
    value: 'bn', label: 'বাংলা', flag: '🇧🇩', bcp47: 'bn-BD', group: 'major',
    instruction: 'বাংলায় স্বাভাবিক ও কথোপকথনমূলকভাবে উত্তর দিন।',
    ui: { placeholder: 'বার্তা লিখুন...', listening: 'শুনছি...', waiting: 'এজেন্টরা উত্তর দিচ্ছে...', micUnsupported: 'মাইক্রোফোন সমর্থিত নয়', stopRecording: 'রেকর্ডিং বন্ধ', speak: 'বলুন' },
  },
  {
    value: 'ru', label: 'Русский', flag: '🇷🇺', bcp47: 'ru-RU', group: 'major',
    instruction: 'Отвечай на русском языке естественно и в разговорном стиле.',
    ui: { placeholder: 'Напишите сообщение...', listening: 'Слушаю...', waiting: 'Агенты отвечают...', micUnsupported: 'Микрофон не поддерживается', stopRecording: 'Остановить запись', speak: 'Говорите' },
  },
  {
    value: 'tr', label: 'Türkçe', flag: '🇹🇷', bcp47: 'tr-TR', group: 'major',
    instruction: 'Türkçe olarak doğal ve sohbet tarzında yanıt ver.',
    ui: { placeholder: 'Mesaj yaz...', listening: 'Dinliyorum...', waiting: 'Ajanlar yanıtlıyor...', micUnsupported: 'Mikrofon desteklenmiyor', stopRecording: 'Kaydı durdur', speak: 'Konuş' },
  },
  {
    value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', bcp47: 'vi-VN', group: 'major',
    instruction: 'Trả lời bằng tiếng Việt một cách tự nhiên và đối thoại.',
    ui: { placeholder: 'Nhập tin nhắn...', listening: 'Đang nghe...', waiting: 'Các tác nhân đang phản hồi...', micUnsupported: 'Không hỗ trợ micro', stopRecording: 'Dừng ghi âm', speak: 'Nói' },
  },
  {
    value: 'pl', label: 'Polski', flag: '🇵🇱', bcp47: 'pl-PL', group: 'major',
    instruction: 'Odpowiadaj po polsku w naturalny i konwersacyjny sposób.',
    ui: { placeholder: 'Napisz wiadomość...', listening: 'Słucham...', waiting: 'Agenci odpowiadają...', micUnsupported: 'Mikrofon nieobsługiwany', stopRecording: 'Zatrzymaj nagrywanie', speak: 'Mów' },
  },
  {
    value: 'uk', label: 'Українська', flag: '🇺🇦', bcp47: 'uk-UA', group: 'major',
    instruction: 'Відповідай українською мовою природно і в розмовному стилі.',
    ui: { placeholder: 'Напишіть повідомлення...', listening: 'Слухаю...', waiting: 'Агенти відповідають...', micUnsupported: 'Мікрофон не підтримується', stopRecording: 'Зупинити запис', speak: 'Говоріть' },
  },
  {
    value: 'nl', label: 'Nederlands', flag: '🇳🇱', bcp47: 'nl-NL', group: 'major',
    instruction: 'Antwoord in het Nederlands op een natuurlijke en conversationele manier.',
    ui: { placeholder: 'Typ een bericht...', listening: 'Luisteren...', waiting: 'Agenten reageren...', micUnsupported: 'Microfoon niet ondersteund', stopRecording: 'Stop opname', speak: 'Spreek' },
  },
  {
    value: 'ro', label: 'Română', flag: '🇷🇴', bcp47: 'ro-RO', group: 'major',
    instruction: 'Răspunde în română într-un mod natural și conversațional.',
    ui: { placeholder: 'Scrie un mesaj...', listening: 'Ascult...', waiting: 'Agenții răspund...', micUnsupported: 'Microfon nesuportat', stopRecording: 'Oprește înregistrarea', speak: 'Vorbește' },
  },
  {
    value: 'el', label: 'Ελληνικά', flag: '🇬🇷', bcp47: 'el-GR', group: 'major',
    instruction: 'Απάντησε στα ελληνικά με φυσικό και συνομιλιακό τρόπο.',
    ui: { placeholder: 'Γράψε μήνυμα...', listening: 'Ακούω...', waiting: 'Οι πράκτορες απαντούν...', micUnsupported: 'Μικρόφωνο μη υποστηριζόμενο', stopRecording: 'Σταμάτα εγγραφή', speak: 'Μίλα' },
  },
  {
    value: 'cs', label: 'Čeština', flag: '🇨🇿', bcp47: 'cs-CZ', group: 'major',
    instruction: 'Odpovídej česky přirozeným a konverzačním způsobem.',
    ui: { placeholder: 'Napiš zprávu...', listening: 'Poslouchám...', waiting: 'Agenti odpovídají...', micUnsupported: 'Mikrofon není podporován', stopRecording: 'Zastavit nahrávání', speak: 'Mluv' },
  },
  {
    value: 'hu', label: 'Magyar', flag: '🇭🇺', bcp47: 'hu-HU', group: 'major',
    instruction: 'Válaszolj magyarul természetes és beszélgetős stílusban.',
    ui: { placeholder: 'Írj üzenetet...', listening: 'Hallgatom...', waiting: 'Az ügynökök válaszolnak...', micUnsupported: 'Mikrofon nem támogatott', stopRecording: 'Felvétel leállítása', speak: 'Beszélj' },
  },
  {
    value: 'sv', label: 'Svenska', flag: '🇸🇪', bcp47: 'sv-SE', group: 'major',
    instruction: 'Svara på svenska på ett naturligt och samtalsliknande sätt.',
    ui: { placeholder: 'Skriv meddelande...', listening: 'Lyssnar...', waiting: 'Agenterna svarar...', micUnsupported: 'Mikrofon stöds inte', stopRecording: 'Stoppa inspelning', speak: 'Tala' },
  },
  {
    value: 'da', label: 'Dansk', flag: '🇩🇰', bcp47: 'da-DK', group: 'major',
    instruction: 'Svar på dansk på en naturlig og samtalepræget måde.',
    ui: { placeholder: 'Skriv besked...', listening: 'Lytter...', waiting: 'Agenterne svarer...', micUnsupported: 'Mikrofon ikke understøttet', stopRecording: 'Stop optagelse', speak: 'Tal' },
  },
  {
    value: 'fi', label: 'Suomi', flag: '🇫🇮', bcp47: 'fi-FI', group: 'major',
    instruction: 'Vastaa suomeksi luonnollisella ja keskustelunomaisella tavalla.',
    ui: { placeholder: 'Kirjoita viesti...', listening: 'Kuuntelen...', waiting: 'Agentit vastaavat...', micUnsupported: 'Mikrofonia ei tueta', stopRecording: 'Lopeta nauhoitus', speak: 'Puhu' },
  },
  {
    value: 'no', label: 'Norsk', flag: '🇳🇴', bcp47: 'nb-NO', group: 'major',
    instruction: 'Svar på norsk på en naturlig og samtalepreget måte.',
    ui: { placeholder: 'Skriv melding...', listening: 'Lytter...', waiting: 'Agentene svarer...', micUnsupported: 'Mikrofon ikke støttet', stopRecording: 'Stopp opptak', speak: 'Snakk' },
  },
  {
    value: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩', bcp47: 'id-ID', group: 'major',
    instruction: 'Jawab dalam Bahasa Indonesia secara alami dan percakapan.',
    ui: { placeholder: 'Tulis pesan...', listening: 'Mendengarkan...', waiting: 'Agen sedang merespons...', micUnsupported: 'Mikrofon tidak didukung', stopRecording: 'Hentikan rekaman', speak: 'Bicara' },
  },
  {
    value: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾', bcp47: 'ms-MY', group: 'major',
    instruction: 'Jawab dalam Bahasa Melayu secara semula jadi dan bersifat perbualan.',
    ui: { placeholder: 'Tulis mesej...', listening: 'Mendengar...', waiting: 'Ejen sedang menjawab...', micUnsupported: 'Mikrofon tidak disokong', stopRecording: 'Hentikan rakaman', speak: 'Cakap' },
  },
  {
    value: 'tl', label: 'Filipino', flag: '🇵🇭', bcp47: 'fil-PH', group: 'major',
    instruction: 'Sumagot sa Filipino nang natural at conversational.',
    ui: { placeholder: 'Mag-type ng mensahe...', listening: 'Nakikinig...', waiting: 'Sumasagot ang mga ahente...', micUnsupported: 'Hindi suportado ang mikropono', stopRecording: 'Itigil ang recording', speak: 'Magsalita' },
  },
  {
    value: 'he', label: 'עברית', flag: '🇮🇱', bcp47: 'he-IL', group: 'major',
    instruction: 'ענה בעברית באופן טבעי ושיחתי.',
    ui: { placeholder: '...כתוב הודעה', listening: '...מאזין', waiting: '...הסוכנים מגיבים', micUnsupported: 'מיקרופון לא נתמך', stopRecording: 'עצור הקלטה', speak: 'דבר' },
  },
  {
    value: 'fa', label: 'فارسی', flag: '🇮🇷', bcp47: 'fa-IR', group: 'major',
    instruction: 'به فارسی به شکل طبیعی و محاوره‌ای پاسخ بده.',
    ui: { placeholder: '...پیام بنویسید', listening: '...در حال شنیدن', waiting: '...عامل‌ها پاسخ می‌دهند', micUnsupported: 'میکروفون پشتیبانی نمی‌شود', stopRecording: 'توقف ضبط', speak: 'صحبت کنید' },
  },
  {
    value: 'ur', label: 'اردو', flag: '🇵🇰', bcp47: 'ur-PK', group: 'major',
    instruction: 'اردو میں فطری اور گفتگو کے انداز میں جواب دیں۔',
    ui: { placeholder: '...پیغام لکھیں', listening: '...سن رہا ہوں', waiting: '...ایجنٹ جواب دے رہے ہیں', micUnsupported: 'مائیکروفون تعاون نہیں کرتا', stopRecording: 'ریکارڈنگ روکیں', speak: 'بولیں' },
  },
  {
    value: 'sw', label: 'Kiswahili', flag: '🇹🇿', bcp47: 'sw-TZ', group: 'major',
    instruction: 'Jibu kwa Kiswahili kwa njia ya asili na ya mazungumzo.',
    ui: genericUI('Kiswahili'),
  },

  // ══════════════════════════════════════════════════════════════════
  // ELEVENLABS — Lingue supportate da ElevenLabs v3 (TTS disponibile)
  // ══════════════════════════════════════════════════════════════════
  { value: 'sk', label: 'Slovenčina', flag: '🇸🇰', bcp47: 'sk-SK', group: 'elevenlabs', instruction: 'Odpovedaj po slovensky prirodzene a konverzačne.', ui: genericUI('Slovenčina') },
  { value: 'bg', label: 'Български', flag: '🇧🇬', bcp47: 'bg-BG', group: 'elevenlabs', instruction: 'Отговаряй на български по естествен и разговорен начин.', ui: genericUI('Български') },
  { value: 'hr', label: 'Hrvatski', flag: '🇭🇷', bcp47: 'hr-HR', group: 'elevenlabs', instruction: 'Odgovaraj na hrvatskom na prirodan i razgovoran način.', ui: genericUI('Hrvatski') },
  { value: 'sr', label: 'Српски', flag: '🇷🇸', bcp47: 'sr-RS', group: 'elevenlabs', instruction: 'Одговарај на српском на природан и разговоран начин.', ui: genericUI('Српски') },
  { value: 'sl', label: 'Slovenščina', flag: '🇸🇮', bcp47: 'sl-SI', group: 'elevenlabs', instruction: 'Odgovarjaj v slovenščini naravno in pogovorno.', ui: genericUI('Slovenščina') },
  { value: 'lt', label: 'Lietuvių', flag: '🇱🇹', bcp47: 'lt-LT', group: 'elevenlabs', instruction: 'Atsakyk lietuviškai natūraliai ir pokalbio stiliumi.', ui: genericUI('Lietuvių') },
  { value: 'lv', label: 'Latviešu', flag: '🇱🇻', bcp47: 'lv-LV', group: 'elevenlabs', instruction: 'Atbildi latviski dabiski un sarunvalodā.', ui: genericUI('Latviešu') },
  { value: 'et', label: 'Eesti', flag: '🇪🇪', bcp47: 'et-EE', group: 'elevenlabs', instruction: 'Vasta eesti keeles loomulikult ja vestluslikult.', ui: genericUI('Eesti') },
  { value: 'ta', label: 'தமிழ்', flag: '🇮🇳', bcp47: 'ta-IN', group: 'elevenlabs', instruction: 'இயல்பான மற்றும் உரையாடல் முறையில் தமிழில் பதிலளிக்கவும்.', ui: genericUI('தமிழ்') },
  { value: 'te', label: 'తెలుగు', flag: '🇮🇳', bcp47: 'te-IN', group: 'elevenlabs', instruction: 'తెలుగులో సహజంగా మరియు సంభాషణాత్మకంగా సమాధానం ఇవ్వండి.', ui: genericUI('తెలుగు') },
  { value: 'ml', label: 'മലയാളം', flag: '🇮🇳', bcp47: 'ml-IN', group: 'elevenlabs', instruction: 'മലയാളത്തിൽ സ്വാഭാവികമായും സംഭാഷണരീതിയിലും ഉത്തരം നൽകുക.', ui: genericUI('മലയാളം') },
  { value: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳', bcp47: 'kn-IN', group: 'elevenlabs', instruction: 'ಕನ್ನಡದಲ್ಲಿ ಸ್ವಾಭಾವಿಕವಾಗಿ ಮತ್ತು ಸಂಭಾಷಣಾ ಶೈಲಿಯಲ್ಲಿ ಉತ್ತರಿಸಿ.', ui: genericUI('ಕನ್ನಡ') },
  { value: 'gu', label: 'ગુજરાતી', flag: '🇮🇳', bcp47: 'gu-IN', group: 'elevenlabs', instruction: 'ગુજરાતીમાં કુદરતી અને વાતચીતના સ્વરૂપમાં જવાબ આપો.', ui: genericUI('ગુજરાતી') },
  { value: 'mr', label: 'मराठी', flag: '🇮🇳', bcp47: 'mr-IN', group: 'elevenlabs', instruction: 'मराठीत नैसर्गिक आणि संवादात्मक पद्धतीने उत्तर द्या.', ui: genericUI('मराठी') },
  { value: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳', bcp47: 'pa-IN', group: 'elevenlabs', instruction: 'ਪੰਜਾਬੀ ਵਿੱਚ ਕੁਦਰਤੀ ਅਤੇ ਗੱਲਬਾਤ ਦੇ ਅੰਦਾਜ਼ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।', ui: genericUI('ਪੰਜਾਬੀ') },
  { value: 'ne', label: 'नेपाली', flag: '🇳🇵', bcp47: 'ne-NP', group: 'elevenlabs', instruction: 'नेपालीमा प्राकृतिक र कुराकानी शैलीमा जवाफ दिनुहोस्।', ui: genericUI('नेपाली') },
  { value: 'si', label: 'සිංහල', flag: '🇱🇰', bcp47: 'si-LK', group: 'elevenlabs', instruction: 'සිංහලෙන් ස්වභාවික හා සංවාදශීලී ලෙස පිළිතුරු දෙන්න.', ui: genericUI('සිංහල') },
  { value: 'my', label: 'မြန်မာ', flag: '🇲🇲', bcp47: 'my-MM', group: 'elevenlabs', instruction: 'မြန်မာဘာသာဖြင့် သဘာဝကျကျ ပြန်ဖြေပါ။', ui: genericUI('မြန်မာ') },
  { value: 'km', label: 'ខ្មែរ', flag: '🇰🇭', bcp47: 'km-KH', group: 'elevenlabs', instruction: 'ឆ្លើយតបជាភាសាខ្មែរដោយធម្មជាតិ។', ui: genericUI('ខ្មែរ') },
  { value: 'lo', label: 'ລາວ', flag: '🇱🇦', bcp47: 'lo-LA', group: 'elevenlabs', instruction: 'ຕອບເປັນພາສາລາວແບບທຳມະຊາດ.', ui: genericUI('ລາວ') },
  { value: 'ka', label: 'ქართული', flag: '🇬🇪', bcp47: 'ka-GE', group: 'elevenlabs', instruction: 'უპასუხე ქართულად ბუნებრივად და საუბრის სტილში.', ui: genericUI('ქართული') },
  { value: 'hy', label: 'Armenian', flag: '🇦🇲', bcp47: 'hy-AM', group: 'elevenlabs', instruction: 'Reply in Armenian naturally and conversationally.', ui: genericUI('Armenian') },
  { value: 'az', label: 'Azərbaycan', flag: '🇦🇿', bcp47: 'az-AZ', group: 'elevenlabs', instruction: 'Azərbaycan dilində təbii və söhbət tərzi ilə cavab ver.', ui: genericUI('Azərbaycan') },
  { value: 'kk', label: 'Қазақ', flag: '🇰🇿', bcp47: 'kk-KZ', group: 'elevenlabs', instruction: 'Қазақ тілінде табиғи және сөйлесу стилінде жауап бер.', ui: genericUI('Қазақ') },
  { value: 'uz', label: 'Oʻzbek', flag: '🇺🇿', bcp47: 'uz-UZ', group: 'elevenlabs', instruction: 'Oʻzbek tilida tabiiy va suhbat uslubida javob ber.', ui: genericUI('Oʻzbek') },
  { value: 'mk', label: 'Македонски', flag: '🇲🇰', bcp47: 'mk-MK', group: 'elevenlabs', instruction: 'Одговарај на македонски на природен и разговорен начин.', ui: genericUI('Македонски') },
  { value: 'bs', label: 'Bosanski', flag: '🇧🇦', bcp47: 'bs-BA', group: 'elevenlabs', instruction: 'Odgovaraj na bosanskom na prirodan i razgovoran način.', ui: genericUI('Bosanski') },
  { value: 'sq', label: 'Shqip', flag: '🇦🇱', bcp47: 'sq-AL', group: 'elevenlabs', instruction: 'Përgjigju në shqip në mënyrë natyrale dhe bisedore.', ui: genericUI('Shqip') },
  { value: 'is', label: 'Íslenska', flag: '🇮🇸', bcp47: 'is-IS', group: 'elevenlabs', instruction: 'Svaraðu á íslensku á náttúrulegan og samræðulegan hátt.', ui: genericUI('Íslenska') },
  { value: 'ga', label: 'Gaeilge', flag: '🇮🇪', bcp47: 'ga-IE', group: 'elevenlabs', instruction: 'Freagair i nGaeilge go nádúrtha agus go comhrách.', ui: genericUI('Gaeilge') },
  { value: 'cy', label: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', bcp47: 'cy-GB', group: 'elevenlabs', instruction: 'Ateba yn Gymraeg yn naturiol ac mewn arddull sgwrsiol.', ui: genericUI('Cymraeg') },
  { value: 'gl', label: 'Galego', flag: '🇪🇸', bcp47: 'gl-ES', group: 'elevenlabs', instruction: 'Responde en galego de forma natural e conversacional.', ui: genericUI('Galego') },
  { value: 'ca', label: 'Català', flag: '🇪🇸', bcp47: 'ca-ES', group: 'elevenlabs', instruction: 'Respon en català de manera natural i conversacional.', ui: genericUI('Català') },
  { value: 'eu', label: 'Euskara', flag: '🇪🇸', bcp47: 'eu-ES', group: 'elevenlabs', instruction: 'Erantzun euskaraz modu natural eta elkarrizketakoan.', ui: genericUI('Euskara') },
  { value: 'af', label: 'Afrikaans', flag: '🇿🇦', bcp47: 'af-ZA', group: 'elevenlabs', instruction: 'Antwoord in Afrikaans op \'n natuurlike en gesprekmatige manier.', ui: genericUI('Afrikaans') },
  { value: 'am', label: 'አማርኛ', flag: '🇪🇹', bcp47: 'am-ET', group: 'elevenlabs', instruction: 'በአማርኛ በተፈጥሮአዊ እና በንግግር ዘይቤ ይመልሱ።', ui: genericUI('አማርኛ') },
  { value: 'ha', label: 'Hausa', flag: '🇳🇬', bcp47: 'ha-NG', group: 'elevenlabs', instruction: 'Ka amsa da Hausa ta hanyar dabi\'a da tattaunawa.', ui: genericUI('Hausa') },
  { value: 'ig', label: 'Igbo', flag: '🇳🇬', bcp47: 'ig-NG', group: 'elevenlabs', instruction: 'Zaa n\'Igbo n\'ụzọ nkịtị na nkwurịta okwu.', ui: genericUI('Igbo') },
  { value: 'yo', label: 'Yorùbá', flag: '🇳🇬', bcp47: 'yo-NG', group: 'elevenlabs', instruction: 'Dahun ni Yorùbá ní ọ̀nà àdánidá àti ìfọ̀rọ̀wérọ̀.', ui: genericUI('Yorùbá') },
  { value: 'zu', label: 'isiZulu', flag: '🇿🇦', bcp47: 'zu-ZA', group: 'elevenlabs', instruction: 'Phendula ngesiZulu ngendlela yemvelo nengxoxo.', ui: genericUI('isiZulu') },
  { value: 'xh', label: 'isiXhosa', flag: '🇿🇦', bcp47: 'xh-ZA', group: 'elevenlabs', instruction: 'Phendula ngesiXhosa ngendlela yendalo nencoko.', ui: genericUI('isiXhosa') },
  { value: 'mn', label: 'Монгол', flag: '🇲🇳', bcp47: 'mn-MN', group: 'elevenlabs', instruction: 'Монгол хэлээр байгалийн болон ярилцлагын хэлбэрээр хариул.', ui: genericUI('Монгол') },
  { value: 'lb', label: 'Lëtzebuergesch', flag: '🇱🇺', bcp47: 'lb-LU', group: 'elevenlabs', instruction: 'Äntwert op Lëtzebuergesch op eng natierlech a konversationell Aart.', ui: genericUI('Lëtzebuergesch') },
  { value: 'mt', label: 'Malti', flag: '🇲🇹', bcp47: 'mt-MT', group: 'elevenlabs', instruction: 'Wieġeb bil-Malti b\'mod naturali u konversazzjonali.', ui: genericUI('Malti') },

  // ══════════════════════════════════════════════════════════════════
  // OTHER — Bonus
  // ══════════════════════════════════════════════════════════════════
  { value: 'eo', label: 'Esperanto', flag: '🌍', bcp47: 'eo', group: 'other', instruction: 'Respondu en Esperanto nature kaj konversacie.', ui: genericUI('Esperanto') },
];

/** Helper: ottieni configurazione lingua per codice */
export function getLangConfig(lang: AppLanguage): LanguageConfig {
  return LANGUAGES.find(l => l.value === lang) || LANGUAGES[0];
}

export interface AppSettings {
  apiKeys: APIKeyEntry[];
  customVoices: VoiceConfig;
  excludedAgents: string[];
  conversationMode: ConversationMode;
  turnStrategy: TurnStrategy;
  ttsEnabled: boolean;
  autoRun: boolean;
  language: AppLanguage;
  temperature: number;
  maxTokens: number;
  wordRange: [number, number];
}
