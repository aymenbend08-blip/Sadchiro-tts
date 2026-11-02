/**
 * Generates the dialogue soundtrack for the stickman film using this repository's
 * own TTS pipeline (same parser, same Gemini voices/models as /api/tts/dialogue).
 *
 * Output (in scripts/stickman-film/out/):
 *   dialogue.wav    merged 24 kHz mono 16-bit track (same 400 ms gap as the app default)
 *   timeline.json   exact start/end of every spoken line + per-frame loudness envelope
 *
 * Usage:  GEMINI_API_KEY=... npx tsx scripts/stickman-film/generate-audio.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { parseDialogueScript } from '../../src/utils/dialogueParser';
import { USER_SAMPLE_SCRIPT } from '../../src/components/DialogueStudio';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');
const SAMPLE_RATE = 24000;
const SILENCE_MS = 400;
const FPS = 30;

const MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
];

function styleFor(line: { gender: string; speakerLabel: string }): string {
  if (/راوي|نهاية|مقدمة/.test(line.speakerLabel)) {
    return 'Calm, articulate, wise narrator tone with expressive pauses.';
  }
  return line.gender === 'female'
    ? 'Natural, warm female conversational voice with clear emotion.'
    : 'Natural, confident male conversational voice with clear emotion.';
}

/** Gemini returns either a WAV container or raw L16 PCM; normalise to Int16 PCM. */
function toPcm(buf: Buffer): Buffer {
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF') {
    for (let j = 12; j < buf.length - 8; ) {
      const id = buf.subarray(j, j + 4).toString('ascii');
      const size = buf.readUInt32LE(j + 4);
      if (id === 'data') return buf.subarray(j + 8, Math.min(j + 8 + size, buf.length));
      j += 8 + size + (size % 2);
    }
    return buf.subarray(44);
  }
  return buf;
}

function trimSilence(pcm: Buffer): Buffer {
  const n = pcm.length / 2;
  const thr = 300;
  let a = 0;
  let b = n - 1;
  while (a < n && Math.abs(pcm.readInt16LE(a * 2)) < thr) a++;
  while (b > a && Math.abs(pcm.readInt16LE(b * 2)) < thr) b--;
  const pad = Math.round(SAMPLE_RATE * 0.06);
  a = Math.max(0, a - pad);
  b = Math.min(n - 1, b + pad);
  return pcm.subarray(a * 2, (b + 1) * 2);
}

function wavHeader(dataLen: number): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + dataLen, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(SAMPLE_RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(dataLen, 40);
  return h;
}

async function synth(ai: GoogleGenAI, text: string, voice: string, style: string): Promise<Buffer> {
  let lastErr: any;
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const model of MODELS) {
      try {
        const part: any = { text };
        if (model.startsWith('gemini-3.8')) part.speechMetadata = { style };
        const r = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [part] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          },
        });
        const p = r.candidates?.[0]?.content?.parts?.find((x) => x.inlineData?.data);
        if (p?.inlineData?.data) return Buffer.from(p.inlineData.data, 'base64');
      } catch (e: any) {
        lastErr = e;
        console.warn(`  ${model}: ${String(e?.message || e).slice(0, 140)}`);
      }
    }
    const wait = 20 * (attempt + 1);
    console.warn(`  all models failed, retrying in ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  throw lastErr || new Error('TTS failed');
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set. Add it to the environment (or .env) and re-run.');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const { lines } = parseDialogueScript(USER_SAMPLE_SCRIPT);

  const chunks: Buffer[] = [];
  const timeline: any[] = [];
  let cursor = 0;
  const gap = Buffer.alloc(Math.round((SAMPLE_RATE * SILENCE_MS) / 1000) * 2);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cache = path.join(OUT, `line_${String(i).padStart(2, '0')}.pcm`);
    let pcm: Buffer;
    if (fs.existsSync(cache)) {
      pcm = fs.readFileSync(cache);
    } else {
      console.log(`[${i + 1}/${lines.length}] ${line.speakerLabel} (${line.voice})`);
      pcm = trimSilence(toPcm(await synth(ai, line.text, line.voice, styleFor(line))));
      fs.writeFileSync(cache, pcm);
      await new Promise((r) => setTimeout(r, 800));
    }
    if (i > 0) {
      chunks.push(gap);
      cursor += gap.length / 2;
    }
    const start = cursor / SAMPLE_RATE;
    chunks.push(pcm);
    cursor += pcm.length / 2;

    // loudness envelope (0..1) per video frame, used for mouth animation
    const spf = SAMPLE_RATE / FPS;
    const env: number[] = [];
    for (let f = 0; f * spf < pcm.length / 2; f++) {
      let s = 0;
      let c = 0;
      for (let k = Math.floor(f * spf); k < Math.min((f + 1) * spf, pcm.length / 2); k++) {
        const v = pcm.readInt16LE(k * 2) / 32768;
        s += v * v;
        c++;
      }
      env.push(Math.min(1, Math.sqrt(s / Math.max(1, c)) * 6));
    }
    const speaker = /راوي|نهاية|مقدمة/.test(line.speakerLabel)
      ? 'narrator'
      : line.gender === 'female'
        ? 'woman'
        : 'man';
    timeline.push({ index: i, speaker, label: line.speakerLabel, text: line.text, start, end: cursor / SAMPLE_RATE, env });
  }

  const pcmAll = Buffer.concat(chunks);
  fs.writeFileSync(path.join(OUT, 'dialogue.wav'), Buffer.concat([wavHeader(pcmAll.length), pcmAll]));
  fs.writeFileSync(
    path.join(OUT, 'timeline.json'),
    JSON.stringify({ duration: pcmAll.length / 2 / SAMPLE_RATE, fps: FPS, lines: timeline }, null, 1)
  );
  console.log(`Done: ${(pcmAll.length / 2 / SAMPLE_RATE).toFixed(2)} s, ${timeline.length} lines -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
