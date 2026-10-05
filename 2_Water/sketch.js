const CONFIG = {
  swipeDistance: 56,
  tapDistance: 12,
  tapDuration: 420,
  evaporationStarts: 2,
  evaporateAt: 5
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
const ease01 = t => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};

class GameManager {
  constructor() {
    this.cup = new WaterCup();
    this.cat = new Cat();
    this.clock = new Clock();
    this.particles = [];
    this.time = 0;
    this.pointer = null;
    this.resetLevel(1);
  }

  resetLevel(level) {
    this.cancel();
    this.level = level;
    this.state = 'idle';
    this.timer = 0;
    this.fadeIn = 0.4;
    this.hint = true;
    this.cup.reset();
    this.cat.reset();
    this.clock.reset();
    this.particles.length = 0;
  }

  finish() {
    if (this.state === 'complete' || this.state === 'final') return;
    this.state = 'complete';
    this.timer = 0;
    this.cancel();
  }

  down(id, x, y, now) {
    if (this.pointer || this.state === 'complete' || this.state === 'final') return false;
    let target = null;
    if (this.level === 1 && this.state === 'idle' && this.cup.contains(x, y)) target = 'cup';
    if (this.level === 2 && this.cat.state === 'sleeping' && this.cat.onBack(x, y)) target = 'cat';
    if (this.level === 3 && this.clock.begin(x, y)) {
      target = 'clock'; this.state = 'turningClock'; this.hint = false;
    }
    if (!target) return false;
    this.pointer = { id, x, y, now, target, maxDistance: 0 };
    return true;
  }

  move(id, x, y) {
    const p = this.pointer;
    if (!p || p.id !== id) return;
    const dx = x - p.x, dy = y - p.y;
    p.maxDistance = Math.max(p.maxDistance, Math.hypot(dx, dy));

    if (p.target === 'cat' && this.cat.state === 'sleeping' &&
        Math.abs(dx) >= CONFIG.swipeDistance && Math.abs(dx) > Math.abs(dy) * 1.5 &&
        this.cat.onBack(x, y)) {
      this.cat.pet();
      this.state = 'waking';
      this.hint = false;
    }

    if (p.target === 'clock') {
      const added = this.clock.move(x, y);
      if (added > 0 && this.clock.turns > CONFIG.evaporationStarts) {
        this.state = 'evaporating';
        const range = CONFIG.evaporateAt - CONFIG.evaporationStarts;
        const level = 1 - (this.clock.turns - CONFIG.evaporationStarts) / range;
        this.cup.setLevel(Math.min(this.cup.level, level));
        const amount = Math.min(5, Math.max(1, Math.ceil(added * 9)));
        for (let i = 0; i < amount; i++) {
          if (this.particles.length < 100) {
            this.particles.push(new Particle(
              this.cup.x + (Math.random() - 0.5) * 68,
              this.cup.surfaceY,
              'steam'
            ));
          }
        }
        if (!this.cup.water) this.finish();
      }
    }
  }

  up(id, x, y, now) {
    const p = this.pointer;
    if (!p || p.id !== id) return;
    if (p.target === 'cup' && p.maxDistance <= CONFIG.tapDistance &&
        Math.hypot(x - p.x, y - p.y) <= CONFIG.tapDistance &&
        now - p.now <= CONFIG.tapDuration && this.cup.contains(x, y)) {
      this.cup.spill();
      this.hint = false;
      this.state = 'spilling';
      this.timer = 0;
      for (let i = 0; i < 22; i++) {
        this.particles.push(new Particle(this.cup.x + 50, this.cup.y - 95, 'drop'));
      }
    }
    if (p.target === 'clock' && this.state !== 'complete') this.state = 'idle';
    this.cancel();
  }

  cancel() {
    this.pointer = null;
    if (this.clock) this.clock.end();
    if (this.level === 3 && this.state !== 'complete' && this.state !== 'final') {
      this.state = 'idle';
    }
  }

  update(dt) {
    this.time += dt;
    this.timer += dt;
    this.fadeIn = Math.max(0, this.fadeIn - dt);
    this.cup.update(dt);
    this.cat.update(dt, this.cup);
    this.clock.update(dt);
    for (const particle of this.particles) particle.update(dt);
    this.particles = this.particles.filter(particle => particle.alive);

    if (this.state === 'spilling' && this.timer >= 0.22) this.finish();
    if (this.level === 2 && this.state !== 'complete' && this.state !== 'final') {
      this.state = this.cat.state;
      if (this.cat.state === 'satisfied') this.finish();
    }
    if (this.state === 'complete' && this.timer >= 1.45) {
      if (this.level < 3) this.resetLevel(this.level + 1);
      else { this.state = 'final'; this.timer = 0; }
    }
  }

  eveningColors() {
    // 매 회전마다 하늘색에서 짙은 저녁빛으로 이동한다.
    const skies = [
      [245, 240, 230], [218, 236, 242], [178, 215, 235],
      [129, 172, 208], [76, 111, 157], [30, 51, 89]
    ];
    const turns = clamp(this.clock.turns, 0, 5);
    const index = Math.min(4, Math.floor(turns));
    const blend = turns >= 5 ? 1 : turns - index;
    const a = skies[index], b = skies[index + 1];
    return {
      sky: a.map((v, i) => mix(v, b[i], blend)),
      floor: [238, 231, 218].map((v, i) => mix(v, [39, 59, 86][i], turns / 5)),
      turns
    };
  }

