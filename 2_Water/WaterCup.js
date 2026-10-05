class WaterCup {
  constructor() {
    this.x = 500;
    this.y = 414;
    this.w = 112;
    this.h = 146;
    this.reset();
  }

  reset() {
    this.x = 500;
    this.water = { level: 1 };
    this.angle = 0;
    this.targetAngle = 0;
    this.spillTime = null;
    this.ripple = 0;
  }

  get level() { return this.water ? this.water.level : 0; }
  get surfaceY() { return this.y - 12 - (this.h - 38) * this.level; }

  contains(x, y) {
    return Math.abs(x - this.x) < this.w / 2 + 16 &&
      y > this.y - this.h - 14 && y < this.y + 12;
  }

  setLevel(value) {
    const level = clamp(value, 0, 1);
    if (level <= 0.00001) this.water = null;
    else if (this.water) this.water.level = level;
    this.ripple = 1;
  }

  spill() {
    this.water = null;
    this.spillTime = 0;
  }

  sip() { this.setLevel(this.level - 1 / 12); }

  update(dt) {
    this.ripple = Math.max(0, this.ripple - dt * 3);
    if (this.spillTime !== null) {
      this.spillTime += dt;
      this.targetAngle = 1.30 * ease01(this.spillTime / 0.16);
    }
    this.angle = mix(this.angle, this.targetAngle, 1 - Math.exp(-dt * 6));
  }

  drawBack(t) {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    noStroke();
    fill(255, 255, 255, 100);
    quad(-56, -146, 56, -146, 44, 0, -44, 0);

    if (this.water) {
      const sy = this.surfaceY - this.y;
      const half = 44 + (-sy / this.h) * 12 - 5;
      fill(119, 183, 195, 175);
      beginShape();
      vertex(-39, -12);
      vertex(39, -12);
      vertex(half, sy);
      for (let i = 12; i >= 0; i--) {
        const x = -half + i / 12 * half * 2;
        vertex(x, sy + Math.sin(i * 0.8 + t * 2.3) * (0.9 + this.ripple * 2));
      }
      endShape(CLOSE);
      fill(195, 229, 231, 210);
      ellipse(0, sy, half * 2, 10);
    }
    pop();
  }

  drawFront() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    noFill();
    stroke(115, 143, 144, 170);
    strokeWeight(2.5);
    beginShape();
    vertex(-56, -146);
    vertex(-44, -7);
    quadraticVertex(-43, 2, -32, 3);
    vertex(32, 3);
    quadraticVertex(43, 2, 44, -7);
    vertex(56, -146);
    endShape();
    ellipse(0, -146, 112, 15);
    stroke(255, 255, 255, 200);
    strokeWeight(4);
    line(-43, -126, -36, -35);
    strokeWeight(2);
    line(41, -118, 35, -62);
    noStroke();
    fill(255, 255, 255, 80);
    ellipse(0, -5, 75, 8);
    pop();
  }
}
