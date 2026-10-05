class Cat {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = "sleeping";
    this.timer = 0;
    this.lapTime = 0;
    this.didSip = false;
    this.x = 220;
    this.headX = 281;
    this.headY = 373;
    this.stand = 0;
    this.tongue = 0;
    this.sips = 0;
  }

  change(state) {
    this.state = state;
    this.timer = 0;
  }
  pet() {
    if (this.state === "sleeping") this.change("waking");
  }
  onBack(x, y) {
    return ((x - 214) / 96) ** 2 + ((y - 358) / 48) ** 2 < 1;
  }

  update(dt, cup) {
    this.timer += dt;
    if (this.state === "waking" && this.timer >= 0.65)
      this.change("approaching");
    if (this.state === "approaching" && this.timer >= 1.25)
      this.change("drinking");

    const rising =
      this.state === "waking"
        ? ease01(this.timer / 0.65) * 0.42
        : this.state === "approaching"
          ? 0.42 + ease01(this.timer / 1.25) * 0.58
          : this.state === "sleeping"
            ? 0
            : 1;
    const follow = 1 - Math.exp(-dt * 8);
    this.stand = mix(this.stand, rising, follow);
    this.x = mix(220, 302, this.stand);
    cup.x = mix(500, 520, this.stand);

    if (this.state === "drinking") {
      this.lapTime += dt;
      const duration = 0.56;
      if (this.lapTime >= duration) {
        this.lapTime -= duration;
        this.didSip = false;
      }
      const phase = this.lapTime / duration;
      this.tongue = Math.sin(Math.PI * phase);
      if (phase >= 0.5 && !this.didSip) {
        this.didSip = true;
        this.sips++;
        cup.sip();
        if (!cup.water) this.change("satisfied");
      }
    } else {
      this.tongue = 0;
    }

    // 컵의 입구를 고양이 쪽으로 가져와 목과 몸의 비율을 유지한다.
    if (cup.spillTime === null) {
      cup.targetAngle = this.state === "sleeping" ? 0 : -0.39 * this.stand;
    }
    const bob = this.state === "drinking" ? this.tongue * 3 : 0;
    this.headX = mix(281, 389, this.stand);
    this.headY = mix(373, 311, this.stand) + bob;
  }

  draw(t) {
    const asleep = this.state === "sleeping";
    const s = this.stand;
    const x = this.x,
      hx = this.headX,
      hy = this.headY;
    const fur = "#d8bca8",
      edge = "#866c5c";
    const bodyY = mix(376, 342, s);
    const bodyH = mix(87, 91, s);
    const breath = asleep ? Math.sin(t * 1.7) * 1.8 : 0;

    push();
    noStroke();
    fill(98, 72, 49, 14);
    ellipse(x, 420, 203, 18);

    // 일어나며 몸 뒤에 감춰졌던 꼬리가 왼쪽으로 펼쳐진다.
    // 잠든 첫 화면에서는 꼬리를 완전히 숨기고, 움직이기 시작한 뒤에만 드러낸다.
    const tail = ease01(clamp((s - 0.22) / 0.68, 0, 1));
    if (tail > 0) {
      push();
      const tailX = x - 80 - 80 * tail;
      const tailY = bodyY + 10 - 36 * tail + Math.sin(t * 2.4) * 3 * tail;
      noFill();
      stroke(134, 108, 92, 80 * tail);
      strokeWeight(23);
      bezier(
        x - 68,
        bodyY + 10,
        x - 95 - 14 * tail,
        bodyY + 16,
        x - 100 - 50 * tail,
        bodyY + 22,
        tailX,
        tailY,
      );
      stroke(fur);
      strokeWeight(20);
      bezier(
        x - 68,
        bodyY + 10,
        x - 95 - 14 * tail,
        bodyY + 16,
        x - 100 - 50 * tail,
        bodyY + 22,
        tailX,
        tailY,
      );
      pop();
    }

    // 몸통 안쪽에서 시작해 발끝으로 이어지는 하나의 실루엣.
    if (s > 0.01) {
      noStroke();
      fill(216, 188, 168, 255 * ease01(Math.min(1, s * 5)));
      for (const offset of [-66, -32, 44, 77]) {
        const lx = x + offset;
        // 바깥쪽 다리도 몸통의 곡선 안에서 시작해 틈이 생기지 않는다.
        const top = mix(396, bodyY - 18, s);
        const bottom = mix(408, 415, ease01(Math.min(1, s * 2)));
        beginShape();
        vertex(lx - 11, top);
        bezierVertex(
          lx - 11,
          top + 13,
          lx - 12,
          bottom - 11,
          lx - 13,
          bottom - 5,
        );
        bezierVertex(lx - 14, bottom + 2, lx - 10, bottom + 6, lx, bottom + 6);
        bezierVertex(
          lx + 11,
          bottom + 6,
          lx + 14,
          bottom + 2,
          lx + 13,
          bottom - 5,
        );
        bezierVertex(lx + 12, bottom - 11, lx + 11, top + 13, lx + 11, top);
        endShape(CLOSE);
      }
    }

    fill(fur);
    ellipse(x, bodyY - breath, 179, bodyH + breath);

    // 잠든 자세의 엉덩이 곡선은 일어서면서 사라진다.
    if (s < 0.98) {
      stroke(134, 108, 92, 230 * (1 - ease01(s)));
      strokeWeight(1.6);
      noFill();
      arc(x - 42, bodyY + 8, 85, 54, 0.1, Math.PI * 1.35);
    }

    // 제출한 정지 화면의 포개진 앞발을 유지하고 일어설 때만 숨긴다.
    if (s < 1 / 3) {
      noStroke();
      fill(216, 188, 168, 255 * (1 - ease01(s * 3)));
      ellipse(x + 42, 406, 50, 21);
      ellipse(x + 67, 408, 34, 17);
    }

    push();
    translate(hx, hy);
    const ear = this.state === "waking" ? Math.sin(this.timer * 8) * 3 : 0;
    noStroke();
    fill(fur);
    triangle(-30, -12, -28, -45 - ear, -5, -29);
    triangle(8, -29, 31, -43 + ear, 34, -8);
    fill("#bd958a");
    triangle(-24, -18, -24, -36 - ear, -12, -25);
    triangle(15, -25, 27, -35 + ear, 28, -15);
    fill(fur);
    ellipse(0, 0, 75, 65);

    // 잠들었을 때는 얼굴 중앙, 일어나며 눈과 주둥이가 컵을 향한다.
    const faceShift = ease01(s);
    const muzzleX = mix(9, 18, faceShift);
    const muzzleY = mix(15, 14, faceShift);
    const noseX = mix(5, 20, faceShift);
    const noseTop = mix(11, 10, faceShift);
    const gazeX = 5 * faceShift;
    fill("#efe0cf");
    ellipse(muzzleX, muzzleY, 43, 27);
    if (asleep || this.state === "satisfied") {
      stroke(edge);
      strokeWeight(2.1);
      noFill();
      arc(-14 + gazeX, 1 - faceShift, 15, 10, 0.1, Math.PI - 0.1);
      arc(15 + gazeX, 1 - faceShift, 15, 10, 0.1, Math.PI - 0.1);
    } else {
      const open = this.state === "waking" ? ease01(this.timer / 0.5) : 1;
      noStroke();
      fill("#665345");
      circle(-13 + gazeX, -1, 2 + open * 6);
      circle(15 + gazeX, -1, 2 + open * 6);
    }
    noStroke();
    fill("#b78079");
    triangle(noseX - 4, noseTop, noseX + 4, noseTop, noseX, noseTop + 5);
    stroke(edge);
    strokeWeight(1.4);
    line(noseX, noseTop + 5, noseX, noseTop + 9);
    noFill();
    arc(noseX - 5, noseTop + 8, 10, 7, 0, Math.PI);
    arc(noseX + 5, noseTop + 8, 10, 7, 0, Math.PI);
    stroke(134, 106, 90, 140);
    line(
      mix(-23, muzzleX - 31, faceShift),
      13,
      mix(-43, muzzleX - 54, faceShift),
      9,
    );
    line(
      mix(-23, muzzleX - 31, faceShift),
      19,
      mix(-43, muzzleX - 52, faceShift),
      21,
    );
    line(
      mix(25, muzzleX + 15, faceShift),
      13,
      mix(44, muzzleX + 33, faceShift),
      9,
    );
    line(
      mix(25, muzzleX + 15, faceShift),
      19,
      mix(44, muzzleX + 32, faceShift),
      21,
    );
    if (this.state === "drinking") {
      stroke("#d98f94");
      strokeWeight(6);
      line(noseX, 24, noseX + 22 * this.tongue, 24 + 16 * this.tongue);
    }
    pop();
    pop();
  }
}
