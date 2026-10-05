/*
 * 기다림의 계절 — Dynamic Balance (character / leaf refinement)
 * p5.js + Matter.js
 */

const { Engine, World, Bodies, Body, Events } = Matter;

// -----------------------------
// 전역 설정값
// -----------------------------
const CANVAS_W = 600;
const CANVAS_H = 800;

const GROUND_H = 46;
const WALL_THICKNESS = 30;
const PERSON_W = 96;
const PERSON_H = 232;

const MAX_LEAVES = 72;
const MAX_GINKGOS = 12;

const LEAF_INTERVAL_MIN = 480;
const LEAF_INTERVAL_MAX = 860;
const GINKGO_INTERVAL_MIN = 2600;
const GINKGO_INTERVAL_MAX = 4200;

const PALETTE = {
  skyTop: "#e9e1d0",
  skyBottom: "#d9c8aa",
  path: "#e2d6c3",
  ground: "#8b6f56",
  groundShadow: "#6e5845",
  trunk: "#988a73",
  branch: "#a79b88",
  hair: "#2f2324",
  skin: "#f6d6bf",
  cheek: "#f1b7a7",
  coat: "#8f8779",
  collar: "#9e87be",
  skirt: "#4c352e",
  socks: "#f1e8dd",
  shoes: "#5b4334",
  bag: "#d8c26c",
  cup: "#9a6542",
  leaf: ["#e6bf56", "#d8b13f", "#cc9e27", "#d28d2e", "#bf7d24"],
  ginkgo: ["#e4c443", "#d9b52f", "#c9a51f"],
};

// -----------------------------
// Matter.js 객체
// -----------------------------
let engine;
let world;
let ground;
let leftWall;
let rightWall;
let personCollider;
let personHeadCollider;

const leaves = [];
const ginkgos = [];
const ginkgoHitCooldown = new Map();

let nextLeafAt = 0;
let nextGinkgoAt = 0;
let startTime = 0;

function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  pixelDensity(1);
  rectMode(CENTER);
  ellipseMode(CENTER);
  angleMode(RADIANS);
  noStroke();

  engine = Engine.create();
  world = engine.world;

  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.00122;

  createStaticEnvironment();
  createPersonCollider();
  bindCollisionEvents();

  startTime = millis();
  scheduleNextLeaf(true);
  scheduleNextGinkgo();

  for (let i = 0; i < 3; i++) {
    spawnLeaf(random(80, width - 80), random(-40, 90));
  }
}

function draw() {
  drawBackground();

  const elapsed = millis() - startTime;
  if (elapsed > 1800) {
    spawnTimedObjects(elapsed);
  }

  Engine.update(engine, deltaTime);

  drawGround();
  drawPerson();
  drawLeaves();
  drawGinkgos();

  cleanupOffscreenObjects();
}

// -----------------------------
// 배경
// -----------------------------
function drawBackground() {
  background(PALETTE.skyTop);

  for (let y = 0; y < height; y += 2) {
    const t = y / height;
    const c = lerpColor(
      color(PALETTE.skyTop),
      color(PALETTE.skyBottom),
      t * 0.65,
    );
    fill(c);
    rect(width / 2, y, width, 2);
  }

  const groundTop = height - GROUND_H;

  // 중앙 길 / 비어 있는 공간
  noStroke();
  fill(255, 255, 255, 34);
  rect(width / 2, groundTop / 2 + 16, width * 0.56, groundTop - 8);

  drawTree(width * 0.18, groundTop, 18, 0.92);
  drawTree(width * 0.82, groundTop, 14, 0.8);
}

function drawTree(x, groundTop, trunkW, alphaScale) {
  const trunkTop = 185;
  const trunkY = (trunkTop + groundTop) / 2;

  noStroke();
  fill(120, 107, 86, 30 * alphaScale);
  rect(x, trunkY, trunkW, groundTop - trunkTop);

  stroke(120, 107, 86, 30 * alphaScale);
  strokeWeight(trunkW * 0.28);
  line(x, trunkTop + 90, x - 48, trunkTop + 32);
  line(x + 2, trunkTop + 150, x + 58, trunkTop + 86);
  line(x - 3, trunkTop + 230, x - 42, trunkTop + 190);
  noStroke();
}

