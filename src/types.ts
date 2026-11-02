export type GeminiVoice = 'Kore' | 'Fenrir' | 'Puck' | 'Zephyr' | 'Charon';

export type VoiceAudience = 'adult' | 'child';
export type ChildVoiceType = 'boy' | 'girl' | 'algerian-boy' | 'algerian-girl';

export interface VoiceOption {
  id: GeminiVoice;
  name: string;
  arabicName: string;
  gender: 'female' | 'male' | 'neutral';
  tone: string;
  description: string;
  avatarColor: string;
  recommendedFor: string;
  audience?: VoiceAudience;
  childType?: ChildVoiceType;
}

export interface SpeechStyle {
  id: string;
  name: string;
  prompt: string;
  icon: string;
  description: string;
  isKidsOnly?: boolean;
}

export interface GeneratedAudioItem {
  id: string;
  text: string;
  voice: GeminiVoice;
  voiceName: string;
  styleName: string;
  timestamp: number;
  duration?: number;
  audioUrl: string;
  audioBase64?: string;
  mimeType: string;
  dialectName?: string;
  isChildVoice?: boolean;
  childTypeName?: string;
  isBrowserSynthesis?: boolean;
  isDialogue?: boolean;
  dialogueCount?: number;
}

export interface SampleText {
  id: string;
  category: 'literary' | 'documentary' | 'news' | 'podcast' | 'english' | 'algerian' | 'kids';
  title: string;
  categoryName: string;
  text: string;
  suggestedVoice: GeminiVoice;
  suggestedStyle: string;
  dialectId?: string;
  isChildVoice?: boolean;
  childType?: ChildVoiceType;
}

export type AlgerianRegion =
  | 'algiers'
  | 'oran'
  | 'constantine'
  | 'tlemcen'
  | 'setif'
  | 'sahara'
  | 'jijel'
  | 'annaba';

export interface AlgerianDialect {
  id: AlgerianRegion;
  name: string;
  arabicName: string;
  region: string;
  tag: string;
  color: string;
  characteristics: string[];
  keyVocabulary: { word: string; meaning: string }[];
  phoneticRule: string;
  speechStylePrompt: string;
  suggestedVoice: GeminiVoice;
  samplePhrases: {
    title: string;
    text: string;
    meaning: string;
    isKids?: boolean;
  }[];
}

export interface DialogueLine {
  id: string;
  speakerId: 'man' | 'woman' | 'child' | 'speaker1' | 'speaker2';
  speakerLabel: string;
  gender: 'male' | 'female';
  voice: GeminiVoice;
  isChildVoice?: boolean;
  childType?: ChildVoiceType;
  dialectId?: AlgerianRegion;
  language: 'ar' | 'fr' | 'en' | 'darja';
  text: string;
  stylePrompt?: string;
}

export interface DialoguePreset {
  id: string;
  title: string;
  category: string;
  description: string;
  lines: Omit<DialogueLine, 'id'>[];
}
