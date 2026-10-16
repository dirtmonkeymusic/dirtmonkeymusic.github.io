"""Synthesize a stand-in track with stems and ground truth, for testing the beatmap maker."""
import json, os, shutil, subprocess, sys, wave
import numpy as np

SR = 44100
BPM = float(sys.argv[1]) if len(sys.argv) > 1 else 145.0
OFFSET = float(sys.argv[2]) if len(sys.argv) > 2 else 0.37
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(HERE, "..", "tmp-audio")
# ffmpeg from PATH, or the one npm install puts in dev/node_modules.
FFMPEG = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or os.path.join(HERE, "node_modules", "ffmpeg-static", "ffmpeg")
SPB = 60 / BPM
# (type, bars)
PLAN = [("intro", 8), ("build", 4), ("drop", 16), ("break", 8), ("drop", 16), ("outro", 6)]
BARS = sum(b for _, b in PLAN)
N = int((OFFSET + BARS * 4 * SPB + 1.5) * SR)
rng = np.random.default_rng(7)

kick = np.zeros(N); snare = np.zeros(N); bass = np.zeros(N); hats = np.zeros(N); pad = np.zeros(N)
truth = {"kick": [], "snare": [], "bpm": BPM, "offset": OFFSET, "drops": []}

def at(beat):
    return OFFSET + beat * SPB

def put(buf, t, sig, gain=1.0):
    i = int(round(t * SR)); j = min(N, i + len(sig)); buf[i:j] += gain * sig[: j - i]

def k_sig():
    n = int(0.35 * SR); tt = np.arange(n) / SR
    f = 50 + 110 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)

def s_sig():
    n = int(0.25 * SR); tt = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 25)
    noise = rng.uniform(-1, 1, n) * np.exp(-tt * 16)
    return 0.6 * body + 0.7 * noise

def h_sig():
    n = int(0.05 * SR); tt = np.arange(n) / SR
    x = rng.uniform(-1, 1, n) * np.exp(-tt * 80)
    return np.diff(np.concatenate([[0], x]))

K, S, H = k_sig(), s_sig(), h_sig()
beat = 0
for typ, bars in PLAN:
    start = beat
    for b in range(bars):
        b0 = beat + b * 4
        if typ in ("intro", "break") and b % 2 == 0:
            n = int(3 * SPB * SR); tt = np.arange(n) / SR
            env = np.minimum(1, tt / 0.01) * np.minimum(1, (n / SR - tt) / 0.05)
            put(bass, at(b0), np.sin(2 * np.pi * 41.2 * tt) * env * 0.8)
        if typ == "intro":
            put(kick, at(b0), K, 0.6); truth["kick"].append(b0)
            for e in range(8): put(hats, at(b0 + e * 0.5), H, 0.15)
        elif typ == "build":
            put(kick, at(b0), K, 0.7); truth["kick"].append(b0)
            hits = [0, 1, 2, 3] if b < 2 else [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] if b == 2 else [i * 0.25 for i in range(14)]
            for h in hits:
                put(snare, at(b0 + h), S, 0.3 + 0.1 * b); truth["snare"].append(b0 + h)
        elif typ == "drop":
            for kb in (0, 1.5):
                put(kick, at(b0 + kb), K, 1.0); truth["kick"].append(b0 + kb)
            put(snare, at(b0 + 2), S, 0.9); truth["snare"].append(b0 + 2)
            for e in range(8): put(hats, at(b0 + e * 0.5), H, 0.3)
            # wobble bass: two detuned saws with an 8th-note LFO on the level
            t0 = at(b0); n = int(4 * SPB * SR); tt = np.arange(n) / SR
            f = 55.0 if (b // 2) % 2 == 0 else 49.0
            saw = ((tt * f) % 1) * 2 - 1 + ((tt * f * 1.01) % 1) * 2 - 1
            lfo = 0.5 - 0.5 * np.cos(2 * np.pi * tt / (SPB / 2))
            put(bass, t0, np.tanh(2 * saw) * lfo * 0.5)
        elif typ == "break":
            if b % 2 == 0: put(kick, at(b0), K, 0.5); truth["kick"].append(b0)
        elif typ == "outro":
            put(kick, at(b0), K, 0.5); truth["kick"].append(b0)
    if typ == "drop":
        truth["drops"].append([start // 4, start // 4 + bars])
    # pad chord under everything
    t0 = at(beat); n = int(bars * 4 * SPB * SR); tt = np.arange(n) / SR
    chord = sum(np.sin(2 * np.pi * fr * tt) for fr in (220, 261.6, 329.6)) / 3
    put(pad, t0, chord * (0.12 if typ != "drop" else 0.06))
    beat += bars * 4

mix = kick * 0.9 + snare * 0.7 + bass * 0.8 + hats + pad
mix /= np.max(np.abs(mix)) * 1.05

def write16(path, x):
    x = np.clip(x / max(1e-9, np.max(np.abs(x))) * 0.9, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())

def write24_stereo(path, x):
    x = np.clip(x, -1, 1)
    v = (x * 8388607).astype("<i4")
    st = np.stack([v, v], axis=1).reshape(-1)
    b = st.astype("<i4").tobytes()
    raw = b"".join(b[i:i + 3] for i in range(0, len(b), 4))
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR)
        w.writeframes(raw)

os.makedirs(OUT, exist_ok=True)
write16(f"{OUT}/kick.wav", kick); write16(f"{OUT}/snare.wav", snare); write16(f"{OUT}/bass.wav", bass)
write24_stereo(f"{OUT}/mix.wav", mix)
subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", f"{OUT}/mix.wav", "-b:a", "192k", f"{OUT}/mix.mp3"], check=True)
json.dump(truth, open(f"{OUT}/truth.json", "w"))
print("bars", BARS, "seconds", round(N / SR, 1), "kicks", len(truth["kick"]), "snares", len(truth["snare"]), "drops", truth["drops"])
