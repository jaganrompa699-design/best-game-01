// The screenshot scenes behind ?shot=start|play|monolith|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (chase the nearest core when it is safe, otherwise keep the
// nearest enemy at range and shoot at it, dash away when crowded), so the frame is
// what a short game really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 30;
const START_SECONDS = 4;
const PLAY_SECONDS = 34;
const MONOLITH_SECONDS = 150;
const END_SECONDS = 240;

/** Steer the orb for one step: returns { move, aim, firing, dash }. */
function autopilot(state, skill) {
  const player = state.player;
  const aim = { x: player.x + Math.cos(player.angle) * 100, y: player.y + Math.sin(player.angle) * 100 };
  let nearest = null;
  let nearestD2 = Infinity;
  for (const enemy of state.enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < nearestD2) {
      nearestD2 = d2;
      nearest = enemy;
    }
  }
  if (nearest) {
    aim.x = nearest.x;
    aim.y = nearest.y;
  }
  // Flee direction: away from the closest enemy, blended toward the centre.
  let mx = 0;
  let my = 0;
  if (nearest && nearestD2 < 260 * 260) {
    mx = (player.x - nearest.x) / Math.sqrt(nearestD2);
    my = (player.y - nearest.y) / Math.sqrt(nearestD2);
  }
  const cx = FIELD.width / 2 - player.x;
  const cy = FIELD.height / 2 - player.y;
  const cd = Math.hypot(cx, cy) || 1;
  mx += (cx / cd) * 0.45;
  my += (cy / cd) * 0.45;
  // Chase the nearest core when it is close and no enemy is on top of us.
  let core = null;
  let coreD2 = Infinity;
  for (const c of state.cores) {
    const dx = c.x - player.x;
    const dy = c.y - player.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < coreD2) {
      coreD2 = d2;
      core = c;
    }
  }
  if (core && coreD2 < 200 * 200 && nearestD2 > 130 * 130) {
    mx = (core.x - player.x) / Math.sqrt(coreD2);
    my = (core.y - player.y) / Math.sqrt(coreD2);
  }
  const m = Math.hypot(mx, my) || 1;
  const dash = skill > 0 && nearestD2 < 95 * 95 && player.dashCooldown <= 0;
  return {
    move: { x: mx / m, y: my / m },
    aim,
    firing: skill > 0 && nearest !== null,
    dash,
  };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. The play scene's pilot plays well; the end scene's pilot
 * never fires and never moves, so the shards catch it as a careless player is.
 */
export function stageShot(name, world) {
  world.start();
  if (name !== 'play' && name !== 'monolith' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, { x: 640, y: 300 }, false, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_SECONDS : name === 'monolith' ? MONOLITH_SECONDS : PLAY_SECONDS;
  const skill = name === 'end' ? 0 : 1;
  for (let i = 0; i < limit / STEP; i += 1) {
    const input = skill === 0
      ? { move: { x: 0, y: 0 }, aim: { x: 640, y: 300 }, firing: false, dash: false }
      : autopilot(world.state, skill);
    const events = world.step(STEP, input.move, input.aim, input.firing, input.dash);
    if (events & EVENT_OVER) break;
    // The monolith scene stops once the monolith has shown up on screen.
    if (name === 'monolith' && world.state.enemies.some((e) => e.kind === 'monolith')) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
