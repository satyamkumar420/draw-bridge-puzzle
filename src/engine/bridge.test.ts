import { BridgeManager } from './bridge';
import type { TerrainBlock } from '../types/level';
import { vec } from './vector';
import { VehicleSimulation } from './vehicle';
import { ParticleSystem } from './particles';
import { isPointInsideSolidTerrain } from './bridgeCollision';
import { audio } from '../services/audioService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function approxEq(a: number, b: number, eps = 0.5): boolean {
  return Math.abs(a - b) <= eps;
}

const mockTerrains: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 0, y: 400, width: 425, height: 200 },
  { id: 'right-cliff', type: 'brick', x: 575, y: 400, width: 425, height: 200 },
  { id: 'pillar', type: 'brick', x: 304, y: 277, width: 120, height: 140 }
];

console.log('🧪 Starting Bridge Physics & Collision Test Suite...\n');

// Test 1: Straight drawing preservation (angles, lengths, centers)
console.log('Test 1: Straight line drawing preservation...');
const bridge = new BridgeManager();
const anglesToTest = [0, Math.PI / 12, Math.PI / 6, Math.PI / 4, Math.PI / 3, 5 * Math.PI / 12, Math.PI / 2, -Math.PI / 4];

for (const targetAngle of anglesToTest) {
  const len = 150, start = { x: 500, y: 200 };
  const targetEnd = { x: start.x + len * Math.cos(targetAngle), y: start.y + len * Math.sin(targetAngle) };
  bridge.clear();
  bridge.startDrawing(start);
  bridge.addDrawingPoint(targetEnd, []);
  bridge.finishDrawing([]);
  assert(approxEq(bridge.getCurrentLength(), len, 0.1), `Length should be ${len}`);
}
console.log('✅ Test 1 Passed: Straight line lengths preserved.\n');

// Test 2: Freehand Curve Drawing (arch, curve, ramp)
console.log('Test 2: Freehand curve drawing (arch over obstacle)...');
bridge.clear();
// Draw an arched bridge from x=420 to x=580 curving up to y=336
const startArch = { x: 420, y: 396 };
bridge.startDrawing(startArch);

const archPoints: { x: number; y: number }[] = [];
for (let i = 1; i <= 10; i++) {
  const t = i / 10;
  const x = 420 + t * 160;
  // Parabolic arch curving upward
  const y = 396 - Math.sin(t * Math.PI) * 60;
  archPoints.push({ x, y });
  bridge.addDrawingPoint({ x, y }, mockTerrains);
}
bridge.finishDrawing(mockTerrains);

const drawnPoints = bridge.getRawPoints();
assert(drawnPoints.length >= 10, `Curved bridge should have at least 10 points, got ${drawnPoints.length}`);

// Verify curve shape: middle points should be higher than endpoints (arch)
const midPoint = drawnPoints[Math.floor(drawnPoints.length / 2)];
assert(midPoint.y < 350, `Arch bridge apex should curve up, got y = ${midPoint.y}`);
console.log('✅ Test 2 Passed: Freehand curved bridge drawn successfully.\n');

// Test 3: Rigid Invariance for Curves (NO bending or deformation during physics)
console.log('Test 3: Curve rigidity invariance under physics (no deformation)...');
// Record pairwise distances between consecutive points of the curve
const initialDistances: number[] = [];
for (let i = 0; i < drawnPoints.length - 1; i++) {
  initialDistances.push(vec.dist(drawnPoints[i], drawnPoints[i + 1]));
}

bridge.startFalling(mockTerrains);

// Step 60 frames under gravity and collision
for (let frame = 0; frame < 60; frame++) {
  bridge.update(1 / 60, mockTerrains);
  const currentPts = bridge.getRawPoints();

  for (let i = 0; i < currentPts.length - 1; i++) {
    const currentDist = vec.dist(currentPts[i], currentPts[i + 1]);
    assert(approxEq(currentDist, initialDistances[i], 0.01), `Curve deformed at segment ${i} on frame ${frame}!`);
  }
}
console.log('✅ Test 3 Passed: Freehand curve stays 100% rigid with zero deformation during physics.\n');

// Test 4: Ground Landing & Zero Penetration
console.log('Test 4: Ground landing & zero penetration...');
const flatTerrains: TerrainBlock[] = [
  { id: 'floor', type: 'brick', x: 0, y: 400, width: 1000, height: 200 }
];

bridge.clear();
bridge.startDrawing({ x: 500, y: 300 });
[{ x: 550, y: 310 }, { x: 600, y: 330 }, { x: 650, y: 340 }].forEach(pt => bridge.addDrawingPoint(pt, flatTerrains));
bridge.finishDrawing(flatTerrains);
bridge.startFalling(flatTerrains);

for (let i = 0; i < 180; i++) {
  bridge.update(1 / 60, flatTerrains);
  if (bridge.getIsSettled()) break;
}

assert(bridge.getIsSettled(), 'Bridge should settle on the ground');
const settledPts = bridge.getRawPoints();
for (const p of settledPts) {
  assert(p.y <= 396.05, `Bridge center line penetrated ground! p.y = ${p.y}`);
  assert(p.y + 4 <= 400.05, `Bridge visual surface penetrated into brick floor! bottom = ${p.y + 4}`);
}
console.log('✅ Test 4 Passed: Zero penetration into ground upon landing and settling.\n');

// Test 5: Wall Corner Collision & Zero Penetration
console.log('Test 5: Wall corner collision with thickness...');
const cornerTerrain: TerrainBlock[] = [
  { id: 'cliff', type: 'brick', x: 400, y: 300, width: 300, height: 300 }
];

bridge.clear();
bridge.startDrawing({ x: 350, y: 200 });
[{ x: 420, y: 210 }, { x: 480, y: 220 }].forEach(pt => bridge.addDrawingPoint(pt, cornerTerrain));
bridge.finishDrawing(cornerTerrain);
bridge.startFalling(cornerTerrain);

for (let i = 0; i < 180; i++) {
  bridge.update(1 / 60, cornerTerrain);
  const pts = bridge.getRawPoints();
  for (const p of pts) {
    const isInside = p.x > 400 && p.y > 300;
    assert(!isInside, `Bridge penetrated inside cliff at frame ${i}: (${p.x}, ${p.y})`);
  }
}
console.log('✅ Test 5 Passed: Corner collision prevents any penetration into corner or wall interior.\n');

// Test 6: Dual-platform spanning curved bridge
console.log('Test 6: Dual-platform spanning bridge...');
const cliffs: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 0, y: 400, width: 425, height: 200 },
  { id: 'right-cliff', type: 'brick', x: 575, y: 400, width: 425, height: 200 }
];

bridge.clear();
bridge.startDrawing({ x: 350, y: 400 });
bridge.addDrawingPoint({ x: 500, y: 340 }, cliffs);
bridge.addDrawingPoint({ x: 650, y: 400 }, cliffs);
bridge.finishDrawing(cliffs);
bridge.startFalling(cliffs);

assert(bridge.getHasBothWallSupports(), 'Bridge should be supported by both cliffs');
assert(bridge.getIsSettled(), 'Spanning bridge should be settled immediately');
const spanPts = bridge.getRawPoints();
for (const p of spanPts) {
  if (p.x <= 425 || p.x >= 575) {
    assert(p.y <= 396.1, `Spanning bridge penetrated below cliff surface! p.y = ${p.y}`);
  }
}
console.log('✅ Test 6 Passed: Spanning curved bridge is stably supported and settled with zero penetration.\n');

// Test 7: Drawing clipping through obstacles (Level 6 pillar)
console.log('Test 7: Drawing clipping through obstacles (Level 6 pillar)...');
bridge.clear();
const leftStart = bridge.validateStartPoint({ x: 200, y: 400 }, mockTerrains);
assert(leftStart !== null, 'leftStart should be valid on platform top');
bridge.startDrawing(leftStart!);
bridge.addDrawingPoint({ x: 400, y: 350 }, mockTerrains);
const drawnEnd = bridge.getRawPoints()[bridge.getRawPoints().length - 1];
assert(drawnEnd.x <= 304 - 4 + 0.5, `Bridge should be stopped at pillar boundary, got x = ${drawnEnd.x}`);
console.log('✅ Test 7 Passed: Drawing into obstacles is safely clipped at wall boundary.\n');

// Test 8: Bridge drawn high in the air must fall under gravity and NEVER stay stuck in the air
console.log('Test 8: Bridge drawn in air falls down and never hangs suspended...');
bridge.clear();
// Draw bridge at y = 150 (cliff is at y = 400)
bridge.startDrawing({ x: 300, y: 150 });
[{ x: 450, y: 160 }, { x: 600, y: 150 }].forEach(pt => bridge.addDrawingPoint(pt, cliffs));
bridge.finishDrawing(cliffs);
bridge.startFalling(cliffs);

