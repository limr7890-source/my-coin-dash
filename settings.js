// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  pauseKeys: ['P', 'ESC'],
  // Slow-motion power-up: appears every powerUpEvery s, vanishes after powerUpLifetime s.
  powerUpEvery: 10,
  powerUpLifetime: 4,
  slowFactor: 0.4, // drone speed multiplier while slow-mo is active
  slowSeconds: 5,
  highScoreKey: 'coinDash.highScore', // localStorage key for the best score
  // Press a preset's key to restart with it; each preset overrides the values above (Normal keeps them).
  difficultyStorageKey: 'coinDash.difficulty',
  defaultDifficulty: 'normal',
  difficulties: {
    easy: { key: 'ONE', label: 'Easy', droneCount: 2, droneSpeed: 80 },
    normal: { key: 'TWO', label: 'Normal' },
    hard: { key: 'THREE', label: 'Hard', droneCount: 5, droneSpeed: 140 }
  },
  // Press themeKey to switch palettes; the page colours for each theme live in style.css.
  themeKey: 'T',
  themes: {
    dark: { background: 0x101c31, grid: 0x24334b, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a,
      powerUp: 0xb39cff, overlay: 0x0a1120, text: '#ffffff' },
    light: { background: 0xeef3f9, grid: 0xc3cfdf, player: 0x0f9e85, coin: 0xe0a100, drone: 0xe03b52,
      powerUp: 0x7a4fe0, overlay: 0xffffff, text: '#1b2a41' }
  }
};