function createStaticEnvironment() {
  ground = Bodies.rectangle(width / 2, height - GROUND_H / 2, width, GROUND_H, {
    isStatic: true,
    friction: 0.85,
    restitution: 0.08,
    label: "ground",
  });

  leftWall = Bodies.rectangle(
    -WALL_THICKNESS / 2,
    height / 2,
    WALL_THICKNESS,
    height,
    {
      isStatic: true,
      friction: 0.4,
      restitution: 0.25,
      label: "wall-left",
    },
  );

  rightWall = Bodies.rectangle(
    width + WALL_THICKNESS / 2,
    height / 2,
    WALL_THICKNESS,
    height,
    {
      isStatic: true,
      friction: 0.4,
      restitution: 0.25,
      label: "wall-right",
    },
  );

  World.add(world, [ground, leftWall, rightWall]);
}

function createPersonCollider() {
  const personX = width / 2;
  const groundY = height - GROUND_H;

  personCollider = Bodies.rectangle(personX, groundY - 103, 66, 128, {
    isStatic: true,
    friction: 0.25,
    restitution: 1.0,
    label: "person-body",
  });

  personHeadCollider = Bodies.circle(personX, groundY - 194, 43, {
    isStatic: true,
    friction: 0.1,
    restitution: 1.0,
    label: "person-head",
  });

  World.add(world, [personCollider, personHeadCollider]);
}

function drawGround() {
  noStroke();
  fill(PALETTE.path);
  rect(width / 2, height - 90, width, 90);

  fill(PALETTE.ground);
  rect(width / 2, height - GROUND_H / 2, width, GROUND_H);

  fill(PALETTE.groundShadow);
  rect(width / 2, height - 12, width, 8);

  stroke(110, 92, 70, 60);
  strokeWeight(1);
  for (let x = -20; x < width + 20; x += 28) {
    line(x, height - GROUND_H + 10, x + 15, height - GROUND_H + 13);
  }
  noStroke();
}