assert(bridge.getIsFalling(), 'Bridge drawn in the air must start falling');
assert(!bridge.getIsSettled(), 'Bridge in the air must NOT be settled prematurely');

// Run physics loop: bridge must fall down towards y = 400
for (let i = 0; i < 180; i++) {
  bridge.update(1 / 60, cliffs);
  if (bridge.getIsSettled()) break;
}

assert(bridge.getIsSettled(), 'Bridge should settle after landing');
const landedPts = bridge.getRawPoints();
const avgY = landedPts.reduce((acc, p) => acc + p.y, 0) / landedPts.length;
// Bridge center of mass should have dropped from y=150 to near y=396 or below
assert(avgY > 350, `Bridge did not fall down! avgY = ${avgY}`);
console.log('✅ Test 8 Passed: Bridge drawn in the air falls down smoothly and settles upon landing.\n');

// Test 9: Bridge drawn across path acts as solid barrier and STOPS vehicle (No ghost / transparent bridge)
console.log('Test 9: Diagonal bridge barrier stops vehicle (zero transparency/ghosting)...');
const level5Terrains: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 0, y: 275, width: 425, height: 325 },
  { id: 'right-cliff', type: 'brick', x: 425, y: 460, width: 575, height: 140 }
];

const barrierBridge = new BridgeManager();
// Draw a vertical barrier bridge blocking the vehicle's path on the cliff
barrierBridge.startDrawing({ x: 300, y: 140 });
barrierBridge.addDrawingPoint({ x: 300, y: 275 }, level5Terrains);
barrierBridge.finishDrawing(level5Terrains);

const particles = new ParticleSystem();
const sim = new VehicleSimulation(140, 252.5, 9.8, 1.0, level5Terrains, 'smart_car');
sim.setDriving(true);

// Vehicle drives forward towards the bridge barrier
let vehiclePassedThrough = false;
for (let frame = 0; frame < 120; frame++) {
  sim.update(
    1 / 60,
    level5Terrains,
    barrierBridge.getSegments(),
    [],
    { x: 756, y: 458, width: 60, height: 80 },
    [],
    particles,
    barrierBridge
  );

  // If vehicle penetrates past the bridge line (x > 300), it phased through!
  if (sim.vehicle.position.x > 300) {
    vehiclePassedThrough = true;
    break;
  }
}

assert(!vehiclePassedThrough, `Vehicle treated bridge as transparent and passed through! Final pos: (${sim.vehicle.position.x}, ${sim.vehicle.position.y})`);
assert(sim.vehicle.position.x < 280, `Vehicle should be stopped in front of the bridge barrier, got x = ${sim.vehicle.position.x}`);
assert(sim.vehicle.velocity.x < 35, `Vehicle velocity should be stopped by barrier, got vx = ${sim.vehicle.velocity.x}`);
console.log('✅ Test 9 Passed: Vehicle is physically blocked and stopped by bridge barrier with zero transparency.\n');

// Test 10: Smooth driving across normal bridge spanning gap
console.log('Test 10: Smooth vehicle driving across valid spanning bridge...');
const spanBridge = new BridgeManager();
spanBridge.startDrawing({ x: 380, y: 396 });
spanBridge.addDrawingPoint({ x: 500, y: 396 }, cliffs);
spanBridge.addDrawingPoint({ x: 620, y: 396 }, cliffs);
spanBridge.finishDrawing(cliffs);
spanBridge.startFalling(cliffs);

const spanSim = new VehicleSimulation(360, 380, 9.8, 1.0, cliffs, 'smart_car');
spanSim.setDriving(true);

for (let frame = 0; frame < 60; frame++) {
  spanSim.update(1 / 60, cliffs, spanBridge.getSegments(), [], { x: 756, y: 390, width: 60, height: 80 }, [], particles, spanBridge);
}

assert(spanSim.vehicle.position.x > 450, `Vehicle should drive across spanning bridge, got x = ${spanSim.vehicle.position.x}`);
assert(!spanSim.vehicle.isDead, 'Vehicle should survive driving across valid bridge');
console.log('✅ Test 10 Passed: Vehicle drives smoothly across spanning bridge.\n');

// Test 11: Vehicle climbing onto and over drawn arch ramp (Level 5 scenario)
console.log('Test 11: Vehicle climbing onto drawn arch ramp...');
const archRampBridge = new BridgeManager();
archRampBridge.startDrawing({ x: 260, y: 275 });
[{ x: 340, y: 245 }, { x: 420, y: 230 }, { x: 550, y: 310 }, { x: 700, y: 460 }].forEach(pt => archRampBridge.addDrawingPoint(pt, level5Terrains));
archRampBridge.finishDrawing(level5Terrains);
archRampBridge.startFalling(level5Terrains);

for (let i = 0; i < 60; i++) archRampBridge.update(1 / 60, level5Terrains);

const rampSim = new VehicleSimulation(140, 252.5, 9.8, 1.0, level5Terrains, 'smart_car');
rampSim.setDriving(true);

for (let frame = 0; frame < 120; frame++) {
  rampSim.update(1 / 60, level5Terrains, archRampBridge.getSegments(), [], { x: 756, y: 458, width: 60, height: 80 }, [], particles, archRampBridge);
}

assert(rampSim.vehicle.position.x > 300, `Vehicle failed to climb ramp! Stuck at x = ${rampSim.vehicle.position.x}`);
assert(!rampSim.vehicle.isDead, 'Vehicle should survive climbing ramp');
console.log('✅ Test 11 Passed: Vehicle successfully climbs onto and drives over the ramp.\n');

// Test 12: Vehicle crossing uneven / bumpy ("upper khabad") drawn bridge
console.log('Test 12: Vehicle traversing bumpy and uneven ("upper khabad") bridge...');
const bumpyBridge = new BridgeManager();
bumpyBridge.startDrawing({ x: 380, y: 396 });
bumpyBridge.addDrawingPoint({ x: 420, y: 388 }, cliffs);
bumpyBridge.addDrawingPoint({ x: 450, y: 403 }, cliffs); // 15px dip
bumpyBridge.addDrawingPoint({ x: 490, y: 384 }, cliffs); // 19px bump
bumpyBridge.addDrawingPoint({ x: 530, y: 402 }, cliffs); // 18px dip
bumpyBridge.addDrawingPoint({ x: 570, y: 389 }, cliffs); // 13px bump
bumpyBridge.addDrawingPoint({ x: 620, y: 396 }, cliffs);
bumpyBridge.finishDrawing(cliffs);
bumpyBridge.startFalling(cliffs);

for (let i = 0; i < 60; i++) {
  bumpyBridge.update(1 / 60, cliffs);
}

const bumpySim = new VehicleSimulation(350, 380, 9.8, 1.0, cliffs, 'smart_car');
bumpySim.setDriving(true);

for (let frame = 0; frame < 100; frame++) {
  bumpySim.update(1 / 60, cliffs, bumpyBridge.getSegments(), [], { x: 756, y: 390, width: 60, height: 80 }, [], particles, bumpyBridge);
}

assert(bumpySim.vehicle.position.x > 580, `Vehicle got stuck on bumpy bridge! Reached only x = ${bumpySim.vehicle.position.x}`);
assert(!bumpySim.vehicle.isDead, 'Vehicle should survive bumpy bridge crossing');
console.log('✅ Test 12 Passed: Vehicle smoothly rolls over bumpy ("upper khabad") bridge without getting stuck.\n');

// Test 13: Vehicle climbing steep wavy roller-coaster bridge (Level 9 scenario)
console.log('Test 13: Vehicle climbing steep wavy hill without stalling or freezing...');
const level9Terrains: TerrainBlock[] = [
  { id: 'tier-1', type: 'brick', x: 0, y: 462, width: 320, height: 138 },
  { id: 'tier-2', type: 'brick', x: 320, y: 355, width: 344, height: 245 },
  { id: 'tier-3', type: 'brick', x: 664, y: 221, width: 336, height: 379 }
];

const waveBridge = new BridgeManager();
waveBridge.startDrawing({ x: 180, y: 458 });
// Smooth ramp climbing up within legal <= 50 degree limit (~44 degrees)
waveBridge.addDrawingPoint({ x: 250, y: 390 }, level9Terrains);
waveBridge.addDrawingPoint({ x: 330, y: 320 }, level9Terrains);
waveBridge.addDrawingPoint({ x: 420, y: 290 }, level9Terrains);
waveBridge.addDrawingPoint({ x: 520, y: 260 }, level9Terrains);
waveBridge.addDrawingPoint({ x: 670, y: 218 }, level9Terrains);
waveBridge.finishDrawing(level9Terrains);
waveBridge.startFalling(level9Terrains);

for (let i = 0; i < 60; i++) waveBridge.update(1 / 60, level9Terrains);

const waveSim = new VehicleSimulation(140, 439.5, 9.8, 1.0, level9Terrains, 'smart_car');
waveSim.setDriving(true);

