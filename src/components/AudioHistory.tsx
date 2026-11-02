import React from 'react';
import { GeneratedAudioItem } from '../types';
import { Play, Download, Trash2, Clock, Volume2, Sparkles } from 'lucide-react';

interface AudioHistoryProps {
  items: GeneratedAudioItem[];
  activeId: string | null;
  onSelectItem: (item: GeneratedAudioItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const AudioHistory: React.FC<AudioHistoryProps> = ({
  items,
  activeId,
  onSelectItem,
  onDeleteItem,
  onClearAll,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3 pt-6 border-t border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>سجل التسجيلات الصوتية السابقة ({items.length})</span>
        </h3>

        <button
          onClick={onClearAll}
          className="text-xs text-rose-400/70 hover:text-rose-400 transition-colors"
        >
          مسح السجل
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          const isActive = activeId === item.id;
          const timeStr = new Date(item.timestamp).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all text-right flex flex-col justify-between ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                      item.isChildVoice
                        ? 'bg-pink-500/10 text-pink-300 border-pink-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    }`}
                  >
                    {item.isChildVoice && <span>🧒</span>}
                    <span>{item.childTypeName || item.voice}</span>
                    <span>•</span>
                    <span className="truncate max-w-[120px]">{item.styleName || 'طبيعي'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                  "{item.text}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => onSelectItem(item)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isActive ? 'مشغّل الآن' : 'استماع'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <a
                    href={item.audioUrl}
                    download={`sawti_${item.voice}_${item.id}.wav`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="تنزيل الملف الصوتي"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="حذف من السجل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
