import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint for Text-to-Speech generation via Gemini TTS
app.post('/api/tts/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      text,
      voice = 'Kore',
      style = 'Natural, clear Arabic and multilingual articulation',
      dialectId,
      isChildVoice = false,
      childType = 'boy',
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'يرجى تقديم نص صالح للتحويل إلى صوت.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير متوفر في الخادم.' });
      return;
    }

    // Supported voices: Puck, Charon, Kore, Fenrir, Zephyr
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    let chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

    // Optimize base voice for children's personas if requested
    if (isChildVoice) {
      if (childType === 'boy' || childType === 'algerian-boy') {
        chosenVoice = 'Puck'; // naturally higher frequency and energetic
      } else {
        chosenVoice = 'Zephyr'; // gentle, soft, light high-pitched
      }
    }

    const promptText = text.trim().slice(0, 5000);

    // Map Algerian dialect IDs to specialized phonetic instructions
    const dialectStyleMap: Record<string, string> = {
      algiers:
        'Authentic Algiers Algerian Arabic dialect (Darja Algéroise), urban, smooth conversational flow, warm Algiers colloquial intonations',
      oran:
        'Authentic Western Algerian Oranian dialect (Wahran Darja), lively, dynamic, warm, melodic, upbeat Oran phrasing with distinctive rhythm',
      constantine:
        'Noble Eastern Algerian Constantinois dialect (Qasantina Darja), clear Arabic Qaf pronunciation, dignified, refined pacing',
      tlemcen:
        'Traditional Andalusian Tlemcen dialect (Tlemcénien), soft Hamza glottal stop replacing the Qaf, gentle, polite, aristocratic pacing',
      setif:
        'Authentic High Plateaus Setifian dialect (Sétif Darja), confident, articulate, robust, direct High Plains cadence',
      sahara:
        'Deep Algerian Saharan Bedouin dialect (Sahra Darja), voiced velar plosive G sound replacing Qaf, unhurried, warm desert hospitality pacing',
      jijel:
        'Unique coastal Algerian Jijelian dialect (Jijli Darja), distinctive Kaf substitution for Qaf, rapid marine coastal rhythm',
      annaba:
        'North-Eastern coastal Algerian Annabi dialect (Bone/Annaba Darja), melodious Mediterranean coastal rhythm',
    };

    let effectiveStyle = style || 'Clear, natural, professional speaker';

    if (isChildVoice) {
      const childStylePrompts: Record<string, string> = {
        boy: 'Playful, innocent 7-year-old young boy speaking Arabic, high-pitched cheerful juvenile voice, expressive animated kid articulation, energetic cute cartoon voiceover for children.',
        girl: 'Gentle, sweet, innocent 6-year-old little girl speaking Arabic, adorable high-pitched child voice, lovely cute storytelling cadence, joyful juvenile intonation.',
        'algerian-boy':
          'Authentic cheerful 8-year-old Algerian child speaking native colloquial Algerian Darija with playful high pitch, energetic and lovely Algerian kid colloquial accent, joyful boy energy.',
        'algerian-girl':
          'Sweet charming 7-year-old Algerian young girl speaking native colloquial Algerian Darija, cute high-pitched youthful cadence, warm and authentic Algerian child expressions.',
      };

      const baseChildPrompt = childStylePrompts[childType] || childStylePrompts.boy;

      if (dialectId && dialectStyleMap[dialectId]) {
        effectiveStyle = `${baseChildPrompt} In the ${dialectStyleMap[dialectId]}. High pitch, youthful juvenile cadence.`;
      } else {
        effectiveStyle = `${baseChildPrompt} Clear, high-pitched juvenile voice, cheerful animated delivery.`;
      }
    } else if (dialectId && dialectStyleMap[dialectId]) {
      effectiveStyle = `${dialectStyleMap[dialectId]}. ${style ? 'Mood: ' + style : ''}`;
    }

    // Try working preview models first, then flash-lite/flash
    const modelsToTry = [
      'gemini-2.5-flash-preview-tts',
      'gemini-3.1-flash-tts-preview',
      'gemini-3.8-flash-lite-tts',
      'gemini-3.8-flash-tts',
    ];
    let lastError: any = null;
    let audioBase64: string | undefined;
    let mimeType = 'audio/wav';

    for (const model of modelsToTry) {
      try {
        const textPart: any = { text: promptText };
        if (model.startsWith('gemini-3.8') && effectiveStyle) {
          textPart.speechMetadata = { style: effectiveStyle };
        }

        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [textPart],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });

        const candidate = response.candidates?.[0];
        const audioPart = candidate?.content?.parts?.find((p) => p.inlineData && p.inlineData.data);
        if (audioPart?.inlineData?.data) {
          audioBase64 = audioPart.inlineData.data;
          mimeType = audioPart.inlineData.mimeType || 'audio/wav';
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`TTS Model ${model} returned error, attempting fallback if available:`, err?.message || err);
      }
    }

    if (!audioBase64) {
      const errStr = lastError?.message || '';
      const isQuota =
        lastError?.status === 'RESOURCE_EXHAUSTED' ||
        errStr.includes('429') ||
        errStr.includes('Quota exceeded') ||
        errStr.includes('RESOURCE_EXHAUSTED');

      if (isQuota) {
        let retrySeconds = 35;
        const match = errStr.match(/retry in ([0-9.]+)s/i);
        if (match) {
          retrySeconds = Math.ceil(parseFloat(match[1]));
        }

        res.status(429).json({
          error: `تم تجاوز الحصة المجانية المؤقتة لـ Gemini API. يرجى الانتظار ${retrySeconds} ثانية أو استخدام محرك المتصفح الفوري.`,
          quotaExceeded: true,
          retryAfterSeconds: retrySeconds,
        });
        return;
      }

      res.status(500).json({
        error: lastError?.message || 'لم يتمكن النموذج من توليد ملف الصوت لهذا النص.',
      });
      return;
    }

    // Unary default returns full WAV with RIFF header (24kHz, mono, 16-bit)
    res.json({
      success: true,
      audioBase64,
      mimeType,
      voice: chosenVoice,
      textLength: promptText.length,
      dialectId,
      isChildVoice,
      childType,
    });
  } catch (error: any) {
    console.error('TTS Generation error:', error);
    const errStr = error?.message || '';
    const isQuota =
      error?.status === 'RESOURCE_EXHAUSTED' ||
      errStr.includes('429') ||
      errStr.includes('Quota exceeded');

    let retrySeconds = 35;
    const match = errStr.match(/retry in ([0-9.]+)s/i);
    if (match) {
      retrySeconds = Math.ceil(parseFloat(match[1]));
    }

    res.status(isQuota ? 429 : 500).json({
      error: isQuota
        ? `تم تجاوز الحصة المجانية المؤقتة لـ Gemini API. يرجى الانتظار ${retrySeconds} ثانية أو استخدام محرك المتصفح الفوري.`
        : error.message || 'حدث خطأ أثناء معالجة الصوت بالذكاء الاصطناعي.',
      quotaExceeded: isQuota,
      retryAfterSeconds: retrySeconds,
    });
  }
});

