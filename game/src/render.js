// Everything the player sees: the starfield arena, the orb, the shards, the cores,
// the particles, the HUD and the four screens (title, play, paused, game over).
// All art is drawn in code: gradients, polygons and glow, no image files.
import { FIELD, PLAYER, COLORS, CORE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function hexPath(ctx, x, y, radius, rotation) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = rotation + (i * Math.PI) / 3;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawGlow(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: ((i * 373) % FIELD.width) / 1,
      y: ((i * 911) % FIELD.height) / 1,
      r: 0.6 + ((i * 7) % 10) / 10,
      twinkle: (i * 13) % 100 / 100,
    });
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, COLORS.bg1);
    gradient.addColorStop(1, COLORS.bg0);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 80; x < FIELD.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke();
    }
    for (let y = 80; y < FIELD.height; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
    }
    for (const star of stars) {
      const alpha = 0.25 + 0.55 * Math.abs(Math.sin(time * 0.7 + star.twinkle * 6));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#cdd8ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(player, time) {
    if (!player.alive) return;
    const blink = player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
    if (blink) return;
    drawGlow(ctx, player.x, player.y, 46, 'rgba(125,249,255,0.35)', 0.9);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 6, 0, Math.PI * 2);
    ctx.fill();
    // Dash cooldown ring.
    if (player.dashCooldown > 0) {
      ctx.strokeStyle = 'rgba(125,249,255,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER.radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - player.dashCooldown / PLAYER.dashCooldown));
      ctx.stroke();
    }
  }

  function drawEnemies(enemies, time) {
    for (const enemy of enemies) {
      const flash = enemy.hitFlash > 0;
      if (enemy.kind === 'monolith') {
        drawGlow(ctx, enemy.x, enemy.y, 110, 'rgba(93,242,214,0.28)', 0.9);
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.angle);
        ctx.fillStyle = flash ? '#ffffff' : enemy.color;
        ctx.strokeStyle = 'rgba(234,252,255,0.8)';
        ctx.lineWidth = 2;
        hexPath(ctx, 0, 0, enemy.radius, 0);
        ctx.fill();
        ctx.stroke();
        hexPath(ctx, 0, 0, enemy.radius * 0.55, Math.PI / 6);
        ctx.fillStyle = 'rgba(7,11,29,0.85)';
        ctx.fill();
        ctx.restore();
        // Health bar.
        const w = 84;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 18, w, 8);
        ctx.fillStyle = '#5df2d6';
        ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 18, w * (enemy.hp / enemy.maxHp), 8);
      } else if (enemy.kind === 'splitter') {
        drawGlow(ctx, enemy.x, enemy.y, 52, 'rgba(199,146,255,0.3)', 0.8);
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.angle);
        ctx.fillStyle = flash ? '#ffffff' : enemy.color;
        ctx.strokeStyle = 'rgba(234,252,255,0.7)';
        ctx.lineWidth = 2;
        hexPath(ctx, 0, 0, enemy.radius, 0);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(7,11,29,0.8)';
        ctx.fill();
        ctx.restore();
      } else {
        const glowColor = enemy.kind === 'dasher' ? 'rgba(255,180,84,0.35)' : 'rgba(255,93,115,0.3)';
        drawGlow(ctx, enemy.x, enemy.y, 44, glowColor, 0.85);
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.angle);
        ctx.fillStyle = flash ? '#ffffff' : enemy.color;
        ctx.strokeStyle = 'rgba(234,252,255,0.65)';
        ctx.lineWidth = 2;
        hexPath(ctx, 0, 0, enemy.radius, 0);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(7,11,29,0.8)';
        ctx.fill();
        ctx.restore();
        if (enemy.telegraph > 0) {
          ctx.strokeStyle = `rgba(255,180,84,${0.4 + 0.6 * Math.abs(Math.sin(time * 18))})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 9, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  function drawBolts(bolts) {
    for (const bolt of bolts) {
      drawGlow(ctx, bolt.x, bolt.y, 14, 'rgba(255,224,102,0.6)', 0.9);
      ctx.fillStyle = COLORS.bolt;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCores(cores, time) {
    for (const core of cores) {
      const pulse = 1 + 0.18 * Math.sin(time * 6 + core.x);
      drawGlow(ctx, core.x, core.y, 22 * pulse, 'rgba(141,255,110,0.4)', 0.9);
      ctx.save();
      ctx.translate(core.x, core.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.core;
      ctx.fillRect(-5.5 * pulse, -5.5 * pulse, 11 * pulse, 11 * pulse);
      ctx.restore();
    }
  }

  function drawFx(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const p of state.popups) {
      ctx.globalAlpha = Math.max(0, p.life / 0.9);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state) {
    ctx.fillStyle = 'rgba(4,7,20,0.55)';
    ctx.fillRect(0, 0, FIELD.width, 52);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${state.score}`, 18, 34);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(`BEST ${state.best}`, 210, 34);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(state.wave > 0 ? `WAVE ${state.wave}` : 'GET READY', FIELD.width / 2, 33);
    ctx.textAlign = 'right';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = COLORS.text;
    let hearts = '';
    for (let i = 0; i < 3; i += 1) hearts += i < state.lives ? '♥ ' : '♡ ';
    ctx.fillText(hearts.trim(), FIELD.width - 18, 33);
    // Combo bar, bottom left.
    if (state.combo > 0) {
      const w = 180;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(18, FIELD.height - 34, w, 14);
      ctx.fillStyle = '#ffb454';
      ctx.fillRect(18, FIELD.height - 34, w * (state.comboTimer / CORE.comboWindow), 14);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`COMBO x${Math.max(1, state.combo)}`, 18, FIELD.height - 40);
    }
    // Dash bar, bottom right.
    const dashReady = state.player.dashCooldown <= 0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(FIELD.width - 198, FIELD.height - 34, 180, 14);
    ctx.fillStyle = dashReady ? '#7df9ff' : '#3a4a7a';
    ctx.fillRect(FIELD.width - 198, FIELD.height - 34, 180 * (dashReady ? 1 : 1 - state.player.dashCooldown / PLAYER.dashCooldown), 14);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dashReady ? 'DASH READY [SPACE]' : 'DASH…', FIELD.width - 18, FIELD.height - 40);
    // Wave banner.
    if (state.bannerTimer > 0 && state.banner) {
      ctx.globalAlpha = Math.min(1, state.bannerTimer);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.banner, FIELD.width / 2, 150);
      ctx.globalAlpha = 1;
    }
  }

  function drawTitle(state, best) {
    drawBackground(state.time);
    ctx.fillStyle = 'rgba(4,7,20,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7df9ff';
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.fillText('PULSE', FIELD.width / 2, 300);
    ctx.fillStyle = '#8dff6e';
    ctx.fillText('HARVEST', FIELD.width / 2, 388);
    ctx.fillStyle = COLORS.text;
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Pilot the pulse orb. Shatter the void shards, harvest their cores,', FIELD.width / 2, 452);
    ctx.fillText('chain combos — and survive the waves.', FIELD.width / 2, 482);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('WASD / arrows to move · mouse to aim · hold click to fire · SPACE to dash', FIELD.width / 2, 540);
    ctx.fillText('P pause · M mute · cores charge your combo', FIELD.width / 2, 568);
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 26px system-ui, sans-serif';
    const blink = Math.floor(state.time * 2) % 2 === 0;
    if (blink) ctx.fillText('PRESS ENTER OR CLICK TO PLAY', FIELD.width / 2, 640);
    if (best > 0) {
      ctx.fillStyle = COLORS.dim;
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 690);
    }
  }

  function drawPaused(state) {
    ctx.fillStyle = 'rgba(4,7,20,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', FIELD.width / 2, 380);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText('Press P or Esc to resume', FIELD.width / 2, 430);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(10,4,12,0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5d73';
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.fillText('SIGNAL LOST', FIELD.width / 2, 300);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`Score ${state.score}   ·   Wave ${state.wave}   ·   Cores ${state.coresCollected}`, FIELD.width / 2, 372);
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(`Best ${best}   ·   Kills ${state.kills}`, FIELD.width / 2, 414);
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 26px system-ui, sans-serif';
    const blink = Math.floor(state.time * 2) % 2 === 0;
    if (blink) ctx.fillText('PRESS ENTER OR CLICK TO PLAY AGAIN', FIELD.width / 2, 500);
  }

  return {
    draw(state, screen, best) {
      ctx.save();
      if (state.shake > 0) {
        const mag = state.shake * 22;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }
      if (screen === SCREEN_TITLE) {
        drawTitle(state, best);
      } else if (screen === SCREEN_OVER) {
        drawBackground(state.time);
        drawCores(state.cores, state.time);
        drawEnemies(state.enemies, state.time);
        drawFx(state);
        drawHud(state);
        drawOver(state, best);
      } else {
        drawBackground(state.time);
        drawCores(state.cores, state.time);
        drawEnemies(state.enemies, state.time);
        drawBolts(state.bolts);
        drawPlayer(state.player, state.time);
        drawFx(state);
        drawHud(state);
        if (screen === SCREEN_PAUSED) drawPaused(state);
      }
      ctx.restore();
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255,93,115,${state.flash * 0.55})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
    },
  };
}
