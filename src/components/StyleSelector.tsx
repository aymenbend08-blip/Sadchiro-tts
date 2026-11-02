import React from 'react';
import { SPEECH_STYLES } from '../data/samples';
import { SpeechStyle } from '../types';
import { Film, Radio, Mic, BookOpen, Sparkles, Feather, Sliders } from 'lucide-react';

interface StyleSelectorProps {
  selectedStyleId: string;
  customStyle: string;
  onSelectStyle: (style: SpeechStyle) => void;
  onCustomStyleChange: (val: string) => void;
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Film':
      return <Film className="w-4 h-4" />;
    case 'Radio':
      return <Radio className="w-4 h-4" />;
    case 'Mic':
      return <Mic className="w-4 h-4" />;
    case 'BookOpen':
      return <BookOpen className="w-4 h-4" />;
    case 'Sparkles':
      return <Sparkles className="w-4 h-4" />;
    case 'Feather':
      return <Feather className="w-4 h-4" />;
    default:
      return <Sliders className="w-4 h-4" />;
  }
};

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyleId,
  customStyle,
  onSelectStyle,
  onCustomStyleChange,
}) => {
  const isCustom = selectedStyleId === 'custom';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>الأسلوب والنبرة الإلقائية:</span>
        </label>
        <span className="text-xs text-slate-400">توجيه مشاعر وسرعة النطق</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {SPEECH_STYLES.map((style) => {
          const isSelected = selectedStyleId === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelectStyle(style)}
              className={`p-2.5 rounded-xl text-right transition-all flex flex-col items-start gap-1.5 border text-xs ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 font-bold shadow-sm shadow-amber-500/10'
                  : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg ${
                  isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {getIcon(style.icon)}
              </div>
              <span className="font-semibold truncate w-full">{style.name}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Style Input toggle */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1.5">
          <button
            type="button"
            onClick={() => {
              if (!isCustom) {
                const dummy: SpeechStyle = {
                  id: 'custom',
                  name: 'نبرة مخصصة',
                  prompt: customStyle || 'Expressive, clear and authentic Arabic speaker',
                  icon: 'Sliders',
                  description: 'تخصيص حر لتوجيه النطق',
                };
                onSelectStyle(dummy);
              }
            }}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors border ${
              isCustom
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            + تخصيص نبرة معينة كتابياً
          </button>
        </div>

        {isCustom && (
          <input
            type="text"
            value={customStyle}
            onChange={(e) => onCustomStyleChange(e.target.value)}
            placeholder="مثال: صوت إذاعي هادئ مع وقفات تأملية عميقة، أو إلقاء حماسي..."
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        )}
      </div>
    </div>
  );
};