for (let frame = 0; frame < 180; frame++) {
  waveSim.update(1 / 60, level9Terrains, waveBridge.getSegments(), [], { x: 766, y: 220, width: 60, height: 80 }, [], particles, waveBridge);
}

assert(waveSim.vehicle.position.x > 350, `Vehicle stalled on steep wave! Position x = ${waveSim.vehicle.position.x}, velocity.x = ${waveSim.vehicle.velocity.x}`);
assert(!waveSim.vehicle.isDead, 'Vehicle should survive climbing steep wavy bridge');
console.log('✅ Test 13 Passed: Vehicle successfully climbs over steep wave without stalling or freezing.\n');

// Test 14: Wall drawing prevention (Level 17 middle pillar & cliff walls)
console.log('Test 14: Wall drawing prevention (strict zero drawing on solid walls)...');
const level17Terrains: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 0, y: 275, width: 292, height: 325 },
  { id: 'trench-floor', type: 'brick', x: 292, y: 510, width: 429, height: 90 },
  { id: 'right-cliff', type: 'brick', x: 721, y: 275, width: 279, height: 325 },
  { id: 'center-pillar', type: 'brick', x: 451, y: 176, width: 132, height: 337 }
];

const wallTestBridge = new BridgeManager();

// Case A: Clicking on the center pillar wall body must return null and be rejected
const pillarClick = wallTestBridge.validateStartPoint({ x: 500, y: 300 }, level17Terrains);
assert(pillarClick === null, `Clicking on center pillar body should return null, got ${JSON.stringify(pillarClick)}`);
const startedOnPillar = wallTestBridge.startDrawing({ x: 500, y: 300 }, level17Terrains);
assert(!startedOnPillar, 'startDrawing on center pillar body must return false');

// Case B: Clicking on left cliff wall body (below top road surface) must return null
const cliffWallClick = wallTestBridge.validateStartPoint({ x: 150, y: 400 }, level17Terrains);
assert(cliffWallClick === null, `Clicking on cliff wall body should return null, got ${JSON.stringify(cliffWallClick)}`);

// Case C: Drawing from open air towards the pillar must STOP at wall surface and never add points inside
wallTestBridge.clear();
const airStart = wallTestBridge.validateStartPoint({ x: 380, y: 250 }, level17Terrains);
assert(airStart !== null, 'Air start point should be valid');
wallTestBridge.startDrawing(airStart!);
// Move towards pillar: (420, 250) is still in the air
const added1 = wallTestBridge.addDrawingPoint({ x: 420, y: 250 }, level17Terrains);
assert(added1, 'Air point should be added');
// Move inside pillar: (490, 250) is inside pillar (x: 451 to 583)
wallTestBridge.addDrawingPoint({ x: 490, y: 250 }, level17Terrains);
// Boundary point may be added at wall face (x <= 451 - 4 + 0.5)
const currentPts = wallTestBridge.getRawPoints();
const lastPt = currentPts[currentPts.length - 1];
assert(lastPt.x <= 451 - 4 + 0.5, `Bridge must not penetrate pillar wall! lastPt.x = ${lastPt.x}`);
// Move further inside pillar: (540, 250)
const added3 = wallTestBridge.addDrawingPoint({ x: 540, y: 250 }, level17Terrains);
assert(!added3, 'Dragging further inside solid wall must return false and not add points');
const ptsAfter = wallTestBridge.getRawPoints();
assert(ptsAfter.length === currentPts.length, 'No new points should be added inside wall!');
console.log('✅ Test 14 Passed: Drawing on solid walls is strictly prevented and rejected.\n');

// Test 15: Upright vertical stick toppling under gravity onto floor (media_1791172000232 scenario)
console.log('Test 15: Upright vertical stick toppling under gravity onto floor...');
const toppleBridge = new BridgeManager();
// Draw a vertical stick in the air above the trench floor
toppleBridge.startDrawing({ x: 375, y: 390 });
toppleBridge.addDrawingPoint({ x: 380, y: 500 }, level17Terrains);
toppleBridge.finishDrawing(level17Terrains);
toppleBridge.startFalling(level17Terrains);

// Step physics: bridge must fall, land on floor, topple over, and lie flat
for (let i = 0; i < 180; i++) {
  toppleBridge.update(1 / 60, level17Terrains);
  if (toppleBridge.getIsSettled()) break;
}

assert(toppleBridge.getIsSettled(), 'Bridge should settle after falling flat');
const fallenPts = toppleBridge.getRawPoints();
const deltaY = Math.abs(fallenPts[0].y - fallenPts[fallenPts.length - 1].y);
assert(deltaY < 25, `Bridge should lie flat on the floor after toppling, got deltaY = ${deltaY}`);
console.log('✅ Test 15 Passed: Vertical stick naturally topples over to one side and lies flat on floor.\n');

// Test 16: Level 5 ramp settling and immediate driving start (media_1791172863123 scenario)
console.log('Test 16: Level 5 ramp drawing, fast settling, and vehicle driving...');
const rampBridge = new BridgeManager();
rampBridge.startDrawing({ x: 280, y: 180 });
rampBridge.addDrawingPoint({ x: 780, y: 460 }, level5Terrains);
rampBridge.finishDrawing(level5Terrains);
rampBridge.startFalling(level5Terrains);

for (let i = 0; i < 40; i++) {
  rampBridge.update(1 / 60, level5Terrains);
  if (rampBridge.getIsSettled()) break;
}
assert(rampBridge.getIsSettled(), 'Level 5 ramp must settle quickly without freezing');

// Test vehicle starting and advancing down the ramp
const level5Sim = new VehicleSimulation(140, 252.5, 9.8, 1.0, level5Terrains, 'smart_car');
level5Sim.setDriving(true);
for (let step = 0; step < 60; step++) {
  level5Sim.update(1 / 60, level5Terrains, rampBridge.getSegments(), [], { x: 756, y: 458, width: 60, height: 80 }, [], particles, rampBridge);
}
assert(level5Sim.vehicle.position.x > 200, `Vehicle must drive forward on level 5 ramp! x = ${level5Sim.vehicle.position.x}`);
console.log('✅ Test 16 Passed: Level 5 ramp settles cleanly and vehicle drives forward successfully.\n');

// Test 17: Drawing at high speed touching brick corner (media_1791173515480 scenario)
console.log('Test 17: Corner brushing at high speed preserves full ramp...');
const speedBridge = new BridgeManager();
const cornerStart = speedBridge.validateStartPoint({ x: 423, y: 278 }, level5Terrains);
assert(cornerStart !== null, 'Corner start should be snapped and valid');
speedBridge.startDrawing(cornerStart!);

// Fast dragging from corner down to trench floor
const fastPts = [{ x: 460, y: 310 }, { x: 520, y: 360 }, { x: 600, y: 420 }, { x: 700, y: 460 }];
let addedPoints = 0;
for (const pt of fastPts) {
  if (speedBridge.addDrawingPoint(pt, level5Terrains)) addedPoints++;
}
assert(addedPoints === fastPts.length, `All points drawn at speed must be accepted! Added: ${addedPoints}`);
assert(speedBridge.getCurrentLength() > 250, `Full ramp must be drawn, not a short stub! len = ${speedBridge.getCurrentLength()}`);
speedBridge.finishDrawing(level5Terrains);
speedBridge.startFalling(level5Terrains);
for (let i = 0; i < 40; i++) {
  speedBridge.update(1 / 60, level5Terrains);
  if (speedBridge.getIsSettled()) break;
}
assert(speedBridge.getIsSettled(), 'Corner-drawn ramp must settle cleanly');
console.log('✅ Test 17 Passed: Corner brushing at high speed draws full bridge and settles properly.\n');

// Test 18: Full traversal to the end of the destination platform & win condition timing
console.log('Test 18: Full traversal to platform end and win modal stop timing...');
const fullRamp = new BridgeManager();
fullRamp.startDrawing({ x: 425, y: 271 });
fullRamp.addDrawingPoint({ x: 780, y: 460 }, level5Terrains);
fullRamp.finishDrawing(level5Terrains);
fullRamp.startFalling(level5Terrains);
for (let i = 0; i < 40; i++) {
  fullRamp.update(1 / 60, level5Terrains);
  if (fullRamp.getIsSettled()) break;
}

const endSim = new VehicleSimulation(140, 252.5, 9.8, 1.0, level5Terrains, 'smart_car');
endSim.setDriving(true);
const endGoal = { x: 756, y: 458, width: 60, height: 80 };

let wonWhileMoving = false;
let maxPosX = 0;
let minPosAfterMax = 999;
let hasRebounded = false;

for (let frame = 0; frame < 220; frame++) {
  endSim.update(1 / 60, level5Terrains, fullRamp.getSegments(), [], endGoal, [], particles, fullRamp);
  const v = endSim.vehicle;
  maxPosX = Math.max(maxPosX, v.position.x);
  if (v.hasWon && endSim.getIsDriving() && v.position.x < 850) {
    wonWhileMoving = true;
  }
  if (!endSim.getIsDriving() && v.velocity.x < 0) {
    hasRebounded = true;
  }
  if (hasRebounded) {
    minPosAfterMax = Math.min(minPosAfterMax, v.position.x);
  }
  if (!endSim.getIsDriving() && Math.abs(v.velocity.x) < 0.5) break;
}

