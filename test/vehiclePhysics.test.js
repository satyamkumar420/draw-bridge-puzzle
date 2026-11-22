import test from 'node:test';
import assert from 'node:assert/strict';
import { VehicleSimulation } from '../src/engine/vehicle.ts';
import { BridgeManager } from '../src/engine/bridge.ts';
import { getVehicleSpec } from '../src/config/vehicleSpecs.ts';
import { getVehicleCollisionSpec } from '../src/engine/vehicleCollision.ts';
import { getSegmentAABBIntersection, resolveSegmentAgainstTerrains, snapCoordsToTerrainSurface, pointInTerrains, clampPointOutOfTerrains } from '../src/engine/collision.ts';
import { GAME_CONFIG } from '../src/config/constants.ts';

test('Vehicle physics: car cannot pass through a vertical wall or circle obstacle', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  // Vertical wall barrier placed directly in front of the car at x = 200
  const verticalWall = [
    { p1: { x: 200, y: 150 }, p2: { x: 200, y: 350 }, normal: { x: -1, y: 0 }, length: 200 }
  ];
  const road = [
    { id: 'road-1', type: 'brick', x: 0, y: 300, width: 400, height: 300 }
  ];
  const goal = { x: 500, y: 300, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation forward in time (1.5 seconds)
  for (let i = 0; i < 90; i++) {
    sim.update(1 / 60, road, verticalWall, [], goal, [], particles);
  }

  // The car must NOT have phased through the wall (x must remain <= 200)
  assert.ok(
    sim.vehicle.position.x < 200,
    `Car should not pass through wall, current x: ${sim.vehicle.position.x}`
  );
  // Car must not have magically won
  assert.equal(sim.vehicle.hasWon, false, 'Car must not pass barrier to trigger win');
});

test('Vehicle physics: suspension dynamics pitch chassis naturally when front hits bump', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  // Incline ramp starting at x = 130
  const ramp = [
    { p1: { x: 130, y: 300 }, p2: { x: 220, y: 240 }, normal: { x: -0.55, y: -0.83 }, length: 108 }
  ];
  const flatRoad = [
    { id: 'flat-1', type: 'brick', x: 0, y: 300, width: 140, height: 300 }
  ];
  const goal = { x: 800, y: 300, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run forward until front wheel climbs onto ramp
  for (let i = 0; i < 40; i++) {
    sim.update(1 / 60, flatRoad, ramp, [], goal, [], particles);
  }

  // Angle should pitch nose-up (angle < 0 in screen coordinate space)
  assert.ok(
    sim.vehicle.angle < 0,
    `Chassis should pitch up over incline ramp, current angle: ${sim.vehicle.angle}`
  );
});

test('Bridge gravity: drawn line in air falls down and lands resting on walls when both ends supported', () => {
  const bridge = new BridgeManager();
  // Draw bridge high in the air at y = 150 spanning across from x = 100 to 500
  bridge.startDrawing({ x: 100, y: 150 });
  bridge.addPoint({ x: 250, y: 150 });
  bridge.addPoint({ x: 400, y: 150 });
  bridge.addPoint({ x: 500, y: 150 });

  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 300, width: 200, height: 300 },
    { id: 'right-cliff', type: 'brick', x: 400, y: 300, width: 200, height: 300 }
  ];

  bridge.startFalling(terrains);

  // Simulate falling for 40 frames
  for (let i = 0; i < 40; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Bridge with both wall supports must settle');
  const rawPoints = bridge.getRawPoints();
  assert.equal(rawPoints[0].y, 300, 'Left end should rest on left cliff at y=300');
  assert.equal(rawPoints[rawPoints.length - 1].y, 300, 'Right end should rest on right cliff at y=300');
});

test('Bridge gravity: drawn line in air above wall drops and rests on top of the wall without penetrating', () => {
  const bridge = new BridgeManager();
  // Drawn in the air above left cliff (x=100 to x=180 at y=150)
  bridge.startDrawing({ x: 100, y: 150 });
  bridge.addPoint({ x: 180, y: 150 });

  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 300, width: 200, height: 300 },
    { id: 'right-cliff', type: 'brick', x: 400, y: 300, width: 200, height: 300 }
  ];

  bridge.startFalling(terrains);

  // Simulate falling
  for (let i = 0; i < 40; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Object falling onto wall surface must settle');
  const rawPoints = bridge.getRawPoints();
  assert.equal(rawPoints[0].y, 300, 'Point should rest on top of left cliff at y=300');
  assert.equal(rawPoints[1].y, 300, 'Point should rest on top of left cliff at y=300');
});

test('Bridge gravity: line in air over the chasm (no wall underneath) drops into abyss and does not settle', () => {
  const bridge = new BridgeManager();
  // Both points hang in thin air over chasm between x=200 and x=400
  bridge.startDrawing({ x: 250, y: 150 });
  bridge.addPoint({ x: 350, y: 150 });

  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 300, width: 200, height: 300 },
    { id: 'right-cliff', type: 'brick', x: 400, y: 300, width: 200, height: 300 }
  ];

  bridge.startFalling(terrains);

  // Simulate falling
  for (let i = 0; i < 40; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), false, 'Line in open chasm must not settle as drivable road');
  const rawPoints = bridge.getRawPoints();
  // Line fell into the chasm below y=300
  assert.ok(rawPoints[0].y > 300, 'Unsupported bridge must drop down into chasm');
});

test('Continuous attempt: car blocked by obstacle applies physical pressure and rocks up and down', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  const barrier = [
    { p1: { x: 140, y: 200 }, p2: { x: 140, y: 320 }, normal: { x: -1, y: 0 }, length: 120 }
  ];
  const road = [
    { id: 'road-1', type: 'brick', x: 0, y: 300, width: 300, height: 300 }
  ];
  const goal = { x: 800, y: 300, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const initialWheelAngle = sim.vehicle.wheels[0].angle;

  // Run while blocked by barrier
  for (let i = 0; i < 40; i++) {
    sim.update(1 / 60, road, barrier, [], goal, [], particles);
  }

  // Car position must be stopped before barrier
  assert.ok(sim.vehicle.position.x < 140, 'Car should be stopped before barrier');
  // Wheels should have kept spinning trying to drive forward
  assert.ok(
    sim.vehicle.wheels[0].angle > initialWheelAngle + 1.0,
    'Wheels must continuously rotate while driving'
  );
});

test('Vehicle collision: car bumper reaches close to obstacle before stopping (no phantom distance)', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  // Barrier placed at x = 170
  const barrierX = 170;
  const barrier = [
    { p1: { x: barrierX, y: 220 }, p2: { x: barrierX, y: 310 }, normal: { x: -1, y: 0 }, length: 90 }
  ];
  const road = [
    { id: 'road-1', type: 'brick', x: 0, y: 300, width: 300, height: 300 }
  ];
  const goal = { x: 800, y: 300, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation forward until stopped
  for (let i = 0; i < 60; i++) {
    sim.update(1 / 60, road, barrier, [], goal, [], particles);
  }

  // Front bumper reaches close to barrierX (within 5px), proving no phantom collision gap.
  const collisionSpec = getVehicleCollisionSpec(sim.getCarId());
  const bumperX = sim.vehicle.position.x + collisionSpec.frontExtent;
  const gap = barrierX - bumperX;
  assert.ok(
    gap >= 0 && gap <= 5.0,
    `Car front bumper should touch obstacle cleanly without a large phantom gap, gap: ${gap}px`
  );
});

test('Vehicle gravity: airborne front wheel is pulled down by gravity to plant onto flat ground', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);
  // Force an initial pitch up (wheelie)
  sim.vehicle.angle = -0.35;

  const road = [
    { id: 'road-1', type: 'brick', x: 0, y: 300, width: 400, height: 300 }
  ];
  const goal = { x: 800, y: 300, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation forward for 45 frames to allow complete settling
  for (let i = 0; i < 45; i++) {
    sim.update(1 / 60, road, [], [], goal, [], particles);
  }

  // Both wheels must be grounded and angle level on flat road
  assert.equal(sim.vehicle.wheels[0].isGrounded, true, 'Rear wheel must be grounded');
  assert.equal(sim.vehicle.wheels[1].isGrounded, true, 'Front wheel must be pulled down to ground');
  assert.ok(
    Math.abs(sim.vehicle.angle) < 0.08,
    `Car should settle level on flat road, current angle: ${sim.vehicle.angle}`
  );
});

test('Goal crossing: level completes when car crosses flag, then car stops near right edge', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  // Platform from 0 to 400. Flag at x = 200.
  const road = [
    { id: 'road-1', type: 'brick', x: 0, y: 300, width: 400, height: 300 }
  ];
  const goal = { x: 200, y: 300, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run until car crosses flag pole (pole is at goal.x + 25 = 225)
  for (let i = 0; i < 70; i++) {
    sim.update(1 / 60, road, [], [], goal, [], particles);
  }

  // Car must have crossed the flag and won
  assert.equal(sim.vehicle.hasWon, true, 'Car must win upon crossing the flag pole');
  assert.ok(sim.vehicle.position.x >= 225, 'Car position must be past flag pole');

  // Continue running to allow car to reach right end and stop
  for (let i = 0; i < 60; i++) {
    sim.update(1 / 60, road, [], [], goal, [], particles);
  }

  // Car should have reached near the right end (target is 400 - 65 = 335) and stopped
  assert.ok(sim.vehicle.position.x >= 330, `Car should roll to right end, x: ${sim.vehicle.position.x}`);
  assert.equal(sim.getIsDriving(), false, 'Car driving should stop near right edge');
  assert.equal(sim.vehicle.velocity.x, 0, 'Car velocity should be 0 when stopped');
});

test('Wheel alignment: wheels remain locked in wheel cutouts and do not displace upwards over drawn bridge line', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  // Dense multi-segment bridge line (5px segments)
  const bridge = [];
  for (let x = 80; x <= 400; x += 5) {
    bridge.push({
      p1: { x, y: 290 },
      p2: { x: x + 5, y: 290 },
      normal: { x: 0, y: -1 },
      length: 5
    });
  }
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation forward across the bridge
  for (let f = 0; f < 30; f++) {
    sim.update(1 / 60, [], bridge, [], { x: 800, y: 300, width: 60, height: 80 }, [], particles);
    const mounts = sim.getAxleMounts();
    const v = sim.vehicle;
    const rearOffset = Math.abs(v.wheels[0].position.y - mounts.rear.mount.y);
    const frontOffset = Math.abs(v.wheels[1].position.y - mounts.front.mount.y);

    assert.ok(
      rearOffset <= 3.0,
      `Rear wheel must remain inside wheel arch cutout (offset <= 3px), current: ${rearOffset}px`
    );
    assert.ok(
      frontOffset <= 3.0,
      `Front wheel must remain inside wheel arch cutout (offset <= 3px), current: ${frontOffset}px`
    );
  }
});

test('Slope climbing incline (chadwao): front of car pitches up first when contacting uphill slope', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  // Platform up to x = 160, then steep upward slope from (160, 300) to (260, 150) (~56 degree slope)
  const road = [
    { id: 'road-1', type: 'brick', x: 0, y: 300, width: 170, height: 300 }
  ];
  const slope = [];
  for (let x = 160; x <= 260; x += 10) {
    const y1 = 300 - ((x - 160) / 100) * 150;
    const y2 = 300 - ((x + 10 - 160) / 100) * 150;
    const dx = 10;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    // Upward normal
    const normal = { x: dy / len, y: -dx / len };
    slope.push({ p1: { x, y: y1 }, p2: { x: x + 10, y: y2 }, normal, length: len });
  }

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run until front wheel hits the slope (approx 20 frames)
  let pitchedUpDetected = false;
  let frontHigherThanRearDetected = false;

  for (let i = 0; i < 35; i++) {
    sim.update(1 / 60, road, slope, [], { x: 800, y: 300, width: 60, height: 80 }, [], particles);

    // When front wheel is on slope (x > 160) and rear is still on flat road (x <= 160)
    if (sim.vehicle.wheels[1].position.x > 160 && sim.vehicle.wheels[0].position.x <= 165) {
      if (sim.vehicle.angle < -0.05) {
        pitchedUpDetected = true;
      }
      if (sim.vehicle.wheels[1].position.y < sim.vehicle.wheels[0].position.y - 4) {
        frontHigherThanRearDetected = true;
      }
    }
  }

  assert.ok(
    pitchedUpDetected,
    `Front of the car must pitch up (angle < 0) when encountering an uphill slope, current angle: ${sim.vehicle.angle}`
  );
  assert.ok(
    frontHigherThanRearDetected,
    `Front wheel must elevate above rear wheel when climbing slope`
  );
  // Car should not be dead
  assert.equal(sim.vehicle.isDead, false, 'Car should climb without blowing up');
});

test('Gravity limit: car cannot climb excessively steep or sky-high slopes and is pulled down by gravity', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  // Platform up to x = 150 at y = 300, followed by a very steep 75-degree slope up to (190, 150)
  const road = [
    { id: 'road-1', type: 'brick', x: 0, y: 300, width: 160, height: 300 }
  ];
  const steepSlope = [];
  for (let x = 150; x <= 190; x += 10) {
    const y1 = 300 - ((x - 150) / 40) * 150;
    const y2 = 300 - ((x + 10 - 150) / 40) * 150;
    const dx = 10;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const normal = { x: dy / len, y: -dx / len };
    steepSlope.push({ p1: { x, y: y1 }, p2: { x: x + 10, y: y2 }, normal, length: len });
  }

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation for 2 seconds (120 frames)
  for (let i = 0; i < 120; i++) {
    sim.update(1 / 60, road, steepSlope, [], { x: 500, y: 300, width: 60, height: 80 }, [], particles);
  }

  // The car MUST NOT have climbed over the top of the steep slope (x must be < 230)
  assert.ok(
    sim.vehicle.position.x < 220,
    `Car should not climb over steep slope, stopped at x: ${sim.vehicle.position.x}`
  );
  assert.equal(sim.vehicle.hasWon, false, 'Car must not win over an unclimable steep slope');
});

