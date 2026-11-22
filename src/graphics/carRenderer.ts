import type { Vehicle, Wheel } from "../types/physics";
import { assetManager } from "../services/assetManager.ts";

interface CarSkinAssets {
  body: HTMLImageElement;
  wheel: HTMLImageElement;
}

const CAR_SKIN_PATHS: Record<string, { body: string; wheel: string }> = {
  smart_car: {
    body: "./vehicles/blue_coupe_body.png",
    wheel: "./vehicles/blue_coupe_wheel.png"
  },
  sports_coupe: {
    body: "./vehicles/sports_coupe_body.png",
    wheel: "./vehicles/sports_coupe_wheel.png"
  },
  delivery_truck: {
    body: "./vehicles/delivery_truck_body.png",
    wheel: "./vehicles/delivery_truck_wheel.png"
  },
  army_truck: {
    body: "./vehicles/army_truck_body.png",
    wheel: "./vehicles/army_truck_wheel.png"
  },
  dirt_bike: {
    body: "./vehicles/dirt_bike_body.png",
    wheel: "./vehicles/dirt_bike_wheel.png"
  },
  super_bike: {
    body: "./vehicles/super_bike_body.png",
    wheel: "./vehicles/super_bike_wheel.png"
  }
};

const skinCache = new Map<string, CarSkinAssets>();

export function getCarSkin(carId: string): CarSkinAssets | null {
  if (typeof window === "undefined") return null;

  const key = CAR_SKIN_PATHS[carId] ? carId : "smart_car";
  if (skinCache.has(key)) {
    return skinCache.get(key)!;
  }

  const preloaded = assetManager.getVehicleSkin(key);
  if (preloaded) {
    skinCache.set(key, preloaded);
    return preloaded;
  }

  const paths = CAR_SKIN_PATHS[key];
  const body = new Image();
  body.src = paths.body;

  const wheel = new Image();
  wheel.src = paths.wheel;

  const assets: CarSkinAssets = { body, wheel };
  skinCache.set(key, assets);
  return assets;
}

// Preload assets for known cars
if (typeof window !== "undefined") {
  Object.keys(CAR_SKIN_PATHS).forEach((id) => getCarSkin(id));
}

/**
 * Draws the rotating wheel with no halo/fringe
 */
function renderWheel(
  ctx: CanvasRenderingContext2D,
  wheel: Wheel,
  wheelImage: HTMLImageElement | null,
  scaleMultiplier: number = 1.0
): void {
  const { position, radius, angle } = wheel;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(angle);

  if (wheelImage && wheelImage.complete && wheelImage.naturalWidth > 0) {
    const size = radius * 2.0 * scaleMultiplier;
    ctx.drawImage(wheelImage, -size / 2, -size / 2, size, size);
  } else {
    const renderedRadius = radius * scaleMultiplier;
    // Fallback procedural rim
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(0, 0, renderedRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.arc(0, 0, renderedRadius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.arc(0, 0, renderedRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

import { getVehicleSpec } from "../config/vehicleSpecs.ts";
import { computeAxleMounts } from "../engine/vehicleFactory.ts";

/**
 * Draws the vehicle body and rotating wheels with exact preview alignment
 */
export function renderVehicle(
  ctx: CanvasRenderingContext2D,
  vehicle: Vehicle,
  carId: string = "army_truck",
  scaleMultiplier: number = 1.2
): void {
  // Blast destroys car completely ("car gayab")
  if (vehicle.isDead && vehicle.deathType === "blast") {
    return;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Sinking in water fades car out smoothly
  if (vehicle.isDead && vehicle.deathType === "drown") {
    const timer = vehicle.deathTimer || 0;
    const alpha = Math.max(0, 1 - timer / 1.1);
    ctx.globalAlpha = alpha;
  }

  const skin = getCarSkin(carId);
  const bodyImage = skin?.body || null;
  const wheelImage = skin?.wheel || null;
  const spec = getVehicleSpec(carId);

  const isBike = carId === "dirt_bike" || carId === "super_bike";

  const vScale = vehicle.width / spec.baseWidth || 1.0;
  const mounts = computeAxleMounts(vehicle, vScale, carId);

  const drawWheels = () => {
    // Keep wheels strictly mounted to chassis axle positions so they never visually detach
    const rearWheel = { ...vehicle.wheels[0], position: mounts.rear.mount };
    const frontWheel = { ...vehicle.wheels[1], position: mounts.front.mount };
    const wheelRenderScale = spec.wheelScale * (isBike ? scaleMultiplier : 1);
    renderWheel(ctx, rearWheel, wheelImage, wheelRenderScale); // Rear wheel
    renderWheel(ctx, frontWheel, wheelImage, wheelRenderScale); // Front wheel
  };

  const drawBody = () => {
    ctx.save();
    ctx.translate(vehicle.position.x, vehicle.position.y);
    ctx.rotate(vehicle.angle);

    const w = vehicle.width * spec.widthMultiplier * scaleMultiplier;
    const h = vehicle.height * spec.heightMultiplier * scaleMultiplier;

    if (bodyImage && bodyImage.complete && bodyImage.naturalWidth > 0) {
      ctx.drawImage(
        bodyImage,
        -w / 2 + spec.bodyOffsetX * scaleMultiplier * vScale,
        -h / 2 + spec.bodyOffsetY * scaleMultiplier * vScale,
        w,
        h
      );
    } else {
      // Fallback while image loads
      ctx.fillStyle =
        carId === "sports_coupe"
          ? "#ef4444"
          : carId === "delivery_truck"
            ? "#f59e0b"
            : carId === "army_truck"
              ? "#4d7c0f"
              : "#dc2626";
      ctx.beginPath();
      ctx.roundRect(
        -w / 2 + spec.bodyOffsetX * scaleMultiplier,
        -h / 2 + spec.bodyOffsetY * scaleMultiplier,
        w,
        h * 0.75,
        8
      );
      ctx.fill();
    }

    ctx.restore();
  };

  if (isBike) {
    // For bikes: wheels rendered underneath, chassis body on top
    drawWheels();
    drawBody();
  } else {
    // For cars: chassis body underneath, wheels rendered on top
    drawBody();
    drawWheels();
  }

  ctx.restore();
}