assert(wonWhileMoving, 'Vehicle should have crossed the flag while actively driving');
assert(maxPosX >= 958, `Vehicle bumper should touch end wall (zero gap), reached maxPosX = ${maxPosX}`);
assert(!endSim.getIsDriving(), 'Vehicle should stop driving after reaching the platform end');
assert(endSim.vehicle.position.x >= 950, `Vehicle must settle at platform end without backwards catapulting! x = ${endSim.vehicle.position.x}`);
assert(endSim.vehicle.wheels[0].isGrounded && endSim.vehicle.wheels[1].isGrounded, 'Vehicle wheels must be firmly grounded upon settling');
console.log(`✅ Test 18 Passed: Vehicle closes wall gap to x=${endSim.vehicle.position.x.toFixed(1)}, smoothly stops driving, and settles stably on wheels.\n`);

// Test 19: Universal Corner Drawing & Routing in all directions (Down, Up, Right, Left)
console.log('Test 19: Multi-directional corner drawing and routing (all 4 corners)...');
const cornerBM = new BridgeManager();
const testWall: TerrainBlock[] = [
  { id: 'cliff', type: 'brick', x: 200, y: 300, width: 200, height: 200 }
];

// Scenario 1: Top-Right corner - Draw from top surface (left of corner) downwards into chasm
cornerBM.clear();
const startTR = cornerBM.validateStartPoint({ x: 380, y: 296 }, testWall);
assert(startTR !== null, 'Start point near TR corner must be valid');
cornerBM.startDrawing(startTR!);
// Move along top then down off edge
assert(cornerBM.addDrawingPoint({ x: 390, y: 296 }, testWall), 'Step along top should add');
assert(cornerBM.addDrawingPoint({ x: 410, y: 350 }, testWall), 'Move down off TR corner must route and add');
assert(cornerBM.addDrawingPoint({ x: 420, y: 420 }, testWall), 'Move further down must add');
const trPts = cornerBM.getRawPoints();
assert(trPts.length >= 4, `TR down: expected at least 4 points, got ${trPts.length}`);
// The corner point (400, 296) must be captured
assert(trPts.some(p => p.x === 400 && p.y === 296), 'TR corner point must be in polyline');

// Scenario 2: Top-Right corner - Drawing down with finger slightly inward (inside wall x=395 < 400)
cornerBM.clear();
cornerBM.startDrawing({ x: 380, y: 296 });
assert(cornerBM.addDrawingPoint({ x: 395, y: 360 }, testWall), 'Drawing down with inward finger must route to outer side');
assert(cornerBM.addDrawingPoint({ x: 395, y: 420 }, testWall), 'Drawing further down along side must succeed');
const trInwardPts = cornerBM.getRawPoints();
assert(trInwardPts.every(p => p.x >= 400 || (p.y <= 300 && p.x <= 400)), 'No point should penetrate solid body');

// Scenario 3: Top-Right corner - Drawing UP and over top from side face
cornerBM.clear();
cornerBM.startDrawing({ x: 404.5, y: 340 });
assert(cornerBM.addDrawingPoint({ x: 370, y: 280 }, testWall), 'Drawing UP over TR corner must route and succeed');
const trUpPts = cornerBM.getRawPoints();
assert(trUpPts.length >= 2, 'TR up must succeed');

// Scenario 4: Top-Left corner - Drawing down from top surface
cornerBM.clear();
cornerBM.startDrawing({ x: 220, y: 296 });
assert(cornerBM.addDrawingPoint({ x: 190, y: 350 }, testWall), 'Move down off TL corner must route and add');
const tlPts = cornerBM.getRawPoints();
assert(tlPts.some(p => p.x === 200 && p.y === 296), 'TL corner point must be in polyline');

// Scenario 5: Bottom-Right corner - Drawing UP around corner
cornerBM.clear();
cornerBM.startDrawing({ x: 380, y: 504 });
assert(cornerBM.addDrawingPoint({ x: 420, y: 450 }, testWall), 'Drawing UP around BR corner must route and add');
const brPts = cornerBM.getRawPoints();
assert(brPts.some(p => p.x === 400 && p.y === 504), 'BR corner point must be captured');

console.log('✅ Test 19 Passed: Drawing smoothly routes around all corners in all directions without freezing or solid penetration.\n');

// Test 20: Anti-Jump Physics Clamping - Drawing pulled down below wall settles stably with zero jumping
console.log('Test 20: Bridge drawn with downward pull near wall settles with zero jump / explosion...');
const antiJumpBM = new BridgeManager();
antiJumpBM.startDrawing({ x: 400, y: 271 }, level5Terrains);
antiJumpBM.addDrawingPoint({ x: 410, y: 310 }, level5Terrains); // pulled down below wall
antiJumpBM.addDrawingPoint({ x: 420, y: 360 }, level5Terrains);
antiJumpBM.addDrawingPoint({ x: 480, y: 410 }, level5Terrains);
antiJumpBM.addDrawingPoint({ x: 580, y: 456 }, level5Terrains);
antiJumpBM.finishDrawing(level5Terrains);
antiJumpBM.startFalling(level5Terrains);

for (let i = 0; i < 40; i++) {
  antiJumpBM.update(1 / 60, level5Terrains);
  if (antiJumpBM.getIsSettled()) break;
}

assert(antiJumpBM.getIsSettled(), 'Bridge with downward pull must settle stably without disappearing');
assert(antiJumpBM.getHasBothWallSupports(), 'Spanning bridge with downward pull must retain dual wall support');
const antiJumpPts = antiJumpBM.getRawPoints();
assert(antiJumpPts.length >= 5, 'Bridge geometry must remain intact');
assert(Math.abs(antiJumpPts[0].y - 271) < 8, `Left resting point must not jump into air! y = ${antiJumpPts[0].y}`);
console.log('✅ Test 20 Passed: Bridge drawn with downward pull settles stably with zero jump or catapulting.\n');

// Test 21: Vehicle crossing bridge with downward corner pull without stopping or getting stuck
console.log('Test 21: Vehicle crossing bridge with downward corner pull without stopping...');
const driveSim = new VehicleSimulation(140, 252.5, 9.8, 1.0, level5Terrains, 'smart_car');
driveSim.setDriving(true);

let vehicleStuck = false;
for (let frame = 0; frame < 180; frame++) {
  driveSim.update(1 / 60, level5Terrains, antiJumpBM.getSegments(), [], { x: 756, y: 458, width: 60, height: 80 }, [], particles, antiJumpBM);
  const v = driveSim.vehicle;
  if (driveSim.getIsDriving() && Math.abs(v.velocity.x) < 0.5 && v.position.x > 380 && v.position.x < 700) {
    vehicleStuck = true;
    break;
  }
}

assert(!vehicleStuck, 'Vehicle must not get stuck while driving across bridge');
assert(driveSim.vehicle.position.x > 700, `Vehicle must traverse across the bridge! Reached x = ${driveSim.vehicle.position.x}`);
console.log('✅ Test 21 Passed: Vehicle smoothly traverses bridge with downward corner pull without getting stuck.\n');

// Test 22: High-speed drawing prevention over solid walls & floors (Level 11 reproduction)
console.log('Test 22: Fast drawing speed zero penetration over solid walls and floor...');
const level11Terrains: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 0, y: 380, width: 400, height: 220 },
  { id: 'right-cliff', type: 'brick', x: 570, y: 380, width: 430, height: 220 },
  { id: 't-bottom-11-0', type: 'brick', x: 400, y: 531, width: 170, height: 70 },
  { id: 't-1790659146141', type: 'brick', x: 392, y: 248, width: 180, height: 283 }
];

const fastDrawBM = new BridgeManager();

// Case A: High-speed swipe straight down into right cliff floor from air
fastDrawBM.startDrawing({ x: 575, y: 360 });
fastDrawBM.addDrawingPoint({ x: 575, y: 550 }, level11Terrains); // 190px jump downwards in one step
fastDrawBM.addDrawingPoint({ x: 575, y: 600 }, level11Terrains); // further swipe to bottom of screen
const fastPtsA = fastDrawBM.getRawPoints();
assert(fastPtsA.length >= 2, 'Should clip at cliff top surface');
assert(fastPtsA.every(p => !isPointInsideSolidTerrain(p, level11Terrains, 0.5)), 'No points should penetrate solid cliff or floor!');
const maxYA = Math.max(...fastPtsA.map(p => p.y));
assert(maxYA <= 376, `Stroke must stop at or above cliff surface y=380-radius=376, reached y=${maxYA}`);

