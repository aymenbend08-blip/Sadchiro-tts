import { DialogueLine, GeminiVoice, AlgerianRegion } from '../types';

export interface ParsedScriptResult {
  lines: DialogueLine[];
  detectedSpeakers: {
    label: string;
    gender: 'male' | 'female';
    count: number;
    voice: GeminiVoice;
    isChild?: boolean;
  }[];
  totalTurns: number;
}

/**
 * Intelligent parser that extracts speaker turns, roles, and text from a single block of dialogue text.
 * Supports patterns like:
 * "المرأة: ...", "الرجل: ...", "الراوي: ...", "النهاية: ...", "سارة: ...", "أحمد: ..."
 * "Woman: ...", "Man: ...", "Narrator: ..."
 * Titles / intros at the start and conclusions at the end.
 */
export function parseDialogueScript(rawText: string): ParsedScriptResult {
  if (!rawText || !rawText.trim()) {
    return { lines: [], detectedSpeakers: [], totalTurns: 0 };
  }

  const rawLines = rawText.split('\n');
  const parsedTurns: DialogueLine[] = [];

  // Patterns for gender and speaker role detection
  const femaleKeywords = [
    'المرأة',
    'المرأه',
    'الزوجة',
    'الزوجه',
    'البنت',
    'الفتاة',
    'سارة',
    'ساره',
    'فاطمة',
    'فاطمه',
    'مريم',
    'هند',
    'منى',
    'الأم',
    'الام',
    'امرأة',
    'زوجه',
    'woman',
    'female',
    'girl',
    'wife',
    'mother',
  ];

  const maleKeywords = [
    'الرجل',
    'الزوج',
    'الأب',
    'الاب',
    'الولد',
    'الشاب',
    'أحمد',
    'احمد',
    'كريم',
    'عمر',
    'علي',
    'خالد',
    'أمين',
    'امين',
    'man',
    'male',
    'boy',
    'husband',
    'father',
  ];

  const childKeywords = [
    'الطفل',
    'الطفلة',
    'الطفله',
    'الصغير',
    'الصغيرة',
    'أنيس',
    'إياد',
    'child',
    'kid',
  ];

  const narratorKeywords = [
    'الراوي',
    'المعلق',
    'المقدمة',
    'المقدمه',
    'النهاية',
    'الخاتمة',
    'خاتمة',
    'الحكمة',
    'العبرة',
    'narrator',
    'intro',
    'outro',
    'conclusion',
  ];

  let currentSpeakerLabel = '';
  let currentGender: 'male' | 'female' = 'male';
  let currentVoice: GeminiVoice = 'Charon';
  let currentIsChild = false;
  let currentBuffer: string[] = [];

  const flushCurrent = () => {
    const textContent = currentBuffer.join(' ').trim();
    if (textContent.length > 0) {
      parsedTurns.push({
        id: `turn_${parsedTurns.length}_${Date.now()}`,
        speakerId: currentIsChild ? 'child' : currentGender === 'male' ? 'man' : 'woman',
        speakerLabel: currentSpeakerLabel || 'الراوي',
        gender: currentGender,
        voice: currentVoice,
        isChildVoice: currentIsChild,
        language: detectLanguage(textContent),
        text: textContent,
      });
    }
    currentBuffer = [];
  };

  // Speaker label regex: matches "Name:", "Name -", "[Name]", etc.
  // e.g. "المرأة:", "**المرأة:**", "الرجل :", "النهاية:"
  const prefixRegex = /^\s*(\*{0,2})([^\n:：\-–—]{2,30})\1\s*[:：\-–—]\s*(.*)$/;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine) continue;

    // Check if line starts with a speaker prefix
    const match = rawLine.match(prefixRegex);

    if (match) {
      // Flush previous speaker's text if any
      flushCurrent();

      const candidateName = match[2].trim().replace(/^\*+|\*+$/g, '').trim();
      const speechPart = match[3].trim().replace(/^\*+|\*+$/g, '').trim();

      const normalized = candidateName.toLowerCase();

      // Determine gender & role
      if (childKeywords.some((k) => normalized.includes(k))) {
        currentSpeakerLabel = candidateName;
        currentGender = 'male';
        currentVoice = 'Puck';
        currentIsChild = true;
      } else if (femaleKeywords.some((k) => normalized.includes(k))) {
        currentSpeakerLabel = candidateName;
        currentGender = 'female';
        currentVoice = 'Kore';
        currentIsChild = false;
      } else if (narratorKeywords.some((k) => normalized.includes(k))) {
        currentSpeakerLabel = candidateName;
        currentGender = 'male';
        currentVoice = 'Charon'; // Calm documentary/narrator tone
        currentIsChild = false;
      } else if (maleKeywords.some((k) => normalized.includes(k))) {
        currentSpeakerLabel = candidateName;
        currentGender = 'male';
        currentVoice = 'Fenrir'; // Confident articulate male tone
        currentIsChild = false;
      } else {
        // Unknown speaker name - alternate or default to male/female
        const isLikelyFemale = candidateName.endsWith('ة') || candidateName.endsWith('اء');
        currentSpeakerLabel = candidateName;
        currentGender = isLikelyFemale ? 'female' : 'male';
        currentVoice = isLikelyFemale ? 'Kore' : 'Fenrir';
        currentIsChild = false;
      }

      if (speechPart) {
        currentBuffer.push(speechPart);
      }
    } else {
      // Line without prefix:
      // Could be title/intro at start or conclusion at end, or continuation of previous speaker
      const cleanLine = rawLine.replace(/^\*+|\*+$/g, '').trim();
      if (!cleanLine) continue;

      // Check special markers like "النهاية:" without colon or with asterisks
      const isOutroMarker = narratorKeywords.some(
        (k) => cleanLine.toLowerCase() === k || cleanLine.toLowerCase() === `**${k}**`
      );

      if (isOutroMarker) {
        flushCurrent();
        currentSpeakerLabel = 'النهاية (الراوي)';
        currentGender = 'male';
        currentVoice = 'Charon';
        currentIsChild = false;
      } else if (!currentSpeakerLabel) {
        // Text before any speaker is encountered (e.g. Title: «أنا أمزح معك فقط!»)
        currentSpeakerLabel = 'المقدمة (الراوي)';
        currentGender = 'male';
        currentVoice = 'Charon';
        currentIsChild = false;
        currentBuffer.push(cleanLine);
      } else {
        // Continuation of current speaker's turn
        currentBuffer.push(cleanLine);
      }
    }
  }

  // Final flush
  flushCurrent();

  // Aggregate speaker stats
  const speakerMap = new Map<string, { label: string; gender: 'male' | 'female'; count: number; voice: GeminiVoice; isChild?: boolean }>();

  for (const turn of parsedTurns) {
    const key = turn.speakerLabel;
    if (speakerMap.has(key)) {
      speakerMap.get(key)!.count++;
    } else {
      speakerMap.set(key, {
        label: turn.speakerLabel,
        gender: turn.gender,
        count: 1,
        voice: turn.voice,
        isChild: turn.isChildVoice,
      });
    }
  }

  return {
    lines: parsedTurns,
    detectedSpeakers: Array.from(speakerMap.values()),
    totalTurns: parsedTurns.length,
  };
}

function detectLanguage(text: string): 'ar' | 'fr' | 'en' | 'darja' {
  // Simple language heuristic
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;

  if (latinCount > arabicCount) {
    // Check French vs English
    const frenchWords = ['le', 'la', 'les', 'bonjour', 'merci', 'oui', 'c’est', 'vous', 'avec', 'tout'];
    const lower = text.toLowerCase();
    const hasFrench = frenchWords.some((w) => lower.includes(w));
    return hasFrench ? 'fr' : 'en';
  }

  // Algerian darja clues
  const darjaClues = ['واش', 'راك', 'غايا', 'شوالا', 'بنينة', 'برك', 'صحا', 'حنا', 'بزاف', 'كاش', 'ديال'];
  if (darjaClues.some((c) => text.includes(c))) {
    return 'darja';
  }

  return 'ar';
}
