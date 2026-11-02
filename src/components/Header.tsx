import React from 'react';
import { Volume2, Sparkles, HelpCircle, AudioWaveform, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenExplanation: () => void;
  audioCount: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExplanation, audioCount }) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 shadow-2xl shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-amber-500/20 group">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center transition-transform duration-300 group-hover:scale-95">
                <AudioWaveform className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>صَــوْتِي</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    استوديو الدقة الفائقة
                  </span>
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">
                تحويل النص المكتوب إلى نطق بشري عالي النقاء بدقة 24kHz وتشكيل لغوي سليم
              </p>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>جودة استوديو 24kHz</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <button
              onClick={onOpenExplanation}
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow-amber-500/10 active:scale-95"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>هل يمكن التحويل بدقة عالية؟</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