// Case B: High-speed diagonal swipe across cliff
fastDrawBM.clear();
fastDrawBM.startDrawing({ x: 650, y: 350 });
fastDrawBM.addDrawingPoint({ x: 750, y: 580 }, level11Terrains);
fastDrawBM.addDrawingPoint({ x: 750, y: 600 }, level11Terrains);
const fastPtsB = fastDrawBM.getRawPoints();
assert(fastPtsB.every(p => !isPointInsideSolidTerrain(p, level11Terrains, 0.5)), 'Diagonal fast draw must not penetrate solid cliff');
const maxYB = Math.max(...fastPtsB.map(p => p.y));
assert(maxYB <= 376, `Diagonal swipe must stop at or above cliff surface y=376, reached y=${maxYB}`);

console.log('✅ Test 22 Passed: High-speed drawing strictly blocked at outer surface with zero solid penetration.\n');

// Test 23: Screen boundaries & ceiling constraints (prevent drawing or vehicle exiting window/screen height)
console.log('Test 23: Screen boundaries and ceiling constraints (prevent out-of-screen drawing & vehicle escape)...');
const boundsBM = new BridgeManager();

// Case A: Drawing dragged far above screen (y < 0, e.g. y = -150) must be clamped to y >= 0
boundsBM.startDrawing({ x: 200, y: -50 });
boundsBM.addDrawingPoint({ x: 300, y: -150 }, []);
boundsBM.addDrawingPoint({ x: 400, y: -200 }, []);
const topPts = boundsBM.getRawPoints();
assert(topPts.length >= 2, 'Should clamp and add points');
assert(topPts.every(p => p.y >= 0), `All points must stay within screen height y >= 0! Min y: ${Math.min(...topPts.map(p => p.y))}`);

// Case B: Drawing dragged far below screen (y > 600, e.g. y = 800) must be clamped to y <= 600
boundsBM.clear();
boundsBM.startDrawing({ x: 200, y: 700 });
boundsBM.addDrawingPoint({ x: 300, y: 800 }, []);
boundsBM.addDrawingPoint({ x: 400, y: 850 }, []);
const bottomPts = boundsBM.getRawPoints();
assert(bottomPts.every(p => p.y <= 600), `All points must stay within screen height y <= 600! Max y: ${Math.max(...bottomPts.map(p => p.y))}`);

// Case C: Vehicle upward propulsion cannot escape above screen ceiling
const skySim = new VehicleSimulation(200, 100, 9.8, 1.0, [], 'smart_car');
skySim.vehicle.velocity.y = -600; // violent upward velocity
for (let frame = 0; frame < 30; frame++) {
  skySim.update(1 / 60, [], [], [], { x: 900, y: 300, width: 60, height: 80 }, [], particles);
}
assert(skySim.vehicle.position.y >= 18, `Vehicle must never escape above window screen ceiling! y = ${skySim.vehicle.position.y}`);
assert(!skySim.vehicle.isDead, 'Vehicle should bounce down from ceiling and survive');

console.log('✅ Test 23 Passed: Bridge line and vehicle are strictly contained within window screen boundaries.\n');

// Test 24: Elevated bridge goal traversal without premature end barrier stop (Level 8 scenario)
console.log('Test 24: Elevated bridge goal traversal without premature end barrier stop (Level 8)...');
const level8Terrains: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 0, y: 380, width: 410, height: 220 },
  { id: 'right-cliff', type: 'brick', x: 590, y: 380, width: 410, height: 220 },
  { id: 't-bottom-8-0', type: 'brick', x: 410, y: 530, width: 180, height: 70 }
];
const level8Goal = { x: 639, y: 380, width: 60, height: 80 };

const l8Bridge = new BridgeManager();
l8Bridge.startDrawing({ x: 380, y: 376 });
// Draw high arch over pit reaching x = 750 on right cliff (climbable <= 50° slope)
for (let i = 1; i <= 10; i++) {
  const t = i / 10;
  const x = 380 + t * 370;
  const archY = 376 - Math.sin(t * Math.PI) * 135;
  l8Bridge.addDrawingPoint({ x, y: archY }, level8Terrains);
}
l8Bridge.finishDrawing(level8Terrains);
l8Bridge.startFalling(level8Terrains);

const l8Sim = new VehicleSimulation(340, 357.5, 9.8, 1.0, level8Terrains, 'smart_car');
l8Sim.setDriving(true);

for (let frame = 0; frame < 180; frame++) {
  l8Sim.update(1 / 60, level8Terrains, l8Bridge.getSegments(), [], level8Goal, [], particles, l8Bridge);
}

// Car should have reached and passed the flag (x >= 639 + 25 = 664) and continued forward smoothly
assert(l8Sim.vehicle.hasWon, 'Vehicle must trigger hasWon upon crossing flag');
assert(l8Sim.vehicle.position.x > 675, `Vehicle must not be prematurely stopped at x=664! Reached x = ${l8Sim.vehicle.position.x}`);
console.log('✅ Test 24 Passed: Vehicle smoothly traverses elevated bridge past flag without premature stop.\n');

// Test 25: Multi-platform bridge zero seesaw catapulting and sky loop drop (Level 32/42 scenarios)
console.log('Test 25: Zero seesaw catapulting & sky loop gravity drop (Level 32/42 scenarios)...');
const l32Terrains: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 0, y: 380, width: 410, height: 220 },
  { id: 'right-cliff', type: 'brick', x: 590, y: 380, width: 410, height: 220 },
  { id: 't-bottom-32', type: 'brick', x: 410, y: 530, width: 180, height: 70 }
];

// Case A: Bridge with tail covering spawn cliff (x=160 to 380) must remain flat on cliff surface, zero seesaw catapult
const seesawBridge = new BridgeManager();
seesawBridge.startDrawing({ x: 160, y: 376 });
seesawBridge.addDrawingPoint({ x: 380, y: 376 }, l32Terrains);
seesawBridge.addDrawingPoint({ x: 485, y: 340 }, l32Terrains);
seesawBridge.addDrawingPoint({ x: 680, y: 376 }, l32Terrains);
seesawBridge.finishDrawing(l32Terrains);
seesawBridge.startFalling(l32Terrains);

const ptsAfterSettling = seesawBridge.getRawPoints();
const leftTailY = ptsAfterSettling[0].y;
// Left tail must NOT catapult into the air (in Level 32 screenshot it flew up to y ~ 335-340)
assert(Math.abs(leftTailY - 376) <= 3.0, `Left tail over cliff must stay flat on road, got y = ${leftTailY} (expected ~376)`);
assert(seesawBridge.getHasBothWallSupports(), 'Bridge should be supported by both platforms');

// Case B: Bridge drawn with high loop in the sky (Level 42 scenario) must NOT freeze in mid-air
const skyLoopBridge = new BridgeManager();
skyLoopBridge.startDrawing({ x: 380, y: 376 });
for (let i = 1; i <= 8; i++) {
  const t = i / 8;
  const x = 380 + t * 300;
  const y = 376 - Math.sin(t * Math.PI) * 180; // High curve up to y = 196
  skyLoopBridge.addDrawingPoint({ x, y }, l32Terrains);
}
skyLoopBridge.finishDrawing(l32Terrains);
skyLoopBridge.startFalling(l32Terrains);

// Must fall under gravity initially because of sky loop, not freeze instantly in mid-air
assert(skyLoopBridge.getIsFalling(), 'High sky loop bridge must fall under gravity and not freeze as flush');

console.log('✅ Test 25 Passed: Zero seesaw catapulting and sky loops correctly fall under gravity.\n');

// Test 26: Zero brick penetration over stacked pillar & cliff seam (Level 24 media_1791263635007 scenario)
console.log('Test 26: Zero brick penetration over stacked pillar & cliff seam (Level 24 scenario)...');
const l24Terrains: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 1, y: 416, width: 319, height: 327 },
  { id: 't-bottom-24-0', type: 'brick', x: 319, y: 530, width: 208, height: 70 },
  { id: 'right-cliff', type: 'brick', x: 527, y: 445, width: 473, height: 155 },
  { id: 't-pillar-24', type: 'brick', x: 529, y: 305, width: 120, height: 140 }
];

// Failure path: fast diagonal swipe from spike pit across middle pillar into sky
const swipeBridge = new BridgeManager();
swipeBridge.startDrawing({ x: 350, y: 515 }, l24Terrains);
const swipeSteps = [
  { x: 450, y: 505 },
  { x: 550, y: 495 },
  { x: 650, y: 485 },
  { x: 740, y: 470 },
  { x: 800, y: 430 },
  { x: 860, y: 360 },
  { x: 870, y: 300 },
  { x: 800, y: 200 },
  { x: 710, y: 110 }
];

for (const step of swipeSteps) {
  swipeBridge.addDrawingPoint(step, l24Terrains);
}
swipeBridge.finishDrawing(l24Terrains);

