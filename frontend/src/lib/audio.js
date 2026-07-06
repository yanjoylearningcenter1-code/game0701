// Web Audio API sound effects - no external files needed.
let ctx = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function tone({ freq = 440, duration = 0.15, type = "sine", gain = 0.18, freqEnd = null, delay = 0 }) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise({ duration = 0.2, gain = 0.18, delay = 0 }) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(gain, t0);
  src.connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + duration);
}

export const sfx = {
  correct() {
    tone({ freq: 660, duration: 0.12, type: "triangle", gain: 0.18 });
    tone({ freq: 988, duration: 0.18, type: "triangle", gain: 0.18, delay: 0.09 });
  },
  wrong() {
    tone({ freq: 220, duration: 0.18, type: "sawtooth", gain: 0.18, freqEnd: 120 });
  },
  combo(level = 1) {
    const base = 660 + level * 80;
    tone({ freq: base, duration: 0.1, type: "square", gain: 0.14 });
    tone({ freq: base * 1.5, duration: 0.12, type: "square", gain: 0.12, delay: 0.06 });
  },
  bossAttack() {
    noise({ duration: 0.25, gain: 0.25 });
    tone({ freq: 90, duration: 0.3, type: "sawtooth", gain: 0.22, freqEnd: 45 });
  },
  victory() {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, duration: 0.18, type: "triangle", gain: 0.2, delay: i * 0.12 })
    );
  },
  click() {
    tone({ freq: 880, duration: 0.05, type: "triangle", gain: 0.1 });
  },
  magic() {
    [440, 660, 880, 1320].forEach((f, i) =>
      tone({ freq: f, duration: 0.25, type: "sine", gain: 0.14, delay: i * 0.08 })
    );
  },
};

export function unlockAudio() {
  getCtx();
}
