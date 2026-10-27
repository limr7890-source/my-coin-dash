/* global Phaser, COIN_DASH */
// The theme lives outside the scene so it survives R; localStorage keeps it across reloads.
let themeName = 'dark';
try {
  const saved = localStorage.getItem('coinDashTheme');
  if (COIN_DASH.themes[saved]) themeName = saved;
} catch (e) { /* storage unavailable: keep the default */ }

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.best = this.loadBest();
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.overlay = null;
    this.grid = this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on(`keydown-${c.themeKey}`, () => {
      themeName = themeName === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('coinDashTheme', themeName); } catch (e) { /* not saved */ }
      this.applyTheme();
    });
    this.applyTheme();
  }

  applyTheme() {
    // Recolour existing objects in place so switching never interrupts the round.
    const t = COIN_DASH.themes[themeName];
    document.body.classList.toggle('light', themeName === 'light');
    this.cameras.main.setBackgroundColor(t.background);
    this.grid.setFillStyle(t.background, 1).setOutlineStyle(t.grid, 0.45);
    this.hud.setColor(t.text);
    this.player.setFillStyle(t.player);
    this.coin.setFillStyle(t.coin);
    this.drones.getChildren().forEach((drone) => drone.setFillStyle(t.drone));
    if (this.overlay) {
      this.overlay.box.setFillStyle(t.overlay, 0.95);
      this.overlay.text.setColor(t.text);
    }
  }

  // Storage can be blocked (private mode, file:// in some browsers); fall back to 0.
  loadBest() {
    try {
      const best = parseInt(localStorage.getItem(COIN_DASH.highScoreKey), 10);
      return Number.isFinite(best) && best > 0 ? best : 0;
    } catch (e) {
      return 0;
    }
  }

  saveBest(best) {
    try {
      localStorage.setItem(COIN_DASH.highScoreKey, String(best));
    } catch (e) { /* keep playing without a saved record */ }
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    const best = Math.max(this.best, this.score);
    this.hud.setText(`Coins: ${this.score}          Best: ${best}          Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    // finish() runs once per round, so the record is saved at most once.
    const newBest = this.score > this.best;
    if (newBest) {
      this.best = this.score;
      this.saveBest(this.best);
    }
    const c = COIN_DASH;
    const bestLine = newBest ? `New high score! Best: ${this.best}` : `Best: ${this.best}`;
    const box = this.add.rectangle(c.width / 2, c.height / 2, 520, 190);
    const text = this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\n${bestLine}\nPress R to try again`,
      { font: '24px monospace', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
    this.overlay = { box, text };
    this.applyTheme();
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.themes[themeName].background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
