// Every tuning number for Pulse Harvest lives here, so balance can be read and
// changed in one place. The field is the canvas size in CSS pixels.
export const FIELD = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const LIVES = 3;
export const BEST_KEY = 'pulse-harvest-best';

export const PLAYER = {
  radius: 14,
  speed: 340,
  accel: 2600,
  friction: 6.5,
  fireInterval: 1 / 6,
  boltSpeed: 640,
  boltRadius: 5,
  dashSpeed: 920,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnerableAfterHit: 1.5,
};

export const ENEMIES = {
  shard: { radius: 16, hp: 1, speed: 72, score: 50, color: '#ff5d73' },
  splitter: { radius: 21, hp: 2, speed: 56, score: 100, color: '#c792ff' },
  dasher: { radius: 14, hp: 1, speed: 62, score: 150, color: '#ffb454', lungeInterval: 2.2, lungeSpeed: 430 },
  monolith: { radius: 48, hp: 24, speed: 26, score: 1000, color: '#5df2d6' },
};

export const CORE = { radius: 8, magnetRadius: 150, pullSpeed: 420, value: 10, comboWindow: 2.5, maxCombo: 8 };
export const WAVE = { baseCount: 4, perWave: 2, breather: 3, clearBonus: 250 };
export const COLORS = {
  bg0: '#070b1d',
  bg1: '#0d1533',
  grid: 'rgba(120,150,255,0.07)',
  player: '#7df9ff',
  playerCore: '#eafcff',
  bolt: '#ffe066',
  core: '#8dff6e',
  text: '#e8ecff',
  dim: '#9aa5d6',
  danger: '#ff5d73',
};