// Helper function to concatenate multiple 24kHz mono 16-bit PCM WAV buffers with conversational pause
function mergeWavBuffers(wavBuffers: Buffer[], silenceMs = 400): Buffer {
  if (wavBuffers.length === 0) return Buffer.alloc(0);
  if (wavBuffers.length === 1) return wavBuffers[0];

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = (numChannels * bitsPerSample) / 8; // 2 bytes
  const silenceSamples = Math.round((sampleRate * silenceMs) / 1000);
  const silenceBuffer = Buffer.alloc(silenceSamples * bytesPerSample, 0);

  const pcmChunks: Buffer[] = [];

  for (let i = 0; i < wavBuffers.length; i++) {
    const buf = wavBuffers[i];
    let dataOffset = -1;
    let dataLength = 0;
    for (let j = 0; j < buf.length - 8; j++) {
      if (
        buf[j] === 0x64 &&
        buf[j + 1] === 0x61 &&
        buf[j + 2] === 0x74 &&
        buf[j + 3] === 0x63
      ) {
        // 'data'
      }
      if (
        buf[j] === 0x64 && // 'd'
        buf[j + 1] === 0x61 && // 'a'
        buf[j + 2] === 0x74 && // 't'
        buf[j + 3] === 0x61 // 'a'
      ) {
        dataOffset = j + 8;
        dataLength = buf.readUInt32LE(j + 4);
        break;
      }
    }

    let pcm: Buffer;
    if (dataOffset !== -1 && dataOffset < buf.length) {
      pcm = buf.subarray(dataOffset, Math.min(dataOffset + dataLength, buf.length));
    } else if (buf.length > 44) {
      pcm = buf.subarray(44);
    } else {
      pcm = Buffer.alloc(0);
    }

    if (pcm.length > 0) {
      if (pcmChunks.length > 0 && silenceMs > 0) {
        pcmChunks.push(silenceBuffer);
      }
      pcmChunks.push(pcm);
    }
  }

  const totalPcm = Buffer.concat(pcmChunks);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + totalPcm.length, 4);
  header.write('WAVE', 8);

  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * bytesPerSample, 28);
  header.writeUInt16LE(bytesPerSample, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write('data', 36);
  header.writeUInt32LE(totalPcm.length, 40);

  return Buffer.concat([header, totalPcm]);
}

