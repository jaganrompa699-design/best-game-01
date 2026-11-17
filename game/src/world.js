// Pulse Harvest: the world. One player orb harvests cores from void shards in a
// top-down arena. Enemies arrive in waves; destroying them drops cores, and cores
// collected in a quick chain raise the combo multiplier. Three lives; the game
// ends when they run out. Everything advances in fixed steps so a seed replays.
import { FIELD, PLAYER, ENEMIES, CORE, WAVE, STEP } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE = 4;
export const EVENT_CORE = 8;

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function clampToField(entity, radius) {
  entity.x = Math.min(FIELD.width - radius, Math.max(radius, entity.x));
  entity.y = Math.min(FIELD.height - radius, Math.max(radius, entity.y));
}

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      score: 0,
      best: 0,
      lives: 3,
      wave: 0,
      combo: 0,
      comboTimer: 0,
      coresCollected: 0,
      kills: 0,
      time: 0,
      waveState: 'breather',
      waveTimer: 1.2,
      spawnQueue: [],
      spawnTimer: 0,
      shake: 0,
      flash: 0,
      banner: '',
      bannerTimer: 0,
      player: {
        x: FIELD.width / 2,
        y: FIELD.height / 2,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        fireTimer: 0,
        dashTimer: 0,
        dashCooldown: 0,
        invulnerable: 0,
        alive: true,
      },
      bolts: [],
      enemies: [],
      cores: [],
      particles: [],
      popups: [],
    };
  }

  function spawnPoint(margin) {
    // Pick an edge point away from the player so nothing appears on top of them.
    for (let tries = 0; tries < 8; tries += 1) {
      const side = random.int(0, 3);
      const m = margin;
      let x;
      let y;
      if (side === 0) { x = random.range(m, FIELD.width - m); y = m; }
      else if (side === 1) { x = random.range(m, FIELD.width - m); y = FIELD.height - m; }
      else if (side === 2) { x = m; y = random.range(m, FIELD.height - m); }
      else { x = FIELD.width - m; y = random.range(m, FIELD.height - m); }
      const dx = x - state.player.x;
      const dy = y - state.player.y;
      if (dx * dx + dy * dy > 240 * 240) return { x, y };
    }
    return { x: FIELD.width / 2, y: 40 };
  }

  function waveComposition(wave) {
    const list = [];
    const count = WAVE.baseCount + WAVE.perWave * wave;
    for (let i = 0; i < count; i += 1) {
      const roll = random.next();
      if (wave >= 5 && i === 0) list.push('monolith');
      else if (wave >= 3 && roll < 0.22) list.push('splitter');
      else if (wave >= 2 && roll < 0.45) list.push('dasher');
      else list.push('shard');
    }
    return list;
  }

  function startWave(wave) {
    state.wave = wave;
    state.spawnQueue = waveComposition(wave);
    state.spawnTimer = 0;
    state.waveState = 'fighting';
    state.banner = `WAVE ${wave}`;
    state.bannerTimer = 1.6;
  }

  function spawnEnemy(kind) {
    const def = ENEMIES[kind];
    const point = spawnPoint(def.radius + 6);
    const speed = def.speed * (1 + 0.07 * (state.wave - 1));
    state.enemies.push({
      kind,
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      radius: def.radius,
      hp: def.hp,
      maxHp: def.hp,
      speed,
      score: def.score,
      color: def.color,
      angle: random.angle(),
      spin: random.range(-1.6, 1.6),
      lungeTimer: random.range(1.2, 2.4),
      lunging: 0,
      telegraph: 0,
      hitFlash: 0,
    });
  }

  function dropCore(x, y, guaranteed) {
    if (!guaranteed && random.next() > 0.6) return;
    const angle = random.angle();
    const speed = random.range(40, 130);
    state.cores.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: CORE.radius,
      life: 9,
    });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.angle();
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: random.range(0.25, 0.6),
        maxLife: 0.6,
        radius: random.range(2, 4.5),
        color,
      });
    }
  }

  function addPopup(x, y, text, color) {
    state.popups.push({ x, y, text, color, life: 0.9 });
  }

  function addScore(base, x, y) {
    const gained = base * Math.max(1, state.combo);
    state.score += gained;
    addPopup(x, y, `+${gained}`, '#ffe066');
  }

  function killEnemy(enemy, index) {
    state.enemies.splice(index, 1);
    state.kills += 1;
    burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'monolith' ? 42 : 16, 260);
    addScore(enemy.score, enemy.x, enemy.y);
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 2; i += 1) {
        const def = ENEMIES.shard;
        state.enemies.push({
          kind: 'shard',
          x: enemy.x + (i === 0 ? -14 : 14),
          y: enemy.y,
          vx: 0, vy: 0,
          radius: def.radius, hp: def.hp, maxHp: def.hp,
          speed: def.speed * 1.15,
          score: def.score, color: def.color,
          angle: random.angle(), spin: random.range(-1.6, 1.6),
          lungeTimer: 0, lunging: 0, telegraph: 0, hitFlash: 0,
        });
      }
    }
    if (enemy.kind === 'monolith') {
      for (let i = 0; i < 5; i += 1) dropCore(enemy.x + random.range(-30, 30), enemy.y + random.range(-30, 30), true);
      for (let i = 0; i < 3; i += 1) {
        const point = spawnPoint(30);
        const def = ENEMIES.shard;
        state.enemies.push({
          kind: 'shard', x: point.x, y: point.y, vx: 0, vy: 0,
          radius: def.radius, hp: def.hp, maxHp: def.hp,
          speed: def.speed * 1.1,
          score: def.score, color: def.color,
          angle: random.angle(), spin: random.range(-1.6, 1.6),
          lungeTimer: 0, lunging: 0, telegraph: 0, hitFlash: 0,
        });
      }
    } else {
      dropCore(enemy.x, enemy.y, false);
    }
  }

  function hurtPlayer() {
    const player = state.player;
    if (player.invulnerable > 0 || player.dashTimer > 0) return 0;
    state.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    player.invulnerable = PLAYER.invulnerableAfterHit;
    player.vx = 0;
    player.vy = 0;
    state.shake = 0.45;
    state.flash = 0.35;
    burst(player.x, player.y, '#ff5d73', 26, 320);
    if (state.lives <= 0) {
      player.alive = false;
      burst(player.x, player.y, '#7df9ff', 50, 380);
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function stepPlayer(dt, move, aim, firing, dash) {
    const player = state.player;
    if (!player.alive) return;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.fireTimer = Math.max(0, player.fireTimer - dt);

    const dx = aim.x - player.x;
    const dy = aim.y - player.y;
    if (dx * dx + dy * dy > 4) player.angle = Math.atan2(dy, dx);

    if (dash && player.dashCooldown <= 0 && player.dashTimer <= 0) {
      player.dashTimer = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown;
      const dashAngle = move.x !== 0 || move.y !== 0 ? Math.atan2(move.y, move.x) : player.angle;
      player.vx = Math.cos(dashAngle) * PLAYER.dashSpeed;
      player.vy = Math.sin(dashAngle) * PLAYER.dashSpeed;
      burst(player.x, player.y, '#7df9ff', 10, 160);
    }

    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
    } else {
      player.vx += move.x * PLAYER.accel * dt;
      player.vy += move.y * PLAYER.accel * dt;
      const drag = Math.exp(-PLAYER.friction * dt);
      player.vx *= drag;
      player.vy *= drag;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > PLAYER.speed) {
        player.vx = (player.vx / speed) * PLAYER.speed;
        player.vy = (player.vy / speed) * PLAYER.speed;
      }
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    clampToField(player, PLAYER.radius);

    if (firing && player.fireTimer <= 0) {
      player.fireTimer = PLAYER.fireInterval;
      state.bolts.push({
        x: player.x + Math.cos(player.angle) * (PLAYER.radius + 6),
        y: player.y + Math.sin(player.angle) * (PLAYER.radius + 6),
        vx: Math.cos(player.angle) * PLAYER.boltSpeed,
        vy: Math.sin(player.angle) * PLAYER.boltSpeed,
        radius: PLAYER.boltRadius,
        life: 1.1,
      });
    }
  }

  function stepEnemies(dt) {
    const player = state.player;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      const nx = dx / distance;
      const ny = dy / distance;

      if (enemy.kind === 'dasher') {
        enemy.lungeTimer -= dt;
        if (enemy.lunging > 0) {
          enemy.lunging -= dt;
          enemy.x += enemy.vx * dt;
          enemy.y += enemy.vy * dt;
        } else if (enemy.telegraph > 0) {
          enemy.telegraph -= dt;
          if (enemy.telegraph <= 0) {
            enemy.lunging = 0.32;
            enemy.vx = nx * ENEMIES.dasher.lungeSpeed;
            enemy.vy = ny * ENEMIES.dasher.lungeSpeed;
          }
        } else {
          enemy.x += nx * enemy.speed * dt;
          enemy.y += ny * enemy.speed * dt;
          if (enemy.lungeTimer <= 0 && distance < 420 && player.alive) {
            enemy.telegraph = 0.45;
            enemy.lungeTimer = ENEMIES.dasher.lungeInterval;
          }
        }
      } else if (enemy.kind === 'monolith') {
        enemy.x += nx * enemy.speed * dt;
        enemy.y += ny * enemy.speed * dt;
        enemy.angle += enemy.spin * dt * 0.25;
      } else {
        // Chasers wobble a little so their paths are not straight lines.
        const wobble = Math.sin(state.time * 2 + enemy.angle * 3) * 0.35;
        const px = -ny * wobble;
        const py = nx * wobble;
        enemy.x += (nx + px) * enemy.speed * dt;
        enemy.y += (ny + py) * enemy.speed * dt;
        enemy.angle += enemy.spin * dt;
      }
      clampToField(enemy, enemy.radius);

      // Touching the player hurts, unless the player is dashing or invulnerable.
      if (player.alive && distance < enemy.radius + PLAYER.radius) {
        const result = hurtPlayer();
        if (result & EVENT_OVER) return result;
        if (result & EVENT_HIT) {
          // Knock the enemy back so one touch is one hit.
          enemy.x -= nx * 30;
          enemy.y -= ny * 30;
        }
      }
    }
    return 0;
  }

  function stepBolts(dt) {
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const bolt = state.bolts[i];
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      if (bolt.life <= 0 || bolt.x < 0 || bolt.x > FIELD.width || bolt.y < 0 || bolt.y > FIELD.height) {
        state.bolts.splice(i, 1);
        continue;
      }
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        const rr = bolt.radius + enemy.radius;
        if (dist2(bolt, enemy) < rr * rr) {
          state.bolts.splice(i, 1);
          enemy.hp -= 1;
          enemy.hitFlash = 0.12;
          burst(bolt.x, bolt.y, '#ffe066', 5, 140);
          if (enemy.hp <= 0) killEnemy(enemy, j);
          break;
        }
      }
    }
  }

  function stepCores(dt) {
    const player = state.player;
    for (let i = state.cores.length - 1; i >= 0; i -= 1) {
      const core = state.cores[i];
      core.life -= dt;
      if (core.life <= 0) {
        state.cores.splice(i, 1);
        continue;
      }
      const dx = player.x - core.x;
      const dy = player.y - core.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (player.alive && distance < CORE.magnetRadius) {
        const pull = CORE.pullSpeed * (1 - distance / (CORE.magnetRadius + 60));
        core.vx += (dx / distance) * pull * dt * 6;
        core.vy += (dy / distance) * pull * dt * 6;
      } else {
        core.vx *= Math.exp(-2 * dt);
        core.vy *= Math.exp(-2 * dt);
      }
      core.x += core.vx * dt;
      core.y += core.vy * dt;
      if (player.alive && distance < PLAYER.radius + core.radius + 6) {
        state.cores.splice(i, 1);
        state.coresCollected += 1;
        state.combo = Math.min(CORE.maxCombo, state.combo + 1);
        state.comboTimer = CORE.comboWindow;
        const gained = CORE.value * Math.max(1, state.combo);
        state.score += gained;
        addPopup(core.x, core.y, `+${gained}`, '#8dff6e');
        burst(core.x, core.y, '#8dff6e', 6, 120);
      }
    }
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
  }

  function stepFx(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-3 * dt);
      p.vy *= Math.exp(-3 * dt);
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const p = state.popups[i];
      p.y -= 34 * dt;
      p.life -= dt;
      if (p.life <= 0) state.popups.splice(i, 1);
    }
    state.shake = Math.max(0, state.shake - dt);
    state.flash = Math.max(0, state.flash - dt);
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
  }

  function stepWaves(dt) {
    if (state.waveState === 'breather') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) startWave(state.wave + 1);
      return 0;
    }
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(state.spawnQueue.shift());
        state.spawnTimer = Math.max(0.35, 1.1 - state.wave * 0.06);
      }
      return 0;
    }
    if (state.enemies.length === 0) {
      const bonus = WAVE.clearBonus + state.wave * 50;
      state.score += bonus;
      state.banner = `WAVE ${state.wave} CLEAR  +${bonus}`;
      state.bannerTimer = 2;
      state.waveState = 'breather';
      state.waveTimer = WAVE.breather;
      return EVENT_WAVE;
    }
    return 0;
  }

  return {
    state,
    reset() {
      const kept = state.best;
      Object.assign(state, freshState());
      state.best = kept;
    },
    setBest(best) {
      state.best = best;
    },
    start() {
      this.reset();
      state.waveState = 'breather';
      state.waveTimer = 1.2;
    },
    step(dt, move, aim, firing, dash) {
      state.time += dt;
      let events = 0;
      stepPlayer(dt, move, aim, firing, dash);
      if (state.player.alive) {
        events |= stepEnemies(dt);
        if (events & EVENT_OVER) return events;
      }
      stepBolts(dt);
      stepCores(dt);
      events |= stepWaves(dt);
      stepFx(dt);
      return events;
    },
  };
}

export { STEP };
