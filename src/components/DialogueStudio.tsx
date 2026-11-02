import React, { useState, useEffect, useMemo } from 'react';
import { DialogueLine, DialoguePreset, GeminiVoice, AlgerianRegion } from '../types';
import { parseDialogueScript, ParsedScriptResult } from '../utils/dialogueParser';
import { speakDialogueWithBrowser } from '../utils/browserSpeech';
import {
  Users,
  Plus,
  Trash2,
  Sparkles,
  Play,
  Volume2,
  MessageSquare,
  Sliders,
  Baby,
  FileText,
  ListOrdered,
  RotateCcw,
  CheckCircle,
  Copy,
  Clipboard,
  HelpCircle,
} from 'lucide-react';

interface DialogueStudioProps {
  onGenerateDialogue: (lines: DialogueLine[], silenceMs: number) => void;
  isGenerating: boolean;
}

// Default sample provided directly by the user!
export const USER_SAMPLE_SCRIPT = `«أنا أمزح معك فقط!»

المرأة: هل تعرف ما أكثر شيء يزعجني في بعض الناس؟ أولئك الذين يعتقدون أن السخرية من الآخرين وإحراجهم أمام الناس دليل على خفة الظل والذكاء!

الرجل: ولماذا؟ ربما هم فقط يحبون المزاح وإضحاك من حولهم.

المرأة: المزاح شيء، وإهانة الآخرين شيء آخر. اليوم كنت في جلسة مع مجموعة من الناس، وكان هناك رجل كلما تحدث أحدهم سخر منه، مرة من شكله، ومرة من طريقة كلامه، ومرة من أمر شخصي يخصه.

الرجل: ربما لم يكن يقصد الإساءة، فهناك أشخاص اعتادوا هذا النوع من المزاح.

المرأة: المشكلة أنه عندما لاحظت انزعاج أحد الحاضرين، واجهته بما يفعل، فرد بكل بساطة: «ما بك؟ أنا أمزح معه فقط!».

الرجل: هذه العبارة أصبحت مبررًا جاهزًا لكل كلمة جارحة!

المرأة: لكن أخبرني، أي مزاح هذا الذي يضحك فيه الجميع، بينما يتمنى الشخص المستهدف لو أن الأرض ابتلعته حتى لا يسمع المزيد؟

الرجل: معك حق، فليس كل من يضحك أمامك يكون سعيدًا بما تقوله.

المرأة: بالضبط! هناك فرق كبير بين شخص يمتلك روح الدعابة، وشخص يستمتع بالتقليل من قيمة الآخرين. الأول يجعل الجميع يضحكون معه، أما الثاني فيجعل الجميع يضحكون على حساب شخص واحد.

الرجل: لكن بعض الناس حساسون أكثر من اللازم، ولا يتقبلون حتى المزاح البسيط.

المرأة: وأنا لا أقول لك لا تمزح! امزح، وأضحك الناس، وانشر البهجة أينما كنت، لكن لا تجعل كرامة الآخرين ثمنًا لضحكتك. ليس كل شخص صامت يعني أنه لم يتأذَّ، وليس كل من ضحك معك يعني أنك لم تجرحه.

الرجل: إذن، قوة الشخصية ليست في امتلاك لسان لاذع؟

المرأة: بالتأكيد لا. أحيانًا لا يكون اللسان اللاذع دليلًا على الذكاء، بل على ضعف التربية وقلة احترام الآخرين. الشطارة الحقيقية أن تعرف ماذا تقول، ومتى تقوله، وألا تتجاوز حدودك مع أحد.

الرجل: والأصعب أن بعض الناس لا يدركون خطورة كلماتهم إلا عندما يجدون شخصًا يرد عليهم بالطريقة نفسها.

المرأة: وهذا ما أقوله دائمًا. عامل الناس باحترام، ولا تختبر صبرهم بحجة أنك تمزح. فقد تنسى أنت الكلمة التي قلتها بعد دقائق، لكن الشخص الذي سمعها قد يتذكرها لسنوات.

الرجل: يبدو أن علينا أن نتعلم كيف نضحك الناس دون أن نجرح أحدًا.

المرأة: هذا كل ما في الأمر. خفة الظل لا تحتاج إلى إهانة، والمرح لا يحتاج إلى التقليل من الآخرين.

النهاية:

ليس كل من يجرحك صريحًا، وليس كل من يهينك صاحب لسان حاد. هناك فرق كبير بين خفة الظل وسوء الأدب.

**فلا تجعل عبارة «أنا أمزح معك فقط» غطاءً لكلمات قد تترك جرحًا لا يراه أحد.`;

