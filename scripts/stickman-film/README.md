# فيلم «أنا أمزح معك فقط!» — Stickman

خط إنتاج كامل يحوّل حوار `USER_SAMPLE_SCRIPT` الموجود في المستودع إلى فيديو عمودي 1080×1920 بمعدل 30 إطارًا في الثانية (H.264 + AAC).

## الخطوات

```bash
npm install --legacy-peer-deps
pip install skia-python pillow        # يحتاج libegl1 على Linux

# 1) توليد الصوت بمحرك المستودع نفسه (Gemini TTS: المرأة Kore، الرجل Fenrir، الراوي Charon)
GEMINI_API_KEY=... npm run film:audio   # -> scripts/stickman-film/out/dialogue.wav + timeline.json

# 2) تحريك المشاهد ومزامنتها مع الصوت وتصديرها
npm run film:render                     # -> scripts/stickman-film/out/ana-amzah-maak-faqat.mp4
```

- `python3 scripts/stickman-film/render.py --preview`: معاينة صامتة بتوقيتات تقديرية، ولا تحتاج مفتاحًا.
- `--stills 5:0.5,7:0.8`: صور ثابتة من منتصف السطر 5 ومن 80% من السطر 7.

## البنية
- `generate-audio.ts`: يستخدم محلل الحوار في المستودع ونماذج Gemini نفسها، ويحفظ توقيت كل جملة ومنحنى شدة الصوت لتحريك الفم.
- `rig.py`: هيكل الشخصيات وتصاميمها الثابتة (المرأة، الرجل، الساخر، ثلاثة ضحايا، والحاضرون).
- `film.py`: المشاهد (المقهى، الجلسة، الفضاء الرمزي، المنزل) وكتل التمثيل المتكررة.
- `shots.py`: جدول الإخراج الذي يربط كل جملة صوتية باللقطات التي تجسدها.
- `render.py`: المونتاج والانتقالات والتصيير المتوازي والدمج مع الصوت.

## صوت ElevenLabs (البديل المستخدم حاليًا)
وُلِّدت الجمل الـ19 في ElevenLabs بنموذج `eleven_v4` داخل الـ flow ‏`fYxIZtlz8T6nhCfwASL2`: المرأة بصوت Wiam، والرجل بصوت Aymen، والراوي بصوت Celil. معرّفات التوليد محفوظة في `elevenlabs_manifest.json`.

بعد تنزيل الملفات باسم `line_00.mp3` … `line_18.mp3` (يحتاج التنزيل إلى السماح بالنطاق `elevenlabsusercontent.com`):
```bash
python3 scripts/stickman-film/build_timeline.py <مجلد_الملفات>   # -> out/dialogue.wav + out/timeline.json
npm run film:render
```