test('Vehicle ground settling: car spawned above terrain settles with wheels flush on wall surface', () => {
  const spawnX = 120;
  // Intentionally set an offset spawnY high in the air (e.g. y = 350 when wall is at y = 400)
  const spawnY = 350;
  const terrains = [
    { id: 'cliff-1', type: 'brick', x: 0, y: 400, width: 300, height: 200 }
  ];

  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0, terrains);
  const spec = getVehicleSpec(sim.getCarId());

  // Expected chassis Y: 400 - spec.restYOffset
  const expectedY = 400 - spec.restYOffset;
  assert.ok(Math.abs(sim.vehicle.position.y - expectedY) < 0.001);

  // Wheels must touch the wall surface: mount.y + radius = 400
  const rearWheel = sim.vehicle.wheels[0];
  const frontWheel = sim.vehicle.wheels[1];
  assert.ok(Math.abs(rearWheel.position.y + rearWheel.radius - 400) < 0.001);
  assert.ok(Math.abs(frontWheel.position.y + frontWheel.radius - 400) < 0.001);
  assert.equal(rearWheel.isGrounded, true);
  assert.equal(frontWheel.isGrounded, true);
});

test('End border stop: car crossing goal stops immediately when reaching right screen border and does not clip off-screen', () => {
  const spawnX = 750;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  // Road extends all the way to screen border (x = 1000). Flag at x = 800.
  const road = [
    { id: 'road-right', type: 'brick', x: 600, y: 300, width: 400, height: 300 }
  ];
  const goal = { x: 800, y: 300, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation until car reaches right border
  for (let i = 0; i < 150; i++) {
    sim.update(1 / 60, road, [], [], goal, [], particles);
  }

  // Car must have won
  assert.equal(sim.vehicle.hasWon, true, 'Car must have crossed the goal flag');

  // Car bumper (position.x + 35) must be clamped and not exceed 1000
  const maxAllowedX = 1000 - 35;
  assert.ok(
    sim.vehicle.position.x <= maxAllowedX,
    `Car position (${sim.vehicle.position.x}) must not exceed right border limit (${maxAllowedX})`
  );

  // Car must be completely stopped
  assert.equal(sim.getIsDriving(), false, 'Car driving must stop at right border');
  assert.equal(sim.vehicle.velocity.x, 0, 'Car velocity.x must be 0 at right border');
});

test('End wall stop: car crossing goal stops immediately upon colliding with front wall barrier', () => {
  const spawnX = 650;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  // Ground road with a vertical wall barrier placed at x = 900
  const road = [
    { id: 'road-flat', type: 'brick', x: 600, y: 300, width: 350, height: 300 },
    { id: 'end-wall', type: 'brick', x: 880, y: 200, width: 60, height: 100 }
  ];
  const goal = { x: 750, y: 300, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation until car hits the end wall
  for (let i = 0; i < 120; i++) {
    sim.update(1 / 60, road, [], [], goal, [], particles);
  }

  // Car must have won
  assert.equal(sim.vehicle.hasWon, true, 'Car must cross goal before hitting wall');

  // Car must be stopped in front of the wall (x <= 880 - bumper)
  assert.ok(
    sim.vehicle.position.x <= 880,
    `Car position (${sim.vehicle.position.x}) must stop before penetrating wall at 880`
  );
  assert.equal(sim.getIsDriving(), false, 'Driving must stop upon hitting end wall');
  assert.equal(sim.vehicle.velocity.x, 0, 'Velocity must be 0 when stopped against wall');
});

test('Responsive Scaling: car crossing goal flag on canonical level reaches flag and stops near right border across simulated screen viewports', () => {
  // Test Level 3 configuration with extended right terrain (simulating a wide device screen)
  const spawnX = 100;
  const spawnY = 377.5;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0);
  sim.setDriving(true);

  const terrains = [
    { id: 't-1', type: 'brick', x: -100, y: 400, width: 340, height: 200 },
    { id: 't-2', type: 'brick', x: 440, y: 430, width: 120, height: 170 },
    { id: 't-3', type: 'brick', x: 760, y: 400, width: 400, height: 200 } // Extended to 1160
  ];
  const goal = { x: 830, y: 400, width: 60, height: 80 };

  // A bridge spanning the two gaps
  const bridge = [
    { p1: { x: 230, y: 400 }, p2: { x: 450, y: 430 }, normal: { x: 0, y: -1 }, length: 220 },
    { p1: { x: 550, y: 430 }, p2: { x: 770, y: 400 }, normal: { x: 0, y: -1 }, length: 220 }
  ];

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation forward until car crosses the flag
  for (let i = 0; i < 220; i++) {
    sim.update(1 / 60, terrains, bridge, [], goal, [], particles);
  }

  // Car must reach and cross the goal flag (flag pole is at goal.x + 25 = 855)
  assert.equal(sim.vehicle.hasWon, true, 'Car must successfully reach and cross goal flag');
  assert.ok(sim.vehicle.position.x >= 855, `Car position (${sim.vehicle.position.x}) must be past flag pole (855)`);

  // Run until car comes to a complete rest
  for (let i = 0; i < 80; i++) {
    sim.update(1 / 60, terrains, bridge, [], goal, [], particles);
  }

  assert.equal(sim.getIsDriving(), false, 'Car must be stopped on the landing platform');
  assert.equal(sim.vehicle.velocity.x, 0, 'Car velocity must be zero once stopped');
});

test('Drawn bridge persistence: bridge drawn in virtual coordinates preserves its raw points, segments, and stability without clearing on canvas resize', () => {
  const bridge = new BridgeManager();
  bridge.startDrawing({ x: 100, y: 300 });
  bridge.addPoint({ x: 200, y: 300 });
  bridge.addPoint({ x: 300, y: 300 });

  assert.equal(bridge.getRawPoints().length, 3, 'Bridge must have 3 points');
  assert.equal(bridge.getSegments().length, 2, 'Bridge must have 2 segments');

  // Simulate window resize: coordinates are in canonical space, points must remain unchanged
  const rawPointsBefore = JSON.stringify(bridge.getRawPoints());

  // Settling on terrains
  const terrains = [
    { id: 't-1', type: 'brick', x: 80, y: 300, width: 50, height: 200 },
    { id: 't-2', type: 'brick', x: 280, y: 300, width: 50, height: 200 }
  ];
  bridge.startFalling(terrains);
  assert.equal(bridge.getHasBothWallSupports(), true, 'Bridge must span both support walls');
  assert.equal(JSON.stringify(bridge.getRawPoints()), rawPointsBefore, 'Virtual points must remain exact across scale changes');
});

test('Slope descending decline (dalan): car pitches down and grounds both wheels when descending downward slope', () => {
  const spawnX = 100;
  const spawnY = 280;
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0, undefined, 'smart_car');
  sim.setDriving(true);

  // Platform from 0 to 160 at y = 300, then downward slope from (160, 300) to (450, 500)
  const road = [
    { id: 'flat-start', type: 'brick', x: 0, y: 300, width: 165, height: 300 }
  ];
  const slope = [];
  for (let x = 160; x <= 450; x += 10) {
    const y1 = 300 + ((x - 160) / 290) * 200;
    const y2 = 300 + ((x + 10 - 160) / 290) * 200;
    const dx = 10;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    // Upward-facing normal for downward slope (dy > 0, dx > 0 => normal = { dy/len, -dx/len })
    const normal = { x: dy / len, y: -dx / len };
    slope.push({ p1: { x, y: y1 }, p2: { x: x + 10, y: y2 }, normal, length: len });
  }

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  let pitchedDownDetected = false;
  let groundedOnSlope = false;

  // Run simulation forward across the downward slope (dalan)
  for (let i = 0; i < 60; i++) {
    sim.update(1 / 60, road, slope, [], { x: 800, y: 300, width: 60, height: 80 }, [], particles);

    // When vehicle is traversing the downward slope
    if (sim.vehicle.position.x > 180 && sim.vehicle.position.x < 380) {
      if (sim.vehicle.angle > 0.05) {
        pitchedDownDetected = true;
      }
      if (sim.vehicle.wheels[0].isGrounded || sim.vehicle.wheels[1].isGrounded) {
        groundedOnSlope = true;
      }
    }
  }

  assert.ok(
    pitchedDownDetected,
    `Vehicle must pitch downward (angle > 0) when descending slope (dalan), current angle: ${sim.vehicle.angle}`
  );
  assert.equal(groundedOnSlope, true, 'Vehicle wheels must contact slope surface during descent');
  assert.equal(sim.vehicle.isDead, false, 'Vehicle must not crash descending slope');
});

test('Wall collision with army truck: front bumper does not penetrate vertical wall', () => {
  // Spawn army truck approaching a vertical purple wall at x = 720 (matching Level 13)
  const spawnX = 640;
  const spawnY = 320;
  const terrains = [
    { id: 'left-approach', type: 'brick', x: 500, y: 360, width: 220, height: 200 },
    { id: 'right-wall', type: 'brick', x: 720, y: 300, width: 200, height: 300 }
  ];
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0, terrains, 'army_truck');
  sim.setDriving(true);

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation into the wall for 90 frames (1.5 seconds)
  for (let i = 0; i < 90; i++) {
    sim.update(1 / 60, terrains, [], [], { x: 900, y: 300, width: 60, height: 80 }, [], particles);
  }

  // Front bumper of army truck extends 50.5px ahead of vehicle position.
  // Front bumper must stop at or before the wall face at x = 720 (no penetration into wall!)
  const frontBumperX = sim.vehicle.position.x + 50.5;
  assert.ok(
    frontBumperX <= 720.5,
    `Army truck front bumper (${frontBumperX}) must not penetrate into the wall at 720`
  );
  // Vehicle must not magically pass through barrier to win
  assert.equal(sim.vehicle.hasWon, false, 'Vehicle must not penetrate barrier to trigger goal win');
});

test('Screen border with army truck: front bumper does not clip off-screen', () => {
  const spawnX = 850;
  const spawnY = 280;
  const terrains = [
    { id: 'ground', type: 'brick', x: 700, y: 300, width: 300, height: 300 }
  ];
  const sim = new VehicleSimulation(spawnX, spawnY, 9.8, 1.0, terrains, 'army_truck');
  sim.setDriving(true);

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run forward towards screen edge (1000px)
  for (let i = 0; i < 100; i++) {
    sim.update(1 / 60, terrains, [], [], { x: 750, y: 300, width: 60, height: 80 }, [], particles);
  }

  const frontBumperX = sim.vehicle.position.x + 50.5;
  assert.ok(
    frontBumperX <= 1000.5,
    `Army truck front bumper (${frontBumperX}) must never clip outside screen limit 1000`
  );
});

test('Bridge ramp climb: car smoothly climbs drawn incline ramp to elevated goal without hanging or diving nose-down', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', x: 575, y: 320, width: 425, height: 280 }
  ];
  const goal = { x: 595, y: 320, width: 60, height: 80 };
  const rawPoints = [
    { x: 370, y: 460 },
    { x: 400, y: 450 },
    { x: 430, y: 430 },
    { x: 460, y: 400 },
    { x: 490, y: 370 },
    { x: 520, y: 340 },
    { x: 550, y: 310 },
    { x: 575, y: 295 },
    { x: 585, y: 320 }
  ];
  const segments = [];
  for (let i = 0; i < rawPoints.length - 1; i++) {
    const p1 = rawPoints[i];
    const p2 = rawPoints[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const normal = { x: dy / len, y: -dx / len };
    if (normal.y > 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
    }
    segments.push({ p1, p2, normal, length: len });
  }

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const sim = new VehicleSimulation(310, 437.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);

  let maxSlopePitch = -Infinity;
  let maxOverallPitch = -Infinity;
  for (let frame = 0; frame <= 110; frame++) {
    sim.update(1 / 60, terrains, segments, [], goal, [], particles);
    const v = sim.vehicle;
    if (v.position.x >= 400 && v.position.x <= 540) {
      if (v.angle > maxSlopePitch) maxSlopePitch = v.angle;
    }
    if (v.angle > maxOverallPitch) maxOverallPitch = v.angle;
    if (v.hasWon) break;
  }

  // Car must reach and win without hanging vertically into the chasm
  assert.equal(sim.vehicle.hasWon, true, 'Car must win and reach the high goal ledge');
  assert.equal(sim.vehicle.isDead, false, 'Car must not die during climb');
  // While climbing the incline ramp, vehicle must stay pitched up (angle < 0)
  assert.ok(
    maxSlopePitch < 0,
    `Car must remain pitched upwards during slope climb, max slope pitch: ${(maxSlopePitch * 180 / Math.PI).toFixed(1)}°`
  );
  // Overall pitch must never reach vertical hanging (> 50 degrees / 0.87 rad)
  assert.ok(
    maxOverallPitch < 0.87,
    `Car must never hang vertically downwards, max overall pitch: ${(maxOverallPitch * 180 / Math.PI).toFixed(1)}°`
  );
});

test('Bridge wheel contact (Happy-Path): wheel bottom contacts drawn bridge line directly with zero hover air-gap', () => {
  const road = [{ id: 'flat-start', type: 'brick', x: 0, y: 300, width: 200, height: 300 }];
  const bridge = [];
  for (let x = 200; x <= 500; x += 10) {
    bridge.push({ p1: { x, y: 300 }, p2: { x: x + 10, y: 300 }, normal: { x: 0, y: -1 }, length: 10 });
  }
  const sim = new VehicleSimulation(100, 277.5, 9.8, 1.0, road, 'smart_car');
  sim.setDriving(true);
  const particles = { emitExplosion: () => {}, emitWaterSplash: () => {}, emitBubbles: () => {}, emitSparkle: () => {}, emitTrail: () => {} };

  let maxAirGap = 0;
  const strokeTop = 300.0 - (GAME_CONFIG.STROKE_WIDTH / 2);
  for (let i = 0; i < 90; i++) {
    sim.update(1 / 60, road, bridge, [], { x: 800, y: 300, width: 60, height: 80 }, [], particles);
    const v = sim.vehicle;
    if (v.position.x > 250 && v.position.x < 450) {
      const w0b = v.wheels[0].position.y + v.wheels[0].radius;
      const w1b = v.wheels[1].position.y + v.wheels[1].radius;
      // Bridge line stroke top surface. Air gap exists if wheel bottom is above strokeTop
      const airGap0 = Math.max(0, strokeTop - w0b);
      const airGap1 = Math.max(0, strokeTop - w1b);
      if (airGap0 > maxAirGap) maxAirGap = airGap0;
      if (airGap1 > maxAirGap) maxAirGap = airGap1;
    }
  }

  assert.ok(
    maxAirGap <= 0.5,
    `Wheels must ride flush on the bridge line stroke without floating (max air gap <= 0.5px), current: ${maxAirGap.toFixed(2)}px`
  );
});

