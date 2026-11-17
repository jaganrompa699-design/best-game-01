// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and game over.
//
// ?seed=N fixes the wave pattern. ?shot=start|play|monolith|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_OVER, EVENT_WAVE } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const audioUnlocked = { done: false };
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let clock = 0;
  // Last-seen counters, so sounds fire on changes, not every frame.
  let seen = { lives: LIVES, kills: 0, cores: 0, wave: 0, score: 0 };

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function unlockAudioOnce() {
    if (audioUnlocked.done) return;
    audioUnlocked.done = true;
    audio.unlock();
  }

  function startGame() {
    unlockAudioOnce();
    world.start();
    world.setBest(best);
    seen = { lives: LIVES, kills: 0, cores: 0, wave: 0, score: 0 };
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.start();
    announce(`Playing. ${LIVES} lives.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    audio.gameOver();
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    clock += elapsed;
    const actions = input.takeActions();
    if (actions.has(ACTION_MUTE)) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions.has(ACTION_CONFIRM)) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions.has(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const before = { lives: world.state.lives, kills: world.state.kills, cores: world.state.coresCollected, wave: world.state.wave };
          const events = world.step(
            STEP,
            input.move(),
            input.mouse,
            input.firing(),
            input.dashPressed() || false,
          );
          const after = world.state;
          if (after.kills > before.kills) audio.pop();
          if (after.coresCollected > before.cores) audio.core(after.combo);
          if (after.wave > before.wave) audio.waveClear();
          if (events & EVENT_HIT) audio.hit();
          if (events & EVENT_OVER) {
            endGame();
            break;
          }
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions.has(ACTION_PAUSE) || actions.has(ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_OVER) {
      if (actions.has(ACTION_CONFIRM)) startGame();
    }
    renderer.draw(world.state, screen, best);
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('mousedown', unlockAudioOnce);
  window.addEventListener('keydown', unlockAudioOnce);
  announce('Pulse Harvest. Press Enter or click to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
