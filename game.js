/* global Phaser, COIN_DASH */
// The theme lives outside the scene so it survives R; localStorage keeps it across reloads.
let themeName = 'dark';
try {
  const saved = localStorage.getItem('coinDashTheme');
  if (COIN_DASH.themes[saved]) themeName = saved;
} catch (e) { /* storage unavailable: keep the default */ }
// The difficulty preset survives R and reloads the same way.
let difficulty = COIN_DASH.defaultDifficulty;
try {
  const saved = localStorage.getItem(COIN_DASH.difficultyStorageKey);
  if (COIN_DASH.difficulties[saved]) difficulty = saved;
} catch (e) { /* storage unavailable: keep the default */ }

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    const d = Object.assign({}, c, c.difficulties[difficulty]);
    this.score = 0;
    this.finished = false;
    this.best = this.loadBest();
    this.paused = false;
    this.deadline = this.time.now + d.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.overlay = null;
    this.grid = this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace' });
    this.modeText = this.add.text(c.width - 18, 6, `Mode: ${d.label}`, { font: '14px monospace' }).setOrigin(1, 0);
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    // One reused power-up star: hidden with its body disabled until the next spawn time.
    this.powerUp = this.add.star(0, 0, 4, 5, 12).setVisible(false);
    this.physics.add.existing(this.powerUp);
    this.powerUp.body.setCircle(12);
    this.powerUp.body.enable = false;
    this.powerUpAt = this.time.now + c.powerUpEvery * 1000; // next spawn, or vanish time while shown
    this.slowUntil = 0; // 0 when drones are at normal speed
    this.slowLabel = this.add.text(c.width / 2, 54, '', { font: '18px monospace' }).setOrigin(0.5, 0);
    this.drones = this.physics.add.group();
    for (let i = 0; i < d.droneCount; i++) {
      // Three drones per row; extra drones start in a lower row, still clear of the player.
      const drone = this.add.rectangle(90 + (i % 3) * 270, i < 3 ? 100 : c.height - 100, 26, 26);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * d.droneSpeed, Math.sin(angle) * d.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.powerUp, () => {
      if (this.finished) return;
      this.hidePowerUp();
      this.startSlow();
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
    Object.keys(c.difficulties).forEach((name) => {
      this.input.keyboard.on(`keydown-${c.difficulties[name].key}`, () => {
        difficulty = name;
        try { localStorage.setItem(c.difficultyStorageKey, name); } catch (e) { /* not saved */ }
        this.scene.restart();
      });
    });
    // Hidden until paused; created last so it draws above the play area. applyTheme() colours it.
    this.pauseBox = this.add.rectangle(c.width / 2, c.height / 2, 460, 110);
    this.pauseText = this.add.text(c.width / 2, c.height / 2, `Paused\npress ${c.pauseKeys[0]} to resume`,
      { font: '24px monospace', align: 'center', lineSpacing: 12 }).setOrigin(0.5);
    this.pauseOverlay = this.add.container(0, 0, [this.pauseBox, this.pauseText]).setVisible(false);
    c.pauseKeys.forEach((key) => this.input.keyboard.on(`keydown-${key}`, () => this.togglePause()));
    this.applyTheme();
  }

  applyTheme() {
    // Recolour existing objects in place so switching never interrupts the round.
    const t = COIN_DASH.themes[themeName];
    document.body.classList.toggle('light', themeName === 'light');
    this.cameras.main.setBackgroundColor(t.background);
    this.grid.setFillStyle(t.background, 1).setOutlineStyle(t.grid, 0.45);
    this.hud.setColor(t.text);
    this.modeText.setColor(t.text);
    this.player.setFillStyle(t.player);
    this.coin.setFillStyle(t.coin);
    this.powerUp.setFillStyle(t.powerUp);
    this.slowLabel.setColor(t.text);
    this.drones.getChildren().forEach((drone) => drone.setFillStyle(t.drone));
    this.pauseBox.setFillStyle(t.overlay, 0.95);
    this.pauseText.setColor(t.text);
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

  updatePowerUp(now) {
    const c = COIN_DASH;
    if (this.slowUntil && now >= this.slowUntil) {
      // Undo the slow-down; scaling the velocity keeps each drone's current direction.
      this.drones.getChildren().forEach((drone) => drone.body.velocity.scale(1 / c.slowFactor));
      this.slowUntil = 0;
    }
    if (now >= this.powerUpAt) {
      if (this.powerUp.visible) this.hidePowerUp();
      else this.placePowerUp();
    }
    this.slowLabel.setText(this.slowUntil ? `Slow-mo: ${Math.ceil((this.slowUntil - now) / 1000)}s` : '');
  }

  placePowerUp() {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 120
      || Phaser.Math.Distance.Between(x, y, this.coin.x, this.coin.y) < 30);
    this.powerUp.setPosition(x, y).setVisible(true);
    this.powerUp.body.enable = true;
    this.powerUp.body.reset(x, y);
    this.powerUpAt = this.time.now + c.powerUpLifetime * 1000;
  }

  hidePowerUp() {
    this.powerUp.setVisible(false);
    this.powerUp.body.enable = false;
    this.powerUpAt = this.time.now + COIN_DASH.powerUpEvery * 1000;
  }

  startSlow() {
    const c = COIN_DASH;
    // A second pickup while slowed only extends the timer; drones are not slowed twice.
    if (!this.slowUntil) {
      this.drones.getChildren().forEach((drone) => drone.body.velocity.scale(c.slowFactor));
    }
    this.slowUntil = this.time.now + c.slowSeconds * 1000;
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    this.pauseOverlay.setVisible(this.paused);
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.physics.pause();
    } else {
      // Paused time must not count against the round or the power-up timers.
      const pausedFor = this.time.now - this.pausedAt;
      this.deadline += pausedFor;
      this.powerUpAt += pausedFor;
      if (this.slowUntil) this.slowUntil += pausedFor;
      this.physics.resume();
    }
  }

  update() {
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    this.updatePowerUp(this.time.now);
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