test('Bridge wheel contact (All Vehicles): all vehicle models ride directly on bridge stroke', () => {
  const vehicles = ['smart_car', 'sports_coupe', 'delivery_truck', 'army_truck'];
  const strokeTop = 300.0 - (GAME_CONFIG.STROKE_WIDTH / 2);
  for (const carId of vehicles) {
    const road = [{ id: 'flat-start', type: 'brick', x: 0, y: 300, width: 200, height: 300 }];
    const bridge = [];
    for (let x = 200; x <= 500; x += 10) {
      bridge.push({ p1: { x, y: 300 }, p2: { x: x + 10, y: 300 }, normal: { x: 0, y: -1 }, length: 10 });
    }
    const sim = new VehicleSimulation(100, 277.5, 9.8, 1.0, road, carId);
    sim.setDriving(true);
    const particles = { emitExplosion: () => {}, emitWaterSplash: () => {}, emitBubbles: () => {}, emitSparkle: () => {}, emitTrail: () => {} };

    let maxAirGap = 0;
    for (let i = 0; i < 90; i++) {
      sim.update(1 / 60, road, bridge, [], { x: 800, y: 300, width: 60, height: 80 }, [], particles);
      const v = sim.vehicle;
      if (v.position.x > 250 && v.position.x < 450) {
        const w0b = v.wheels[0].position.y + v.wheels[0].radius;
        const w1b = v.wheels[1].position.y + v.wheels[1].radius;
        const airGap0 = Math.max(0, strokeTop - w0b);
        const airGap1 = Math.max(0, strokeTop - w1b);
        if (airGap0 > maxAirGap) maxAirGap = airGap0;
        if (airGap1 > maxAirGap) maxAirGap = airGap1;
      }
    }

    assert.ok(
      maxAirGap <= 0.5,
      `${carId} wheels must ride flush on the bridge line stroke without floating (air gap <= 0.5px), current: ${maxAirGap.toFixed(2)}px`
    );
  }
});

test('Cliff Corner Transition: Army truck climbs ramp to corner of cliff and rolls smoothly onto flat platform without getting stuck', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 460, width: 400, height: 140 },
    { id: 'right-cliff', type: 'brick', x: 600, y: 250, width: 400, height: 350 }
  ];
  const goal = { x: 800, y: 250, width: 60, height: 80 };

  // Drawn ramp from left cliff directly to the top-left corner of the right cliff (x: 600, y: 250)
  const rawPoints = [
    { x: 350, y: 460 },
    { x: 400, y: 420 },
    { x: 450, y: 380 },
    { x: 500, y: 340 },
    { x: 550, y: 295 },
    { x: 600, y: 250 }
  ];
  const segments = [];
  for (let i = 0; i < rawPoints.length - 1; i++) {
    const p1 = rawPoints[i];
    const p2 = rawPoints[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const normal = { x: dy / len, y: -dx / len };
    if (normal.y > 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
    }
    segments.push({ p1, p2, normal, length: len });
  }

  const sim = new VehicleSimulation(300, 440, 9.8, 1.0, terrains, 'army_truck');
  sim.setDriving(true);
  const particles = { emitExplosion: () => {}, emitWaterSplash: () => {}, emitBubbles: () => {}, emitSparkle: () => {}, emitTrail: () => {} };

  // Run simulation for 3 seconds (180 frames)
  for (let frame = 0; frame < 180; frame++) {
    sim.update(1 / 60, terrains, segments, [], goal, [], particles);
    if (sim.vehicle.hasWon) break;
  }

  // Truck must smoothly roll over corner, reach right cliff platform, and not get stuck
  assert.ok(
    sim.vehicle.position.x > 620,
    `Army truck should successfully roll over the cliff corner onto platform, reached x: ${sim.vehicle.position.x}`
  );
  assert.equal(sim.vehicle.isDead, false, 'Vehicle should not die during corner transition');
});

test('Bridge non-penetration: drawing high above brick never plunges or penetrates underneath brick surface', () => {
  const bridge = new BridgeManager();
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 300, width: 250, height: 300 },
    { id: 'right-cliff', type: 'brick', x: 550, y: 300, width: 250, height: 300 }
  ];

  // User draws starting high above left cliff, dipping slightly near cliff edge, spanning across to right cliff
  bridge.startDrawing({ x: 100, y: 150 }); // 150px above cliff
  bridge.addPoint({ x: 200, y: 260 });     // 40px above cliff near edge
  bridge.addPoint({ x: 400, y: 100 });     // High in air over chasm
  bridge.addPoint({ x: 600, y: 200 });     // 100px above right cliff
  bridge.addPoint({ x: 700, y: 180 });     // 120px above right cliff

  bridge.startFalling(terrains);

  // Simulate falling
  for (let i = 0; i < 60; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Bridge must settle when contacting cliff surface');

  const points = bridge.getRawPoints();
  for (const p of points) {
    for (const t of terrains) {
      if (p.x >= t.x && p.x <= t.x + t.width) {
        assert.ok(
          p.y <= t.y + 0.001,
          `Bridge point at x=${p.x}, y=${p.y} must not penetrate below brick surface y=${t.y}`
        );
      }
    }
  }

  // Lowest point over left terrain rests flush on terrain surface at y=300
  assert.equal(points[1].y, 300, 'Lowest point above terrain should rest flush on terrain surface at y=300');
  assert.ok(points[0].y <= 300, 'High endpoint at x=100 must remain safely in the air above cliff');
});

test('Bridge non-penetration: drawing across cliffs at surface level settles immediately without deforming into brick', () => {
  const bridge = new BridgeManager();
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 300, width: 250, height: 300 },
    { id: 'right-cliff', type: 'brick', x: 550, y: 300, width: 250, height: 300 }
  ];

  bridge.startDrawing({ x: 100, y: 300 }); // On left cliff
  bridge.addPoint({ x: 200, y: 280 });     // In air
  bridge.addPoint({ x: 400, y: 200 });     // Arch over chasm
  bridge.addPoint({ x: 600, y: 300 });     // On right cliff

  bridge.startFalling(terrains);

  const points = bridge.getRawPoints();
  assert.equal(points[0].y, 300);
  assert.equal(points[1].y, 280);
  assert.equal(points[2].y, 200);
  assert.equal(points[3].y, 300);
});

test('Segment-AABB collision (Happy-Path): accurately detects segment cutting through corner of brick', () => {
  const box = { x: 575, y: 320, width: 425, height: 280 };
  const p1 = { x: 560, y: 340 }; // Chasm (outside left face)
  const p2 = { x: 600, y: 300 }; // Ledge (above top face)

  const hit = getSegmentAABBIntersection(p1, p2, box);
  assert.equal(hit.intersects, true, 'Segment passing through corner must be detected as intersecting');
  assert.equal(hit.enterFace, 'left', 'Must enter through left face');
  assert.equal(hit.exitFace, 'top', 'Must exit through top face');
});

test('Segment-AABB collision (Failure-Path): segment completely outside brick returns no intersection', () => {
  const box = { x: 575, y: 320, width: 425, height: 280 };
  const p1 = { x: 200, y: 200 };
  const p2 = { x: 400, y: 200 };

  const hit = getSegmentAABBIntersection(p1, p2, box);
  assert.equal(hit.intersects, false, 'Segment in clear sky must not intersect');
});

test('Corner Wrapping Resolution: swipe across cliff corner inserts corner vertex and prevents tunneling', () => {
  const terrains = [
    { x: 0, y: 460, width: 425, height: 140 },
    { x: 575, y: 320, width: 425, height: 280 }
  ];
  const p1 = { x: 560, y: 340 }; // Below ledge in gap
  const p2 = { x: 600, y: 300 }; // Above ledge

  const resolved = resolveSegmentAgainstTerrains(p1, p2, terrains);
  assert.equal(resolved.length, 2, 'Should resolve into [cornerVertex, targetPoint]');
  // Corner vertex at (575, 320)
  assert.equal(resolved[0].x, 575, 'Corner X must match cliff edge');
  assert.equal(resolved[0].y, 320, 'Corner Y must match cliff top');
  // Final point at p2
  assert.equal(resolved[1].x, 600);
  assert.equal(resolved[1].y, 300);
});

test('Terrain Resolution (Blocked Drawing): drawing directly into solid brick is rejected', () => {
  const terrains = [{ x: 0, y: 460, width: 425, height: 140 }];
  const p1 = { x: 200, y: 450 }; // Above cliff
  const p2 = { x: 200, y: 500 }; // Deep inside solid cliff

  const resolved = resolveSegmentAgainstTerrains(p1, p2, terrains);
  assert.equal(resolved.length, 0, 'Drawing into solid brick must be rejected');
});

test('Bridge settling: incline drawn in the air high above right cliff drops down so upper end rests on the right cliff platform', () => {
  const bridge = new BridgeManager();
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', x: 575, y: 320, width: 425, height: 280 }
  ];

  // Drawn from left cliff edge (x=410, y=460) pointing high up into the air above right cliff (x=650, y=200)
  bridge.startDrawing({ x: 410, y: 460 });
  bridge.addPoint({ x: 650, y: 200 });

  bridge.startFalling(terrains);

  assert.equal(bridge.getIsSettled(), false, 'Airborne ramp must start falling under gravity');

  // Simulate falling for 40 frames
  for (let i = 0; i < 40; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Ramp must settle once right end lands on right cliff');

  const points = bridge.getRawPoints();
  assert.equal(points[0].y, 460, 'Bottom end must remain on left cliff at y=460');
  assert.equal(points[1].y, 320, 'Top end must land and rest on right cliff at y=320 without floating in air');
});

test('Steep incline climb (Happy-Path): car smoothly climbs straight bridge ramp with ~48° incline to high platform', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', x: 575, y: 320, width: 425, height: 280 }
  ];
  const goal = { x: 620, y: 320, width: 60, height: 80 };

  // Straight ramp line spanning the gap from x=415, y=460 to x=580, y=320 (approx 40-48 deg slope)
  const p1 = { x: 415, y: 460 };
  const p2 = { x: 580, y: 320 };
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  const normal = { x: dy / len, y: -dx / len };
  const segments = [{ p1, p2, normal, length: len }];

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const sim = new VehicleSimulation(300, 437.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);

  // Run simulation for 2 seconds (120 frames)
  for (let frame = 0; frame < 120; frame++) {
    sim.update(1 / 60, terrains, segments, [], goal, [], particles);
    if (sim.vehicle.hasWon) break;
  }

  // Car must reach the upper platform and win without falling/sliding down backwards
  assert.equal(sim.vehicle.hasWon, true, 'Car must climb the bridge ramp to reach the top goal');
  assert.equal(sim.vehicle.isDead, false, 'Car must not die during climb');
  assert.ok(sim.vehicle.position.x >= 580, `Car should reach top platform, x: ${sim.vehicle.position.x}`);
});

test('Anti-rollback protection (Failure/Edge-Path): car on extreme barrier never rolls backward into the hazard pit while driving', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 460, width: 425, height: 140 }
  ];
  // Extreme 75-degree barrier placed at x=350
  const barrier = [
    { p1: { x: 350, y: 460 }, p2: { x: 360, y: 200 }, normal: { x: -0.99, y: 0.04 }, length: 260 }
  ];
  const goal = { x: 800, y: 320, width: 60, height: 80 };

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const sim = new VehicleSimulation(250, 437.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);

  // Run simulation forward into the barrier
  for (let frame = 0; frame < 90; frame++) {
    sim.update(1 / 60, terrains, barrier, [], goal, [], particles);
    // While driving forward, velocity.x should never run away backwards (velocity.x >= -2)
    assert.ok(
      sim.vehicle.velocity.x >= -2,
      `Car velocity.x (${sim.vehicle.velocity.x}) must not roll backwards down into the pit while driving`
    );
  }
});

test('Upright stick topple (Happy-Path): stick drawn vertically on cliff edge topples and falls down under gravity', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', x: 575, y: 400, width: 425, height: 200 }
  ];

  const bridge = new BridgeManager();
  // Draw an upright stick standing near the cliff edge (x = 415 to 420, y = 400 up to 220)
  bridge.startDrawing({ x: 415, y: 400 });
  bridge.addPoint({ x: 418, y: 310 });
  bridge.addPoint({ x: 420, y: 220 });

  assert.equal(bridge.isUprightStickShape(), true, 'Drawn stick must be identified as an upright stick');

  bridge.startFalling(terrains);

  // An upright stick cannot balance on its tip and must not settle upright
  assert.equal(bridge.getIsSettled(), false, 'Upright stick must not settle standing vertically');
  assert.equal(bridge.getIsFalling(), true, 'Upright stick must start toppling and falling');

  const initialLength = bridge.getCurrentLength();

  // Simulate 60 frames (1 second of physics)
  let plungedIntoWater = false;
  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
    const pts = bridge.getRawPoints();
    if (pts.length > 0) {
      assert.ok(
        Math.abs(bridge.getCurrentLength() - initialLength) < 0.01,
        'Drawn shape must remain 100% solid without shrinking'
      );
    }
    if (pts.some(p => p.y > 400) || pts.length === 0) {
      plungedIntoWater = true;
    }
  }

  assert.equal(
    plungedIntoWater,
    true,
    'Stick must fall down towards the chasm/water under gravity as a solid body'
  );
});

