"""Build out/dialogue.wav + out/timeline.json from per-line audio files (e.g. ElevenLabs MP3s).

    python3 build_timeline.py audio_dir/      # expects line_00.* ... line_18.* in script order

Speakers follow the repo's parser order (see elevenlabs_manifest.json). Silence at the edges of
each file is trimmed and a 400 ms gap is placed between lines, like the app's dialogue merge.
"""
import glob
import json
import math
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
SR, FPS, GAP = 24000, 30, 0.4


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def trim(x, thr=0.01, pad=0.06):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    p = int(pad * SR)
    return x[max(0, idx[0] - p): min(len(x), idx[-1] + p)]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'elevenlabs')
    manifest = json.load(open(os.path.join(HERE, 'elevenlabs_manifest.json'), encoding='utf-8'))
    lines_meta = manifest['lines']
    chunks, timeline, cursor = [], [], 0
    gap = np.zeros(int(GAP * SR), dtype=np.float32)
    for i, meta in enumerate(lines_meta):
        files = sorted(glob.glob(os.path.join(src, f'line_{i:02d}.*')))
        if not files:
            sys.exit(f'missing audio for line {i} in {src}')
        x = trim(decode(files[0]))
        if i:
            chunks.append(gap)
            cursor += len(gap)
        start = cursor / SR
        chunks.append(x)
        cursor += len(x)
        spf = SR / FPS
        env = []
        for f in range(int(math.ceil(len(x) / spf))):
            seg = x[int(f * spf): int((f + 1) * spf)]
            env.append(float(min(1.0, math.sqrt(float(np.mean(seg ** 2))) * 6)) if len(seg) else 0.0)
        timeline.append(dict(index=i, speaker=meta['speaker'], text=meta['text'], start=start, end=cursor / SR, env=env))
    pcm = (np.clip(np.concatenate(chunks), -1, 1) * 32767).astype('<i2')
    os.makedirs(OUT, exist_ok=True)
    wav = os.path.join(OUT, 'dialogue.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', wav],
                   input=pcm.tobytes(), check=True)
    dur = len(pcm) / SR
    json.dump(dict(duration=dur, fps=FPS, lines=timeline), open(os.path.join(OUT, 'timeline.json'), 'w'), ensure_ascii=False)
    print(f'{len(timeline)} lines, {dur:.2f}s -> {wav}')


if __name__ == '__main__':
    main()
