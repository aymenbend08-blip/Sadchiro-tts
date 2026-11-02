import React, { useState } from 'react';
import { SAMPLES } from '../data/samples';
import { SampleText } from '../types';
import { BookOpen, Sparkles, PlayCircle, Baby } from 'lucide-react';

interface SamplePickerProps {
  onSelectSample: (sample: SampleText) => void;
}

export const SamplePicker: React.FC<SamplePickerProps> = ({ onSelectSample }) => {
  const [filter, setFilter] = useState<'all' | 'kids' | 'algerian' | 'general'>('all');

  const filteredSamples = SAMPLES.filter((s) => {
    if (filter === 'kids') return s.isChildVoice || s.category === 'kids';
    if (filter === 'algerian') return s.category === 'algerian' || !!s.dialectId;
    if (filter === 'general') return !s.isChildVoice && s.category !== 'algerian';
    return true;
  });

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>نماذج جاهزة للاستماع الفوري وتجربة النقاء:</span>
        </span>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الكل ({SAMPLES.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('kids')}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
              filter === 'kids'
                ? 'bg-pink-500 text-white font-bold'
                : 'text-pink-400 hover:text-pink-200'
            }`}
          >
            <Baby className="w-3 h-3" />
            <span>قصص وأطفال 🧒👧</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('algerian')}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              filter === 'algerian'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-emerald-400 hover:text-emerald-200'
            }`}
          >
            جزائرية 🇩🇿
          </button>
          <button
            type="button"
            onClick={() => setFilter('general')}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              filter === 'general'
                ? 'bg-indigo-500 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            وثائقي وأدبي
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
        {filteredSamples.map((sample) => (
          <button
            key={sample.id}
            type="button"
            onClick={() => onSelectSample(sample)}
            className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all group ${
              sample.isChildVoice
                ? 'bg-slate-900/90 hover:bg-pink-500/10 border-pink-500/30 hover:border-pink-500/60 text-slate-200 hover:text-pink-200'
                : 'bg-slate-900/80 hover:bg-amber-500/10 border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-200'
            }`}
          >
            <PlayCircle
              className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${
                sample.isChildVoice ? 'text-pink-400' : 'text-amber-400'
              }`}
            />
            <span
              className={`font-semibold text-white ${
                sample.isChildVoice ? 'group-hover:text-pink-300' : 'group-hover:text-amber-300'
              }`}
            >
              {sample.title}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                sample.isChildVoice
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {sample.categoryName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