// API endpoint for multi-speaker / multi-language dialogue generation
app.post('/api/tts/dialogue', async (req: Request, res: Response): Promise<void> => {
  try {
    const { lines: inputLines, rawText, silenceMs = 400 } = req.body;

    let lines = inputLines;

    // If raw text was provided, parse into lines server-side if lines is empty
    if ((!lines || lines.length === 0) && typeof rawText === 'string' && rawText.trim()) {
      const parsed = parseServerRawDialogue(rawText);
      lines = parsed;
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ error: 'يرجى تقديم نص أو سطور الحوار المراد دمجها.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير متوفر في الخادم.' });
      return;
    }

    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

    // Map Algerian dialect IDs to specialized phonetic instructions
    const dialectStyleMap: Record<string, string> = {
      algiers: 'Authentic Algiers Algerian Arabic dialect (Darja Algéroise)',
      oran: 'Authentic Western Algerian Oranian dialect (Wahran Darja)',
      constantine: 'Noble Eastern Algerian Constantinois dialect (Qasantina Darja)',
      tlemcen: 'Traditional Andalusian Tlemcen dialect (Tlemcénien)',
      setif: 'Authentic High Plateaus Setifian dialect (Sétif Darja)',
      sahara: 'Deep Algerian Saharan Bedouin dialect (Sahra Darja)',
      jijel: 'Unique coastal Algerian Jijelian dialect (Jijli Darja)',
      annaba: 'North-Eastern coastal Algerian Annabi dialect (Bone/Annaba Darja)',
    };

    const validLines = lines.filter((l: any) => l && l.text && l.text.trim().length > 0);
    const audioBuffersByIndex: (Buffer | null)[] = new Array(validLines.length).fill(null);

    // Concurrency limit of 3 to speed up dialogue generation while respecting rate limits
    const batchSize = 3;

    for (let batchStart = 0; batchStart < validLines.length; batchStart += batchSize) {
      const currentBatch = validLines.slice(batchStart, batchStart + batchSize);

      await Promise.all(
        currentBatch.map(async (line: any, idxInBatch: number) => {
          const globalIdx = batchStart + idxInBatch;
          const lineText = line.text.trim();

          let chosenVoice = line.voice || (line.gender === 'female' ? 'Kore' : 'Fenrir');
          if (!validVoices.includes(chosenVoice)) {
            chosenVoice = line.gender === 'female' ? 'Kore' : 'Fenrir';
          }

          if (line.isChildVoice) {
            chosenVoice = line.gender === 'female' ? 'Zephyr' : 'Puck';
          }

          let lineStyle = line.stylePrompt || '';
          if (line.isChildVoice) {
            lineStyle = `Playful, innocent ${
              line.gender === 'female' ? '6-year-old girl' : '7-year-old boy'
            } voice, cute conversational cadence. ${lineStyle}`;
          } else if (line.speakerLabel && (line.speakerLabel.includes('راوي') || line.speakerLabel.includes('نهاية') || line.speakerLabel.includes('مقدمة'))) {
            lineStyle = `Calm, articulate, wise narrator tone with expressive pauses. ${lineStyle}`;
          } else if (line.gender === 'female') {
            lineStyle = `Natural, warm female conversational voice with clear emotion. ${lineStyle}`;
          } else {
            lineStyle = `Natural, confident male conversational voice with clear emotion. ${lineStyle}`;
          }

          if (line.language === 'fr') {
            lineStyle += ' Clear authentic French articulation and natural pronunciation.';
          } else if (line.language === 'en') {
            lineStyle += ' Clear authentic English articulation and natural pronunciation.';
          } else if (line.dialectId && dialectStyleMap[line.dialectId]) {
            lineStyle += ` In ${dialectStyleMap[line.dialectId]}.`;
          }

          const modelsToTry = [
            'gemini-2.5-flash-preview-tts',
            'gemini-3.1-flash-tts-preview',
            'gemini-3.8-flash-lite-tts',
            'gemini-3.8-flash-tts',
          ];

          for (const model of modelsToTry) {
            try {
              const textPart: any = { text: lineText };
              if (model.startsWith('gemini-3.8') && lineStyle) {
                textPart.speechMetadata = { style: lineStyle };
              }

              const response = await ai.models.generateContent({
                model,
                contents: [
                  {
                    role: 'user',
                    parts: [textPart],
                  },
                ],
                config: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: chosenVoice },
                    },
                  },
                },
              });

              const candidate = response.candidates?.[0];
              const audioPart = candidate?.content?.parts?.find(
                (p) => p.inlineData && p.inlineData.data
              );
              if (audioPart?.inlineData?.data) {
                audioBuffersByIndex[globalIdx] = Buffer.from(
                  audioPart.inlineData.data,
                  'base64'
                );
                break;
              }
            } catch (err: any) {
              console.warn(
                `Line #${globalIdx + 1} (${line.speakerLabel}) model ${model} error:`,
                err?.message || err
              );
            }
          }
        })
      );

      // Pacing delay between batches to respect Gemini RPM rate-limits
      if (batchStart + batchSize < validLines.length) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    const generatedAudioBuffers = audioBuffersByIndex.filter(
      (buf): buf is Buffer => buf !== null && buf.length > 0
    );

    if (generatedAudioBuffers.length === 0) {
      res.status(500).json({ error: 'لم يتمكن النموذج من توليد مقاطع الحوار.' });
      return;
    }

    const mergedWav = mergeWavBuffers(generatedAudioBuffers, silenceMs);

    res.json({
      success: true,
      audioBase64: mergedWav.toString('base64'),
      mimeType: 'audio/wav',
      linesCount: generatedAudioBuffers.length,
    });
  } catch (error: any) {
    console.error('Dialogue TTS error:', error);
    res.status(500).json({
      error: error.message || 'حدث خطأ أثناء توليد الحوار المدمج بالذكاء الاصطناعي.',
    });
  }
});

