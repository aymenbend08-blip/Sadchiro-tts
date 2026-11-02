import { GeminiVoice, ChildVoiceType, DialogueLine } from '../types';

/**
 * Creates a silent valid WAV blob so the player and timer work smoothly
 * when playing via client-side SpeechSynthesis with zero buzzing or background tones.
 */
export function generateSynthesizedWavBlob(durationSeconds: number, isChild: boolean): { blob: Blob; url: string } {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.max(sampleRate * 2, Math.round(sampleRate * durationSeconds));
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * 2;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true); // file length - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Pure silent PCM (0) so there is zero tone or buzzing noise
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, 0, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  return { blob, url };
}

/**
 * Speaks text using the browser's native SpeechSynthesis API.
 */
export function speakWithBrowserTts(
  text: string,
  options: {
    voice?: GeminiVoice;
    isChildVoice?: boolean;
    childType?: ChildVoiceType;
    playbackRate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-DZ';

  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(
    (v) => v.lang.startsWith('ar') || v.lang.includes('Arabic') || v.name.includes('Arabic')
  );
  if (arabicVoice) {
    utterance.voice = arabicVoice;
  }

  if (options.isChildVoice) {
    utterance.pitch = 1.45;
    utterance.rate = 1.05;
  } else if (options.voice === 'Fenrir' || options.voice === 'Charon') {
    utterance.pitch = 0.82;
    utterance.rate = 0.95;
  } else if (options.voice === 'Puck') {
    utterance.pitch = 1.15;
    utterance.rate = 1.05;
  } else {
    // Default female voice (Kore / Zephyr)
    utterance.pitch = 1.25;
    utterance.rate = 1.0;
  }

  if (options.playbackRate) {
    utterance.rate *= options.playbackRate;
  }

  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;
  if (options.onError) utterance.onerror = options.onError;

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Speaks an entire dialogue sequentially turn by turn using browser speech synthesis,
 * alternating between female voice pitch, male voice pitch, and narrator pitch.
 */
export function speakDialogueWithBrowser(
  lines: DialogueLine[],
  onTurnChange?: (turnIndex: number) => void,
  onComplete?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  if (!lines || lines.length === 0) return;

  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(
    (v) => v.lang.startsWith('ar') || v.lang.includes('Arabic') || v.name.includes('Arabic')
  );
  const frenchVoice = voices.find((v) => v.lang.startsWith('fr'));
  const englishVoice = voices.find((v) => v.lang.startsWith('en'));

  let currentIndex = 0;

  const playNext = () => {
    if (currentIndex >= lines.length) {
      if (onComplete) onComplete();
      return;
    }

    const currentLine = lines[currentIndex];
    if (onTurnChange) onTurnChange(currentIndex);

    const utterance = new SpeechSynthesisUtterance(currentLine.text);

    if (currentLine.language === 'fr') {
      utterance.lang = 'fr-FR';
      if (frenchVoice) utterance.voice = frenchVoice;
    } else if (currentLine.language === 'en') {
      utterance.lang = 'en-US';
      if (englishVoice) utterance.voice = englishVoice;
    } else {
      utterance.lang = 'ar-DZ';
      if (arabicVoice) utterance.voice = arabicVoice;
    }

    // Role-based pitch tuning
    if (currentLine.isChildVoice) {
      utterance.pitch = 1.45;
      utterance.rate = 1.05;
    } else if (currentLine.gender === 'female') {
      utterance.pitch = 1.3;
      utterance.rate = 1.0;
    } else if (
      currentLine.speakerLabel.includes('راوي') ||
      currentLine.speakerLabel.includes('نهاية') ||
      currentLine.speakerLabel.includes('مقدمة')
    ) {
      utterance.pitch = 0.95;
      utterance.rate = 0.92;
    } else {
      // Male speaker
      utterance.pitch = 0.82;
      utterance.rate = 0.95;
    }

    utterance.onend = () => {
      currentIndex++;
      setTimeout(playNext, 350);
    };

    utterance.onerror = () => {
      currentIndex++;
      setTimeout(playNext, 200);
    };

    window.speechSynthesis.speak(utterance);
  };

  playNext();
}

/**
 * Stops any active browser speech synthesis
 */
export function stopBrowserSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