const swipePts = swipeBridge.getRawPoints();
// Must be stopped cleanly at the cliff/pillar left face and not penetrate into pillar or cliff
for (const p of swipePts) {
  assert(!isPointInsideSolidTerrain(p, l24Terrains, 0.5), `Swipe point penetrated inside solid terrain! (${p.x}, ${p.y})`);
  assert(p.x <= 528, `Drawing should be stopped at wall surface (x <= 528), got x = ${p.x}`);
}

// Happy path: valid curved bridge drawn cleanly over spike pit onto pillar top
const validL24Bridge = new BridgeManager();
const startPoint = validL24Bridge.validateStartPoint({ x: 310, y: 412 }, l24Terrains);
assert(startPoint !== null, 'Start point on left cliff must be valid');
validL24Bridge.startDrawing(startPoint!, l24Terrains);
validL24Bridge.addDrawingPoint({ x: 380, y: 440 }, l24Terrains);
validL24Bridge.addDrawingPoint({ x: 450, y: 410 }, l24Terrains);
validL24Bridge.addDrawingPoint({ x: 520, y: 340 }, l24Terrains);
validL24Bridge.addDrawingPoint({ x: 550, y: 301.5 }, l24Terrains); // Pillar top surface
validL24Bridge.addDrawingPoint({ x: 620, y: 301.5 }, l24Terrains); // Across pillar top
validL24Bridge.finishDrawing(l24Terrains);

const validPts = validL24Bridge.getRawPoints();
assert(validPts.length >= 4, `Valid bridge should have at least 4 points, got ${validPts.length}`);
for (const p of validPts) {
  assert(!isPointInsideSolidTerrain(p, l24Terrains, 0.5), `Valid bridge point penetrated solid terrain! (${p.x}, ${p.y})`);
}
console.log('✅ Test 26 Passed: Stacked pillar and cliff seam strictly prevents brick penetration while preserving valid drawing.\n');

// Test 27: High arch / sky bridge goal flag crossing triggers victory (Level 7 & 9 scenarios)
console.log('Test 27: High arch & sky bridge goal flag crossing (Level 7 & 9 media scenarios)...');
// Case A: Level 7 scenario (goal at y = 459, bridge high arch at y ~ 140)
const l7Sim = new VehicleSimulation(800, 140, 9.8, 1.0, [], 'smart_car');
l7Sim.setDriving(true);
l7Sim.vehicle.position = { x: 800, y: 140 };
l7Sim.vehicle.velocity = { x: 120, y: 0 };
l7Sim.vehicle.angle = 0.1;
const l7Goal = { x: 811, y: 459, width: 60, height: 80 };

// Step forward past flagpole at x = 811 + 25 = 836 while still high in the sky (y = 140)
for (let f = 0; f < 30; f++) {
  l7Sim.update(1 / 60, [], [], [], l7Goal, [], particles, undefined);
  if (l7Sim.vehicle.hasWon) break;
}
assert(l7Sim.vehicle.hasWon, 'Level 7: Vehicle crossing flag on high bridge in sky (y=140, goal.y=459) must trigger hasWon!');

// Case B: Level 9 scenario (goal at y = 220, bridge arch at y ~ 80)
const l9Sim = new VehicleSimulation(760, 80, 9.8, 1.0, [], 'smart_car');
l9Sim.setDriving(true);
l9Sim.vehicle.position = { x: 760, y: 80 };
l9Sim.vehicle.velocity = { x: 100, y: 0 };
l9Sim.vehicle.angle = 0.2;
const l9Goal = { x: 766, y: 220, width: 60, height: 80 };

for (let f = 0; f < 30; f++) {
  l9Sim.update(1 / 60, [], [], [], l9Goal, [], particles, undefined);
  if (l9Sim.vehicle.hasWon) break;
}
assert(l9Sim.vehicle.hasWon, 'Level 9: Vehicle crossing flag above obstacles (y=80, goal.y=220) must trigger hasWon!');

// Case C: Failure path - car fallen into deep pit below goal platform (y = goal.y + 100) must NOT win
const pitSim = new VehicleSimulation(850, 560, 9.8, 1.0, [], 'smart_car');
pitSim.setDriving(true);
pitSim.vehicle.position = { x: 850, y: 560 }; // Below platform (459 + 101)
pitSim.vehicle.velocity = { x: 80, y: 0 };
pitSim.update(1 / 60, [], [], [], l7Goal, [], particles, undefined);
assert(!pitSim.vehicle.hasWon, 'Vehicle below platform floor in pit must NOT trigger hasWon!');

console.log('✅ Test 27 Passed: High bridge goal crossings cleanly trigger victory while pit falls are rejected.\n');

// Test 28: Full traversal to end border, zero backwards jumping, and stable wheel settling on bridge slope (Level 8 scenario)
console.log('Test 28: Full end border traversal & stable wheel settling without backwards jump (Level 8 scenario)...');
const t28Terrains: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 0, y: 380, width: 410, height: 220 },
  { id: 'right-cliff', type: 'brick', x: 590, y: 380, width: 410, height: 220 },
  { id: 't-bottom-8-0', type: 'brick', x: 410, y: 530, width: 180, height: 70 }
];
const t28Goal = { x: 639, y: 380, width: 60, height: 80 };
const t28Bridge = new BridgeManager();
t28Bridge.startDrawing({ x: 200, y: 376 });
const t28Pts = [
  { x: 200, y: 376 },
  { x: 310, y: 270 },
  { x: 420, y: 170 },
  { x: 530, y: 110 },
  { x: 640, y: 100 },
  { x: 750, y: 100 },
  { x: 850, y: 120 },
  { x: 920, y: 160 },
  { x: 980, y: 200 }
];
for (let i = 1; i < t28Pts.length; i++) {
  t28Bridge.addDrawingPoint(t28Pts[i], t28Terrains);
}
t28Bridge.finishDrawing(t28Terrains);
t28Bridge.startFalling(t28Terrains);

const t28Sim = new VehicleSimulation(140, 357.5, 9.8, 1.0, t28Terrains, 'smart_car');
t28Sim.setDriving(true);

let t28MaxX = 0;
for (let f = 0; f < 250; f++) {
  t28Sim.update(1 / 60, t28Terrains, t28Bridge.getSegments(), [], t28Goal, [], particles, t28Bridge, { left: 0, right: 1000, top: 0, bottom: 600 });
  t28MaxX = Math.max(t28MaxX, t28Sim.vehicle.position.x);
}

// 1. Vehicle crossed the flag and hasWon is true
assert(t28Sim.vehicle.hasWon, 'Vehicle must win upon crossing the flag');
// 2. Vehicle traversed all the way to the end border (x >= 955, front bumper touches 1000)
assert(t28MaxX >= 955, `Vehicle must reach screen end border (x >= 955), reached max = ${t28MaxX.toFixed(1)}`);
// 3. Vehicle has stopped driving upon reaching end border
assert(!t28Sim.getIsDriving(), 'Driving must stop at end barrier');
// 4. Vehicle settled at the end border without violent backwards jumping
assert(t28Sim.vehicle.position.x >= 950, `Vehicle must stay at end border, pos = ${t28Sim.vehicle.position.x.toFixed(1)}`);
// 5. Vehicle wheels are grounded and vehicle is resting stably (never suspended/frozen in air)
assert(t28Sim.vehicle.wheels[0].isGrounded || t28Sim.vehicle.wheels[1].isGrounded, 'Vehicle wheels must be grounded on the bridge/ground');
assert(Math.abs(t28Sim.vehicle.velocity.x) < 2 && Math.abs(t28Sim.vehicle.velocity.y) < 2, 'Vehicle velocities must be at rest');

console.log('✅ Test 28 Passed: Vehicle traverses to end border, stops smoothly, and settles stably on wheels.\n');

// Test 29: High arch near screen top (y ~ 18, Level 10 scenario) - vehicle stays on top with zero penetration
console.log('Test 29: High arch crest traversal near screen ceiling without downward penetration (Level 10)...');
const t29Terrains: TerrainBlock[] = [
  { id: 'tier-1', type: 'brick', x: 0, y: 480, width: 260, height: 120 },
  { id: 'tier-2', type: 'brick', x: 260, y: 390, width: 240, height: 210 },
  { id: 'tier-3', type: 'brick', x: 500, y: 300, width: 240, height: 300 },
  { id: 'tier-4', type: 'brick', x: 740, y: 215, width: 260, height: 385 }
];
const t29Goal = { x: 792, y: 213, width: 60, height: 80 };
const t29Bridge = new BridgeManager();
t29Bridge.startDrawing({ x: 140, y: 476 });
const t29Pts = [
  { x: 140, y: 476 },
  { x: 255, y: 365 },
  { x: 375, y: 255 },
  { x: 495, y: 145 },
  { x: 585, y: 65 },
  { x: 660, y: 25 },
  { x: 730, y: 40 },
  { x: 800, y: 90 },
  { x: 880, y: 200 }
];
for (let i = 1; i < t29Pts.length; i++) {
  t29Bridge.addDrawingPoint(t29Pts[i], t29Terrains);
}
t29Bridge.finishDrawing(t29Terrains);
t29Bridge.startFalling(t29Terrains);

