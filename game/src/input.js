// Keyboard + mouse input, read fresh every frame. The canvas keeps focus so the
// arrow keys and space never scroll the page, and the mouse aims in canvas pixels.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_DASH = 'dash';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
  Shift: ACTION_DASH,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false };

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onKeyDown(event) {
    if (event.target !== document.body && event.target !== canvas) return;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
    if (!event.repeat) {
      keys.add(event.key);
      pressed.add(event.key);
    }
  }

  function onKeyUp(event) {
    keys.delete(event.key);
  }

  function onMouseMove(event) {
    const point = canvasPoint(event);
    mouse.x = point.x;
    mouse.y = point.y;
  }

  function onMouseDown(event) {
    const point = canvasPoint(event);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.down = true;
    pressed.add('mouse');
  }

  function onMouseUp() {
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    mouse,
    move() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    firing() {
      return mouse.down;
    },
    takeActions() {
      const found = new Set();
      for (const key of pressed) {
        const action = KEY_ACTIONS[key];
        if (action) found.add(action);
      }
      if (pressed.has('mouse')) found.add(ACTION_CONFIRM);
      pressed.clear();
      return found;
    },
    dashPressed() {
      return keys.has(' ') && !keys.has('Enter');
    },
  };
}
