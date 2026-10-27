// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Press themeKey to switch palettes; the page colours for each theme live in style.css.
  themeKey: 'T',
  themes: {
    dark: { background: 0x101c31, grid: 0x24334b, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a,
      overlay: 0x0a1120, text: '#ffffff' },
    light: { background: 0xeef3f9, grid: 0xc3cfdf, player: 0x0f9e85, coin: 0xe0a100, drone: 0xe03b52,
      overlay: 0xffffff, text: '#1b2a41' }
  }
};