const t29Sim = new VehicleSimulation(100, 457.5, 10, 1.0, t29Terrains, 'smart_car');
t29Sim.setDriving(true);

let maxOverCrestX = 0;
let minObservedY = Infinity;
for (let f = 0; f < 250; f++) {
  t29Sim.update(1 / 60, t29Terrains, t29Bridge.getSegments(), [], t29Goal, [], particles, t29Bridge, { left: 0, right: 1000, top: 0, bottom: 600 });
  maxOverCrestX = Math.max(maxOverCrestX, t29Sim.vehicle.position.x);
  minObservedY = Math.min(minObservedY, t29Sim.vehicle.position.y);
}

// 1. When bridge is pinched against ceiling (y = 25), vehicle stops before the squeeze ("thoda sa dur hi rok do")
assert(maxOverCrestX <= 655, `Vehicle must stop before squeezed ceiling gap! Stopped at x = ${maxOverCrestX.toFixed(1)}`);
assert(!t29Sim.getIsDriving(), 'Driving must stop before pinched ceiling');
assert(!t29Sim.vehicle.isDead, 'Vehicle must not die or fall through bridge');
assert(t29Sim.vehicle.wheels[0].isGrounded || t29Sim.vehicle.wheels[1].isGrounded, 'Vehicle wheels must stay grounded on top of bridge');
// 2. Vehicle chassis and roof must NEVER go above screen ceiling (topLimit = 0)
assert(minObservedY >= 19, `Vehicle must stay strictly within screen ceiling! minObservedY = ${minObservedY}`);

// Case B: Bridge drawn with safe headroom clearance (y = 65 > 46) -> vehicle traverses crest and wins!
const t29SafeBridge = new BridgeManager();
t29SafeBridge.startDrawing({ x: 140, y: 476 });
const t29SafePts = [
  { x: 140, y: 476 },
  { x: 255, y: 365 },
  { x: 375, y: 265 },
  { x: 495, y: 175 },
  { x: 585, y: 100 },
  { x: 650, y: 65 }, // Safe clearance under ceiling!
  { x: 720, y: 85 },
  { x: 780, y: 140 },
  { x: 860, y: 215 }
];
for (let i = 1; i < t29SafePts.length; i++) {
  t29SafeBridge.addDrawingPoint(t29SafePts[i], t29Terrains);
}
t29SafeBridge.finishDrawing(t29Terrains);
t29SafeBridge.startFalling(t29Terrains);

const t29SafeSim = new VehicleSimulation(100, 457.5, 10, 1.0, t29Terrains, 'smart_car');
t29SafeSim.setDriving(true);
let maxSafeX = 0;
for (let f = 0; f < 250; f++) {
  t29SafeSim.update(1 / 60, t29Terrains, t29SafeBridge.getSegments(), [], t29Goal, [], particles, t29SafeBridge, { left: 0, right: 1000, top: 0, bottom: 600 });
  maxSafeX = Math.max(maxSafeX, t29SafeSim.vehicle.position.x);
}
assert(maxSafeX >= 800, `Vehicle must traverse arch with safe clearance! Reached x = ${maxSafeX.toFixed(1)}`);
assert(t29SafeSim.vehicle.hasWon, 'Vehicle must win when bridge has safe ceiling clearance');

console.log('✅ Test 29 Passed: Vehicle safely stops before squeezed ceiling bridge and traverses bridge with clearance.\n');

// Test 30: 50 Degree Slope Climbing Limit & Screen Boundary Containment
console.log('Test 30: 50 Degree slope climbing limit & screen boundary containment...');
const t30Terrains: TerrainBlock[] = [
  { id: 'start-plat', type: 'brick', x: 0, y: 480, width: 250, height: 120 },
  { id: 'goal-plat', type: 'brick', x: 600, y: 300, width: 400, height: 300 }
];
const t30Goal = { x: 700, y: 298, width: 60, height: 80 };

// Case A: Bridge with 45 degree slope (<= 50°) -> vehicle successfully climbs!
const climbBridge = new BridgeManager();
climbBridge.startDrawing({ x: 200, y: 476 });
// dx = 120, dy = -120 -> theta = 45 degrees
climbBridge.addDrawingPoint({ x: 320, y: 356 }, t30Terrains);
climbBridge.addDrawingPoint({ x: 440, y: 300 }, t30Terrains);
climbBridge.addDrawingPoint({ x: 620, y: 296 }, t30Terrains);
climbBridge.finishDrawing(t30Terrains);
climbBridge.startFalling(t30Terrains);
for (let i = 0; i < 60; i++) climbBridge.update(1 / 60, t30Terrains);

const climbSim = new VehicleSimulation(150, 457.5, 9.8, 1.0, t30Terrains, 'smart_car');
climbSim.setDriving(true);
for (let f = 0; f < 180; f++) {
  climbSim.update(1 / 60, t30Terrains, climbBridge.getSegments(), [], t30Goal, [], particles, climbBridge, { left: 0, right: 1000, top: 0, bottom: 600 });
}
assert(climbSim.vehicle.position.x > 320, `Vehicle must climb 45 deg slope (<= 65 deg)! Reached x = ${climbSim.vehicle.position.x.toFixed(1)}`);

// Case B1: Bridge with 60 degree slope (<= 65°) -> vehicle successfully climbs!
const t30B1Terrains: TerrainBlock[] = [
  { id: 'start-plat', type: 'brick', x: 0, y: 480, width: 220, height: 120 },
  { id: 'upper-plat', type: 'brick', x: 350, y: 220, width: 300, height: 380 }
];
const t30B1Goal = { x: 500, y: 218, width: 60, height: 80 };
const climb60Bridge = new BridgeManager();
climb60Bridge.startDrawing({ x: 200, y: 476 });
// dx = 155, dy = -260 -> theta = 59.2 degrees (<= 65 degrees)
climb60Bridge.addDrawingPoint({ x: 275, y: 346 }, t30B1Terrains);
climb60Bridge.addDrawingPoint({ x: 355, y: 216 }, t30B1Terrains);
climb60Bridge.finishDrawing(t30B1Terrains);
climb60Bridge.startFalling(t30B1Terrains);
for (let i = 0; i < 60; i++) climb60Bridge.update(1 / 60, t30B1Terrains);

const climb60Sim = new VehicleSimulation(120, 457.5, 9.8, 1.0, t30B1Terrains, 'smart_car');
climb60Sim.setDriving(true);
let climb60MaxX = 0;
for (let f = 0; f < 250; f++) {
  climb60Sim.update(1 / 60, t30B1Terrains, climb60Bridge.getSegments(), [], t30B1Goal, [], particles, climb60Bridge, { left: 0, right: 1000, top: 0, bottom: 600 });
  climb60MaxX = Math.max(climb60MaxX, climb60Sim.vehicle.position.x);
}
assert(climb60MaxX >= 350, `Vehicle must climb 60 deg slope (<= 65 deg)! Reached max x = ${climb60MaxX.toFixed(1)}`);

// Case B2: Bridge with 70 degree slope (> 65°) -> vehicle CANNOT climb!
const t30B2Terrains: TerrainBlock[] = [
  { id: 'start-plat', type: 'brick', x: 0, y: 480, width: 220, height: 120 },
  { id: 'upper-plat', type: 'brick', x: 295, y: 220, width: 300, height: 380 }
];
const t30B2Goal = { x: 500, y: 218, width: 60, height: 80 };
const steep70Bridge = new BridgeManager();
steep70Bridge.startDrawing({ x: 200, y: 476 });
// dx = 100, dy = -260 -> theta = 68.96 degrees (> 65 degrees)
steep70Bridge.addDrawingPoint({ x: 250, y: 346 }, t30B2Terrains);
steep70Bridge.addDrawingPoint({ x: 300, y: 216 }, t30B2Terrains);
steep70Bridge.finishDrawing(t30B2Terrains);
steep70Bridge.startFalling(t30B2Terrains);
for (let i = 0; i < 60; i++) steep70Bridge.update(1 / 60, t30B2Terrains);

const steep70Sim = new VehicleSimulation(120, 457.5, 9.8, 1.0, t30B2Terrains, 'smart_car');
steep70Sim.setDriving(true);
let steep70MaxX = 0;
for (let f = 0; f < 250; f++) {
  steep70Sim.update(1 / 60, t30B2Terrains, steep70Bridge.getSegments(), [], t30B2Goal, [], particles, steep70Bridge, { left: 0, right: 1000, top: 0, bottom: 600 });
  steep70MaxX = Math.max(steep70MaxX, steep70Sim.vehicle.position.x);
}
assert(steep70MaxX < 290, `Vehicle must NOT climb slope > 65 deg! Reached steep70MaxX = ${steep70MaxX.toFixed(1)}`);

