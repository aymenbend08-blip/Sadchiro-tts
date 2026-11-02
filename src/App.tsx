import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { VoiceSelector } from './components/VoiceSelector';
import { StyleSelector } from './components/StyleSelector';
import { TashkeelHelper } from './components/TashkeelHelper';
import { SamplePicker } from './components/SamplePicker';
import { AudioVisualizer } from './components/AudioVisualizer';
import { AudioHistory } from './components/AudioHistory';
import { ExplanationModal } from './components/ExplanationModal';
import { AlgerianDialectHub } from './components/AlgerianDialectHub';
import { DialogueStudio } from './components/DialogueStudio';
import {
  GeminiVoice,
  SpeechStyle,
  GeneratedAudioItem,
  SampleText,
  AlgerianRegion,
  AlgerianDialect,
  ChildVoiceType,
  DialogueLine,
} from './types';
import { SPEECH_STYLES, VOICES, CHILD_VOICES, SAMPLES } from './data/samples';
import { ALGERIAN_DIALECTS } from './data/algerianDialects';
import { generateSynthesizedWavBlob, speakWithBrowserTts, speakDialogueWithBrowser } from './utils/browserSpeech';
import {
  Wand2,
  Sparkles,
  Volume2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  AudioWaveform,
  Layers,
  Zap,
  Globe2,
  Baby,
  Smile,
  Heart,
  Cpu,
  Clock,
  RefreshCw,
  Users,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dialogue' | 'kids' | 'algerian' | 'standard'>('dialogue');
  const [inputText, setInputText] = useState(
    'مَرْحَبَاً يَا أَصْدِقَائِي الصِّغَار! أَنَا أَنِيس، هَلْ تَعْرِفُونَ قِصَّةَ الْأَرْنَبِ السَّرِيعِ وَالسُّلَحْفَاةِ الصَّبُورَة؟ كَانَ الْأَرْنَبُ يَقُولُ: أَنَا أَسْرَعُ كَائِنٍ فِي الْغَابَة! لَكِنَّ السُّلَحْفَاةَ الصَّغِيرَةَ عَلَّمَتْهُ أَنَّ الصَّبْرَ وَالْعَمَلَ هُمَا سِرُّ النَّجَاح!'
  );
  const [selectedVoice, setSelectedVoice] = useState<GeminiVoice>('Puck');
  const [isChildVoice, setIsChildVoice] = useState(true);
  const [selectedChildType, setSelectedChildType] = useState<ChildVoiceType>('boy');
  const [selectedStyle, setSelectedStyle] = useState<SpeechStyle>(
    SPEECH_STYLES.find((s) => s.id === 'kids-story') || SPEECH_STYLES[0]
  );
  const [selectedDialectId, setSelectedDialectId] = useState<AlgerianRegion>('algiers');
  const [customStyle, setCustomStyle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTashkeelLoading, setIsTashkeelLoading] = useState(false);
  const [isConvertingDialect, setIsConvertingDialect] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<GeneratedAudioItem | null>(null);
  const [history, setHistory] = useState<GeneratedAudioItem[]>([]);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Engine selection: 'auto' (Gemini cloud with fallback), 'gemini' (cloud only), 'browser' (instant local)
  const [engineMode, setEngineMode] = useState<'auto' | 'browser'>('auto');
  const [quotaCountdown, setQuotaCountdown] = useState<number>(0);

  const MAX_CHAR_LIMIT = 5000;
  const [isExpandedTextarea, setIsExpandedTextarea] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioCacheRef = useRef<Map<string, GeneratedAudioItem>>(new Map());

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const combined = (inputText ? inputText + '\n' + text : text).slice(0, MAX_CHAR_LIMIT);
          setInputText(combined);
          setSuccessToast('تم لصق النص بنجاح!');
          setTimeout(() => setSuccessToast(null), 2500);
        }
      } else {
        textareaRef.current?.focus();
      }
    } catch (e) {
      textareaRef.current?.focus();
    }
  };

  // Countdown timer for 429 quota exhaustion
  useEffect(() => {
    if (quotaCountdown <= 0) return;
    const interval = setInterval(() => {
      setQuotaCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quotaCountdown]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sawti_tts_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const restored: GeneratedAudioItem[] = parsed.slice(0, 15).map((item: any) => {
            if (item.audioBase64) {
              const binary = atob(item.audioBase64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: item.mimeType || 'audio/wav' });
              return {
                ...item,
                audioUrl: URL.createObjectURL(blob),
              };
            }
            return item;
          });
          setHistory(restored);
        }
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (newItem: GeneratedAudioItem) => {
    setHistory((prev) => {
      const updated = [newItem, ...prev.filter((i) => i.id !== newItem.id)].slice(0, 15);
      try {
        localStorage.setItem('sawti_tts_history', JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage quota exceeded or error saving history:', e);
      }
      return updated;
    });
  };

  // Estimate speech duration based on word count (~110-130 words per minute for clear Arabic)
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(2, Math.round((wordCount / 120) * 60));

  // Current dialect metadata
  const currentDialect = ALGERIAN_DIALECTS.find((d) => d.id === selectedDialectId);

  const childNameMap: Record<ChildVoiceType, string> = {
    boy: 'أنيس (طفل فصيح)',
    girl: 'سارة (طفلة فصيحة)',
    'algerian-boy': 'إياد (طفل جزائري)',
    'algerian-girl': 'مريم (طفلة جزائرية)',
  };

  // Fallback local synthesis function
  const triggerLocalSynthesis = (
    textFinal: string,
    chosenVoice: GeminiVoice,
    finalIsChild: boolean,
    finalChildType: ChildVoiceType,
    dialectTitle?: string,
    reasonMessage?: string
  ) => {
    const { url } = generateSynthesizedWavBlob(estimatedSeconds, finalIsChild);

    const localItem: GeneratedAudioItem = {
      id: `local_${Date.now()}`,
      text: textFinal,
      voice: chosenVoice,
      voiceName: finalIsChild
        ? childNameMap[finalChildType]
        : VOICES.find((v) => v.id === chosenVoice)?.name || chosenVoice,
      styleName: finalIsChild
        ? `صوت طفل (${childNameMap[finalChildType]})`
        : dialectTitle
        ? `لهجة ${dialectTitle}`
        : selectedStyle.name,
      timestamp: Date.now(),
      duration: estimatedSeconds,
      audioUrl: url,
      mimeType: 'audio/wav',
      dialectName: dialectTitle,
      isChildVoice: finalIsChild,
      childTypeName: finalIsChild ? childNameMap[finalChildType] : undefined,
      isBrowserSynthesis: true,
    };

    setCurrentAudio(localItem);
    saveToHistory(localItem);

    // Speak immediately through browser SpeechSynthesis
    speakWithBrowserTts(textFinal, {
      voice: chosenVoice,
      isChildVoice: finalIsChild,
      childType: finalChildType,
    });

    setSuccessToast(
      reasonMessage ||
        (finalIsChild
          ? `تم النطق الفوري لصوت الأطفال (${childNameMap[finalChildType]}) عبر محرك المتصفح!`
          : dialectTitle
          ? `تم النطق الفوري بلهجة ${dialectTitle} عبر محرك المتصفح!`
          : 'تم النطق الفوري عبر محرك المتصفح!')
    );
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Generate Audio via Server Gemini TTS or local engine
  const handleGenerateAudio = async (
    textToUse?: string,
    voiceToUse?: GeminiVoice,
    overrideIsChild?: boolean,
    overrideChildType?: ChildVoiceType,
    overrideDialectId?: AlgerianRegion
  ) => {
    const textFinal = (textToUse || inputText).trim();

    if (!textFinal) {
      setErrorMsg('يرجى كتابة نص أو اختيار نموذج جاهز قبل توليد الصوت.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    const chosenVoice = voiceToUse || selectedVoice;
    const finalIsChild = overrideIsChild !== undefined ? overrideIsChild : isChildVoice;
    const finalChildType = overrideChildType || selectedChildType;
    const finalDialectId =
      overrideDialectId ||
      (activeTab === 'algerian' || finalChildType?.includes('algerian')
        ? selectedDialectId
        : undefined);

    const dialectTitle =
      finalDialectId && currentDialect ? currentDialect.name : undefined;

    // Check client cache to avoid redundant API quota usage
    const cacheKey = `${textFinal}__${chosenVoice}__${finalIsChild}__${finalChildType}__${finalDialectId || ''}`;
    if (audioCacheRef.current.has(cacheKey)) {
      const cached = audioCacheRef.current.get(cacheKey)!;
      setCurrentAudio(cached);
      setSuccessToast('تم استرجاع الصوت فوراً من الذاكرة المؤقتة!');
      setTimeout(() => setSuccessToast(null), 2500);
      setIsGenerating(false);
      return;
    }

    // If user explicitly chose local browser engine or we are in cooldown, use local engine
    if (engineMode === 'browser' || quotaCountdown > 0) {
      triggerLocalSynthesis(
        textFinal,
        chosenVoice,
        finalIsChild,
        finalChildType,
        dialectTitle,
        quotaCountdown > 0
          ? `⚡ تم تشغيل الصوت عبر محرك المتصفح الفوري (متبقي ${quotaCountdown} ثانية لتجدد الحصة السحابية)`
          : undefined
      );
      setIsGenerating(false);
      return;
    }

    const stylePrompt =
      selectedStyle.id === 'custom' && customStyle.trim()
        ? customStyle.trim()
        : selectedStyle.prompt;

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textFinal,
          voice: chosenVoice,
          style: stylePrompt,
          dialectId: finalDialectId,
          isChildVoice: finalIsChild,
          childType: finalChildType,
        }),
      });

      const data = await response.json();

      // If Rate Limit / 429 Quota Exhaustion occurred on free tier
      if (response.status === 429 || data.quotaExceeded) {
        const retrySec = data.retryAfterSeconds || 35;
        setQuotaCountdown(retrySec);

        // Seamlessly fallback to browser engine so the user is never blocked!
        triggerLocalSynthesis(
          textFinal,
          chosenVoice,
          finalIsChild,
          finalChildType,
          dialectTitle,
          `⚠️ تم تجاوز الحصة السحابية المجانية لـ Gemini مؤقتاً — تم تشغيل الصوت عبر محرك المتصفح الفوري بنجاح! (يمكنك إعادة المحاولة السحابية بعد ${retrySec} ثانية)`
        );
        return;
      }

      if (!response.ok || !data.success || !data.audioBase64) {
        throw new Error(data.error || 'فشل توليد الصوت بالذكاء الاصطناعي.');
      }

      // Convert base64 to Blob URL for clean browser playback
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const mime = data.mimeType || 'audio/wav';
      const blob = new Blob([bytes], { type: mime });
      const audioUrl = URL.createObjectURL(blob);

      const newItem: GeneratedAudioItem = {
        id: `aud_${Date.now()}`,
        text: textFinal,
        voice: chosenVoice,
        voiceName: finalIsChild
          ? childNameMap[finalChildType]
          : VOICES.find((v) => v.id === chosenVoice)?.name || chosenVoice,
        styleName: finalIsChild
          ? `صوت طفل (${childNameMap[finalChildType]})`
          : dialectTitle
          ? `لهجة ${dialectTitle}`
          : selectedStyle.name,
        timestamp: Date.now(),
        duration: estimatedSeconds,
        audioUrl,
        audioBase64: data.audioBase64,
        mimeType: mime,
        dialectName: dialectTitle,
        isChildVoice: finalIsChild,
        childTypeName: finalIsChild ? childNameMap[finalChildType] : undefined,
        isBrowserSynthesis: false,
      };

      audioCacheRef.current.set(cacheKey, newItem);
      setCurrentAudio(newItem);
      saveToHistory(newItem);

      setSuccessToast(
        finalIsChild
          ? `تم توليد صوت الأطفال بنجاح (${childNameMap[finalChildType]}) بدقة 24kHz!`
          : dialectTitle
          ? `تم توليد الصوت باللهجة ${dialectTitle} بدقة استوديو 24kHz!`
          : 'تم توليد الصوت بنجاح بدقة استوديو 24kHz!'
      );
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      console.error('TTS error:', err);
      // Fallback on error to ensure app ALWAYS works
      triggerLocalSynthesis(
        textFinal,
        chosenVoice,
        finalIsChild,
        finalChildType,
        dialectTitle,
        '⚡ تم التحويل تلقائياً لمحرك المتصفح الفوري لتشغيل الصوت دون انقطاع.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate multi-speaker and multi-language merged dialogue
  const handleGenerateDialogue = async (lines: DialogueLine[], silenceMs = 400) => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/tts/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, silenceMs }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.audioBase64) {
        throw new Error(data.error || 'فشل توليد الحوار الصوتي المدمج.');
      }

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const mime = data.mimeType || 'audio/wav';
      const blob = new Blob([bytes], { type: mime });
      const audioUrl = URL.createObjectURL(blob);

      const combinedText = lines
        .map((l) => `${l.speakerLabel}: ${l.text}`)
        .join('\n');

      const newItem: GeneratedAudioItem = {
        id: `dialogue_${Date.now()}`,
        text: combinedText,
        voice: 'Kore',
        voiceName: 'حوار متعدد الأصوات',
        styleName: `مشهد حواري كامل (${data.linesCount || lines.length} سطراً)`,
        timestamp: Date.now(),
        duration: Math.max(4, lines.length * 3),
        audioUrl,
        audioBase64: data.audioBase64,
        mimeType: mime,
        isDialogue: true,
        dialogueCount: data.linesCount || lines.length,
      };

      setCurrentAudio(newItem);
      saveToHistory(newItem);

      setSuccessToast(
        `تم دمج وتوليد الحوار الصوتي بالكامل (${data.linesCount || lines.length} سطراً من البداية حتى النهاية) بنجاح بدقة 24kHz!`
      );
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Dialogue cloud error, falling back to browser synthesis:', err);
      // Fallback: speak dialogue naturally using browser speech synthesis with zero humming or buzz
      speakDialogueWithBrowser(lines);

      const estimatedDuration = Math.max(5, lines.length * 3.5);
      const { url } = generateSynthesizedWavBlob(estimatedDuration, false);
      const combinedText = lines
        .map((l) => `${l.speakerLabel}: ${l.text}`)
        .join('\n');

      const fallbackItem: GeneratedAudioItem = {
        id: `dialogue_${Date.now()}`,
        text: combinedText,
        voice: 'Kore',
        voiceName: 'حوار صوتي (المتصفح الفوري)',
        styleName: `مشهد حواري كامل (${lines.length} سطراً)`,
        timestamp: Date.now(),
        duration: estimatedDuration,
        audioUrl: url,
        mimeType: 'audio/wav',
        isDialogue: true,
        dialogueCount: lines.length,
        isBrowserSynthesis: true,
      };

      setCurrentAudio(fallbackItem);
      saveToHistory(fallbackItem);

      setSuccessToast(
        `⚡ تم تشغيل الحوار كاملاً (${lines.length} سطراً) بصوت طبيعي عبر محرك المتصفح الفوري دون أي قيود!`
      );
      setTimeout(() => setSuccessToast(null), 4500);
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert current text into the selected Algerian dialect
  const handleConvertCurrentText = async (dialectId: AlgerianRegion) => {
    if (!inputText.trim()) {
      setErrorMsg('يرجى كتابة نص أولاً ليتم تحويله إلى اللهجة الجزائرية.');
      return;
    }

    setIsConvertingDialect(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/algerian/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          dialectId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر تحويل النص إلى اللهجة الجزائرية.');
      }

      if (data.convertedText) {
        setInputText(data.convertedText);
        const dialectObj = ALGERIAN_DIALECTS.find((d) => d.id === dialectId);
        setSuccessToast(
          `تم تحويل وتكييف النص بنجاح إلى ${dialectObj?.arabicName || 'اللهجة الجزائرية'}!`
        );
        setTimeout(() => setSuccessToast(null), 3500);
      }
    } catch (err: any) {
      console.error('Dialect conversion error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تكييف النص إلى اللهجة الجزائرية.');
    } finally {
      setIsConvertingDialect(false);
    }
  };

  // Select voice with adult / child awareness
  const handleSelectVoice = (
    voice: GeminiVoice,
    childFlag?: boolean,
    childType?: ChildVoiceType
  ) => {
    setSelectedVoice(voice);
    if (childFlag !== undefined) {
      setIsChildVoice(childFlag);
      if (childType) setSelectedChildType(childType);
    }
  };

  // Select an Algerian Dialect
  const handleSelectDialect = (dialect: AlgerianDialect) => {
    setSelectedDialectId(dialect.id);
    if (!isChildVoice) {
      setSelectedVoice(dialect.suggestedVoice);
    }
  };

  // Apply sample phrase from Algerian hub
  const handleApplyAlgerianPhrase = (text: string, voice: GeminiVoice) => {
    setInputText(text);
    setSelectedVoice(voice);
    handleGenerateAudio(text, voice);
  };

  // Auto-diacritize using Gemini
  const handleAutoTashkeel = async () => {
    if (!inputText.trim()) return;

    setIsTashkeelLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/tashkeel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر تشكيل النص تلقائياً.');
      }

      if (data.diacritizedText) {
        setInputText(data.diacritizedText);
        setSuccessToast('تم تشكيل النص بدقة لغوية ونحوية تامة!');
        setTimeout(() => setSuccessToast(null), 3000);
      }
    } catch (err: any) {
      console.error('Tashkeel error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تشكيل النص.');
    } finally {
      setIsTashkeelLoading(false);
    }
  };

  // Remove diacritics
  const handleRemoveTashkeel = () => {
    const stripped = inputText.replace(/[\u064B-\u065F\u0670]/g, '');
    setInputText(stripped);
  };

  // Insert pause symbol
  const handleInsertPause = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = inputText;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + ' ... ' + after;
      setInputText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 5, start + 5);
      }, 50);
    } else {
      setInputText((prev) => prev + ' ... ');
    }
  };

  // Load a pre-configured sample
  const handleSelectSample = (sample: SampleText) => {
    setInputText(sample.text);
    setSelectedVoice(sample.suggestedVoice);

    if (sample.isChildVoice) {
      setIsChildVoice(true);
      if (sample.childType) setSelectedChildType(sample.childType);
      setActiveTab('kids');
    } else if (sample.category === 'algerian' || sample.dialectId) {
      setIsChildVoice(false);
      setActiveTab('algerian');
      if (sample.dialectId) setSelectedDialectId(sample.dialectId as AlgerianRegion);
    } else {
      setIsChildVoice(false);
    }

    const styleObj = SPEECH_STYLES.find((s) => s.id === sample.suggestedStyle);
    if (styleObj) setSelectedStyle(styleObj);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        onOpenExplanation={() => setIsExplanationOpen(true)}
        audioCount={history.length}
      />

      {/* Main Studio Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Live Quota Alert & Engine Switcher Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">محرك النطق النشط:</span>
                <span className="text-xs text-amber-300 font-semibold">
                  {engineMode === 'browser'
                    ? '⚡ محرك المتصفح الفوري (غير محدود)'
                    : quotaCountdown > 0
                    ? `🔄 مؤقت: محرك المتصفح الفوري (انتظار السحابة)`
                    : '☁️ محرك Gemini TTS السحابي (24kHz)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                يعمل التطبيق بسلاسة تامة حتى عند تجاوز الحصة السحابية المجانية لـ Google
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {quotaCountdown > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>إعادة تفعيل السحابة: {quotaCountdown} ثانية</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setEngineMode(engineMode === 'auto' ? 'browser' : 'auto')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                engineMode === 'browser'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {engineMode === 'browser' ? 'التبديل للسحابي ☁️' : 'تفعيل النطق الفوري (بدون حدود) ⚡'}
            </button>
          </div>
        </div>

        {/* Direct Answer Hero Banner */}
        <section className="relative rounded-3xl overflow-hidden border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-slate-900 to-emerald-950/30 p-5 sm:p-7 shadow-xl shadow-black/40">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-bold">
                <Baby className="w-3.5 h-3.5 text-yellow-300" />
                <span>جديد: أصوات أطفال بالعربية الفصحى وباللهجة الجزائرية 🧒👧</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
                حوّل أي نص إلى صوت أطفال بريء أو صوت كبار فصيح وجزائري بدقة 24kHz
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                استمتع بنبرات طفولية عالية التردد ومبهجة (أنيس وسارة بالفصحى، وإياد ومريم بالدارجة
                الجزائرية)، إلى جانب 8 لهجات جزائرية وأصوات كبار إذاعية برنين استوديو نقي مع حماية من نفاد الحصة.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setActiveTab('dialogue');
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
              >
                <Users className="w-4 h-4 fill-current" />
                <span>🎭 حوار رجل وامرأة (خانة واحدة)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('kids');
                  handleSelectSample(SAMPLES[0]);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-pink-500/20 active:scale-95 transition-all"
              >
                <Baby className="w-4 h-4 fill-current" />
                <span>صوت طفل (أنيس)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('kids');
                  handleSelectSample(SAMPLES[2]);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
              >
                <span>🇩🇿 طفل جزائري (إياد)</span>
              </button>
            </div>
          </div>
        </section>

        {/* Studio Mode Selector (Tabs) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('dialogue');
                setIsChildVoice(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all border ${
                activeTab === 'dialogue'
                  ? 'bg-gradient-to-r from-indigo-500/25 to-purple-500/25 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>حوار رجل وامرأة (خانة موحّدة) 🎭</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-mono">
                مباشر
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('kids');
                setIsChildVoice(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all border ${
                activeTab === 'kids'
                  ? 'bg-gradient-to-r from-pink-500/20 to-amber-500/20 text-pink-300 border-pink-500/50 shadow-md shadow-pink-500/10'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Baby className="w-4 h-4 text-pink-400" />
              <span>أصوات الأطفال 🧒👧</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-200 font-mono">
                فصحى + جزائرية
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('algerian');
                setIsChildVoice(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all border ${
                activeTab === 'algerian'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>🇩🇿 جميع اللهجات الجزائرية</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-mono">
                8 لهجات
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('standard');
                setIsChildVoice(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all border ${
                activeTab === 'standard'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Globe2 className="w-4 h-4 text-amber-400" />
              <span>العربية الفصحى للكبار</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              {engineMode === 'browser'
                ? 'النطق الفوري للمتصفح نشط'
                : isChildVoice
                ? 'نبرة طفولية نشطة'
                : 'محرّك النطق الصوتي الفوري نشط'}
            </span>
          </div>
        </div>

        {/* Success & Error alerts */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs font-bold text-rose-400 hover:text-white px-2 py-1 rounded-lg hover:bg-rose-500/20"
            >
              إغلاق
            </button>
          </div>
        )}

        {successToast && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Kids Highlight Banner when in Kids Tab */}
        {activeTab === 'kids' && (
          <div className="rounded-2xl p-4 bg-gradient-to-r from-pink-950/40 via-slate-900 to-amber-950/30 border border-pink-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-xl">
                  🧒
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>استوديو أصوات الأطفال (فصحى وجزائرية)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                      4 شخصيات صغار
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300">
                    أصوات أطفال طبيعية مرحة ومتحمسة بدقة 24kHz لتسجيل القصص التعليمية والرسوم المتحركة.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectSample(SAMPLES[0])}
                  className="px-3 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 text-xs font-semibold"
                >
                  قصة الأرنب (أنيس)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample(SAMPLES[2])}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold"
                >
                  يوميات مدرسة (إياد 🇩🇿)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Algerian Dialect Hub when in Algerian mode */}
        {activeTab === 'algerian' && (
          <AlgerianDialectHub
            selectedDialectId={selectedDialectId}
            onSelectDialect={handleSelectDialect}
            onApplySamplePhrase={handleApplyAlgerianPhrase}
            onConvertCurrentText={handleConvertCurrentText}
            isConverting={isConvertingDialect}
            currentTextLength={inputText.trim().length}
          />
        )}

        {/* Dialogue Studio Mode */}
        {activeTab === 'dialogue' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <DialogueStudio
                onGenerateDialogue={handleGenerateDialogue}
                isGenerating={isGenerating}
              />
            </div>

            <div className="lg:col-span-5 space-y-6">
              {/* Real-time Audio Visualizer and Player */}
              <AudioVisualizer currentAudio={currentAudio} />

              {/* Dialogue Guide Card */}
              <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>كيف تدمج لغتين أو نبرتين مع بعض؟</span>
                </h3>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <strong className="text-white block mb-1">1. تعيين المتحدثين (رجل وامرأة):</strong>
                    اختر لكل رد هويته الصوتية (رجل 👨 Fenrir / Charon، أو امرأة 👩 Kore / Zephyr، أو طفل 🧒 Puck).
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <strong className="text-white block mb-1">2. لغة أو لهجة مستقلة لكل متحدث:</strong>
                    يمكن للرجل أن يتحدث بالعربية الفصحى أو الإنجليزية، بينما ترد المرأة بالفرنسية أو بالدارجة الجزائرية، فيقوم النظام بضبط مخارج الحروف تلقائياً لكل سطر.
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <strong className="text-white block mb-1">3. الوقفات والدمج الصوتي النقي:</strong>
                    يتم توليد كل مقطع ودمجها بملف WAV موحد بدقة 24kHz مع وقفة تنفس وتفاعل بين كل متحدث وآخر.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Single Speaker Workstation Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Editor & Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
            {/* Text Editor Box */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="script-input"
                  className="text-sm font-bold text-white flex items-center gap-2"
                >
                  {isChildVoice ? (
                    <Baby className="w-4 h-4 text-pink-400" />
                  ) : (
                    <AudioWaveform className="w-4 h-4 text-amber-400" />
                  )}
                  <span>
                    {isChildVoice
                      ? `نص قصة أو كلام الأطفال (${
                          selectedChildType === 'boy'
                            ? 'أنيس الفصيح'
                            : selectedChildType === 'girl'
                            ? 'سارة الفصيحة'
                            : selectedChildType === 'algerian-boy'
                            ? 'إياد الجزائري 🇩🇿'
                            : 'مريم الجزائرية 🇩🇿'
                        }):`
                      : activeTab === 'algerian'
                      ? `النص الجزائري (${currentDialect?.name || 'العامّية'}):`
                      : 'النص المراد تحويله إلى صوت:'}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                  <span
                    className={`font-semibold ${
                      inputText.length >= 4800
                        ? 'text-rose-400 font-bold'
                        : inputText.length >= 4000
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {inputText.length} / {MAX_CHAR_LIMIT} حرف
                  </span>
                  <span>•</span>
                  <span>{wordCount} كلمة</span>
                  <span>•</span>
                  <span className="text-amber-400">~{estimatedSeconds} ثانية</span>
                  <button
                    type="button"
                    onClick={() => setIsExpandedTextarea(!isExpandedTextarea)}
                    className="mr-auto text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors flex items-center gap-1"
                    title={isExpandedTextarea ? 'تصغير مساحة الكتابة' : 'تكبير مساحة الكتابة لنصوص ومقالات أطول'}
                  >
                    <span>{isExpandedTextarea ? '↕️ تصغير' : '↕️ تكبير المساحة'}</span>
                  </button>
                </div>
              </div>

              {/* Textarea & Capacity Progress */}
              <div className="relative space-y-1.5">
                <textarea
                  id="script-input"
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  maxLength={MAX_CHAR_LIMIT}
                  rows={isExpandedTextarea ? 14 : 6}
                  placeholder={
                    isChildVoice
                      ? 'اكتب هنا قصة أطفال، نشيداً، حواراً كرتونياً، أو مغامرة طريفة باللغة العربية الفصحى أو بالدارجة الجزائرية (حتى 5000 حرف)...'
                      : activeTab === 'algerian'
                      ? 'اكتب هنا أي كلام بالدارجة الجزائرية، أو اكتب فكرة واضغط "حوّل النص إلى اللهجة المختارة" أعلاه (حتى 5000 حرف)...'
                      : 'اكتب هنا النص العربي أو الصق أي مقال، قصة، أو تقرير تريد سماعه بصوت فائق النقاء (حتى 5000 حرف)...'
                  }
                  className={`w-full bg-slate-950/80 rounded-2xl border p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all text-sm sm:text-base leading-relaxed resize-y font-normal ${
                    isExpandedTextarea ? 'min-h-[300px]' : 'min-h-[160px]'
                  } ${
                    isChildVoice
                      ? 'border-pink-500/30 focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/60'
                      : 'border-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/60'
                  }`}
                />

                {/* Live Character Limit Bar */}
                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                  <div className="flex-1 bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        inputText.length >= 4800
                          ? 'bg-rose-500'
                          : inputText.length >= 4000
                          ? 'bg-amber-500'
                          : isChildVoice
                          ? 'bg-pink-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (inputText.length / MAX_CHAR_LIMIT) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono shrink-0">
                    {Math.round((inputText.length / MAX_CHAR_LIMIT) * 100)}% من السعة
                  </span>
                </div>
              </div>

              {/* Tashkeel & Diacritics toolbar */}
              <TashkeelHelper
                onAutoTashkeel={handleAutoTashkeel}
                onRemoveTashkeel={handleRemoveTashkeel}
                onInsertPause={handleInsertPause}
                onCopyText={() => navigator.clipboard.writeText(inputText)}
                onClearText={() => setInputText('')}
                onPasteText={handlePasteClipboard}
                isTashkeelLoading={isTashkeelLoading}
                textLength={inputText.length}
              />
            </div>

            {/* Voice Character Selection */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl">
              <VoiceSelector
                selectedVoice={selectedVoice}
                isChildVoice={isChildVoice}
                selectedChildType={selectedChildType}
                onSelectVoice={handleSelectVoice}
              />
            </div>

            {/* Speech Style & Emotional Prompting */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl">
              <StyleSelector
                selectedStyleId={selectedStyle.id}
                customStyle={customStyle}
                onSelectStyle={(s) => setSelectedStyle(s)}
                onCustomStyleChange={(val) => setCustomStyle(val)}
              />
            </div>

            {/* Generate Action Button */}
            <div>
              <button
                type="button"
                onClick={() => handleGenerateAudio()}
                disabled={isGenerating || !inputText.trim()}
                className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden ${
                  isChildVoice
                    ? 'bg-gradient-to-r from-pink-500 via-amber-400 to-pink-500 hover:from-pink-400 hover:via-amber-300 hover:to-pink-400 text-slate-950 shadow-pink-500/25'
                    : activeTab === 'algerian'
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-400 hover:via-teal-400 hover:to-emerald-400 text-slate-950 shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 text-slate-950 shadow-amber-500/25'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-6 bg-slate-950 rounded-full animate-sound-wave-1"></span>
                      <span className="w-2 h-8 bg-slate-950 rounded-full animate-sound-wave-2"></span>
                      <span className="w-2 h-5 bg-slate-950 rounded-full animate-sound-wave-3"></span>
                      <span className="w-2 h-7 bg-slate-950 rounded-full animate-sound-wave-4"></span>
                    </div>
                    <span>
                      {isChildVoice
                        ? `جارٍ توليد صوت الأطفال (${
                            selectedChildType === 'boy'
                              ? 'أنيس'
                              : selectedChildType === 'girl'
                              ? 'سارة'
                              : selectedChildType === 'algerian-boy'
                              ? 'إياد 🇩🇿'
                              : 'مريم 🇩🇿'
                          })...`
                        : activeTab === 'algerian'
                        ? `جارٍ توليد الصوت بلهجة ${currentDialect?.name || 'الجزائر'}...`
                        : 'جارٍ معالجة وتوليد الصوت فائق الدقة...'}
                    </span>
                  </>
                ) : (
                  <>
                    {isChildVoice ? (
                      <Baby className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    ) : (
                      <Volume2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    )}
                    <span>
                      {isChildVoice
                        ? `توليد صوت الأطفال (${
                            selectedChildType === 'boy'
                              ? 'أنيس الفصيح'
                              : selectedChildType === 'girl'
                              ? 'سارة الفصيحة'
                              : selectedChildType === 'algerian-boy'
                              ? 'إياد الجزائري 🇩🇿'
                              : 'مريم الجزائرية 🇩🇿'
                          }) الآن`
                        : activeTab === 'algerian'
                        ? `توليد الصوت بلهجة ${currentDialect?.name || 'الجزائر'} الآن`
                        : 'توليد الصوت فائق الدقة الآن'}
                    </span>
                    <Sparkles className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 mt-2">
                <span>⚡ مدعوم بالحماية التلقائية من قيود الحصة والتحويل الفوري للنطق</span>
              </div>
            </div>
          </div>

          {/* Right Column: Audio Player & Technical Guide (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Real-time Audio Visualizer and Player */}
            <AudioVisualizer currentAudio={currentAudio} />

            {/* Quality Comparison card */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-pink-400" />
                <span>خصائص أصوات الأطفال بالذكاء الاصطناعي:</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white block mb-0.5">تردد طفولي مرتفع ونقي:</strong>
                    محاكاة الحبال الصوتية الصغيرة للأطفال مع نبرة بريئة ومتحمسة خالية من الغلظة.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white block mb-0.5">أطفال الفصحى وأطفال الدارجة:</strong>
                    إمكانية الاختيار بين أطفال يتحدثون الفصحى المشكولة (قصص ورسوم متحركة) أو أطفال يتحدثون بالعامية الجزائرية العفوية.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white block mb-0.5">استمرارية العمل بلا انقطاع:</strong>
                    في حال بلوغ الحصة المجانية السحابية، يتحول التطبيق لمحرك المتصفح الفوري فوراً.
                  </div>
                </div>
              </div>
            </div>

            {/* Quick spec pills */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                <span className="text-lg font-black text-pink-400 font-mono">4 شخصيات</span>
                <p className="text-[10px] text-slate-400">أطفال فصحى وجزائريون (بنين وبنات)</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                <span className="text-lg font-black text-emerald-400 font-mono">Dual-Engine</span>
                <p className="text-[10px] text-slate-400">محرك سحابي 24kHz ومحرك محلي فوري</p>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Audio Generation History */}
        <AudioHistory
          items={history}
          activeId={currentAudio?.id || null}
          onSelectItem={(item) => setCurrentAudio(item)}
          onDeleteItem={(id) => {
            setHistory((prev) => {
              const updated = prev.filter((i) => i.id !== id);
              try {
                localStorage.setItem('sawti_tts_history', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
            if (currentAudio?.id === id) setCurrentAudio(null);
          }}
          onClearAll={() => {
            setHistory([]);
            try {
              localStorage.removeItem('sawti_tts_history');
            } catch (e) {}
          }}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} صَــوْتِي 🇩🇿 - استوديو تحويل النصوص إلى أصوات بشرية فائقة الدقة (أطفال وكبار • فصحى وجميع اللهجات الجزائرية)
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>مدعوم بنماذج Gemini 3.8 التوليدية + المحرك الفوري</span>
            <span>•</span>
            <button
              onClick={() => setIsExplanationOpen(true)}
              className="text-pink-400 hover:underline"
            >
              دليل جودة النطق الصوتي
            </button>
          </div>
        </div>
      </footer>

      {/* Explanation Modal */}
      <ExplanationModal
        isOpen={isExplanationOpen}
        onClose={() => setIsExplanationOpen(false)}
        onTrySample={() => {
          setActiveTab('kids');
          handleSelectSample(SAMPLES[0]);
        }}
      />
    </div>
  );
}
