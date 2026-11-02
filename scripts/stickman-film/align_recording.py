"""Build out/timeline.json + out/dialogue.wav from ONE full dialogue recording.

    python3 align_recording.py path/to/full_dialogue.wav

Line boundaries are found by snapping the expected line lengths (elevenlabs_manifest.json
"duration") to the real pauses detected in the recording, so each line gets exact start/end
times, and the mouth envelope comes from the real audio.
"""
import json, math, os, re, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
SR, FPS = 24000, 30


def pitch(x, a, b):
    y = x[int(a * SR):int(b * SR)]
    fr, out = int(0.04 * SR), []
    for i in range(0, len(y) - fr, fr // 2):
        w = y[i:i + fr] - y[i:i + fr].mean()
        if np.sqrt((w ** 2).mean()) < 0.02:
            continue
        ac = np.correlate(w, w, 'full')[fr - 1:]
        lo, hi = int(SR / 400), int(SR / 70)
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.4 * ac[0]:
            out.append(SR / k)
    return float(np.median(out)) if out else 0.0


def main():
    src = sys.argv[1]
    man = json.load(open(os.path.join(HERE, 'elevenlabs_manifest.json'), encoding='utf-8'))['lines']
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                                     check=True, capture_output=True).stdout, dtype=np.int16).astype(np.float32) / 32768
    total = len(x) / SR
    log = subprocess.run(['ffmpeg', '-i', src, '-af', 'silencedetect=noise=-38dB:d=0.25', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    sil = list(zip([float(v) for v in re.findall(r'silence_start: ([\d.]+)', log)],
                   [float(v) for v in re.findall(r'silence_end: ([\d.]+)', log)]))
    durs = [l['duration'] for l in man]
    # speech segments between pauses, each with a rough pitch (male ~<140 Hz, female ~>170 Hz)
    segs, cur = [], 0.0
    for a, b in sil:
        if a > cur + 0.05:
            segs.append((cur, a))
        cur = b
    if cur < total - 0.05:
        segs.append((cur, total))
    f0s = [pitch(x, a, b) for a, b in segs]

    def cost(i, j0, j1):   # line i spans segments j0..j1 inclusive
        d = segs[j1][1] - segs[j0][0]
        c = ((d - durs[i]) / max(durs[i], 2.0)) ** 2 * 20
        fem = man[i]['speaker'] == 'woman'
        for j in range(j0, j1 + 1):
            f, ln = f0s[j], segs[j][1] - segs[j][0]
            if f and fem and f < 140:
                c += ln * (140 - f) / 20
            if f and not fem and f > 175:
                c += ln * (f - 175) / 20
        return c

    n, L = len(segs), len(man)
    INF = float('inf')
    best = [[INF] * (n + 1) for _ in range(L + 1)]
    back = [[0] * (n + 1) for _ in range(L + 1)]
    best[0][0] = 0.0
    for i in range(L):
        for j0 in range(n):
            if best[i][j0] == INF:
                continue
            for j1 in range(j0, min(n, j0 + 14)):
                v = best[i][j0] + cost(i, j0, j1)
                if v < best[i + 1][j1 + 1]:
                    best[i + 1][j1 + 1] = v
                    back[i + 1][j1 + 1] = j0
    spans, j = [], n
    for i in range(L, 0, -1):
        j0 = back[i][j]
        spans.append((j0, j - 1))
        j = j0
    spans.reverse()
    starts = [segs[a][0] for a, _ in spans]
    ends = [segs[b][1] for _, b in spans]
    lines = []
    for i, m in enumerate(man):
        a, b = starts[i], ends[i]
        seg = x[int(a * SR): int(b * SR)]
        spf = SR / FPS
        env = [float(min(1.0, math.sqrt(float(np.mean(seg[int(f * spf):int((f + 1) * spf)] ** 2) or 0)) * 6))
               for f in range(int(math.ceil(len(seg) / spf)))]
        lines.append(dict(index=i, speaker=m['speaker'], text=m['text'], start=a, end=b, env=env))
        print(f'{i:2d} {m["speaker"]:8s} {a:7.2f}-{b:7.2f} ({b - a:5.2f}s, expected {m["duration"]:5.2f})')
    os.makedirs(OUT, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', str(SR), os.path.join(OUT, 'dialogue.wav')], check=True)
    json.dump(dict(duration=total, fps=FPS, lines=lines), open(os.path.join(OUT, 'timeline.json'), 'w'), ensure_ascii=False)
    print(f'total {total:.2f}s')


if __name__ == '__main__':
    main()
