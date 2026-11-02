import React, { useState } from 'react';
import { ALGERIAN_DIALECTS } from '../data/algerianDialects';
import { AlgerianDialect, AlgerianRegion, GeminiVoice } from '../types';
import {
  Compass,
  Sparkles,
  Volume2,
  Wand2,
  BookOpen,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  Play,
} from 'lucide-react';

interface AlgerianDialectHubProps {
  selectedDialectId: AlgerianRegion;
  onSelectDialect: (dialect: AlgerianDialect) => void;
  onApplySamplePhrase: (text: string, voice: GeminiVoice) => void;
  onConvertCurrentText: (dialectId: AlgerianRegion) => void;
  isConverting: boolean;
  currentTextLength: number;
}

export const AlgerianDialectHub: React.FC<AlgerianDialectHubProps> = ({
  selectedDialectId,
  onSelectDialect,
  onApplySamplePhrase,
  onConvertCurrentText,
  isConverting,
  currentTextLength,
}) => {
  const [showVocab, setShowVocab] = useState(true);

  const currentDialect =
    ALGERIAN_DIALECTS.find((d) => d.id === selectedDialectId) || ALGERIAN_DIALECTS[0];

  return (
    <div className="rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-emerald-500/30 p-5 sm:p-6 shadow-2xl space-y-5">
      {/* Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-sm">
            🇩🇿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                جميع اللهجات الجزائرية الأصيلة
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                8 لهجات إقليمية
              </span>
            </div>
            <p className="text-xs text-slate-400">
              توجيه نطق واقعي، تكييف المصطلحات الشعبية، ومحاكاة مخارج الحروف لكل منطقة
            </p>
          </div>
        </div>

        {/* Dialect Converter Action */}
        <button
          type="button"
          onClick={() => onConvertCurrentText(currentDialect.id)}
          disabled={isConverting || currentTextLength === 0}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0"
          title="تحويل أي فكرة أو نص إلى هذه اللهجة الجزائرية المحددة"
        >
          <Wand2 className={`w-3.5 h-3.5 ${isConverting ? 'animate-spin' : ''}`} />
          <span>
            {isConverting
              ? 'جارٍ التحويل إلى اللهجة...'
              : `حوّل النص إلى ${currentDialect.name}`}
          </span>
        </button>
      </div>

      {/* Dialect Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {ALGERIAN_DIALECTS.map((dialect) => {
          const isSelected = dialect.id === selectedDialectId;
          return (
            <button
              key={dialect.id}
              type="button"
              onClick={() => onSelectDialect(dialect)}
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1 group relative ${
                isSelected
                  ? 'bg-gradient-to-b from-emerald-500/20 via-slate-900 to-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/40'
                  : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-bold shadow-md">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              <span className="text-base sm:text-lg block">
                {dialect.id === 'algiers'
                  ? '🏛️'
                  : dialect.id === 'oran'
                  ? '🌊'
                  : dialect.id === 'constantine'
                  ? '🌉'
                  : dialect.id === 'tlemcen'
                  ? '🏰'
                  : dialect.id === 'setif'
                  ? '🌾'
                  : dialect.id === 'sahara'
                  ? '🌴'
                  : dialect.id === 'jijel'
                  ? '⛰️'
                  : '⛵'}
              </span>

              <span
                className={`text-xs font-bold leading-tight block ${
                  isSelected ? 'text-emerald-300' : 'text-slate-300 group-hover:text-white'
                }`}
              >
                {dialect.name}
              </span>

              <span className="text-[9px] text-slate-500 line-clamp-1">
                {dialect.tag.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Dialect Deep Profile Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-4">
        {/* Region & Phonetic Rule */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">
                {currentDialect.arabicName}
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              <strong>المناطق:</strong> {currentDialect.region}
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span>قاعدة النطق: {currentDialect.phoneticRule.slice(0, 45)}...</span>
          </div>
        </div>

        {/* Characteristics bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
          {currentDialect.characteristics.map((charac, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>{charac}</span>
            </div>
          ))}
        </div>

        {/* Key Vocabulary Pills */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>أشهر مفردات {currentDialect.name}:</span>
            </span>
            <span className="text-[10px] text-slate-500">انقر على العبارة لتضمينها</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentDialect.keyVocabulary.map((vocab, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-center gap-1.5 shadow-sm hover:border-emerald-500/40 transition-colors"
              >
                <span className="font-bold text-emerald-300 font-mono">{vocab.word}</span>
                <span className="text-[10px] text-slate-500">({vocab.meaning})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pre-recorded Dialect Sample Texts */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <span className="text-xs font-semibold text-slate-300 block">
            🎙️ نماذج حية جاهزة للاستماع بهذه اللهجة:
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {currentDialect.samplePhrases.map((sample, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between gap-2 text-xs"
              >
                <div>
                  <h5 className="font-bold text-amber-300 mb-1">{sample.title}</h5>
                  <p className="text-slate-300 font-normal leading-relaxed line-clamp-3 text-[13px]">
                    "{sample.text}"
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    المعنى: {sample.meaning}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    الصوت المقترح: {currentDialect.suggestedVoice}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onApplySamplePhrase(sample.text, currentDialect.suggestedVoice)
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>تطبيق وتوليد</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
