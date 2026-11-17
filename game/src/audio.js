// All sound is synthesized with WebAudio oscillators: no audio files, no network.
// The context is created on the first user gesture (browsers block audio before it).
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
      master = context.createGain();
      master.gain.value = 0.15;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone({ type = 'sine', from = 440, to = null, duration = 0.1, volume = 1, delay = 0 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx || !master) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    shoot() {
      tone({ type: 'square', from: 660, to: 420, duration: 0.06, volume: 0.35 });
    },
    pop() {
      tone({ type: 'triangle', from: 240, to: 55, duration: 0.14, volume: 0.8 });
    },
    core(combo) {
      const step = Math.min(combo, 12);
      tone({ type: 'sine', from: 660 * Math.pow(2, step / 12), duration: 0.09, volume: 0.5 });
    },
    hit() {
      tone({ type: 'sawtooth', from: 170, to: 45, duration: 0.28, volume: 0.9 });
      tone({ type: 'square', from: 90, to: 40, duration: 0.2, volume: 0.5, delay: 0.02 });
    },
    dash() {
      tone({ type: 'sine', from: 300, to: 900, duration: 0.12, volume: 0.4 });
    },
    waveClear() {
      [523, 659, 784].forEach((freq, i) => tone({ type: 'sine', from: freq, duration: 0.16, volume: 0.5, delay: i * 0.07 }));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((freq, i) => tone({ type: 'triangle', from: freq, duration: 0.22, volume: 0.6, delay: i * 0.13 }));
    },
    start() {
      [262, 392, 523].forEach((freq, i) => tone({ type: 'sine', from: freq, duration: 0.12, volume: 0.5, delay: i * 0.06 }));
    },
  };
}
