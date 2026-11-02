import React from 'react';
import { X, CheckCircle2, Sparkles, Cpu, Mic, BookOpen, Volume2, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrySample: () => void;
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({ isOpen, onClose, onTrySample }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-amber-500/10 overflow-hidden text-right"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="relative px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                هل يمكن تحويل نص مكتوب إلى صوت بدقة عالية؟
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                إجابة علمية وتقنية مفصلة مع استعراض قدرات الذكاء الاصطناعي التوليدي
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-200 text-sm leading-relaxed">
          {/* Quick Direct Answer Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-emerald-950/20 border border-emerald-500/30">
            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-base font-bold text-emerald-300 mb-1">
                  نعم، بكل تأكيد وبمستويات واقعية مذهلة تضاهي الاستوديوهات البشرية!
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm">
                  بفضل أحدث نماذج التوليد الصوتي العصبي (Neural Audio Synthesis) مثل نماذج <strong>Gemini TTS</strong>، أصبح من الممكن تحويل النصوص العربية والعالمية إلى موجات صوتية عالية الدقة (24kHz Mono 16-bit WAV) مع محاكاة دقيقة لمخارج الحروف، التلوين الصوتي، النبرات العاطفية، وحتى أنفاس المتحدث الطبيعية.
                </p>
              </div>
            </div>
          </div>

          {/* 3 Pillars of High Fidelity */}
          <div>
            <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              <span>ركائز الدقة العالية في تحويل النصوص إلى أصوات اليوم:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span>1. التشكيل والصوتيات</span>
                </div>
                <p className="text-xs text-slate-400">
                  اللغة العربية تعتمد على الحركات (فتحة، ضمة، كسرة، سكون، شدة). عند تشكيل النص بدقة، ينطق النموذج كل حرف بمخرجه الفصيح دون أي التباس في المعنى.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
                  <Volume2 className="w-4 h-4" />
                  <span>2. نقاء التردد 24kHz</span>
                </div>
                <p className="text-xs text-slate-400">
                  الأنظمة القديمة كانت تعمل بترددات منخفضة (8-16kHz) فتبدو معدنية كروبوت. النماذج الحالية تبني ترددات متكاملة تحاكي الرنين الحنجري وتفاصيل الصوت الدقيقة.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2 text-rose-400 font-bold mb-2">
                  <Mic className="w-4 h-4" />
                  <span>3. التوجيه بالأسلوب والنبرة</span>
                </div>
                <p className="text-xs text-slate-400">
                  يمكن توجيه الصوت ليكون إذاعياً وقوراً، أو سردياً دافئاً، أو حماسياً إعلانياً، أو شعرياً بليغاً مع مراعاة علامات الترقيم كوقفات تنفس واقعية.
                </p>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div>
            <h4 className="text-base font-bold text-white mb-3">
              مقارنة بين أنظمة الصوت القديمة واستوديو الذكاء الاصطناعي الحديث:
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">المعيار</th>
                    <th className="p-3 text-rose-400">الأنظمة القديمة (الروبوتية)</th>
                    <th className="p-3 text-emerald-400 font-bold">استوديو الذكاء الاصطناعي (صوتي)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  <tr className="bg-slate-900/40">
                    <td className="p-3 font-semibold text-slate-300">طبيعية الصوت</td>
                    <td className="p-3 text-slate-400">ميكانيكي، جاف، بدون مشاعر</td>
                    <td className="p-3 text-emerald-300 font-medium">بشري، حيوي، ذو نبرات وتنفس طبيعي</td>
                  </tr>
                  <tr className="bg-slate-900/20">
                    <td className="p-3 font-semibold text-slate-300">النطق العربي</td>
                    <td className="p-3 text-slate-400">كثير الأخطاء النحوية وتسكين أواخر الكلم</td>
                    <td className="p-3 text-emerald-300 font-medium">دقيق مع تشكيل آلي متطور بالذكاء الاصطناعي</td>
                  </tr>
                  <tr className="bg-slate-900/40">
                    <td className="p-3 font-semibold text-slate-300">المرونة والأسلوب</td>
                    <td className="p-3 text-slate-400">نبرة وحيدة غير قابلة للتعديل</td>
                    <td className="p-3 text-emerald-300 font-medium">شخصيات متعددة (وثائقي، إذاعي، شعري، بودكاست)</td>
                  </tr>
                  <tr className="bg-slate-900/20">
                    <td className="p-3 font-semibold text-slate-300">صيغة التصدير</td>
                    <td className="p-3 text-slate-400">جودة مضغوطة منخفضة</td>
                    <td className="p-3 text-emerald-300 font-medium">ملف صوتي WAV خام نقي للاستخدام المباشر</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Golden tips */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <h5 className="font-bold text-amber-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>نصائح ذهبية للحصول على أقصى دقة وجودة صوتية:</span>
            </h5>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
              <li>استخدم زر <strong>"التشكيل الآلي"</strong> لضبط الحركات على أواخر الكلمات والهمزات.</li>
              <li>ضع الفواصل (،) والنقاط (.) وعلامات التعجب والاستفهام في أماكنها، فهي توجه النموذج للتنفس والوقف السليم.</li>
              <li>اختر الصوت والنبرة المتناسبة مع طبيعة موضوعك (مثلاً Fenrir للوثائقيات و Kore للقصص).</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            إغلاق
          </button>

          <button
            onClick={() => {
              onClose();
              onTrySample();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <span>جرب نموذجاً وثائقياً الآن</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
