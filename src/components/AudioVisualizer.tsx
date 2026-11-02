import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Download, Volume2, VolumeX, Sparkles, AudioLines, Radio, Cpu } from 'lucide-react';
import { GeneratedAudioItem } from '../types';
import { speakWithBrowserTts, stopBrowserSpeech } from '../utils/browserSpeech';

interface AudioVisualizerProps {
  currentAudio: GeneratedAudioItem | null;
  onReplay?: () => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ currentAudio }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // When audio changes, reset and autoplay
  useEffect(() => {
    if (!currentAudio || !audioRef.current) return;

    stopBrowserSpeech();
    audioRef.current.src = currentAudio.audioUrl;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.load();

    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          if (currentAudio.isBrowserSynthesis) {
            speakWithBrowserTts(currentAudio.text, {
              voice: currentAudio.voice,
              isChildVoice: currentAudio.isChildVoice,
              playbackRate,
              onEnd: () => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                  setCurrentTime(0);
                }
              },
            });
          }
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }

    return () => {
      stopBrowserSpeech();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentAudio]);

  // Audio element events
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    stopBrowserSpeech();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      stopBrowserSpeech();
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if (currentAudio?.isBrowserSynthesis) {
            speakWithBrowserTts(currentAudio.text, {
              voice: currentAudio.voice,
              isChildVoice: currentAudio.isChildVoice,
              playbackRate,
              onEnd: () => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                  setCurrentTime(0);
                }
              },
            });
          }
        })
        .catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) setIsMuted(true);
      else setIsMuted(false);
    }
  };

  const handleDownload = () => {
    if (!currentAudio) return;
    const a = document.createElement('a');
    a.href = currentAudio.audioUrl;
    a.download = `sawti_${currentAudio.voice}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Canvas visualizer simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barCount = 48;
      const barWidth = width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isPlaying) {
          // Dynamic wave formula simulating frequencies
          const sinVal = Math.sin(phase + (i * 0.35));
          const cosVal = Math.cos(phase * 1.5 + (i * 0.2));
          barHeight = Math.max(6, Math.abs(sinVal * cosVal) * (height - 10) + Math.random() * 8);
        } else {
          // Subtle idle curve
          const progress = duration > 0 ? currentTime / duration : 0;
          const isPassed = (i / barCount) <= progress;
          barHeight = isPassed ? 10 : 5;
        }

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        const progressRatio = duration > 0 ? currentTime / duration : 0;
        const currentRatio = i / barCount;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (currentRatio <= progressRatio) {
          gradient.addColorStop(0, '#f59e0b'); // amber-500
          gradient.addColorStop(1, '#ea580c'); // orange-600
        } else {
          gradient.addColorStop(0, '#334155'); // slate-700
          gradient.addColorStop(1, '#1e293b'); // slate-800
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.12;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, duration]);

  if (!currentAudio) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-800 p-8 text-center bg-slate-950/40">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
          <AudioLines className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-300 mb-1">مشغل الصوت عالي الدقة</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          اكتب أي نص أو اختر من النماذج الجاهزة أعلاه، ثم اضغط على "توليد الصوت الآن" للاستماع بجودة الاستوديو 24kHz.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-amber-500/30 p-5 sm:p-6 shadow-2xl shadow-black/60 relative overflow-hidden">
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Decorative ambient background glow */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar of the player */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              currentAudio.isChildVoice
                ? 'bg-pink-500/10 border border-pink-500/30 text-pink-400'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}
          >
            {currentAudio.isChildVoice ? (
              <span className="text-lg">🧒</span>
            ) : (
              <Radio className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {currentAudio.childTypeName || `صوت: ${currentAudio.voice}`}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                WAV 24kHz
              </span>
              {currentAudio.isChildVoice && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold">
                  صوت طفل
                </span>
              )}
              {currentAudio.isBrowserSynthesis && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  <span>محرك المتصفح الفوري</span>
                </span>
              )}
              {currentAudio.isDialogue && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold flex items-center gap-1">
                  <span>🎭</span>
                  <span>حوار مدمج ({currentAudio.dialogueCount || 2} أسطر)</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              الأسلوب: {currentAudio.styleName || 'طبيعي معبّر'}
            </p>
          </div>
        </div>

        {/* Download action button */}
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shadow-sm"
          title="تنزيل الملف الصوتي بصيغة WAV نقية"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>تنزيل WAV</span>
        </button>
      </div>

      {/* Canvas Waveform */}
      <div className="mb-4 bg-slate-950/80 rounded-2xl p-3 border border-slate-800/80">
        <canvas
          ref={canvasRef}
          width={640}
          height={64}
          className="w-full h-16 block rounded-lg cursor-pointer"
          onClick={togglePlay}
        />
      </div>

      {/* Time & Seek Bar */}
      <div className="space-y-1.5 mb-5">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          aria-label="شريط تقدّم الصوت"
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
        />
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Playback rate presets */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {[0.75, 1, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-2 py-1 rounded-lg transition-colors ${
                playbackRate === rate
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Core Play/Pause/Replay */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().then(() => setIsPlaying(true));
              }
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="إعادة من البداية"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25 transition-all active:scale-95"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="مستوى الصوت"
            className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* Snippet of the synthesized text */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400 text-right font-medium">
        <span className="text-slate-500">النص المنطوق: </span>
        <span className="text-slate-300">"{currentAudio.text.slice(0, 120)}{currentAudio.text.length > 120 ? '...' : ''}"</span>
      </div>
    </div>
  );
};