export const DialogueStudio: React.FC<DialogueStudioProps> = ({
  onGenerateDialogue,
  isGenerating,
}) => {
  // Input mode: 'single-box' (user pastes full script) or 'line-by-line' (fine-tuning cards)
  const [editorMode, setEditorMode] = useState<'single-box' | 'line-by-line'>('single-box');

  // Single text box state
  const [rawScriptText, setRawScriptText] = useState<string>(USER_SAMPLE_SCRIPT);

  // Custom speaker voice mapping overrides
  const [womanVoice, setWomanVoice] = useState<GeminiVoice>('Kore');
  const [manVoice, setManVoice] = useState<GeminiVoice>('Fenrir');
  const [narratorVoice, setNarratorVoice] = useState<GeminiVoice>('Charon');

  // Silence pause between speakers
  const [silenceMs, setSilenceMs] = useState<number>(400);

  // Line-by-line state
  const [manualLines, setManualLines] = useState<DialogueLine[]>([]);

  // Parse raw text into structured lines live
  const parsedData: ParsedScriptResult = useMemo(() => {
    const res = parseDialogueScript(rawScriptText);

    // Apply voice mappings
    const mappedLines = res.lines.map((line) => {
      let voice = line.voice;
      if (line.gender === 'female' && !line.isChildVoice) {
        voice = womanVoice;
      } else if (
        line.gender === 'male' &&
        !line.isChildVoice &&
        (line.speakerLabel.includes('راوي') ||
          line.speakerLabel.includes('مقدمة') ||
          line.speakerLabel.includes('نهاية'))
      ) {
        voice = narratorVoice;
      } else if (line.gender === 'male' && !line.isChildVoice) {
        voice = manVoice;
      }
      return { ...line, voice };
    });

    return {
      ...res,
      lines: mappedLines,
    };
  }, [rawScriptText, womanVoice, manVoice, narratorVoice]);

  // Sync manual lines when switching to line-by-line
  const handleSwitchToLineByLine = () => {
    if (parsedData.lines.length > 0) {
      setManualLines(parsedData.lines);
    }
    setEditorMode('line-by-line');
  };

  // Submit generation directly from single box or manual lines
  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const linesToUse = editorMode === 'single-box' ? parsedData.lines : manualLines;
    const validLines = linesToUse.filter((l) => l.text.trim().length > 0);

    if (validLines.length === 0) return;

    onGenerateDialogue(validLines, silenceMs);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-rose-950/40 border border-indigo-500/30 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>المحرر الموحّد لتوليد الحوار الصوتي المباشر 🎭</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              ضع نص الحوار في خانة واحدة وسيتم تحويله إلى أصوات مدمجة مباشرة
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              اكتب أو الصق نص الحوار كاملاً مع كتابة (المرأة: ... والرجل: ... والنهاية: ...) وسيتعرف
              الذكاء الاصطناعي تلقائياً على كل شخصية ويقرأها بنبرتها الخاصة ويدمجها في ملف صوتي واحد!
            </p>
          </div>

          {/* Quick Action to load user sample */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setRawScriptText(USER_SAMPLE_SCRIPT);
                setEditorMode('single-box');
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تحميل نص «أنا أمزح معك فقط!»</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Mode Selector: Single-Box (Recommended) vs Line-by-Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditorMode('single-box')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
              editorMode === 'single-box'
                ? 'bg-gradient-to-r from-indigo-500/25 to-purple-500/25 text-indigo-300 border-indigo-500/50 shadow-md'
                : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>خانة واحدة لنص الحوار كاملاً (توليد مباشر) ⚡</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchToLineByLine}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
              editorMode === 'line-by-line'
                ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 border-amber-500/50 shadow-md'
                : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-4 h-4 text-amber-400" />
            <span>تفكيك وتعديل السطور (متقدم)</span>
          </button>
        </div>

        {/* Silence Gap Slider */}
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>الوقفة بين المتحدثين:</span>
          <span className="text-amber-400 font-mono font-bold">{silenceMs}ms</span>
          <input
            type="range"
            min={150}
            max={800}
            step={50}
            value={silenceMs}
            onChange={(e) => setSilenceMs(Number(e.target.value))}
            className="w-20 accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* SINGLE-BOX MODE (Default & Primary) */}
      {editorMode === 'single-box' && (
        <div className="space-y-5">
          {/* Main Textarea */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="dialogue-raw-script"
                className="text-sm font-bold text-white flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>نص الحوار الكامل (الخانة الموحّدة):</span>
              </label>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>{rawScriptText.length} حرف</span>
                <span>•</span>
                <span className="text-indigo-400 font-bold">{parsedData.totalTurns} رد مكتشف</span>
              </div>
            </div>

            <textarea
              id="dialogue-raw-script"
              rows={12}
              value={rawScriptText}
              onChange={(e) => setRawScriptText(e.target.value)}
              placeholder="الصق نص الحوار هنا، مثال:&#10;المرأة: السلام عليكم، كيف حالك اليوم؟&#10;الرجل: وعليكم السلام، الحمد لله بخير!&#10;النهاية: وهكذا كانت المحادثة..."
              className="w-full bg-slate-950/90 rounded-2xl border border-slate-800 p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 text-sm sm:text-base leading-relaxed font-normal min-h-[240px] resize-y"
            />

            {/* Quick Actions under textarea */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRawScriptText(USER_SAMPLE_SCRIPT)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                >
                  استعادة نص «أنا أمزح معك فقط!»
                </button>
                <button
                  type="button"
                  onClick={() => setRawScriptText('')}
                  className="px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  مسح المربع
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                💡 يتعرف النظام تلقائياً على: <strong>المرأة:</strong> و <strong>الرجل:</strong> و <strong>الراوي:</strong> و <strong>النهاية:</strong>
              </div>
            </div>
          </div>

          {/* Real-time Detected Speakers & Voice Customizer Bar */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>الشخصيات المكتشفة تلقائياً في النص وتوزيع الأصوات:</span>
              </h4>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                {parsedData.detectedSpeakers.length} شخصيات مسرحية
              </span>
            </div>

            {/* Speaker Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Woman Voice Setup */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/30 to-slate-900/80 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👩</span>
                    <strong className="text-xs font-bold text-rose-300">صوت المرأة:</strong>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                    {parsedData.lines.filter((l) => l.gender === 'female').length} ردود
                  </span>
                </div>
                <select
                  value={womanVoice}
                  onChange={(e) => setWomanVoice(e.target.value as GeminiVoice)}
                  className="w-full bg-slate-950 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 border border-rose-500/30 focus:outline-none"
                >
                  <option value="Kore">Kore (صوت أنثوي دافئ وإنساني)</option>
                  <option value="Zephyr">Zephyr (صوت أنثوي هادئ وناعم)</option>
                </select>
              </div>

              {/* Man Voice Setup */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/30 to-slate-900/80 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨</span>
                    <strong className="text-xs font-bold text-blue-300">صوت الرجل:</strong>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                    {parsedData.lines.filter((l) => l.gender === 'male' && !l.speakerLabel.includes('راوي') && !l.speakerLabel.includes('نهاية') && !l.speakerLabel.includes('مقدمة')).length} ردود
                  </span>
                </div>
                <select
                  value={manVoice}
                  onChange={(e) => setManVoice(e.target.value as GeminiVoice)}
                  className="w-full bg-slate-950 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 border border-blue-500/30 focus:outline-none"
                >
                  <option value="Fenrir">Fenrir (صوت رجالي رخيم وواثق)</option>
                  <option value="Charon">Charon (صوت وقور ورصين)</option>
                  <option value="Puck">Puck (صوت رجالي حيوي)</option>
                </select>
              </div>

              {/* Narrator Voice Setup */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/30 to-slate-900/80 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎙️</span>
                    <strong className="text-xs font-bold text-purple-300">صوت الراوي / النهاية:</strong>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                    {parsedData.lines.filter((l) => l.speakerLabel.includes('راوي') || l.speakerLabel.includes('نهاية') || l.speakerLabel.includes('مقدمة')).length} فقرات
                  </span>
                </div>
                <select
                  value={narratorVoice}
                  onChange={(e) => setNarratorVoice(e.target.value as GeminiVoice)}
                  className="w-full bg-slate-950 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 border border-purple-500/30 focus:outline-none"
                >
                  <option value="Charon">Charon (صوت سردي وقور وهادئ)</option>
                  <option value="Fenrir">Fenrir (صوت إذاعي فصيح)</option>
                  <option value="Kore">Kore (راوية أنثوية دافئة)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Detailed Lines Inspector Drawer */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  معاينة السطور المكتشفة بالكامل ({parsedData.totalTurns} سطراً متكاملاً):
                </h4>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                100% مكتمل (من البداية حتى الخاتمة)
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
              {parsedData.lines.map((line, idx) => {
                const isFemale = line.gender === 'female';
                const isNarrator =
                  line.speakerLabel.includes('راوي') ||
                  line.speakerLabel.includes('نهاية') ||
                  line.speakerLabel.includes('مقدمة');

                return (
                  <div
                    key={line.id || idx}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-colors ${
                      isNarrator
                        ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                        : isFemale
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        : 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <strong className="text-white font-bold text-[11px]">
                          {line.speakerLabel}
                        </strong>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-400 font-mono">
                          {line.voice}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                        {line.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Big Action Button */}
          <div>
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating || parsedData.lines.length === 0}
              className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white shadow-xl shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              {isGenerating ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-5 bg-white rounded-full animate-bounce"></span>
                    <span className="w-2 h-7 bg-white rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-4 bg-white rounded-full animate-bounce delay-200"></span>
                  </div>
                  <span>جارٍ توليد ودمج جميع السطور الـ ({parsedData.totalTurns}) كاملاً...</span>
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>توليد ودمج الحوار كاملاً ({parsedData.totalTurns} سطراً) الآن 🎭</span>
                  <Sparkles className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                ⚡ لتشغيل فوري غير محدود وبدون أي انتظار سحابي:
              </span>
              <button
                type="button"
                onClick={() => speakDialogueWithBrowser(parsedData.lines)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all"
              >
                <Volume2 className="w-4 h-4" />
                <span>تشغيل فوري عبر محرك المتصفح الآن ⚡</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LINE-BY-LINE ADVANCED MODE */}
      {editorMode === 'line-by-line' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-amber-400" />
              <span>السطور المفككة للحوار ({manualLines.length} سطور):</span>
            </h4>

            <button
              type="button"
              onClick={() => {
                const asText = manualLines
                  .map((l) => `${l.speakerLabel}: ${l.text}`)
                  .join('\n\n');
                setRawScriptText(asText);
                setEditorMode('single-box');
              }}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>العودة لمربع النص الموحّد ⬅️</span>
            </button>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {manualLines.map((line, idx) => {
              const isFemale = line.gender === 'female';
              const isKid = line.isChildVoice;

              return (
                <div
                  key={line.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                    isKid
                      ? 'bg-pink-950/20 border-pink-500/30'
                      : isFemale
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-blue-950/20 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <strong className="text-xs text-white">{line.speakerLabel}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={line.voice}
                        onChange={(e) => {
                          const v = e.target.value as GeminiVoice;
                          setManualLines((prev) =>
                            prev.map((l) => (l.id === line.id ? { ...l, voice: v } : l))
                          );
                        }}
                        className="bg-slate-900 text-xs text-slate-300 rounded-lg px-2 py-1 border border-slate-700"
                      >
                        <option value="Kore">Kore (أنثى دافئ)</option>
                        <option value="Zephyr">Zephyr (أنثى ناعم)</option>
                        <option value="Fenrir">Fenrir (رجل رخيم)</option>
                        <option value="Charon">Charon (رجل وقور/راوي)</option>
                        <option value="Puck">Puck (حيوي/طفل)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setManualLines((prev) => prev.filter((l) => l.id !== line.id))
                        }
                        className="text-rose-400 p-1 hover:bg-rose-500/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={line.text}
                    onChange={(e) => {
                      const t = e.target.value;
                      setManualLines((prev) =>
                        prev.map((l) => (l.id === line.id ? { ...l, text: t } : l))
                      );
                    }}
                    className="w-full bg-slate-950/80 text-xs sm:text-sm rounded-xl p-2.5 border border-slate-800 text-slate-100 focus:outline-none leading-relaxed"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={isGenerating || manualLines.length === 0}
            className="w-full py-3.5 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 shadow-xl transition-all"
          >
            توليد ودمج هذه السطور الآن
          </button>
        </div>
      )}
    </div>
  );
};
