# TypeRush Arcade - Typing Challenge Game

**Course:**  Web Technologiesgit 
**Student:** Munaza Mushtaq (FA24-BSE-090)
**Tech:** HTML5, CSS3, JavaScript (ES6+) - no libraries or frameworks

A browser-based typing game with two game modes, three difficulty levels, live scoring, and a results screen.

---

## How to run

1. Keep these three files in the **same folder**:
   - `index.html`
   - `style.css`
   - `script.js`
2. Double-click `index.html` (or open it in any modern browser such as Chrome, Edge or Firefox).
3. No installation or internet connection is needed.

---

## How to play

1. Choose a **difficulty** (Easy / Medium / Hard).
2. Choose a **game mode** and press its Start button.
3. Use your physical keyboard, or tap the on-screen keyboard on a phone/tablet.
4. When the game ends, the **results screen** shows your score and statistics.

### Game controls

| Button  | What it does                                              |
|---------|-----------------------------------------------------------|
| Start   | Starts a new session (disabled while a game is running)   |
| Restart | Stops the current game and starts a fresh one immediately |
| Reset   | Stops the game and clears the board (waits for Start)     |
| Home    | Returns to the home screen                                |

---

## Mode A - Bubbles (letter recognition)

Letter bubbles float upward. Type the letter shown on a bubble to pop it before it reaches the top.

- At least **5 bubbles** are always on screen, each with a unique letter.
- Correct key: **+10 points** and the bubble pops.
- Wrong key (no such letter on screen): **score penalty** and a red flash.
- A bubble reaching the top counts as **1 miss**.
- The game ends when the **miss limit** is reached.
- **Difficulty increases** every 5 correct pops: bubbles move faster and more bubbles appear.

| Difficulty | Bubble speed | Bubbles at start | Miss limit | Wrong-key penalty |
|------------|--------------|------------------|------------|-------------------|
| Easy       | 45           | 5                | 8          | -1                |
| Medium     | 55           | 5                | 10         | -1                |
| Hard       | 68           | 6                | 8          | -2                |

## Mode B - KeyMagnet (keyboard precision)

A large target key appears. Find it on the keyboard and press it as fast as you can.

- Choose a **key set**: Home row, Top row, Bottom row, or All letters. The target keys are generated from the selected set.
- Correct key: **+10 points** (+5 **speed bonus** if answered in under 1 second on Medium/Hard).
- Wrong key or timeout: points are deducted.
- Tracks **correct / incorrect answers** and **response time** (average and fastest).
- The round ends when the **timer reaches 0**.

| Difficulty | Round time | Time per key | Target highlighted on keyboard | Penalty |
|------------|------------|--------------|--------------------------------|---------|
| Easy       | 60 s       | no limit     | Yes                            | -2      |
| Medium     | 45 s       | 3.0 s        | Yes                            | -3      |
| Hard       | 30 s       | 1.8 s        | **No**                         | -5      |

---

## Features

- Home screen, game screen and results screen in a single page.
- Live HUD (score, misses/time, level, accuracy).
- Visual feedback: stage flash (green/red), key highlight animations, bubble pop animation.
- Results screen with score, accuracy and mode-specific statistics.
- **Best score** is saved in the browser (`localStorage`) per mode, difficulty and key set.
- Fully **responsive** layout (desktop, tablet and mobile) with a touch-friendly on-screen keyboard.

---

## Code structure

| File         | Purpose                                                                      |
|--------------|------------------------------------------------------------------------------|
| `index.html` | Page structure: home, game and results screens                               |
| `style.css`  | Layout, theme, animations and responsive rules                               |
| `script.js`  | All game logic: settings, game loop, scoring, input handling, results        |

### Key parts of `script.js`

- `BUBBLE_CFG`, `MAGNET_CFG`, `KEY_SETS` - all difficulty and key-set settings in one place (easy to tweak).
- `app` - global state object (current mode, difficulty, status, timer ids, session data).
- `startGame()`, `resetGame()`, `goHome()`, `endGame()` - game flow.
- `resetState()` - clears score, timers, misses, targets and statistics on every restart/reset.
- `stopAll()` - cancels the animation loop and the interval timer.

### Timer and loop management

- **Bubbles** uses one `requestAnimationFrame` loop (`app.rafId`).
- **KeyMagnet** uses one `setInterval` timer (`app.intervalId`).
- `stopAll()` is called before every start, restart, reset, home and game-over, so two loops can never run at the same time and no timer keeps running after the game ends.

---

## Customising

Open `script.js` and edit the config objects at the top, for example:

```js
medium: { label: 'Medium', speed: 55, base: 5, interval: 1300, missLimit: 10, penalty: 1 }
```

- `speed` - how fast bubbles rise (pixels per second)
- `base` - how many bubbles are on screen at the start
- `interval` - delay between new bubbles (ms)
- `missLimit` - misses allowed before game over
- `penalty` - points lost on a wrong key