// -----------------------------
// 사람 그래픽
// -----------------------------
function drawPerson() {
  const x = width / 2;
  const groundY = height - GROUND_H;

  push();
  translate(x, groundY);
  noStroke();

  fill(20, 18, 16, 24);
  ellipse(0, -1, 90, 12);

  // 뒷머리는 얼굴과 옷보다 먼저 그려 어깨 뒤로 내려가게 한다.
  fill(PALETTE.hair);
  beginShape();
  vertex(-43, -180);
  bezierVertex(-51, -215, -32, -239, -3, -241);
  bezierVertex(27, -243, 47, -220, 47, -190);
  bezierVertex(46, -167, 39, -142, 40, -122);
  bezierVertex(24, -118, -23, -118, -41, -124);
  bezierVertex(-40, -144, -45, -163, -43, -180);
  endShape(CLOSE);

  // 치마 아래로 보이는 발목, 양말, 두 구두.
  fill(PALETTE.skin);
  rect(-12, -18, 12, 24, 4);
  rect(12, -18, 12, 24, 4);
  fill(PALETTE.socks);
  rect(-12, -10, 12, 8, 2);
  rect(12, -10, 12, 8, 2);
  fill(PALETTE.shoes);
  push();
  translate(-13, -5);
  rotate(-0.10);
  ellipse(0, 0, 23, 11);
  pop();
  push();
  translate(13, -5);
  rotate(0.10);
  ellipse(0, 0, 23, 11);
  pop();

  // 아래로 자연스럽게 넓어지고 밑단이 둥근 치마.
  fill(PALETTE.skirt);
  beginShape();
  vertex(-28, -88);
  bezierVertex(-33, -66, -39, -39, -41, -23);
  bezierVertex(-26, -15, 25, -15, 41, -23);
  bezierVertex(38, -43, 32, -70, 28, -88);
  endShape(CLOSE);

  // 목과 어깨: 얼굴 아래에서 코트로 이어지는 연결부.
  fill(PALETTE.skin);
  rect(0, -149, 17, 24, 5);
  fill(PALETTE.coat);
  beginShape();
  vertex(-12, -153);
  bezierVertex(-28, -151, -38, -143, -40, -128);
  bezierVertex(-43, -108, -36, -85, -30, -70);
  bezierVertex(-18, -66, 17, -66, 30, -70);
  bezierVertex(36, -87, 43, -110, 40, -128);
  bezierVertex(37, -143, 25, -152, 12, -153);
  vertex(0, -142);
  endShape(CLOSE);

  fill(PALETTE.skin);
  triangle(-10, -152, 0, -142, 10, -152);
  noFill();
  stroke(122, 110, 94);
  strokeWeight(2.5);
  strokeCap(ROUND);
  beginShape();
  vertex(-17, -148);
  bezierVertex(-13, -138, -7, -138, -2, -133);
  vertex(0, -72);
  endShape();
  beginShape();
  vertex(17, -147);
  vertex(7, -138);
  vertex(-2, -134);
  endShape();
  noStroke();
  fill(122, 110, 94);
  ellipse(8, -124, 5, 5);
  ellipse(8, -113, 5, 5);

  // 가방 손잡이를 손 뒤에 먼저 그린다.
  noFill();
  stroke(PALETTE.bag);
  strokeWeight(3);
  arc(0, -58, 22, 38, PI, TWO_PI);
  noStroke();
  fill(PALETTE.bag);
  rect(0, -49, 31, 23, 5);
  fill(242, 218, 127);
  rect(0, -53, 29, 13, 4);

  // 손을 먼저 그리고 소매가 손목을 살짝 덮게 해 연결부를 자연스럽게 만든다.
  noStroke();
  fill(PALETTE.skin);
  beginShape();
  vertex(-19, -94);
  bezierVertex(-11, -94, -3, -91, 3, -87);
  bezierVertex(7, -83, 4, -76, -1, -76);
  bezierVertex(-7, -76, -15, -79, -20, -82);
  endShape(CLOSE);
  beginShape();
  vertex(19, -94);
  bezierVertex(11, -93, 3, -89, -1, -85);
  bezierVertex(-4, -81, -1, -76, 3, -77);
  bezierVertex(9, -77, 16, -80, 20, -83);
  endShape(CLOSE);
  stroke(219, 172, 147);
  strokeWeight(0.8);
  noFill();
  bezier(1, -87, 0, -84, 1, -81, 3, -80);

  // 둥근 어깨 → 팔꿈치 → 좁아지는 소맷부리 → 손목.
  // 소맷부리를 가로로 자르지 않고 손목 방향으로 세워 두 손을 감싼다.
  noStroke();
  fill(PALETTE.coat);
  beginShape();
  vertex(-28, -145);
  bezierVertex(-46, -139, -47, -111, -37, -89);
  bezierVertex(-34, -81, -27, -76, -18, -78);
  bezierVertex(-17, -83, -16, -89, -15, -94);
  bezierVertex(-23, -105, -25, -124, -28, -145);
  endShape(CLOSE);
  beginShape();
  vertex(28, -145);
  bezierVertex(46, -139, 47, -111, 37, -89);
  bezierVertex(34, -81, 27, -76, 18, -78);
  bezierVertex(17, -83, 16, -89, 15, -94);
  bezierVertex(23, -105, 25, -124, 28, -145);
  endShape(CLOSE);

  noFill();
  stroke(125, 116, 101);
  strokeWeight(1.4);
  // 팔 안쪽 선과 손목의 소매 끝을 하나의 곡선으로 연결한다.
  beginShape();
  vertex(-25, -126);
  bezierVertex(-25, -114, -22, -103, -15, -94);
  bezierVertex(-16, -88, -17, -82, -18, -78);
  bezierVertex(-24, -77, -30, -79, -33, -82);
  endShape();
  beginShape();
  vertex(25, -126);
  bezierVertex(25, -114, 22, -103, 15, -94);
  bezierVertex(16, -88, 17, -82, 18, -78);
  bezierVertex(24, -77, 30, -79, 33, -82);
  endShape();

  // 얼굴: 넓고 둥근 턱, 작은 귀, 부드러운 앞머리.
  noStroke();
  fill(PALETTE.skin);
  beginShape();
  vertex(-39, -199);
  bezierVertex(-38, -219, -20, -228, 0, -228);
  bezierVertex(22, -228, 39, -217, 40, -198);
  bezierVertex(41, -180, 34, -162, 18, -155);
  bezierVertex(6, -150, -7, -151, -19, -157);
  bezierVertex(-34, -164, -40, -180, -39, -199);
  endShape(CLOSE);
  ellipse(-40, -187, 17, 20);
  ellipse(40, -187, 17, 20);

  fill(PALETTE.hair);
  beginShape();
  vertex(-43, -196);
  bezierVertex(-47, -218, -27, -239, -3, -240);
  bezierVertex(24, -242, 45, -220, 44, -197);
  vertex(36, -195);
  bezierVertex(32, -203, 26, -210, 23, -211);
  bezierVertex(23, -207, 21, -204, 18, -203);
  bezierVertex(13, -204, 9, -211, 7, -215);
  bezierVertex(4, -212, 0, -205, -3, -204);
  bezierVertex(-8, -203, -15, -211, -18, -216);
  bezierVertex(-23, -213, -29, -205, -33, -196);
  endShape(CLOSE);

  // 예시처럼 편안하게 감은 눈과 은은한 미소.
  noFill();
  stroke(118, 91, 57);
  strokeWeight(2.3);
  bezier(-22, -202, -19, -204, -14, -204, -11, -202);
  bezier(11, -202, 14, -204, 19, -204, 22, -202);
  noFill();
  stroke(42, 31, 26);
  strokeWeight(2.4);
  bezier(-22, -187.5, -19, -184.5, -15, -184.5, -12, -187.5);
  bezier(12, -187.5, 15, -184.5, 19, -184.5, 22, -187.5);
  noStroke();
  fill(229, 145, 139, 85);
  ellipse(-25, -177, 15, 9);
  ellipse(25, -177, 15, 9);
  fill(197, 107, 91);
  ellipse(0, -176, 2.3, 2.5);
  noFill();
  stroke(181, 70, 91);
  strokeWeight(2.2);
  bezier(-6, -167, -2.5, -164.9, 3.3, -164.9, 6.5, -167.4);
  pop();
}

