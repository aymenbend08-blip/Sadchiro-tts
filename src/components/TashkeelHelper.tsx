import React from 'react';
import { Wand2, Eraser, Pause, Copy, Check, Clipboard, Trash2 } from 'lucide-react';

interface TashkeelHelperProps {
  onAutoTashkeel: () => void;
  onRemoveTashkeel: () => void;
  onInsertPause: () => void;
  onCopyText: () => void;
  onClearText: () => void;
  onPasteText?: () => void;
  isTashkeelLoading: boolean;
  textLength: number;
}

export const TashkeelHelper: React.FC<TashkeelHelperProps> = ({
  onAutoTashkeel,
  onRemoveTashkeel,
  onInsertPause,
  onCopyText,
  onClearText,
  onPasteText,
  isTashkeelLoading,
  textLength,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    onCopyText();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onAutoTashkeel}
          disabled={isTashkeelLoading || textLength === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          title="تشكيل النص تلقائياً لضبط مخارج الحركات بدقة متناهية"
        >
          <Wand2 className={`w-3.5 h-3.5 ${isTashkeelLoading ? 'animate-spin' : ''}`} />
          <span>{isTashkeelLoading ? 'جارٍ ضبط التشكيل...' : 'تشكيل آلي فصيح (AI)'}</span>
        </button>

        <button
          type="button"
          onClick={onInsertPause}
          disabled={textLength === 0 || textLength >= 4990}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs transition-colors disabled:opacity-40"
          title="إضافة وقفة تنفس طبيعية لإعطاء المتحدث فرصة للتأمل"
        >
          <Pause className="w-3.5 h-3.5 text-indigo-400" />
          <span>وقفة تنفس (...)</span>
        </button>

        <button
          type="button"
          onClick={onRemoveTashkeel}
          disabled={textLength === 0}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs transition-colors disabled:opacity-40"
          title="إزالة جميع الحركات من النص"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>إزالة التشكيل</span>
        </button>
      </div>

      {/* Secondary utility actions */}
      <div className="flex items-center gap-2">
        {onPasteText && (
          <button
            type="button"
            onClick={onPasteText}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
            title="لصق نص من الحافظة حتى 5000 حرف"
          >
            <Clipboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>لصق نص</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          disabled={textLength === 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors disabled:opacity-40"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
        </button>

        <button
          type="button"
          onClick={onClearText}
          disabled={textLength === 0}
          className="flex items-center gap-1 text-xs text-rose-400/80 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-40"
          title="مسح محتوى المربع"
        >
          <Trash2 className="w-3 h-3" />
          <span>مسح</span>
        </button>
      </div>
    </div>
  );
};