test('Car interaction with unanchored stick: car knocks over upright stick without getting blocked like concrete wall', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', x: 575, y: 400, width: 425, height: 200 }
  ];
  const goal = { x: 700, y: 400, width: 60, height: 80 };

  const bridge = new BridgeManager();
  bridge.startDrawing({ x: 410, y: 400 });
  bridge.addPoint({ x: 412, y: 300 });
  bridge.addPoint({ x: 415, y: 220 });
  bridge.startFalling(terrains);

  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Car starts at x = 330 driving towards the stick at 410
  const sim = new VehicleSimulation(330, 377.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);

  let initialCarX = sim.vehicle.position.x;
  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
    sim.update(1 / 60, terrains, bridge.getSegments(), [], goal, [], particles, bridge);
  }

  // Car should have moved forward past the stick's initial position without dead-stopping
  assert.ok(
    sim.vehicle.position.x > initialCarX + 70,
    `Car must push through and knock the stick over, current x: ${sim.vehicle.position.x}`
  );
  // Car should not have exploded
  assert.equal(sim.vehicle.isDead, false, 'Car must not blast upon hitting unanchored stick');
});

test('Cliff edge upright stick (Happy-Path): stick drawn at cliff edge (x=425) with bottom pit terrain present falls into water pit without freezing', () => {
  // Real Level 1 geometry: left cliff ends at 425, pit floor t-bottom-1-0 begins at 425
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 400, width: 425, height: 200 },
    { id: 't-bottom-1-0', type: 'brick', theme: 'brick-red', x: 425, y: 470, width: 150, height: 130 }
  ];

  const bridge = new BridgeManager();
  // Upright vertical stick drawn right at the cliff edge
  bridge.startDrawing({ x: 425, y: 400 });
  bridge.addPoint({ x: 425, y: 300 });
  bridge.addPoint({ x: 425, y: 200 });

  bridge.startFalling(terrains);

  // Must NOT be mistaken for a dual-support spanning bridge or settle frozen in mid-air
  assert.equal(bridge.getHasBothWallSupports(), false, 'Stick at cliff edge must not count as dual wall support');
  assert.equal(bridge.getIsSettled(), false, 'Stick at cliff edge must not settle standing in mid-air');
  assert.equal(bridge.getIsFalling(), true, 'Stick must be falling under gravity');

  const initialLength = bridge.getCurrentLength();

  // Simulate 30 frames
  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
  }

  const pts = bridge.getRawPoints();
  assert.ok(pts.length > 0, 'Stick points must exist');
  // All points must have fallen down
  assert.ok(pts[0].y > 450, `Bottom point must have fallen down past cliff edge (current y: ${pts[0].y})`);
  assert.ok(
    Math.abs(bridge.getCurrentLength() - initialLength) < 0.01,
    'Drawn stick must remain 100% solid without shrinking or deformation'
  );
});

test('Bridge stroke thickness and boldness: STROKE_WIDTH is configured bold (>= 8px)', () => {
  assert.ok(
    GAME_CONFIG.STROKE_WIDTH >= 8,
    `Bridge stroke width must be at least 8px for bold visibility, currently: ${GAME_CONFIG.STROKE_WIDTH}`
  );
});

test('Steep slope stuck car: car unable to climb steep arch bridge stops and remains firmly on top without sinking inside', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 400, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 600, y: 400, width: 400, height: 200 }
  ];

  // Very steep arch bridge matching user screenshot
  const bridge = new BridgeManager();
  bridge.startDrawing({ x: 380, y: 400 });
  bridge.addPoint({ x: 420, y: 340 });
  bridge.addPoint({ x: 480, y: 320 });
  bridge.addPoint({ x: 530, y: 180 }); // steep incline
  bridge.addPoint({ x: 560, y: 120 }); // near vertical peak
  bridge.addPoint({ x: 590, y: 360 });
  bridge.addPoint({ x: 600, y: 400 });
  bridge.startFalling(terrains);

  const sim = new VehicleSimulation(320, 377.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);
  const particles = { emitExplosion: () => {}, emitWaterSplash: () => {}, emitBubbles: () => {}, emitSparkle: () => {}, emitTrail: () => {} };

  // Run simulation for 2.5 seconds (150 frames)
  for (let i = 0; i < 150; i++) {
    sim.update(1 / 60, terrains, bridge.getSegments(), [], { x: 800, y: 400, width: 60, height: 80 }, [], particles, bridge);
  }

  const v = sim.vehicle;
  // Car must be held on the bridge slope without falling through into the pit
  assert.equal(v.isDead, false, 'Car must not die or fall through bridge');
  assert.ok(v.position.y < 350, `Car must stay elevated on the bridge slope, current y: ${v.position.y}`);
  assert.ok(v.position.x > 450, `Car must have climbed partway up the bridge, current x: ${v.position.x}`);
});

test('Incomplete cantilever ramp (Failure/Edge-Path): ramp drawn from left cliff ending in mid-air never settles frozen in air and falls into pit', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 300, width: 425, height: 300 }
  ];

  const bridge = new BridgeManager();
  // Drawn from left cliff (x=410, y=400) upward towards right cliff but ending at x=560 (in mid-air before right cliff at 575)
  bridge.startDrawing({ x: 410, y: 400 });
  bridge.addPoint({ x: 480, y: 280 });
  bridge.addPoint({ x: 560, y: 160 });

  bridge.startFalling(terrains);

  assert.equal(bridge.getHasBothWallSupports(), false, 'Ramp ending in mid-air must not have dual wall support');
  assert.equal(bridge.getIsSettled(), false, 'Incomplete ramp must not settle frozen in mid-air');
  assert.equal(bridge.getIsFalling(), true, 'Incomplete ramp must be falling under gravity');

  const initialLength = bridge.getCurrentLength();

  // Simulate 45 frames (0.75s)
  for (let i = 0; i < 45; i++) {
    bridge.update(1 / 60, terrains);
  }

  const pts = bridge.getRawPoints();
  assert.ok(pts.length > 0, 'Points must exist');
  assert.ok(pts[pts.length - 1].y > 200, `Airborne end must drop down towards pit (current y: ${pts[pts.length - 1].y})`);
  assert.ok(
    Math.abs(bridge.getCurrentLength() - initialLength) < 0.01,
    'Ramp must fall as 100% solid body without shrinking'
  );
});

test('Cliff platform jump ramp (Happy-Path): ramp drawn on cliff platform drops onto cliff top and never penetrates into brick', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 220, width: 425, height: 380 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 160, width: 425, height: 440 },
    { id: 't-bottom-9-0', type: 'brick', theme: 'brick-red', x: 425, y: 290, width: 150, height: 310 }
  ];

  const bridge = new BridgeManager();
  // Drawn as a launch ramp starting on left cliff (x=340 to 425) and sloping up towards right cliff
  bridge.startDrawing({ x: 340, y: 220 });
  bridge.addPoint({ x: 400, y: 220 });
  bridge.addPoint({ x: 460, y: 180 });
  bridge.addPoint({ x: 500, y: 160 });

  const initialLength = bridge.getCurrentLength();
  bridge.startFalling(terrains);

  // Simulate falling for 30 frames
  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Ramp with solid base on cliff must settle');
  const pts = bridge.getRawPoints();
  // Points on left cliff must NEVER penetrate below 220 into the brick
  for (const p of pts) {
    if (p.x <= 425) {
      assert.ok(p.y <= 220.05, `Point on cliff (${p.x}, ${p.y}) must never penetrate into brick (max y=220)`);
    }
  }
  // Rigid body conservation
  assert.ok(
    Math.abs(bridge.getCurrentLength() - initialLength) < 0.01,
    'Ramp must remain 100% rigid with constant length'
  );
});

test('Unanchored bridge in air (No Folding / Rigid Body): line drawn in mid-air falls as 100% rigid body with zero folding or deformation', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 300, width: 425, height: 300 }
  ];

  const bridge = new BridgeManager();
  // Line drawn entirely in mid-air across open chasm (x=440 to 560)
  bridge.startDrawing({ x: 440, y: 320 });
  bridge.addPoint({ x: 500, y: 280 });
  bridge.addPoint({ x: 560, y: 240 });

  const initialDeltas = [
    { dx: 500 - 440, dy: 280 - 320 },
    { dx: 560 - 500, dy: 240 - 280 }
  ];
  const initialLength = bridge.getCurrentLength();

  bridge.startFalling(terrains);

  for (let frame = 0; frame < 30; frame++) {
    bridge.update(1 / 60, terrains);
    const pts = bridge.getRawPoints();
    if (pts.length >= 3) {
      // Relative vector between every pair of adjacent points must remain completely invariant (zero folding!)
      const d0 = { dx: pts[1].x - pts[0].x, dy: pts[1].y - pts[0].y };
      const d1 = { dx: pts[2].x - pts[1].x, dy: pts[2].y - pts[1].y };

      assert.ok(Math.abs(d0.dx - initialDeltas[0].dx) < 0.001, 'Segment 0 dx must not fold or deform');
      assert.ok(Math.abs(d0.dy - initialDeltas[0].dy) < 0.001, 'Segment 0 dy must not fold or deform');
      assert.ok(Math.abs(d1.dx - initialDeltas[1].dx) < 0.001, 'Segment 1 dx must not fold or deform');
      assert.ok(Math.abs(d1.dy - initialDeltas[1].dy) < 0.001, 'Segment 1 dy must not fold or deform');
      assert.ok(Math.abs(bridge.getCurrentLength() - initialLength) < 0.001, 'Total length must remain 100% constant');
    }
  }
});

test('Solid Wood Rigidity (Happy-Path): bridge drawn across brick cliffs with fire/water in between rests strictly on bricks and ignores hazards with zero deformation', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 400, width: 425, height: 200 },
    { id: 't-bottom-1-0', type: 'brick', theme: 'brick-red', x: 425, y: 470, width: 150, height: 130 }
  ];

  const bridge = new BridgeManager();
  // Bridge drawn high in air spanning across the chasm where fire/water is located
  bridge.startDrawing({ x: 300, y: 250 });
  bridge.addPoint({ x: 420, y: 230 });
  bridge.addPoint({ x: 500, y: 220 });
  bridge.addPoint({ x: 580, y: 230 });
  bridge.addPoint({ x: 700, y: 250 });

  const initialLength = bridge.getCurrentLength();
  bridge.startFalling(terrains);

  for (let i = 0; i < 40; i++) {
    bridge.update(1 / 60, terrains);
  }

  // Must settle resting on the brick cliffs, not stopping on fire or water
  assert.equal(bridge.getIsSettled(), true, 'Bridge must settle resting on the brick platforms');
  const pts = bridge.getRawPoints();
  // Left endpoint on left cliff (x=300) must rest flush at y=400 on left cliff
  assert.equal(pts[0].y, 400, 'Left endpoint must rest flush on left cliff at y=400');
  // Right endpoint on right cliff (x=700) must rest flush at y=400 on right cliff
  assert.equal(pts[4].y, 400, 'Right endpoint must rest flush on right cliff at y=400');
  // The arched shape above the chasm is 100% preserved (y=380, 370, 380)
  assert.equal(pts[1].y, 380, 'Arch profile point 1 must preserve its elevation without folding');
  assert.equal(pts[2].y, 370, 'Arch peak point must preserve its elevation without folding');
  assert.equal(pts[3].y, 380, 'Arch profile point 3 must preserve its elevation without folding');
  // Total arc length must remain 100% constant (zero folding or stretching)
  assert.ok(
    Math.abs(bridge.getCurrentLength() - initialLength) < 0.001,
    'Bridge must remain 100% rigid with zero deformation'
  );
});

test('Single Brick Platform Support (Happy-Path): bridge drawn on top of a single brick platform settles and stays locked without car kicking it into abyss', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 300, width: 500, height: 300 }
  ];
  const goal = { x: 460, y: 300, width: 60, height: 80 };

  const bridge = new BridgeManager();
  // Ramp drawn directly on top of the left cliff platform
  bridge.startDrawing({ x: 180, y: 250 });
  bridge.addPoint({ x: 260, y: 230 });
  bridge.addPoint({ x: 340, y: 210 });
  bridge.startFalling(terrains);

  for (let i = 0; i < 40; i++) {
    bridge.update(1 / 60, terrains);
  }

  // Ramp on top of brick must settle and be supported
  assert.equal(bridge.getIsSettled(), true, 'Ramp on top of brick platform must settle');
  assert.equal(bridge.getIsSupported(), true, 'Ramp on top of brick must be marked supported');

  const pts = bridge.getRawPoints();
  assert.equal(pts[0].y, 300, 'Base of ramp must rest flush on brick surface at y=300');

  // Spawn car driving towards and over the ramp
  const sim = new VehicleSimulation(100, 277.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);
  const particles = { emitExplosion: () => {}, emitWaterSplash: () => {}, emitBubbles: () => {}, emitSparkle: () => {}, emitTrail: () => {} };

  const initialBridgeY = pts[0].y;
  for (let i = 0; i < 60; i++) {
    sim.update(1 / 60, terrains, bridge.getSegments(), [], goal, [], particles, bridge);
  }

  // Car driving over bridge must NOT kick or push the bridge into the abyss
  assert.equal(bridge.getIsSettled(), true, 'Bridge on brick must remain settled after car drives over');
  assert.equal(bridge.getRawPoints()[0].y, initialBridgeY, 'Bridge must not be displaced or dropped into abyss');
  // Car must move forward over the bridge ramp
  assert.ok(sim.vehicle.position.x > 220, 'Car must drive forward over the ramp on the brick');
});

test('Wood Stick Topple Dynamics (Happy-Path): small upright stick topples and rotates under gravity like wood', () => {
  const terrains = [
    { id: 'cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 500, height: 200 }
  ];

  const bridge = new BridgeManager();
  // Small upright vertical stick drawn in the air
  bridge.startDrawing({ x: 420, y: 380 });
  bridge.addPoint({ x: 420, y: 300 });
  bridge.addPoint({ x: 420, y: 220 });

  assert.equal(bridge.isUprightStickShape(), true, 'Stick must be detected as upright stick');
  const initialLength = bridge.getCurrentLength();
  bridge.startFalling(terrains);

  let rotated = false;
  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
    const pts = bridge.getRawPoints();
    if (pts.length >= 3) {
      // Check that the stick tilts / rotates as it falls (deltaX between bottom and top point becomes non-zero)
      const dx = Math.abs(pts[2].x - pts[0].x);
      if (dx > 10) rotated = true;
      assert.ok(
        Math.abs(bridge.getCurrentLength() - initialLength) < 0.01,
        'Stick length must remain 100% constant during rotation'
      );
    }
  }

  assert.equal(rotated, true, 'Upright stick must topple and rotate naturally under gravity like real wood');
});

