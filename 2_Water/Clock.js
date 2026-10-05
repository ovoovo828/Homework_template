class Clock {
  constructor() { this.x = 780; this.y = 326; this.r = 77; this.reset(); }
  reset() {
    this.angle = -Math.PI / 2;
    this.travel = 0;
    this.furthest = 0;
    this.previous = null;
    this.dragging = false;
    this.pulse = 0;
  }
  get turns() { return this.furthest / (Math.PI * 2); }
  hitHand(x, y) {
    const dx = x - this.x, dy = y - this.y;
    const along = dx * Math.cos(this.angle) + dy * Math.sin(this.angle);
    const across = -dx * Math.sin(this.angle) + dy * Math.cos(this.angle);
    return along >= 18 && along <= 83 && Math.abs(across) <= 24;
  }
  begin(x, y) {
    if (!this.hitHand(x, y)) return false;
    this.previous = Math.atan2(y - this.y, x - this.x);
    this.dragging = true;
    return true;
  }
  move(x, y) {
    if (!this.dragging) return 0;
    const radius = Math.hypot(x - this.x, y - this.y);
    const angle = Math.atan2(y - this.y, x - this.x);
    if (radius < 24 || radius > this.r + 40) { this.previous = null; return 0; }
    if (this.previous === null) { this.previous = angle; return 0; }
    const delta = Math.atan2(Math.sin(angle - this.previous), Math.cos(angle - this.previous));
    this.previous = angle;
    if (Math.abs(delta) > Math.PI / 2) return 0;
    this.angle += delta;
    this.travel += delta;
    const old = this.furthest;
    this.furthest = Math.max(this.furthest, this.travel);
    const added = this.furthest - old;
    if (added > 0) this.pulse = 1;
    return added;
  }
  end() { this.dragging = false; this.previous = null; }
  update(dt) { this.pulse = Math.max(0, this.pulse - dt * 2); }
  draw(active) {
    push(); translate(this.x, this.y);
    noStroke(); fill(97, 76, 54, 15); ellipse(0, 91, 147, 16);
    stroke('#ac9d87'); strokeWeight(8); line(-39, 59, -47, 83); line(39, 59, 47, 83);
    noStroke(); fill('#cbbba2'); circle(0, 0, 168);
    fill('#faf6ec'); circle(0, 0, 147);
    stroke('#968875'); strokeWeight(2);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      line(Math.cos(a) * 60, Math.sin(a) * 60, Math.cos(a) * 66, Math.sin(a) * 66);
    }
    if (active) {
      noFill(); stroke(120, 169, 163, 140 + this.pulse * 80); strokeWeight(3);
      const progress = clamp(this.turns / CONFIG.evaporateAt, 0, 1);
      if (progress > 0) arc(0, 0, 183, 183, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      noStroke();
      for (let i = 0; i < CONFIG.evaporateAt; i++) {
        fill(this.turns >= i + 1 ? '#80aaa4' : '#ded7c9');
        circle((i - 2) * 13, 114, 5);
      }
    }
    stroke('#9a8a75'); strokeWeight(5);
    const hour = -0.7 + this.angle / 12;
    line(0, 0, Math.cos(hour) * 35, Math.sin(hour) * 35);
    stroke(active ? '#699d99' : '#938573'); strokeWeight(4);
    line(0, 0, Math.cos(this.angle) * 62, Math.sin(this.angle) * 62);
    noStroke(); fill(active ? '#699d99' : '#938573');
    circle(Math.cos(this.angle) * 62, Math.sin(this.angle) * 62, 12);
    fill('#c1ae94'); circle(0, 0, 13);
    pop();
  }
}
