class Particle {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.age = 0;
    this.life =
      kind === "drop" ? 0.45 + Math.random() * 0.18 : 0.7 + Math.random() * 0.6;
    this.vx =
      kind === "drop" ? 180 + Math.random() * 330 : (Math.random() - 0.5) * 20;
    this.vy =
      kind === "drop" ? -150 - Math.random() * 180 : -28 - Math.random() * 20;
    this.size = kind === "drop" ? 3 + Math.random() * 6 : 5 + Math.random() * 7;
  }
  update(dt) {
    this.age += dt;
    if (this.kind === "drop") this.vy += 1100 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  get alive() {
    return this.age < this.life && this.y < 570;
  }
  draw() {
    const alpha = Math.max(0, 1 - this.age / this.life);
    noStroke();
    if (this.kind === "drop") {
      fill(114, 178, 192, alpha * 190);
      ellipse(this.x, this.y, this.size * 1.5, this.size);
    } else {
      fill(211, 228, 238, alpha * 135);
      circle(
        this.x + Math.sin(this.age * 5) * 5,
        this.y,
        this.size + this.age * 10,
      );
    }
  }
}