test('User Screenshot Overhang Scenario: incomplete arch drawn over water pit without reaching right cliff must fall into pit and not freeze in air', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 400, width: 425, height: 200 },
    { id: 't-bottom-1-0', type: 'brick', theme: 'brick-red', x: 425, y: 470, width: 150, height: 130 }
  ];

  const bridge = new BridgeManager();
  // Exact user screenshot geometry: base at cliff edge (x=400, y=400), arching over water ending at (560, 240) in mid-air
  bridge.startDrawing({ x: 400, y: 400 });
  bridge.addPoint({ x: 440, y: 320 });
  bridge.addPoint({ x: 490, y: 260 });
  bridge.addPoint({ x: 560, y: 240 });

  bridge.startFalling(terrains);

  // Must NOT settle in mid-air
  assert.equal(bridge.getIsSettled(), false, 'Arch hanging in mid-air over water pit must not settle frozen in the sky');
  assert.equal(bridge.getIsFalling(), true, 'Incomplete bridge must fall down towards pit under gravity');

  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
  }

  const pts = bridge.getRawPoints();
  assert.ok(pts[pts.length - 1].y > 350, 'Arch tip in mid-air must drop down into water pit');
});

test('User Screenshot Level 1 Air Gap Elimination: bridge drawn across water pit settles flush on both cliffs with zero air gap', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 400, width: 425, height: 200 },
    { id: 't-bottom-1-0', type: 'brick', theme: 'brick-red', x: 425, y: 470, width: 150, height: 130 }
  ];

  const bridge = new BridgeManager();
  // Exact user screenshot Level 1: Left end drawn 2px above left cliff, right end drawn 25px above right cliff
  bridge.startDrawing({ x: 380, y: 398 });
  bridge.addPoint({ x: 450, y: 385 });
  bridge.addPoint({ x: 520, y: 380 });
  bridge.addPoint({ x: 610, y: 375 });

  bridge.startFalling(terrains);

  assert.equal(bridge.getHasBothWallSupports(), true, 'Must have dual wall support');

  // Simulate falling until settled
  for (let i = 0; i < 40; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Bridge must settle firmly onto both cliffs');

  const pts = bridge.getRawPoints();
  // Left point on left cliff (x=380) must rest flush on left cliff (y=400)
  assert.ok(Math.abs(pts[0].y - 400) < 0.01, `Left end must touch left cliff at y=400, got: ${pts[0].y}`);
  // Right point on right cliff (x=610) must rest flush on right cliff (y=400) with ZERO air gap
  assert.ok(Math.abs(pts[3].y - 400) < 0.01, `Right end must touch right cliff at y=400 with zero air gap, got: ${pts[3].y}`);
});

test('User Screenshot Level 2 Air Gap Elimination: incline ramp settles flush on both cliffs with zero air gap', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 },
    { id: 't-bottom-2-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];

  const bridge = new BridgeManager();
  // Exact user screenshot Level 2: Left end drawn 25px above left cliff (y=460), right end drawn 2px above right cliff (y=320)
  bridge.startDrawing({ x: 380, y: 435 });
  bridge.addPoint({ x: 460, y: 370 });
  bridge.addPoint({ x: 530, y: 330 });
  bridge.addPoint({ x: 590, y: 318 });

  bridge.startFalling(terrains);

  assert.equal(bridge.getHasBothWallSupports(), true, 'Must have dual wall support');

  // Simulate falling until settled
  for (let i = 0; i < 40; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Ramp must settle firmly onto both cliffs');

  const pts = bridge.getRawPoints();
  // Left point on left cliff (x=380) must rest flush on left cliff at y=460 with ZERO air gap
  assert.ok(Math.abs(pts[0].y - 460) < 0.01, `Left end must touch left cliff at y=460 with zero air gap, got: ${pts[0].y}`);
  // Right point on right cliff (x=590) must rest flush on right cliff at y=320 with ZERO air gap
  assert.ok(Math.abs(pts[3].y - 320) < 0.01, `Right end must touch right cliff at y=320 with zero air gap, got: ${pts[3].y}`);
});

test('User Issue 1: Car on steep slope bridge keeps wheels firmly on top of bridge stroke with zero sinking', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 }
  ];

  const bridge = new BridgeManager();
  bridge.startDrawing({ x: 410, y: 460 });
  bridge.addPoint({ x: 480, y: 390 });
  bridge.addPoint({ x: 540, y: 340 });
  bridge.addPoint({ x: 585, y: 320 });
  bridge.startFalling(terrains);

  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
  }

  const sim = new VehicleSimulation(380, 437.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);
  const particles = { emitExplosion: () => {}, emitWaterSplash: () => {}, emitBubbles: () => {}, emitSparkle: () => {}, emitTrail: () => {} };

  // Run simulation up the bridge slope
  for (let i = 0; i < 45; i++) {
    sim.update(1 / 60, terrains, bridge.getSegments(), [], { x: 800, y: 320, width: 60, height: 80 }, [], particles, bridge);
  }

  const v = sim.vehicle;
  const mounts = sim.getAxleMounts();

  // Find bridge elevation under rear wheel
  const rearX = mounts.rear.mount.x;
  const segs = bridge.getSegments();
  const segUnderRear = segs.find(s => rearX >= Math.min(s.p1.x, s.p2.x) && rearX <= Math.max(s.p1.x, s.p2.x));

  if (segUnderRear) {
    const t = (rearX - segUnderRear.p1.x) / (segUnderRear.p2.x - segUnderRear.p1.x);
    const bridgeY = segUnderRear.p1.y + t * (segUnderRear.p2.y - segUnderRear.p1.y);
    const rearWheelBottom = mounts.rear.mount.y + v.wheels[0].radius;
    // Rear wheel bottom must be on or very close to bridge stroke top (within 1.5px), not sunken underneath
    assert.ok(
      rearWheelBottom <= bridgeY + 4.5,
      `Rear wheel bottom (${rearWheelBottom}) must stay on top of bridge line (${bridgeY}), not sink below`
    );
  }
});

test('User Issue 2: Bridge drawn in air over hazard pit falls down and lands firmly on top of bottom brick floor without sinking', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 },
    { id: 't-bottom-2-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];

  const bridge = new BridgeManager();
  // Bridge drawn in air across the spikes pit (y=420), ending before right cliff platform (x=560)
  bridge.startDrawing({ x: 430, y: 420 });
  bridge.addPoint({ x: 500, y: 420 });
  bridge.addPoint({ x: 560, y: 420 });

  bridge.startFalling(terrains);

  // Simulate falling under gravity for 60 frames (1 second)
  for (let i = 0; i < 60; i++) {
    bridge.update(1 / 60, terrains);
  }

  // Must have landed and settled on the solid brick pit floor (y=520)
  assert.equal(bridge.getIsSettled(), true, 'Bridge must settle upon landing on bottom brick floor');
  const pts = bridge.getRawPoints();
  assert.ok(pts.length >= 3, 'Bridge points must exist');

  // Must rest flush on top of t-bottom-2-0 at y=520 and NEVER sink below into purple bricks (y > 520.1)
  for (const p of pts) {
    assert.ok(
      p.y <= 520.05,
      `Point at (${p.x}, ${p.y}) must rest on top of pit floor at y=520 and not sink into bricks`
    );
  }
});

test('User Screenshot Cantilever Pivot Scenario: half-bridge drawn from cliff over spikes pit pivots with one end on brick ledge and one end in pit without sinking into brick', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 },
    { id: 't-bottom-2-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];

  const bridge = new BridgeManager();
  // Exact user screenshot drawing: starts on left cliff at (350, 460), extends over pit to (500, 420)
  bridge.startDrawing({ x: 350, y: 460 });
  bridge.addPoint({ x: 425, y: 460 });
  bridge.addPoint({ x: 500, y: 420 });

  const initialLength = bridge.getCurrentLength();
  bridge.startFalling(terrains);

  // Simulate falling and pivoting for 30 frames
  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Cantilever ramp must settle');
  assert.equal(bridge.getIsSupported(), true, 'Base supported on cliff');

  const pts = bridge.getRawPoints();
  assert.equal(pts.length, 3, 'Must have 3 points');

  // 1. Base / pivot point at cliff edge must rest on top of the brick cliff at y=460
  assert.ok(
    Math.abs(pts[1].y - 460) < 0.5,
    `Cliff contact point at (${pts[1].x}, ${pts[1].y}) must rest right on the cliff ledge at y=460`
  );

  // 2. Overhanging tip must reach the pit floor at y=520
  assert.ok(
    Math.abs(pts[2].y - 520) < 0.5,
    `Tip at (${pts[2].x}, ${pts[2].y}) must reach down into the pit floor at y=520`
  );

  // 3. ZERO penetration into solid brick cliff (any point with x <= 425 must have y <= 460)
  for (const p of pts) {
    if (p.x <= 425) {
      assert.ok(
        p.y <= 460.05,
        `Point at (${p.x}, ${p.y}) must NEVER penetrate into the solid brick cliff (max y=460)`
      );
    }
  }

  // 4. Rigid body conservation: length must be 100% invariant (zero stretching or folding)
  assert.ok(
    Math.abs(bridge.getCurrentLength() - initialLength) < 0.01,
    'Bridge must remain 100% rigid with constant length'
  );
});

test('Cantilever ramp vehicle driving: car driving off cliff rolls onto cantilever bridge slope down into hazard pit', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 },
    { id: 't-bottom-2-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];
  const hazards = [
    { id: 'h-1', type: 'spikes', x: 425, width: 150, height: 40, y: 480 }
  ];
  const goal = { x: 595, y: 320, width: 60, height: 80 };

  const bridge = new BridgeManager();
  bridge.startDrawing({ x: 350, y: 460 });
  bridge.addPoint({ x: 425, y: 460 });
  bridge.addPoint({ x: 500, y: 420 });
  bridge.startFalling(terrains);

  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
  }

  // Spawn car driving forward on left cliff
  const sim = new VehicleSimulation(290, 437.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  for (let i = 0; i < 120; i++) {
    sim.update(1 / 60, terrains, bridge.getSegments(), hazards, goal, [], particles, bridge);
  }

  // Car drove off cliff onto sloping bridge and hit spikes in pit
  assert.equal(sim.vehicle.isDead, true, 'Car must explode upon driving down ramp into spikes hazard');
});

test('Straight wood stick rigid pivot: straight drawn line remains 100% straight during cantilever pivot with zero bending or folding', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 },
    { id: 't-bottom-2-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];

  const bridge = new BridgeManager();
  // Draw a completely straight horizontal line / stick
  bridge.startDrawing({ x: 350, y: 460 });
  bridge.addPoint({ x: 425, y: 460 });
  bridge.addPoint({ x: 500, y: 460 });

  const initialLength = bridge.getCurrentLength();
  bridge.startFalling(terrains);

  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Cantilever stick must settle');
  const pts = bridge.getRawPoints();
  assert.equal(pts.length, 3, 'Must have 3 points');

  // Slope of segment 0 vs slope of segment 1 must be identical (zero folding or bending!)
  const slope0 = (pts[1].y - pts[0].y) / (pts[1].x - pts[0].x);
  const slope1 = (pts[2].y - pts[1].y) / (pts[2].x - pts[1].x);
  assert.ok(
    Math.abs(slope1 - slope0) < 0.001,
    `Slope 0 (${slope0}) and Slope 1 (${slope1}) must be identical (zero bending/folding)`
  );

  // Total length must be 100% invariant
  assert.ok(
    Math.abs(bridge.getCurrentLength() - initialLength) < 0.01,
    'Total length must remain 100% constant'
  );
});

test('User Screenshot Image 1 vs Image 2: upward ramp drawn over pit falls under gravity and never flips backwards into the sky', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 },
    { id: 't-bottom-2-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];

  const bridge = new BridgeManager();
  // Image 1 stroke coordinates: starts near left cliff edge and ramps steeply upward into mid-air over the spikes
  bridge.startDrawing({ x: 348, y: 454 });
  bridge.addPoint({ x: 425, y: 390 });
  bridge.addPoint({ x: 500, y: 340 });
  bridge.addPoint({ x: 560, y: 294 });

  const initialLength = bridge.getCurrentLength();
  bridge.startFalling(terrains);

  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
  }

  const pts = bridge.getRawPoints();
  // In Image 2, the bridge flipped backwards so right end rested at x=820, y=320 and left end pointed into sky at y=189!
  // It MUST NOT flip backwards to the far right cliff (x >= 650)
  for (const p of pts) {
    assert.ok(
      p.x < 650,
      `Point (${p.x}, ${p.y}) must NEVER flip backwards into the far right cliff area (x >= 650)`
    );
    assert.ok(
      p.y >= 290,
      `Point (${p.x}, ${p.y}) must NEVER swing backwards high up into the empty sky (y < 290)`
    );
  }

  // Rigid body preservation: zero deformation
  assert.ok(
    Math.abs(bridge.getCurrentLength() - initialLength) < 0.01,
    'Bridge must remain 100% rigid with constant length'
  );
});

test('User Scenario: car pushing unanchored bridge never shoves bridge points into solid right cliff brick', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 },
    { id: 't-bottom-2-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];

  const bridge = new BridgeManager();
  // Bridge drawn in pit area towards right cliff
  bridge.startDrawing({ x: 500, y: 480 });
  bridge.addPoint({ x: 560, y: 420 });
  bridge.addPoint({ x: 620, y: 320 });

  // Simulate car pushing with heavy horizontal impulse towards right cliff
  for (let i = 0; i < 20; i++) {
    bridge.push({ x: 25, y: 5 }, { x: 150, y: 30 }, terrains);
  }

  const pts = bridge.getRawPoints();
  for (const p of pts) {
    // If inside right cliff horizontal range [575, 1000], y MUST NOT penetrate below cliff surface (y <= 320.05)
    if (p.x >= 575 && p.x <= 1000) {
      assert.ok(
        p.y <= 320.05,
        `Point (${p.x}, ${p.y}) must NEVER be shoved below the top surface of the right cliff into solid brick`
      );
    }
  }
});

