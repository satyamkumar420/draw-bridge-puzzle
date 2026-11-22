export interface VehicleSpec {
  id: string;
  name: string;
  baseWidth: number;
  baseHeight: number;
  widthMultiplier: number;
  heightMultiplier: number;
  bodyOffsetX: number;
  bodyOffsetY: number;
  rearAxle: { x: number; y: number };
  frontAxle: { x: number; y: number };
  wheelRadius: number;
  wheelScale: number;
  restYOffset: number;
}

export const VEHICLE_SPECS: Record<string, VehicleSpec> = {
  smart_car: {
    id: 'smart_car',
    name: 'Smart Hatch',
    baseWidth: 80.0,
    baseHeight: 44.0,
    widthMultiplier: 1.0,
    heightMultiplier: 1.0,
    bodyOffsetX: 0.0,
    bodyOffsetY: 0.0,
    rearAxle: { x: -34.1, y: 12.1 },
    frontAxle: { x: 28.6, y: 12.1 },
    wheelRadius: 10.4,
    wheelScale: 1.0,
    restYOffset: 22.5
  },
  sports_coupe: {
    id: 'sports_coupe',
    name: 'Velocity Coupe',
    baseWidth: 80.0,
    baseHeight: 44.0,
    widthMultiplier: 1.0,
    heightMultiplier: 1.0,
    bodyOffsetX: 0.0,
    bodyOffsetY: 0.0,
    rearAxle: { x: -26.64, y: 14.48 },
    frontAxle: { x: 24.38, y: 14.48 },
    wheelRadius: 9.0,
    wheelScale: 1.0,
    restYOffset: 23.48
  },
  delivery_truck: {
    id: 'delivery_truck',
    name: 'Mini Hauler',
    baseWidth: 80.0,
    baseHeight: 44.0,
    widthMultiplier: 81.46 / 80.0,
    heightMultiplier: 45.08 / 44.0,
    bodyOffsetX: -1.0,
    bodyOffsetY: -3.8,
    rearAxle: { x: -32.2, y: 11.2 },
    frontAxle: { x: 31.6, y: 11.2 },
    wheelRadius: 9.8,
    wheelScale: 1.0,
    restYOffset: 21.0
  },
  army_truck: {
    id: 'army_truck',
    name: 'Army Hauler',
    baseWidth: 80.0,
    baseHeight: 44.0,
    widthMultiplier: 98.42 / 80.0,
    heightMultiplier: 54.93 / 44.0,
    bodyOffsetX: 1.32,
    bodyOffsetY: -9.0,
    rearAxle: { x: -30.6, y: 12.3 },
    frontAxle: { x: 33.1, y: 12.3 },
    wheelRadius: 10.5,
    wheelScale: 1.0,
    restYOffset: 22.8
  },
  dirt_bike: {
    id: 'dirt_bike',
    name: 'Dirt Runner',
    baseWidth: 80.0,
    baseHeight: 44.0,
    widthMultiplier: 1.0,
    heightMultiplier: 1.0,
    bodyOffsetX: 0.0,
    bodyOffsetY: 0.0,
    rearAxle: { x: -26.87, y: 12.57 },
    frontAxle: { x: 26.84, y: 12.57 },
    wheelRadius: 13.5,
    wheelScale: 1.0,
    restYOffset: 26.07
  },
  super_bike: {
    id: 'super_bike',
    name: 'Apex Racer',
    baseWidth: 80.0,
    baseHeight: 44.0,
    widthMultiplier: 1.0,
    heightMultiplier: 1.0,
    bodyOffsetX: 0.0,
    bodyOffsetY: 0.0,
    rearAxle: { x: -26.89, y: 9.46 },
    frontAxle: { x: 26.85, y: 9.46 },
    wheelRadius: 13.03,
    wheelScale: 1.0,
    restYOffset: 22.49
  }
};

export function getVehicleSpec(carId?: string): VehicleSpec {
  if (carId && VEHICLE_SPECS[carId]) {
    return VEHICLE_SPECS[carId];
  }
  return VEHICLE_SPECS.smart_car;
}