  draw() {
    const evening = this.level === 3 ? this.eveningColors() : null;
    noStroke(); fill(...(evening ? evening.sky : [245, 240, 230])); rect(0, 0, 1000, 600);
    fill(...(evening ? evening.floor : [238, 231, 218])); rect(0, 425, 1000, 175);
    stroke('#d9cebb'); strokeWeight(1); line(70, 425, 930, 425);
    noStroke(); fill(101, 77, 52, 13); ellipse(this.cup.x, 423, 167, 18);

    this.cup.drawBack(this.time, this.level === 3);
    this.cat.draw(this.time);
    this.cup.drawFront();
    this.clock.draw(this.level === 3 && this.state !== 'final');
    for (const particle of this.particles) particle.draw();
    if (evening) {
      noStroke(); fill(24, 49, 91, evening.turns * 14);
      rect(0, 0, 1000, 600);
    }
    this.drawHint();

    noStroke(); fill(this.level === 3 && this.clock.turns >= 4 ? '#e8edf3' : '#8c7d69');
    textAlign(LEFT, CENTER); textSize(14);
    text(this.state === 'final' ? 'DONE' : 'LEVEL ' + this.level, 72, 73);
    for (let i = 1; i <= 3; i++) {
      fill(i <= this.level ? '#9fae9c' : '#dcd4c7');
      circle(72 + (i - 1) * 17, 100, 5);
    }
    if (this.hint && this.timer > 5) {
      textAlign(CENTER, CENTER); textSize(16);
      fill(this.level === 3 && this.clock.turns >= 4 ? '#e8edf3' : '#998c79');
      text(['컵을 톡', '등을 옆으로 쓱', '바늘을 시계 방향으로'][this.level - 1], 500, 520);
    }

    let veil = this.fadeIn / 0.4;
    if (this.state === 'complete' && this.level < 3) veil = ease01((this.timer - 1.0) / 0.45);
    if (veil > 0) {
      noStroke(); fill(245, 240, 230, clamp(veil, 0, 1) * 255);
      rect(0, 0, 1000, 600);
    }
  }

  drawHint() {
    if (!this.hint || this.state === 'complete' || this.state === 'final') return;
    const t = this.time;
    push(); noFill(); stroke(137, 164, 150, 150); strokeWeight(2);
    if (this.level === 1) {
      const pulse = t * 0.8 % 1;
      stroke(137, 164, 150, 160 * (1 - pulse));
      circle(500, 239, 12 + pulse * 27);
      noStroke(); fill('#96aa98'); circle(500, 239, 6);
    } else if (this.level === 2) {
      line(166, 315, 270, 315); line(263, 309, 270, 315); line(263, 321, 270, 315);
      fill('#f5f0e6'); circle(166 + (t * 0.55 % 1) * 104, 315, 13);
    } else {
      const a = -Math.PI / 2 + (t * 0.55 % 1) * Math.PI * 1.6;
      arc(780, 326, 207, 207, -Math.PI / 2, Math.PI * 0.1);
      line(876, 358, 880, 346); line(876, 358, 864, 354);
      fill('#f5f0e6'); circle(780 + Math.cos(a) * 103, 326 + Math.sin(a) * 103, 10);
    }
    pop();
  }
}

let game, surface, replay;
const viewport = { scale: 1, x: 0, y: 0 };

function layout() {
  viewport.scale = Math.min(width / 1000, height / 600);
  viewport.x = (width - 1000 * viewport.scale) / 2;
  viewport.y = (height - 600 * viewport.scale) / 2;
}

function coordinates(event) {
  const box = surface.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) * width / box.width - viewport.x) / viewport.scale,
    y: ((event.clientY - box.top) * height / box.height - viewport.y) / viewport.scale
  };
}

function releaseCapture(id) {
  if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
}

function setup() {
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('stage');
  surface = canvas.elt;
  surface.setAttribute('aria-label', '물의 세 가지 시간. 컵 탭, 고양이 등 스와이프, 시계 바늘 원형 드래그.');
  textFont('sans-serif'); strokeCap(ROUND);
  game = new GameManager(); layout();
  replay = document.getElementById('replay');
  replay.addEventListener('click', () => { game.resetLevel(1); replay.hidden = true; });

  surface.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const p = coordinates(event);
    if (game.down(event.pointerId, p.x, p.y, performance.now())) {
      surface.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  });
  surface.addEventListener('pointermove', event => {
    const p = coordinates(event);
    game.move(event.pointerId, p.x, p.y);
    if (game.pointer) event.preventDefault();
  });
  surface.addEventListener('pointerup', event => {
    const p = coordinates(event);
    game.move(event.pointerId, p.x, p.y);
    game.up(event.pointerId, p.x, p.y, performance.now());
    releaseCapture(event.pointerId);
  });
  surface.addEventListener('pointercancel', event => {
    if (game.pointer?.id === event.pointerId) game.cancel();
    releaseCapture(event.pointerId);
  });
  surface.addEventListener('lostpointercapture', event => {
    if (game.pointer?.id === event.pointerId) game.cancel();
  });
  window.addEventListener('blur', () => game.cancel());
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.cancel(); });
  surface.addEventListener('contextmenu', event => event.preventDefault());
  document.getElementById('loading').hidden = true;
}

function draw() {
  if (!game) return;
  const dt = document.hidden ? 0 : Math.min(deltaTime / 1000, 0.05);
  game.update(dt);
  background('#f5f0e6');
  push(); translate(viewport.x, viewport.y); scale(viewport.scale); game.draw(); pop();
  replay.hidden = game.state !== 'final';
}

function windowResized() {
  if (game) game.cancel();
  resizeCanvas(windowWidth, windowHeight); layout();
}