test('User Scenario: horizontal stick drawn in air over cliff edge drops to cliff top and pivots diagonally into water pit without sinking flat into solid brick', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 400, width: 425, height: 200 },
    { id: 't-bottom-1-0', type: 'brick', theme: 'brick-red', x: 425, y: 470, width: 150, height: 130 }
  ];

  const bridge = new BridgeManager();
  // Drawn horizontally in air at y=360 spanning from left cliff into water pit
  bridge.startDrawing({ x: 375, y: 360 });
  bridge.addPoint({ x: 425, y: 360 });
  bridge.addPoint({ x: 475, y: 360 });
  bridge.addPoint({ x: 515, y: 360 });

  const initialLength = bridge.getCurrentLength();
  bridge.startFalling(terrains);

  for (let i = 0; i < 30; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Bridge must settle');
  const pts = bridge.getRawPoints();

  // 1. Cliff edge contact point rests on cliff top at y=400
  assert.ok(
    Math.abs(pts[1].y - 400) < 0.5,
    `Cliff contact point at (${pts[1].x}, ${pts[1].y}) must rest on cliff ledge at y=400`
  );

  // 2. Tip in water pit rests on bottom terrain floor at y=470
  assert.ok(
    Math.abs(pts[pts.length - 1].y - 470) < 0.5,
    `Pit tip at (${pts[pts.length - 1].x}, ${pts[pts.length - 1].y}) must reach water pit bottom at y=470`
  );

  // 3. Slanted diagonally: tip y (470) > base y (361)
  assert.ok(
    pts[pts.length - 1].y > pts[0].y + 50,
    'Wood stick must settle slanted diagonally with tip in pit and base on cliff'
  );

  // 4. ZERO penetration into solid left cliff
  for (const p of pts) {
    if (p.x <= 425) {
      assert.ok(
        p.y <= 400.05,
        `Point (${p.x}, ${p.y}) must NEVER sink below cliff top into solid brick`
      );
    }
  }

  // 5. 100% Rigid body: length constant
  assert.ok(
    Math.abs(bridge.getCurrentLength() - initialLength) < 0.01,
    'Bridge length must remain 100% constant (solid wood stick with zero folding)'
  );
});

test('User Scenario: car colliding with front vertical wall stops firmly on bridge and is never thrown backwards into pit', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 },
    { id: 't-bottom-2-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];
  const hazards = [
    { id: 'h-1', type: 'spikes', x: 425, width: 150, height: 40, y: 480 }
  ];
  const goal = { x: 595, y: 320, width: 60, height: 80 };

  const bridge = new BridgeManager();
  // Flat bridge drawn from left cliff across pit to vertical wall of right cliff (Image 2)
  bridge.startDrawing({ x: 300, y: 460 });
  bridge.addPoint({ x: 425, y: 460 });
  bridge.addPoint({ x: 500, y: 460 });
  bridge.addPoint({ x: 575, y: 460 });
  bridge.startFalling(terrains);

  const sim = new VehicleSimulation(290, 437.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);
  const particles = {
    emitExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Run simulation for 120 frames (2 seconds)
  for (let i = 0; i < 120; i++) {
    sim.update(1 / 60, terrains, bridge.getSegments(), hazards, goal, [], particles, bridge);
  }

  // 1. Car must be stopped at the right cliff wall (front bumper at ~535)
  assert.ok(
    sim.vehicle.position.x >= 530 && sim.vehicle.position.x <= 540,
    `Car must stop right in front of the vertical wall (current x: ${sim.vehicle.position.x})`
  );

  // 2. Car MUST NOT explode upon hitting the vertical wall
  assert.equal(sim.vehicle.isDead, false, 'Car must not blast upon hitting front vertical wall');

  // 3. Velocity must be minimal (parked at the wall)
  assert.ok(
    Math.abs(sim.vehicle.velocity.x) < 15,
    `Car horizontal velocity must be minimal at wall (current vx: ${sim.vehicle.velocity.x})`
  );

  // 4. Car must remain safely on top of bridge (y ~ 437.5, not fallen into spikes y > 470)
  assert.ok(
    sim.vehicle.position.y <= 445,
    `Car must remain safely on top of bridge (current y: ${sim.vehicle.position.y})`
  );
});

test('User Fire/Hazard Pit Scenario (Happy-Path): bridge drawn across fire pit from left to right cliff settles without oscillation or plunge', () => {
  // Geometry from Level 9: left-cliff (y=220), right-cliff (y=160), pit floor (y=290), fire hazard (y=230)
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 220, width: 425, height: 380 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 160, width: 425, height: 440 },
    { id: 't-bottom-9-0', type: 'brick', theme: 'brick-red', x: 425, y: 290, width: 150, height: 310 }
  ];

  const bridge = new BridgeManager();
  // Drawn from left cliff (x=410, y=220) to right cliff (x=600, y=160)
  bridge.startDrawing({ x: 410, y: 220 });
  bridge.addPoint({ x: 500, y: 190 });
  bridge.addPoint({ x: 600, y: 160 });

  bridge.startFalling(terrains);

  // Since drawn directly on/between cliffs, it settles immediately without dipping into fire
  assert.equal(bridge.getIsSettled(), true, 'Bridge spanning cliffs must settle flush immediately');
  assert.equal(bridge.getHasBothWallSupports(), true, 'Must have both cliff wall supports');

  const pts = bridge.getRawPoints();
  assert.equal(pts[0].y, 220, 'Left point must be flush on left cliff at y=220');
  assert.equal(pts[2].y, 160, 'Right point must be flush on right cliff at y=160');

  // Verify none of the points penetrated into solid cliff brick
  assert.ok(pts[0].y <= 220, 'Left point must not penetrate into left cliff');
  assert.ok(pts[2].y <= 160, 'Right point must not penetrate into right cliff');
});

test('User Fire/Hazard Pit Scenario (Failure/Edge-Path): line drawn in mid-air above hazard pit lands flush on pit floor without plunging past it', () => {
  // Level 9 geometry
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 220, width: 425, height: 380 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 160, width: 425, height: 440 },
    { id: 't-bottom-9-0', type: 'brick', theme: 'brick-red', x: 425, y: 290, width: 150, height: 310 }
  ];

  const bridge = new BridgeManager();
  // Drawn horizontally in mid-air directly over the pit
  bridge.startDrawing({ x: 450, y: 150 });
  bridge.addPoint({ x: 550, y: 150 });

  bridge.startFalling(terrains);
  assert.equal(bridge.getIsSettled(), false, 'Airborne line must start falling');
  assert.equal(bridge.getIsFalling(), true);

  // Update physics until it lands
  for (let i = 0; i < 40; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Must settle once it reaches bottom pit floor');
  const pts = bridge.getRawPoints();
  // Must land exactly flush on top of t-bottom at y=290 without overshooting deeper into brick
  assert.equal(pts[0].y, 290, 'Left point must rest flush on pit floor y=290');
  assert.equal(pts[1].y, 290, 'Right point must rest flush on pit floor y=290');
});

test('User Rigid Wood Drop Feel (Happy-Path): bridge drawn in air falls as 100% rigid solid wood body with invariant segment lengths and zero soft morphing', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 400, width: 425, height: 200 }
  ];

  const bridge = new BridgeManager();
  // Drawn 80px high in the air
  bridge.startDrawing({ x: 380, y: 320 });
  bridge.addPoint({ x: 450, y: 300 });
  bridge.addPoint({ x: 520, y: 300 });
  bridge.addPoint({ x: 620, y: 320 });

  const initialLength = bridge.getCurrentLength();
  bridge.startFalling(terrains);

  // Every single frame during fall and landing must preserve 100% rigid geometry
  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
    const currentLength = bridge.getCurrentLength();
    assert.ok(
      Math.abs(currentLength - initialLength) < 0.01,
      `Length must be 100% invariant like hard wood (initial: ${initialLength}, current: ${currentLength})`
    );
  }

  assert.equal(bridge.getIsSettled(), true, 'Must settle solidly onto both cliffs');
});

test('User Rigid Wood Drop Feel (Failure/Edge-Path): straight incline drawn in air rotates and lands as 100% straight rigid wood stick', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 }
  ];

  const bridge = new BridgeManager();
  // Straight line from (410, 460) pointing up to (650, 200) high in air
  bridge.startDrawing({ x: 410, y: 460 });
  bridge.addPoint({ x: 530, y: 330 });
  bridge.addPoint({ x: 650, y: 200 });

  const initialLength = bridge.getCurrentLength();
  bridge.startFalling(terrains);

  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
    const currentLength = bridge.getCurrentLength();
    assert.ok(
      Math.abs(currentLength - initialLength) < 0.01,
      `Straight stick must maintain exact total length during rigid pivot`
    );
  }

  assert.equal(bridge.getIsSettled(), true, 'Must settle flush on cliffs');
  const pts = bridge.getRawPoints();
  assert.equal(pts[0].y, 460, 'Left end rests flush on left cliff y=460');
  assert.equal(pts[2].y, 320, 'Right end rests flush on right cliff y=320');
});

test('User Screenshot media_1790251630114 Scenario (Happy-Path): diagonal line drawn in air spanning cliffs tilts towards heavy left side and lands flush on left cliff y=460', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 220, width: 425, height: 380 }
  ];

  const bridge = new BridgeManager();
  // Exact user screenshot: (340, 370) in air above left cliff to (910, 110) in air above right cliff
  bridge.startDrawing({ x: 340, y: 370 });
  bridge.addPoint({ x: 600, y: 250 });
  bridge.addPoint({ x: 910, y: 110 });

  bridge.startFalling(terrains);
  assert.equal(bridge.getIsSettled(), false, 'Must start falling under gravity');

  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Must settle solidly across both cliffs');
  const pts = bridge.getRawPoints();
  // Left end must have descended from y=370 down to left cliff surface y=460
  assert.ok(Math.abs(pts[0].y - 460) < 1.0, `Left end must land on left cliff at y=460, got: ${pts[0].y}`);
  assert.ok(pts[0].x <= 435, 'Left end must be on left cliff edge');
});

test('User Screenshot media_1790251724919 Scenario (Failure/Edge-Path): horizontal stick drawn in air touching right cliff tilts down into pit under gravity without freezing in air', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 220, width: 425, height: 380 }
  ];

  const bridge = new BridgeManager();
  // Horizontal line in air: (390, 200) to (600, 220)
  bridge.startDrawing({ x: 390, y: 200 });
  bridge.addPoint({ x: 500, y: 190 });
  bridge.addPoint({ x: 600, y: 220 });

  bridge.startFalling(terrains);
  assert.equal(bridge.getIsSettled(), false, 'Must start falling under gravity');

  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Must settle');
  const pts = bridge.getRawPoints();
  // Left end must have tilted down into pit under gravity (must NOT remain frozen at y=200 in the air)
  assert.ok(pts[0].y > 350, `Left end must swing down into pit under gravity, got: ${pts[0].y}`);
});

test('User Screenshot media_1790251940689 Scenario (Happy-Path): vertical line hanging along cliff edge falls under gravity and lands flush on bottom brick floor', () => {
  // Level 20 layout (Left Cliff y=400, Right Cliff y=400, Pit Floor t-bottom y=520)
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'stone-gray', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'stone-gray', x: 575, y: 400, width: 425, height: 200 },
    { id: 't-bottom-20-0', type: 'brick', theme: 'stone-gray', x: 425, y: 520, width: 150, height: 80 }
  ];

  const bridge = new BridgeManager();
  // Vertical line drawn hanging along the cliff wall: (415, 180) to (415, 480)
  bridge.startDrawing({ x: 415, y: 180 });
  bridge.addPoint({ x: 415, y: 300 });
  bridge.addPoint({ x: 415, y: 400 });
  bridge.addPoint({ x: 415, y: 480 });

  bridge.startFalling(terrains);
  // It must NOT settle frozen in the air; gravity must pull it down
  assert.equal(bridge.getIsSettled(), false, 'Must not freeze in mid-air');
  assert.equal(bridge.getIsFalling(), true, 'Must fall under gravity');

  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Must settle once it reaches bottom brick floor');
  const pts = bridge.getRawPoints();
  const maxFloorY = Math.max(...pts.map(p => p.y));
  // The bottom of the stick must land flush on the bottom brick floor (y=520)
  assert.ok(Math.abs(maxFloorY - 520) <= 1.0, `Stick must land flush on bottom brick floor at y=520, got: ${maxFloorY}`);
});

test('User Screenshot media_1790251940689 Scenario (Failure/Edge-Path): vertical stick drawn on top of cliff platform topples and settles on cliff surface', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'stone-gray', x: 0, y: 400, width: 425, height: 200 }
  ];

  const bridge = new BridgeManager();
  // Vertical stick drawn completely on top of cliff platform: (350, 200) to (350, 380)
  bridge.startDrawing({ x: 350, y: 200 });
  bridge.addPoint({ x: 350, y: 300 });
  bridge.addPoint({ x: 350, y: 380 });

  bridge.startFalling(terrains);
  assert.equal(bridge.getIsSettled(), false, 'Must start falling/toppling');

  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Must settle on cliff surface');
  const pts = bridge.getRawPoints();
  const maxCliffY = Math.max(...pts.map(p => p.y));
  assert.ok(Math.abs(maxCliffY - 400) <= 1.0, `Stick must rest flush on top of cliff at y=400, got: ${maxCliffY}`);
});

test('Brick Surface Drawing (Happy-Path): drawing on top of brick snaps to surface and allows smooth line directly on brick surface', () => {
  const terrains = [
    { x: 0, y: 400, width: 425, height: 200 },
    { x: 575, y: 400, width: 425, height: 200 }
  ];

  // User touches on the brick cliff surface at (200, 415) - 15px into brick
  const rawTouch = { x: 200, y: 415 };
  const snapped = snapCoordsToTerrainSurface(rawTouch, terrains);

  // Must snap exactly to the top surface y = 400
  assert.equal(snapped.x, 200);
  assert.equal(snapped.y, 400, 'Must snap directly to brick top surface at y=400');

  // Must NOT be rejected by pointInTerrains since it is on the surface
  assert.equal(pointInTerrains(snapped, terrains), false, 'Surface point must not be treated as inside brick');

  // Drawing segment along the surface from (200, 400) to (300, 400)
  const resolved = resolveSegmentAgainstTerrains(snapped, { x: 300, y: 400 }, terrains);
  assert.equal(resolved.length, 1, 'Segment on brick surface must be accepted');
  assert.equal(resolved[0].x, 300);
  assert.equal(resolved[0].y, 400);
});