// Case C: Screen ceiling boundary -> vehicle roof never goes above screen (y < 0)
const roofSim = new VehicleSimulation(150, 50, 9.8, 1.0, [], 'smart_car');
roofSim.vehicle.velocity.y = -800; // Strong upward impulse towards ceiling
for (let f = 0; f < 40; f++) {
  roofSim.update(1 / 60, [], [], [], t30Goal, [], particles, undefined, { left: 0, right: 1000, top: 0, bottom: 600 });
  assert(roofSim.vehicle.position.y >= 19, `Vehicle must never escape above screen ceiling! y = ${roofSim.vehicle.position.y}`);
}

// Case D: Screen right border -> vehicle stops driving when reaching screen boundary
const borderSim = new VehicleSimulation(930, 457.5, 9.8, 1.0, t30Terrains, 'smart_car');
borderSim.vehicle.velocity.x = 250;
borderSim.setDriving(true);
for (let f = 0; f < 40; f++) {
  borderSim.update(1 / 60, t30Terrains, [], [], { x: 50, y: 50, width: 60, height: 80 }, [], particles, undefined, { left: 0, right: 1000, top: 0, bottom: 600 });
}
assert(borderSim.vehicle.position.x <= 965, `Vehicle must be stopped at right border! x = ${borderSim.vehicle.position.x}`);
assert(!borderSim.getIsDriving(), 'Vehicle must stop driving at screen border');

console.log('✅ Test 30 Passed: Strict 65° slope climb limit, ceiling containment, and border stop fully verified.\n');

// Test 31: Natural hand-drawn ramp climbing with stroke jitter (Level 67 Mountain Wall Ascent)
console.log('Test 31: Natural hand-drawn ramp with stroke jitter (Level 67 Mountain Wall Ascent)...');
const t31Terrains: TerrainBlock[] = [
  { id: 'left-cliff', type: 'brick', x: 0, y: 471, width: 220, height: 129 },
  { id: 'right-cliff', type: 'brick', x: 500, y: 265, width: 500, height: 335 }
];
const t31Goal = { x: 900, y: 263, width: 60, height: 80 };

const t31Bridge = new BridgeManager();
t31Bridge.startDrawing({ x: 215, y: 467 });
// Natural hand-drawn points with local segment jitter up to 52.7° (overall slope ~ 42°)
t31Bridge.addDrawingPoint({ x: 250, y: 425 }, t31Terrains);
t31Bridge.addDrawingPoint({ x: 285, y: 379 }, t31Terrains);
t31Bridge.addDrawingPoint({ x: 340, y: 330 }, t31Terrains);
t31Bridge.addDrawingPoint({ x: 420, y: 280 }, t31Terrains);
t31Bridge.addDrawingPoint({ x: 510, y: 260 }, t31Terrains);
t31Bridge.finishDrawing(t31Terrains);
t31Bridge.startFalling(t31Terrains);
for (let i = 0; i < 60; i++) t31Bridge.update(1 / 60, t31Terrains);

const t31Sim = new VehicleSimulation(110, 448.5, 9.8, 1.0, t31Terrains, 'smart_car');
t31Sim.setDriving(true);
let t31MaxX = 0;
for (let f = 0; f < 200; f++) {
  t31Sim.update(1 / 60, t31Terrains, t31Bridge.getSegments(), [], t31Goal, [], particles, t31Bridge, { left: 0, right: 1000, top: 0, bottom: 600 });
  t31MaxX = Math.max(t31MaxX, t31Sim.vehicle.position.x);
}
// Vehicle must climb up onto the high cliff platform (x >= 500)
assert(t31MaxX >= 500, `Vehicle must climb natural ramp with stroke jitter! Reached max x = ${t31MaxX.toFixed(1)}`);
assert(!t31Sim.vehicle.isDead, 'Vehicle must not die while climbing Level 67 ramp');

console.log('✅ Test 31 Passed: Natural hand-drawn ramp with segment jitter is climbed successfully.\n');

// Test 32: Top corners zero warping ("tede mede" prevention) & zero bridge jump after smoothing
console.log('Test 32: Zero corner distortion ("tede mede") and zero bridge jump after smoothing...');

// Part A: Zero distortion when freehand drawing in air near top-left and top-right corners
const t32Terrains: TerrainBlock[] = [
  { id: 'pillar', type: 'brick', x: 200, y: 300, width: 200, height: 200 }
];
const cornerCheckBridge = new BridgeManager();
// Draw diagonal stroke passing 10px above/beside top-left corner (x=200, y=300)
cornerCheckBridge.startDrawing({ x: 180, y: 285 });
cornerCheckBridge.addDrawingPoint({ x: 195, y: 280 }, t32Terrains);
cornerCheckBridge.addDrawingPoint({ x: 210, y: 275 }, t32Terrains);
const tlDrawnPts = cornerCheckBridge.getRawPoints();
// None of the points should be artificially snapped to y = 296 or pulled to x = 200
for (const p of tlDrawnPts) {
  assert(Math.abs(p.y - 296) > 2, `Point at (${p.x}, ${p.y}) was incorrectly warped to top shelf!`);
}

// Draw diagonal stroke passing near top-right corner (x=400, y=300)
cornerCheckBridge.clear();
cornerCheckBridge.startDrawing({ x: 390, y: 275 });
cornerCheckBridge.addDrawingPoint({ x: 405, y: 280 }, t32Terrains);
cornerCheckBridge.addDrawingPoint({ x: 420, y: 285 }, t32Terrains);
const trDrawnPts = cornerCheckBridge.getRawPoints();
for (const p of trDrawnPts) {
  assert(Math.abs(p.y - 296) > 2, `Point at (${p.x}, ${p.y}) was incorrectly warped to top shelf!`);
}

// Part B: Spanning bridge settles with zero jump after smoothing
const spanningBridge = new BridgeManager();
const spanTerrains: TerrainBlock[] = [
  { id: 'platform-1', type: 'brick', x: 100, y: 300, width: 120, height: 100 },
  { id: 'platform-2', type: 'brick', x: 380, y: 300, width: 120, height: 100 }
];
spanningBridge.startDrawing({ x: 150, y: 296 });
spanningBridge.addDrawingPoint({ x: 220, y: 296 }, spanTerrains);
spanningBridge.addDrawingPoint({ x: 300, y: 290 }, spanTerrains);
spanningBridge.addDrawingPoint({ x: 380, y: 296 }, spanTerrains);
spanningBridge.addDrawingPoint({ x: 450, y: 296 }, spanTerrains);

const preFinishY = spanningBridge.getRawPoints()[0].y;
spanningBridge.finishDrawing(spanTerrains);
spanningBridge.startFalling(spanTerrains);

// Must settle immediately on platforms with zero jump into the air
assert(spanningBridge.getIsSettled(), 'Spanning bridge should settle immediately without falling or jumping');
assert(!spanningBridge.getIsFalling(), 'Bridge should not be falling');
const postSettlingY = spanningBridge.getRawPoints()[0].y;
assert(Math.abs(postSettlingY - preFinishY) < 1.0, `Bridge jumped! Y shifted from ${preFinishY} to ${postSettlingY}`);

// Run 20 physics frames and verify position remains rock solid
for (let f = 0; f < 20; f++) {
  spanningBridge.update(1 / 60, spanTerrains);
}
const finalY = spanningBridge.getRawPoints()[0].y;
assert(Math.abs(finalY - preFinishY) < 1.0, `Bridge bounced during physics! Final Y = ${finalY}`);

console.log('✅ Test 32 Passed: Zero corner distortion ("tede mede") and zero bridge jump fully verified.\n');

// Test 33: End border & barrier collision impact sound trigger
console.log('Test 33: Vehicle impact sound trigger on screen border collision...');
let crashSoundTriggered = false;
const origPlayCrash = audio.playCrash.bind(audio);
audio.playCrash = () => {
  crashSoundTriggered = true;
};

const borderCrashSim = new VehicleSimulation(920, 372.5, 9.8, 1.0, [
  { id: 'floor', type: 'brick', x: 0, y: 400, width: 1000, height: 200 }
], 'smart_car');
borderCrashSim.setDriving(true);

for (let f = 0; f < 60; f++) {
  borderCrashSim.update(1 / 60, [
    { id: 'floor', type: 'brick', x: 0, y: 400, width: 1000, height: 200 }
  ], [], [], { x: 800, y: 370, width: 60, height: 80 }, [], particles, undefined, { left: 0, right: 980, top: 0, bottom: 600 });
}

assert(crashSoundTriggered, 'audio.playCrash must be triggered when vehicle impacts right border!');
assert(!borderCrashSim.getIsDriving(), 'Vehicle should stop driving after hitting right border');
audio.playCrash = origPlayCrash;
console.log('✅ Test 33 Passed: End border collision successfully triggers crash impact sound.\n');

console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 🚀');