function trapezoidLike(x, y, topW, h) {
  beginShape();
  vertex(x - topW * 0.42, y - h * 0.5);
  vertex(x + topW * 0.42, y - h * 0.5);
  vertex(x + topW * 0.26, y + h * 0.5);
  vertex(x - topW * 0.26, y + h * 0.5);
  endShape(CLOSE);
}

// -----------------------------
// 생성
// -----------------------------
function spawnTimedObjects(elapsed) {
  const lateStage = elapsed > 38000;

  if (!lateStage && millis() >= nextLeafAt && leaves.length < MAX_LEAVES) {
    spawnLeaf(random(50, width - 50), random(-80, -25));
    scheduleNextLeaf();
  }

  if (!lateStage && millis() >= nextGinkgoAt && ginkgos.length < MAX_GINKGOS) {
    spawnGinkgo();
    scheduleNextGinkgo();
  }
}

function scheduleNextLeaf(first = false) {
  nextLeafAt =
    millis() +
    (first ? random(250, 650) : random(LEAF_INTERVAL_MIN, LEAF_INTERVAL_MAX));
}

function scheduleNextGinkgo() {
  nextGinkgoAt = millis() + random(GINKGO_INTERVAL_MIN, GINKGO_INTERVAL_MAX);
}

function spawnLeaf(x, y) {
  const size = random(24, 38);
  const body = Bodies.circle(x, y, size * 0.34, {
    density: random(0.00028, 0.00042),
    friction: 0.42,
    frictionAir: 0.055,
    restitution: random(0.05, 0.16),
    angle: random(-PI, PI),
    angularVelocity: random(-0.03, 0.03),
    label: "leaf",
  });

  World.add(world, body);
  leaves.push({
    body,
    size,
    color: random(PALETTE.leaf),
    windPhase: random(TWO_PI),
    sway: random(0.001, 0.0032),
    rotationOffset: random(-0.4, 0.4),
  });
}

function spawnGinkgo() {
  const nearPerson = random() < 0.58;
  const x = nearPerson ? width / 2 + random(-75, 75) : random(55, width - 55);
  const y = random(-110, -45);
  const radius = random(10, 14);

  const body = Bodies.circle(x, y, radius, {
    density: 0.0022,
    friction: 0.35,
    frictionAir: 0.008,
    restitution: random(0.45, 0.72),
    angle: random(-PI, PI),
    angularVelocity: random(-0.08, 0.08),
    label: "ginkgo",
  });

  Body.setVelocity(body, { x: random(-0.8, 0.8), y: random(0.2, 1.0) });
  World.add(world, body);
  ginkgos.push({ body, radius, color: random(PALETTE.ginkgo), hitCount: 0 });
}

// -----------------------------
// 충돌 처리
// -----------------------------
function bindCollisionEvents() {
  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      handleGinkgoPersonCollision(pair.bodyA, pair.bodyB);
    }
  });
}

function handleGinkgoPersonCollision(a, b) {
  let ginkgoBody = null;
  let personBody = null;

  if (
    a.label === "ginkgo" &&
    (b.label === "person-body" || b.label === "person-head")
  ) {
    ginkgoBody = a;
    personBody = b;
  } else if (
    b.label === "ginkgo" &&
    (a.label === "person-body" || a.label === "person-head")
  ) {
    ginkgoBody = b;
    personBody = a;
  }

  if (!ginkgoBody || !personBody) return;

  const lastHit = ginkgoHitCooldown.get(ginkgoBody.id) ?? 0;
  if (millis() - lastHit < 420) return;
  ginkgoHitCooldown.set(ginkgoBody.id, millis());

  let dx = ginkgoBody.position.x - personBody.position.x;
  let dy = ginkgoBody.position.y - personBody.position.y;
  if (Math.abs(dx) < 0.05) dx = random([-1, 1]);

  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;

  const vx = dx * random(2.0, 3.1) + random(-0.45, 0.45);
  const vy = dy * 1.0 + random(-0.4, 0.7);

  Body.setVelocity(ginkgoBody, { x: vx, y: vy });
  Body.setAngularVelocity(ginkgoBody, random(-0.18, 0.18));

  const info = ginkgos.find((item) => item.body.id === ginkgoBody.id);
  if (info) info.hitCount += 1;
}