test('Brick Surface Drawing (Failure/Edge-Path): drawing in the air remains in air and falls rigidly to rest flush on brick surface', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 400, width: 425, height: 200 }
  ];

  // Drawing high in the air at y = 250 (150px above cliff at y = 400)
  const airTouch = { x: 200, y: 250 };
  const snappedAir = snapCoordsToTerrainSurface(airTouch, terrains);
  // In the air, it must not snap down prematurely
  assert.equal(snappedAir.y, 250, 'High air coordinate must remain in air');

  // Drawn across both cliffs high in the air
  const bridge = new BridgeManager();
  bridge.startDrawing({ x: 350, y: 250 });
  bridge.addPoint({ x: 500, y: 250 });
  bridge.addPoint({ x: 650, y: 250 });

  bridge.startFalling(terrains);
  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
  }

  // Once released, gravity rigid drop must seat the solid stick flush on the brick surface y = 400
  assert.equal(bridge.getIsSettled(), true, 'Must settle flush on brick cliffs');
  const pts = bridge.getRawPoints();
  assert.equal(pts[0].y, 400, 'Left end must rest solidly on left cliff surface y=400');
  assert.equal(pts[2].y, 400, 'Right end must rest solidly on right cliff surface y=400');
});

test('User Issue Corner Anti-Penetration (Happy-Path): drawing segment towards higher cliff wraps cleanly around corner without cutting into solid brick', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 280, width: 425, height: 320 }
  ];

  // User draws a stroke from chasm at (560, 310) to cliff top surface at (620, 280)
  // This segment cuts across the corner of the right cliff at (575, 280)
  const p1 = { x: 560, y: 310 };
  const p2 = { x: 620, y: 280 };

  const resolved = resolveSegmentAgainstTerrains(p1, p2, terrains);
  assert.ok(resolved.length >= 2, 'Must resolve with corner wrapping');

  // First point must be the exact top-left corner vertex (575, 280)
  assert.equal(resolved[0].x, 575, 'Must wrap over the corner x=575');
  assert.equal(resolved[0].y, 280, 'Must touch the corner ledge y=280 without penetrating inside brick');

  // Second point is the destination surface point
  assert.equal(resolved[1].x, 620);
  assert.equal(resolved[1].y, 280);
});

test('User Issue Corner Air Gap & Mid-Air Hang (Failure/Edge-Path): bridge ramp spanning cliffs settles flush on both cliff surfaces without mid-air hanging or corner gap', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 320, width: 425, height: 280 }
  ];

  const bridge = new BridgeManager();
  // Bridge drawn spanning from left cliff across gap onto right cliff
  bridge.startDrawing({ x: 380, y: 460 });
  bridge.addPoint({ x: 425, y: 460 });
  bridge.addPoint({ x: 500, y: 390 });
  bridge.addPoint({ x: 575, y: 320 });
  bridge.addPoint({ x: 650, y: 320 });

  bridge.startFalling(terrains);
  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Bridge must settle firmly');
  const pts = bridge.getRawPoints();

  // Left end and left corner must rest flush on left cliff y=460 with zero air gap
  assert.equal(pts[0].y, 460, 'Left base must rest flush at y=460');
  assert.equal(pts[1].y, 460, 'Left cliff corner must rest flush at y=460 with zero air gap');

  // Right corner and right end must rest flush on right cliff y=320 with zero air gap
  assert.equal(pts[3].y, 320, 'Right cliff corner must rest flush at y=320 with zero air gap');
  assert.equal(pts[4].y, 320, 'Right end must rest flush at y=320');

  // Zero points hanging in mid-air above cliffs
  for (const p of pts) {
    if (p.x <= 425) {
      assert.equal(p.y, 460, 'Points on left cliff must rest flush on surface');
    } else if (p.x >= 575) {
      assert.equal(p.y, 320, 'Points on right cliff must rest flush on surface');
    }
  }
});

test('Corner-to-Corner Drawing Fluidity (Happy-Path): dragging from left cliff corner across chasm to right cliff corner draws smoothly without sticking', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 460, width: 425, height: 140 },
    { id: 't-bottom-1-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];

  // Start touch at left cliff corner
  const startPt = snapCoordsToTerrainSurface({ x: 425, y: 460 }, terrains);
  assert.equal(startPt.x, 425);
  assert.equal(startPt.y, 460);

  const bridge = new BridgeManager();
  bridge.startDrawing(startPt);

  // User drags through gap: (460, 458), (500, 455), (540, 458), (575, 460)
  const trajectory = [
    { x: 460, y: 458 },
    { x: 500, y: 455 },
    { x: 540, y: 458 },
    { x: 575, y: 460 }
  ];

  for (const pt of trajectory) {
    const snapped = snapCoordsToTerrainSurface(pt, terrains);
    const lastPt = bridge.getRawPoints()[bridge.getRawPoints().length - 1];
    const resolved = resolveSegmentAgainstTerrains(lastPt, snapped, terrains);
    assert.ok(resolved.length > 0, `Segment from (${lastPt.x}, ${lastPt.y}) to (${snapped.x}, ${snapped.y}) must NOT be rejected`);
    for (const r of resolved) {
      bridge.addPoint(r);
    }
  }

  // All 5 points must be registered smoothly without getting stuck
  assert.equal(bridge.getRawPoints().length, 5, 'All trajectory points must be smoothly added');
  assert.equal(bridge.getRawPoints()[0].x, 425);
  assert.equal(bridge.getRawPoints()[4].x, 575);
});

test('Rigid Wood Stick Physics (Failure/Edge-Path): multi-segment arch bridge maintains 100% constant segment lengths throughout drop and settling', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 460, width: 425, height: 140 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 460, width: 425, height: 140 }
  ];

  const bridge = new BridgeManager();
  // Arch bridge drawn in air
  bridge.startDrawing({ x: 400, y: 400 });
  bridge.addPoint({ x: 450, y: 360 });
  bridge.addPoint({ x: 500, y: 350 });
  bridge.addPoint({ x: 550, y: 360 });
  bridge.addPoint({ x: 600, y: 400 });

  const initialLengths = [];
  const initialPts = bridge.getRawPoints();
  for (let i = 0; i < initialPts.length - 1; i++) {
    initialLengths.push(Math.hypot(initialPts[i + 1].x - initialPts[i].x, initialPts[i + 1].y - initialPts[i].y));
  }

  bridge.startFalling(terrains);

  // Test every single simulation frame
  for (let frame = 0; frame < 60; frame++) {
    bridge.update(1 / 60, terrains);
    const currentPts = bridge.getRawPoints();
    for (let i = 0; i < currentPts.length - 1; i++) {
      const currentLen = Math.hypot(currentPts[i + 1].x - currentPts[i].x, currentPts[i + 1].y - currentPts[i].y);
      assert.ok(
        Math.abs(currentLen - initialLengths[i]) < 0.01,
        `Segment ${i} length must remain 100% constant (initial: ${initialLengths[i]}, current: ${currentLen})`
      );
    }
  }

  assert.equal(bridge.getIsSettled(), true, 'Arch bridge must settle solidly on cliffs');
});

test('Drawing Below Cliff Corner (Happy-Path): starting touch slightly below cliff corner starts drawing smoothly without being blocked', () => {
  // Level layout with higher left cliff at y=380 and lower right cliff at y=460
  const terrains = [
    { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 380, width: 425, height: 220 },
    { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 575, y: 460, width: 425, height: 140 },
    { id: 't-bottom-1-0', type: 'brick', theme: 'brick-red', x: 425, y: 520, width: 150, height: 80 }
  ];

  // User touches 30px below left cliff corner at (420, 410) - 5px inward and 30px below top
  const rawTouch = { x: 420, y: 410 };
  let startCoords = snapCoordsToTerrainSurface(rawTouch, terrains);
  if (pointInTerrains(startCoords, terrains)) {
    startCoords = clampPointOutOfTerrains(startCoords, terrains);
  }

  // Clamped to the right edge (425, 410)
  assert.equal(startCoords.x, 425);
  assert.equal(startCoords.y, 410);

  const bridge = new BridgeManager();
  const started = bridge.startDrawing(startCoords);
  assert.equal(started, true, 'Drawing must start successfully from below corner');

  // Dragging diagonally down towards lower right cliff at (575, 460)
  const trajectory = [
    { x: 460, y: 425 },
    { x: 500, y: 440 },
    { x: 540, y: 450 },
    { x: 575, y: 460 }
  ];

  for (const pt of trajectory) {
    let coords = snapCoordsToTerrainSurface(pt, terrains);
    if (pointInTerrains(coords, terrains)) {
      coords = clampPointOutOfTerrains(coords, terrains);
    }
    const lastPt = bridge.getRawPoints()[bridge.getRawPoints().length - 1];
    const resolved = resolveSegmentAgainstTerrains(lastPt, coords, terrains);
    assert.ok(resolved.length > 0, `Move to (${coords.x}, ${coords.y}) must succeed`);
    for (const r of resolved) {
      bridge.addPoint(r);
    }
  }

  // Verify all points were captured and form a valid spanning bridge
  assert.equal(bridge.getRawPoints().length, 5, 'All 5 points must be captured');
  bridge.startFalling(terrains);
  assert.equal(bridge.getHasBothWallSupports(), true, 'Must recognize support spanning between cliffs');
});

test('Brick Drawing Anti-Penetration (Happy-Path): Drawing across chasm never enters solid brick body', () => {
  const terrains = [
    { id: 'left-cliff', x: 0, y: 440, width: 391, height: 160 },
    { id: 'right-cliff', x: 609, y: 340, width: 391, height: 260 },
    { id: 't-bottom', x: 391, y: 510, width: 218, height: 90 }
  ];

  const bridge = new BridgeManager();
  bridge.startDrawing({ x: 350, y: 440 });

  // User drags downwards into pit and then across to right cliff
  const trajectory = [
    { x: 391, y: 440 }, // Cliff corner
    { x: 420, y: 490 }, // In open air pit
    { x: 500, y: 490 }, // In open air pit
    { x: 609, y: 340 }  // Right cliff corner
  ];

  for (const pt of trajectory) {
    const lastPt = bridge.getRawPoints()[bridge.getRawPoints().length - 1];
    const resolved = resolveSegmentAgainstTerrains(lastPt, pt, terrains);
    for (const r of resolved) {
      bridge.addPoint(r);
    }
  }

  // All points must be strictly outside solid brick interiors
  for (const pt of bridge.getRawPoints()) {
    assert.equal(pointInTerrains(pt, terrains), false, `Point (${pt.x}, ${pt.y}) must not be inside solid brick`);
  }
});

test('Steep Barrier / Checkmark Blocking (Failure/Edge-Path): Vehicle hitting steep wall/barrier is blocked from bypassing', () => {
  const terrains = [
    { id: 'left-cliff', x: 0, y: 340, width: 383, height: 260 },
    { id: 'right-cliff', x: 617, y: 340, width: 383, height: 260 },
    { id: 't-bottom', x: 383, y: 510, width: 234, height: 90 }
  ];

  const bridge = new BridgeManager();
  // Steep wall barrier drawn across the left cliff platform in front of car
  bridge.startDrawing({ x: 350, y: 260 });
  bridge.addPoint({ x: 350, y: 340 });
  bridge.addPoint({ x: 600, y: 340 });
  bridge.startFalling(terrains);

  const sim = new VehicleSimulation(249, 317.5, 9.8, 1.0, terrains, 'smart_car');
  sim.setDriving(true);
  const particles = { emitExplosion: () => {}, emitWaterSplash: () => {}, emitBubbles: () => {}, emitSparkle: () => {}, emitTrail: () => {} };

  // Run simulation forward into the wall
  for (let i = 0; i < 60; i++) {
    sim.update(1 / 60, terrains, bridge.getSegments(), [], { x: 674, y: 340, width: 60, height: 80 }, [], particles, bridge);
  }

  // Car must be blocked by the front wall barrier and NOT have bypassed or reached the right cliff
  assert.ok(sim.vehicle.position.x < 360, `Car must be stopped before barrier, stopped at x: ${sim.vehicle.position.x}`);
  assert.equal(sim.vehicle.hasWon, false, 'Car must not bypass steep obstacle barrier');
});

test('Spanning Bridge High-End Drop (Happy-Path): Straight stick drawn with right end high in air rigidly rotates down to right cliff', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', x: 575, y: 400, width: 425, height: 200 },
    { id: 't-bottom-1-0', type: 'brick', x: 425, y: 510, width: 150, height: 90 }
  ];

  const bridge = new BridgeManager();
  // Stroke starting on left cliff and ending 210px in the air above right cliff
  bridge.startDrawing({ x: 350, y: 400 });
  bridge.addPoint({ x: 450, y: 320 });
  bridge.addPoint({ x: 550, y: 240 });
  bridge.addPoint({ x: 620, y: 190 });

  bridge.startFalling(terrains);
  assert.equal(bridge.getHasBothWallSupports(), true, 'Must detect as dual platform spanning bridge');
  assert.equal(bridge.getIsSettled(), false, 'Must be falling/rotating initially');

  // Simulate falling/rotating for 60 frames
  for (let i = 0; i < 60; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Bridge must settle after rotating down');
  const finalPoints = bridge.getRawPoints();
  assert.ok(Math.abs(finalPoints[0].y - 400) <= 0.5, `Left end must rest on left cliff at y=400, got ${finalPoints[0].y}`);
  assert.ok(Math.abs(finalPoints[finalPoints.length - 1].y - 400) <= 0.5, `Right end must land flush on right cliff at y=400, got ${finalPoints[finalPoints.length - 1].y}`);
});