// Helper for parsing raw dialogue text directly on the server
function parseServerRawDialogue(rawText: string): any[] {
  const lines = rawText.split('\n');
  const results: any[] = [];
  const prefixRegex = /^\s*(\*{0,2})([^\n:：\-–—]{2,30})\1\s*[:：\-–—]\s*(.*)$/;

  const femaleKeywords = ['مرأة', 'مرأه', 'زوجة', 'زوجه', 'بنت', 'فتاة', 'سارة', 'فاطمة', 'مريم', 'هند', 'أم', 'ام', 'woman', 'female'];
  const childKeywords = ['طفل', 'طفلة', 'طفله', 'ولد', 'أنيس', 'إياد', 'child', 'kid'];
  const narratorKeywords = ['راوي', 'معلق', 'مقدمة', 'نهاية', 'خاتمة', 'حكمة', 'عبرة', 'narrator'];

  let currentLabel = 'المقدمة (الراوي)';
  let currentGender = 'male';
  let currentVoice = 'Charon';
  let currentIsChild = false;
  let currentTextBuffer: string[] = [];

  const flush = () => {
    const text = currentTextBuffer.join(' ').trim();
    if (text.length > 0) {
      results.push({
        speakerLabel: currentLabel,
        gender: currentGender,
        voice: currentVoice,
        isChildVoice: currentIsChild,
        text,
      });
    }
    currentTextBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(prefixRegex);
    if (match) {
      flush();
      const speakerName = match[2].trim().replace(/^\*+|\*+$/g, '');
      const speech = match[3].trim().replace(/^\*+|\*+$/g, '');
      const norm = speakerName.toLowerCase();

      if (childKeywords.some((k) => norm.includes(k))) {
        currentLabel = speakerName;
        currentGender = 'male';
        currentVoice = 'Puck';
        currentIsChild = true;
      } else if (femaleKeywords.some((k) => norm.includes(k))) {
        currentLabel = speakerName;
        currentGender = 'female';
        currentVoice = 'Kore';
        currentIsChild = false;
      } else if (narratorKeywords.some((k) => norm.includes(k))) {
        currentLabel = speakerName;
        currentGender = 'male';
        currentVoice = 'Charon';
        currentIsChild = false;
      } else {
        currentLabel = speakerName;
        currentGender = 'male';
        currentVoice = 'Fenrir';
        currentIsChild = false;
      }

      if (speech) currentTextBuffer.push(speech);
    } else {
      const cleanLine = line.replace(/^\*+|\*+$/g, '').trim();
      const norm = cleanLine.toLowerCase();
      if (narratorKeywords.some((k) => norm === k)) {
        flush();
        currentLabel = 'النهاية (الراوي)';
        currentGender = 'male';
        currentVoice = 'Charon';
        currentIsChild = false;
      } else {
        currentTextBuffer.push(cleanLine);
      }
    }
  }

  flush();
  return results;
}