// -----------------------------
// 렌더링
// -----------------------------
function drawLeaves() {
  for (const leaf of leaves) {
    const { x, y } = leaf.body.position;
    const sway = sin((millis() + leaf.windPhase * 1000) * leaf.sway) * 0.12;

    push();
    translate(x, y);
    rotate(leaf.body.angle + leaf.rotationOffset + sway);
    drawGinkgoLeaf(leaf.size, leaf.color);
    pop();
  }
}

function drawGinkgos() {
  for (const item of ginkgos) {
    const { x, y } = item.body.position;
    push();
    translate(x, y);
    rotate(item.body.angle);
    drawGinkgoFruit(item.radius, item.color);
    pop();
  }
}

// 잎자루가 만나는 점에서 바깥쪽으로 펼쳐지는 부채 윤곽.
// 가운데 반지름만 살짝 줄여 얕은 갈라짐을 만든다.
function ginkgoFanPoint(t, size) {
  const angle = -PI + PI / 9 + t * (PI - (2 * PI) / 9);
  const notch = 0.19 * Math.exp(-Math.pow((t - 0.5) / 0.047, 2));
  const ripple = 0.012 * Math.sin(t * PI * 18) * Math.sin(t * PI);
  const radius = size * (1.10 - notch + ripple);
  return { x: Math.cos(angle) * radius, y: size * 0.48 + Math.sin(angle) * radius };
}

function drawGinkgoLeaf(size, c) {
  push();
  noStroke();
  fill(c);
  const left = ginkgoFanPoint(0, size);
  const right = ginkgoFanPoint(1, size);

  beginShape();
  vertex(0, size * 0.48);
  // 양쪽 아래 가장자리는 완만한 곡선으로 잎자루에 모인다.
  bezierVertex(-size * 0.29, size * 0.17, -size * 0.71, size * 0.21, left.x, left.y);
  for (let i = 1; i <= 80; i++) {
    const point = ginkgoFanPoint(i / 80, size);
    vertex(point.x, point.y);
  }
  bezierVertex(size * 0.71, size * 0.21, size * 0.29, size * 0.17, 0, size * 0.48);
  endShape(CLOSE);

  // 잎맥의 끝점도 같은 윤곽을 사용해 갈라진 틈 밖으로 튀어나오지 않는다.
  noFill();
  stroke(255, 225, 132, 115);
  strokeWeight(max(0.45, size * 0.017));
  for (let i = 1; i < 22; i++) {
    const point = ginkgoFanPoint(i / 22, size);
    bezier(0, size * 0.47,
      point.x * 0.22, size * 0.20,
      point.x * 0.67, point.y * 0.70 + size * 0.08,
      point.x * 0.965, point.y * 0.965 + size * 0.48 * 0.035);
  }

  // 가늘고 살짝 휘어진 잎자루.
  stroke(185, 140, 47, 210);
  strokeWeight(max(0.9, size * 0.038));
  bezier(0, size * 0.46, size * 0.025, size * 0.65,
    -size * 0.015, size * 0.86, -size * 0.11, size * 0.98);
  pop();
}

function drawGinkgoFruit(radius, c) {
  noStroke();
  fill(c);
  ellipse(0, 0, radius * 2.0, radius * 2.35);

  fill(115, 92, 26, 40);
  ellipse(-radius * 0.22, -radius * 0.16, radius * 0.5, radius * 0.6);
}

// -----------------------------
// 정리
// -----------------------------
function cleanupOffscreenObjects() {
  for (let i = leaves.length - 1; i >= 0; i--) {
    if (leaves[i].body.position.y > height + 100) {
      World.remove(world, leaves[i].body);
      leaves.splice(i, 1);
    }
  }

  for (let i = ginkgos.length - 1; i >= 0; i--) {
    if (ginkgos[i].body.position.y > height + 120) {
      ginkgoHitCooldown.delete(ginkgos[i].body.id);
      World.remove(world, ginkgos[i].body);
      ginkgos.splice(i, 1);
    }
  }
}