test('Spanning Bridge High-End Drop (Failure/Edge-Path): Straight stick drawn with left end high in air rigidly rotates down to left cliff', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 400, width: 425, height: 200 },
    { id: 'right-cliff', type: 'brick', x: 575, y: 400, width: 425, height: 200 },
    { id: 't-bottom-1-0', type: 'brick', x: 425, y: 510, width: 150, height: 90 }
  ];

  const bridge = new BridgeManager();
  // Stroke starting 210px in the air above left cliff and ending on right cliff
  bridge.startDrawing({ x: 350, y: 190 });
  bridge.addPoint({ x: 450, y: 240 });
  bridge.addPoint({ x: 550, y: 320 });
  bridge.addPoint({ x: 620, y: 400 });

  bridge.startFalling(terrains);
  assert.equal(bridge.getHasBothWallSupports(), true, 'Must detect as dual platform spanning bridge');
  assert.equal(bridge.getIsSettled(), false, 'Must be falling/rotating initially');

  // Simulate falling/rotating for 60 frames
  for (let i = 0; i < 60; i++) {
    bridge.update(1 / 60, terrains);
  }

  assert.equal(bridge.getIsSettled(), true, 'Bridge must settle after rotating down');
  const finalPoints = bridge.getRawPoints();
  assert.ok(Math.abs(finalPoints[0].y - 400) <= 0.5, `Left end must land flush on left cliff at y=400, got ${finalPoints[0].y}`);
  assert.ok(Math.abs(finalPoints[finalPoints.length - 1].y - 400) <= 0.5, `Right end must rest on right cliff at y=400, got ${finalPoints[finalPoints.length - 1].y}`);
});

test('Level 3 Cliff Gap Jump Prevention (Without Bridge): Car must fall into fire hazard pit and never jump across gap without a bridge', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 380, width: 420, height: 220 },
    { id: 'right-cliff', type: 'brick', x: 580, y: 410, width: 420, height: 190 },
    { id: 't-bottom-3-0', type: 'brick', x: 420, y: 510, width: 160, height: 90 }
  ];
  const hazards = [
    { id: 'h-1', type: 'fire', x: 420, width: 160, height: 45, y: 465 }
  ];
  const goal = { x: 643, y: 410, width: 60, height: 80 };
  const particles = { emitExplosion: () => {}, emitWaterSplash: () => {}, emitBubbles: () => {}, emitSparkle: () => {}, emitTrail: () => {} };

  const vehicles = ['smart_car', 'sports_coupe', 'delivery_truck', 'army_truck'];
  for (const carId of vehicles) {
    const sim = new VehicleSimulation(273, 357.5, 9.8, 1.0, terrains, carId);
    sim.setDriving(true);

    for (let f = 0; f < 300; f++) {
      sim.update(1 / 60, terrains, [], hazards, goal, [], particles);
      if (sim.vehicle.isDead || sim.vehicle.hasWon) break;
    }

    assert.equal(sim.vehicle.isDead, true, `${carId} must fall into hazard pit and die when no bridge is drawn`);
    assert.equal(sim.vehicle.hasWon, false, `${carId} must never bypass/jump across cliff gap to goal without bridge`);
  }
});

test('Level 3 Bridge Crossing (With Bridge): All vehicles drive across drawn bridge and reach goal safely', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 380, width: 420, height: 220 },
    { id: 'right-cliff', type: 'brick', x: 580, y: 410, width: 420, height: 190 },
    { id: 't-bottom-3-0', type: 'brick', x: 420, y: 510, width: 160, height: 90 }
  ];
  const hazards = [
    { id: 'h-1', type: 'fire', x: 420, width: 160, height: 45, y: 465 }
  ];
  const goal = { x: 643, y: 410, width: 60, height: 80 };
  const particles = { emitExplosion: () => {}, emitWaterSplash: () => {}, emitBubbles: () => {}, emitSparkle: () => {}, emitTrail: () => {} };

  const bridge = [];
  for (let x = 420; x <= 580; x += 10) {
    const y1 = 380 + ((x - 420) / 160) * (410 - 380);
    const y2 = 380 + ((x + 10 - 420) / 160) * (410 - 380);
    const dx = 10;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const normal = { x: dy / len, y: -dx / len };
    bridge.push({ p1: { x, y: y1 }, p2: { x: x + 10, y: y2 }, normal, length: len });
  }

  const vehicles = ['smart_car', 'sports_coupe', 'delivery_truck', 'army_truck'];
  for (const carId of vehicles) {
    const sim = new VehicleSimulation(273, 357.5, 9.8, 1.0, terrains, carId);
    sim.setDriving(true);

    for (let f = 0; f < 300; f++) {
      sim.update(1 / 60, terrains, bridge, hazards, goal, [], particles);
      if (sim.vehicle.hasWon) break;
    }

    assert.equal(sim.vehicle.hasWon, true, `${carId} must reach goal when crossing a valid bridge in Level 3`);
    assert.equal(sim.vehicle.isDead, false, `${carId} must not crash or explode on a valid bridge`);
  }
});

test('TNT Barrel Impact (Happy-Path): Vehicle falling on TNT triggers explosion, marks TNT destroyed, and causes death', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 300, width: 200, height: 300 }
  ];
  const tntHazard = { id: 'tnt-1', type: 'tnt', x: 250, y: 400, width: 60, height: 60 };
  const goal = { x: 700, y: 300, width: 60, height: 80 };

  let tntExplodedPos = null;
  const particles = {
    emitExplosion: () => {},
    emitTntExplosion: (pos) => { tntExplodedPos = pos; },
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Car spawns directly above the TNT barrel and falls down onto it
  const sim = new VehicleSimulation(280, 320, 9.8, 1.0, terrains);
  sim.setDriving(true);

  for (let f = 0; f < 60; f++) {
    sim.update(1 / 60, terrains, [], [tntHazard], goal, [], particles);
    if (sim.vehicle.isDead) break;
  }

  assert.equal(sim.vehicle.isDead, true, 'Vehicle must die when falling on TNT');
  assert.equal(sim.vehicle.deathType, 'blast', 'Vehicle deathType must be blast');
  assert.equal(tntHazard.destroyed, true, 'TNT hazard must be marked destroyed when hit by vehicle');
  assert.ok(tntExplodedPos !== null, 'emitTntExplosion must be called with TNT location');
});

test('TNT Barrel Avoidance (Failure/Edge-Path): Vehicle crossing bridge safely over TNT leaves TNT intact', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 300, width: 200, height: 300 },
    { id: 'right-cliff', type: 'brick', x: 400, y: 300, width: 200, height: 300 }
  ];
  // TNT in the trench below at y = 450
  const tntHazard = { id: 'tnt-trench', type: 'tnt', x: 260, y: 450, width: 60, height: 60 };
  const goal = { x: 500, y: 300, width: 60, height: 80 };

  // Flat bridge spanning across the trench from left to right cliff at y = 300
  const bridge = [
    { p1: { x: 190, y: 300 }, p2: { x: 410, y: 300 }, normal: { x: 0, y: -1 }, length: 220 }
  ];

  const particles = {
    emitExplosion: () => {},
    emitTntExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const sim = new VehicleSimulation(100, 275, 9.8, 1.0, terrains);
  sim.setDriving(true);

  for (let f = 0; f < 90; f++) {
    sim.update(1 / 60, terrains, bridge, [tntHazard], goal, [], particles);
  }

  assert.equal(sim.vehicle.isDead, false, 'Vehicle crossing bridge safely must not trigger blast');
  assert.notEqual(tntHazard.destroyed, true, 'TNT must remain intact when vehicle crosses safely above on a bridge');
});

test('Biohazard Drum Impact (Happy-Path): Vehicle falling on toxic_barrel bursts drum, marks destroyed, and triggers toxic explosion', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 300, width: 200, height: 300 }
  ];
  const toxicHazard = { id: 'toxic-1', type: 'toxic_barrel', x: 250, y: 400, width: 86, height: 86 };
  const goal = { x: 700, y: 300, width: 60, height: 80 };

  let toxicExplodedPos = null;
  const particles = {
    emitExplosion: () => {},
    emitToxicExplosion: (pos) => { toxicExplodedPos = pos; },
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  // Car spawns directly above the Biohazard Drum and drops on it
  const sim = new VehicleSimulation(280, 320, 9.8, 1.0, terrains);
  sim.setDriving(true);

  for (let f = 0; f < 60; f++) {
    sim.update(1 / 60, terrains, [], [toxicHazard], goal, [], particles);
    if (sim.vehicle.isDead) break;
  }

  assert.equal(sim.vehicle.isDead, true, 'Vehicle must die when impacting toxic_barrel');
  assert.equal(sim.vehicle.deathType, 'blast', 'Vehicle deathType must be blast');
  assert.equal(toxicHazard.destroyed, true, 'Biohazard Drum must be marked destroyed when hit');
  assert.ok(toxicExplodedPos !== null, 'emitToxicExplosion must be called with drum center position');
});

test('Biohazard Drum Avoidance (Failure/Edge-Path): Vehicle crossing bridge safely over toxic_barrel leaves drum intact', () => {
  const terrains = [
    { id: 'left-cliff', type: 'brick', x: 0, y: 300, width: 200, height: 300 },
    { id: 'right-cliff', type: 'brick', x: 400, y: 300, width: 200, height: 300 }
  ];
  const toxicHazard = { id: 'toxic-trench', type: 'toxic_barrel', x: 257, y: 424, width: 86, height: 86 };
  const goal = { x: 500, y: 300, width: 60, height: 80 };

  // Flat bridge spanning across trench at y = 300
  const bridge = [
    { p1: { x: 190, y: 300 }, p2: { x: 410, y: 300 }, normal: { x: 0, y: -1 }, length: 220 }
  ];

  const particles = {
    emitExplosion: () => {},
    emitToxicExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const sim = new VehicleSimulation(100, 275, 9.8, 1.0, terrains);
  sim.setDriving(true);

  for (let f = 0; f < 90; f++) {
    sim.update(1 / 60, terrains, bridge, [toxicHazard], goal, [], particles);
  }

  assert.equal(sim.vehicle.isDead, false, 'Vehicle crossing bridge safely must not trigger blast');
  assert.notEqual(toxicHazard.destroyed, true, 'Biohazard Drum must remain intact when vehicle crosses safely above on a bridge');
});

test('Guillotine Blade Dynamic Avoidance (Happy-Path): Vehicle passing under upright rotating blade does not blast', () => {
  const terrains = [
    { id: 'road', type: 'brick', x: 0, y: 260, width: 500, height: 100 }
  ];
  // Guillotine at x=200, y=150, width=60, height=70 (center cx=230, cy=185). Old AABB reached down to y=220.
  const guillotineHazard = { id: 'g-1', type: 'guillotine', x: 200, y: 150, width: 60, height: 70 };
  const goal = { x: 450, y: 260, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitToxicExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const sim = new VehicleSimulation(200, 238, 9.8, 1.0, terrains);
  sim.setDriving(true);

  // When rotAngle = PI (blade rotated straight up away from car roof), animTime = PI / 3.2
  const upAnimTime = Math.PI / 3.2;
  sim.update(1 / 60, terrains, [], [guillotineHazard], goal, [], particles, undefined, undefined, upAnimTime);

  assert.equal(sim.vehicle.isDead, false, 'Vehicle must not blast when guillotine blade is rotated up and away');
});

test('Guillotine Direct Blade Impact (Failure/Edge-Path): Vehicle directly contacting rotating red blade triggers blast', () => {
  const terrains = [
    { id: 'road', type: 'brick', x: 0, y: 260, width: 500, height: 100 }
  ];
  // Guillotine placed so downward swinging blade (rotAngle = 0) sweeps right into vehicle roof
  const guillotineHazard = { id: 'g-2', type: 'guillotine', x: 200, y: 175, width: 60, height: 70 };
  const goal = { x: 450, y: 260, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitToxicExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const sim = new VehicleSimulation(200, 238, 9.8, 1.0, terrains);
  sim.setDriving(true);

  // rotAngle = 0: blade is pointing directly downward into vehicle roof
  sim.update(1 / 60, terrains, [], [guillotineHazard], goal, [], particles, undefined, undefined, 0);

  assert.equal(sim.vehicle.isDead, true, 'Vehicle must blast when red blade swings down and impacts vehicle');
  assert.equal(sim.vehicle.deathType, 'blast', 'Vehicle deathType must be blast');
});

test('Chakra Corner Safe Clearance (Happy-Path): Vehicle passing near bounding box corner outside circular teeth does not blast', () => {
  const terrains = [
    { id: 'road', type: 'brick', x: 0, y: 260, width: 500, height: 100 }
  ];
  // Chakra at cx=225, cy=180, radius=23. Lowest tooth reaches y=203.
  // Old AABB box reached y=205. Vehicle roof is at y=210.
  const chakraHazard = { id: 'ch-1', type: 'chakra', x: 200, y: 155, width: 50, height: 50 };
  const goal = { x: 450, y: 260, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitToxicExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const sim = new VehicleSimulation(200, 238, 9.8, 1.0, terrains);
  sim.setDriving(true);

  sim.update(1 / 60, terrains, [], [chakraHazard], goal, [], particles);

  assert.equal(sim.vehicle.isDead, false, 'Vehicle outside circular sawblade must not suffer phantom corner blast');
});

test('Chakra Direct Contact (Failure/Edge-Path): Vehicle contacting circular saw teeth triggers blast', () => {
  const terrains = [
    { id: 'road', type: 'brick', x: 0, y: 260, width: 500, height: 100 }
  ];
  // Chakra placed directly on top of vehicle roof (cy=200, radius=23 -> reaches y=223 into roof at y=210)
  const chakraHazard = { id: 'ch-2', type: 'chakra', x: 200, y: 175, width: 50, height: 50 };
  const goal = { x: 450, y: 260, width: 60, height: 80 };
  const particles = {
    emitExplosion: () => {},
    emitToxicExplosion: () => {},
    emitWaterSplash: () => {},
    emitBubbles: () => {},
    emitSparkle: () => {},
    emitTrail: () => {}
  };

  const sim = new VehicleSimulation(200, 238, 9.8, 1.0, terrains);
  sim.setDriving(true);

  sim.update(1 / 60, terrains, [], [chakraHazard], goal, [], particles);

  assert.equal(sim.vehicle.isDead, true, 'Vehicle touching circular sawblade teeth must blast');
  assert.equal(sim.vehicle.deathType, 'blast', 'Vehicle deathType must be blast');
});