// API endpoint for converting text to authentic Algerian dialects
app.post('/api/algerian/convert', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, dialectId = 'algiers' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'يرجى تقديم نص صالح للتحويل.' });
      return;
    }

    const dialectGuide: Record<string, string> = {
      algiers:
        'اللهجة العاصمية والوسط (الجزائر العاصمة والبليدة). استخدم مفردات العاصمة الأصيلة مثل: واش راك، بزاف، دوكا/دورك، صحيت، الله يسلمك، كاش جديد، مليح، حومة.',
      oran:
        'اللهجة الوهرانية والغربية (وهران ومستغانم). استخدم مفردات الغرب الوهراني الشهيرة مثل: راك غاية، دروك، شوالا، لاخاطرش، صايي، حوجي أنا، شباب بزاف، راك مروّنها.',
      constantine:
        'اللهجة القسنطينية والشرقية (قسنطينة وميلة). حافظ على نطق القاف الفصيحة الصريحة، واستخدم: واش حوالك، ربي يعيشك، ياسر (بزاف)، قداش، برك، واش بيك.',
      tlemcen:
        'اللهجة التلمسانية الأندلسية العريقة (تلمسان). الميزة الأهم: اقلب حرف القاف إلى همزة (مثل: آل لي بدل قال لي)، واستخدم: آش راك، هاد الشي شباب، نهارك مبروك، دروك.',
      setif:
        'اللهجة السطايفية والهضاب العليا (سطيف وبرج بوعريريج وباتنة). استخدم مفردات الهضاب مثل: واش راك يا خو، قداه، رانا ملاح، كما هك، سطيف العالي.',
      sahara:
        'اللهجة الصحراوية والجنوبية (ورقلة وبشار وغرداية والوادي وأدرار). الميزة الأهم: انطق القاف كحرف گ (Gaf بدوية)، واستخدم عبارات الترحاب: وشحالكم، زانت أيامكم، مرحبايس، وش علومكم.',
      jijel:
        'اللهجة الجيجلية الساحلية (جيجل). الميزة الأهم: اقلب حرف القاف إلى كاف صريحة (مثل: كال لي بدل قال لي، وكاع بدل قاع)، واستخدم: دي كفاش، صحا ربي يعيشك.',
      annaba:
        'اللهجة العنابية وسواحل الشرق (عنابة والطارف). استخدم المفردات الساحلية الشرقية مثل: واش راك يا حبيبنا، واش بهادا، يعيشك، برك، ياسر.',
    };

    const targetDialectDesc = dialectGuide[dialectId] || dialectGuide.algiers;

    const prompt = `أنت خبير وباحث في اللهجات الجزائرية الشعبية والأصيلة بكافة تنوعاتها الإقليمية.
المطلوب منك تحويل وتكييف النص التالي إلى: ${targetDialectDesc}

القواعد الصارمة:
1. استخدم المفردات الحقيقية المتداولة بين سكان تلك المنطقة الجزائرية بدقة تامة.
2. ضع التشكيل اللغوي على الكلمات لضمان نطق سليم وصحيح بالعامية الجزائرية بواسطة محرك الصوت.
3. حافظ على معنى وروح الرسالة الأصلية مع إضفاء النكهة الشعبية الأصيلة للمنطقة.
4. أعد النص المحول فقط دون أي مقدمات أو تحيات أو هوامش أو علامات اقتباس إضافية.

النص المراد تحويله:
${text.trim().slice(0, 5000)}`;

    let convertedText = '';
    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        if (response.text?.trim()) {
          convertedText = response.text.trim();
          break;
        }
      } catch (err) {
        console.warn(`Model ${model} failed for dialect conversion, trying fallback:`, err);
      }
    }

    if (!convertedText) {
      convertedText = text.trim();
    }

    res.json({
      success: true,
      convertedText,
      dialectId,
    });
  } catch (error: any) {
    console.error('Algerian dialect conversion error:', error);
    res.status(500).json({
      error: error.message || 'حدث خطأ أثناء تحويل النص إلى اللهجة الجزائرية.',
    });
  }
});

