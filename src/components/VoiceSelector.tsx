import React, { useState } from 'react';
import { GeminiVoice, VoiceOption, VoiceAudience, ChildVoiceType } from '../types';
import { VOICES, CHILD_VOICES } from '../data/samples';
import { User, Volume2, Sparkles, Check, Baby, Heart } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: GeminiVoice;
  isChildVoice: boolean;
  selectedChildType?: ChildVoiceType;
  onSelectVoice: (voice: GeminiVoice, isChild?: boolean, childType?: ChildVoiceType) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  isChildVoice,
  selectedChildType,
  onSelectVoice,
}) => {
  const [activeAudienceTab, setActiveAudienceTab] = useState<VoiceAudience>(
    isChildVoice ? 'child' : 'adult'
  );

  return (
    <div className="space-y-3.5">
      {/* Voice Category Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
        <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <User className="w-4 h-4 text-amber-400" />
          <span>اختر نبرة الصوت والشخصية:</span>
        </label>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveAudienceTab('adult');
              onSelectVoice(selectedVoice, false, undefined);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeAudienceTab === 'adult'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>أصوات الكبار (5)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveAudienceTab('child');
              // Default to first child voice (Anis) if switching
              const defaultChild = CHILD_VOICES[0];
              onSelectVoice(defaultChild.id, true, defaultChild.childType);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeAudienceTab === 'child'
                ? 'bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Baby className="w-3.5 h-3.5 text-yellow-300" />
            <span>أصوات الأطفال 🧒👧 (فصحى وجزائرية)</span>
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse"></span>
          </button>
        </div>
      </div>

      {/* Adult Voices Grid */}
      {activeAudienceTab === 'adult' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {VOICES.map((v) => {
            const isSelected = !isChildVoice && selectedVoice === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVoice(v.id, false, undefined)}
                className={`relative text-right p-3.5 rounded-2xl transition-all duration-200 border flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-900 border-amber-500/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${v.avatarColor} p-0.5 flex items-center justify-center shadow-sm shrink-0`}
                    >
                      <div className="w-full h-full bg-slate-950/80 rounded-[10px] flex items-center justify-center">
                        <Volume2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {v.name}
                      </h4>
                      <p className="text-[11px] text-amber-400/90 font-medium">
                        {v.gender === 'female' ? 'أنثوي' : 'ذكوري'} •{' '}
                        {v.id === 'Kore'
                          ? 'متزن'
                          : v.id === 'Fenrir'
                          ? 'إذاعي'
                          : v.id === 'Puck'
                          ? 'حيوي'
                          : v.id === 'Zephyr'
                          ? 'هادئ'
                          : 'أكاديمي'}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-snug mb-2">
                    {v.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 mt-auto">
                  <span className="text-[10px] text-slate-500 block truncate">
                    💡 {v.recommendedFor}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Children Voices Grid */}
      {activeAudienceTab === 'child' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-500/10 via-amber-500/10 to-emerald-500/10 border border-pink-500/20 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Baby className="w-4 h-4 text-pink-400" />
              <span>
                <strong>أصوات الأطفال الحصرية:</strong> نبرات طفولية بريئة ومبهجة، مناسبة لقصص الأطفال، الأناشيد، الحكايات اليومية، والرسوم المتحركة بالفصحى وبالدارجة الجزائرية.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CHILD_VOICES.map((cv) => {
              const isSelected =
                isChildVoice && selectedChildType === cv.childType;
              return (
                <button
                  key={cv.childType}
                  type="button"
                  onClick={() => onSelectVoice(cv.id, true, cv.childType)}
                  className={`relative text-right p-3.5 rounded-2xl transition-all duration-200 border flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-gradient-to-b from-pink-500/20 via-slate-900 to-slate-900 border-pink-500/70 shadow-lg shadow-pink-500/15 ring-1 ring-pink-500/40'
                      : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${cv.avatarColor} p-0.5 flex items-center justify-center shadow-sm shrink-0`}
                      >
                        <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center text-lg">
                          {cv.childType === 'boy'
                            ? '🧒'
                            : cv.childType === 'girl'
                            ? '👧'
                            : cv.childType === 'algerian-boy'
                            ? '👦'
                            : '🧕'}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                            {cv.name}
                          </h4>
                          {cv.childType?.includes('algerian') && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                              🇩🇿 جزائري
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-pink-400 font-medium">
                          {cv.gender === 'female' ? 'طفلة' : 'طفل'} •{' '}
                          {cv.childType?.includes('algerian') ? 'لهجة جزائرية' : 'عربية فصحى'}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-snug mb-2">
                      {cv.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 mt-auto">
                    <span className="text-[10px] text-slate-400 block truncate">
                      ✨ {cv.recommendedFor}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