// API endpoint for Arabic Tashkeel (diacritization) to ensure top pronunciation accuracy
app.post('/api/tashkeel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'يرجى تقديم نص صالح للتشكيل.' });
      return;
    }

    const prompt = `أنت خبير لغوي متخصص في علم التجويد والصوتيات واللغة العربية الفصحى.
المطلوب منك تشكيل النص العربي التالي تشكيلاً لغوياً ونحوياً دقيقاً وتاماً (الحركات: الفتحة، الضمة، الكسرة، السكون، الشدة، التنوين) بحيث يكون النطق الصوتي فائق الدقة ومخارج الحروف سليمة 100%.
حافظ على النص تماماً وبنفس الترتيب بدون إضافة أي مقدمات أو تحيات أو هوامش، أعد النص المشكول فقط:

${text.trim().slice(0, 5000)}`;

    let diacritizedText = '';
    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        if (response.text?.trim()) {
          diacritizedText = response.text.trim();
          break;
        }
      } catch (err) {
        console.warn(`Model ${model} failed for tashkeel, trying fallback:`, err);
      }
    }

    if (!diacritizedText) {
      diacritizedText = text.trim();
    }

    res.json({
      success: true,
      diacritizedText,
    });
  } catch (error: any) {
    console.error('Tashkeel error:', error);
    res.status(500).json({
      error: error.message || 'حدث خطأ أثناء تشكيل النص.',
    });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
