import type { HazardType } from '../types/level';
import type { EditorTool } from '../types/editor';

export interface ObstacleToolDef {
  id: string;
  name: string;
  hazardType: HazardType;
  editorTool: EditorTool;
  category: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  accentColor: string;
  badge: string;
}

export const OBSTACLE_TOOLS: ObstacleToolDef[] = [
  {
    id: 'chakra',
    name: 'Chakra (Sawblade)',
    hazardType: 'chakra',
    editorTool: 'hazard-chakra',
    category: 'Rotary Cutter',
    description: 'High-speed spinning circular steel sawblade with razor teeth.',
    defaultWidth: 50,
    defaultHeight: 50,
    accentColor: '#38bdf8',
    badge: 'CHAKRA'
  },
  {
    id: 'fire',
    name: 'Fire Flame',
    hazardType: 'fire',
    editorTool: 'hazard-fire',
    category: 'Flame Jet',
    description: 'Blazing flamethrower burner jet shooting intense fire plumes.',
    defaultWidth: 60,
    defaultHeight: 50,
    accentColor: '#f97316',
    badge: 'FIRE'
  },
  {
    id: 'laser',
    name: 'Laser Beam',
    hazardType: 'laser',
    editorTool: 'hazard-laser',
    category: 'Electric Zap',
    description: 'High-voltage plasma beam pulsing between twin metallic pylons.',
    defaultWidth: 80,
    defaultHeight: 40,
    accentColor: '#06b6d4',
    badge: 'LASER'
  },
  {
    id: 'tnt',
    name: 'TNT Barrel',
    hazardType: 'tnt',
    editorTool: 'hazard-tnt',
    category: 'Explosive Mine',
    description: 'Pressurized gunpowder barrel with danger stripes & active fuse.',
    defaultWidth: 45,
    defaultHeight: 45,
    accentColor: '#ef4444',
    badge: 'TNT'
  },
  {
    id: 'crusher',
    name: 'Spike Crusher',
    hazardType: 'crusher',
    editorTool: 'hazard-crusher',
    category: 'Heavy Trap',
    description: 'Cast-iron hydraulic stomper hammer with upward razor sharp steel spikes.',
    defaultWidth: 70,
    defaultHeight: 60,
    accentColor: '#a855f7',
    badge: 'CRUSHER'
  },
  {
    id: 'spikes',
    name: 'Ground Spikes',
    hazardType: 'spikes',
    editorTool: 'hazard-spikes',
    category: 'Classic Trap',
    description: 'Row of razor-sharp steel spikes protruding from the surface.',
    defaultWidth: 80,
    defaultHeight: 30,
    accentColor: '#fda4af',
    badge: 'SPIKES'
  },
  {
    id: 'water',
    name: 'Water Pit',
    hazardType: 'water',
    editorTool: 'hazard-water',
    category: 'Liquid Hazard',
    description: 'Deep toxic water chasm where the car instantly sinks & drowns.',
    defaultWidth: 120,
    defaultHeight: 60,
    accentColor: '#0284c7',
    badge: 'WATER'
  },
  {
    id: 'acid',
    name: 'Acid Cauldron',
    hazardType: 'acid',
    editorTool: 'hazard-acid',
    category: 'Corrosive Pool',
    description: 'Bubbling bright-green corrosive acid pool that dissolves vehicles.',
    defaultWidth: 100,
    defaultHeight: 45,
    accentColor: '#22c55e',
    badge: 'ACID'
  },
  {
    id: 'tesla',
    name: 'Tesla Zap Coil',
    hazardType: 'tesla',
    editorTool: 'hazard-tesla',
    category: 'High Voltage',
    description: 'Electrified magnetic coil emitting lethal blue spark discharges.',
    defaultWidth: 50,
    defaultHeight: 65,
    accentColor: '#3b82f6',
    badge: 'TESLA'
  },
  {
    id: 'plasma',
    name: 'Plasma Core',
    hazardType: 'plasma',
    editorTool: 'hazard-plasma',
    category: 'Energy Anomaly',
    description: 'Swirling magenta plasma orb pulsating with unstable dark energy.',
    defaultWidth: 86,
    defaultHeight: 86,
    accentColor: '#ec4899',
    badge: 'PLASMA'
  },
  {
    id: 'meteor',
    name: 'Magma Meteor',
    hazardType: 'meteor',
    editorTool: 'hazard-meteor',
    category: 'Volcanic Hazard',
    description: 'Blazing incandescent molten rock surrounded by fiery volcanic ash.',
    defaultWidth: 55,
    defaultHeight: 55,
    accentColor: '#ea580c',
    badge: 'METEOR'
  },
  {
    id: 'stalactite',
    name: 'Rock Stalagmite',
    hazardType: 'stalactite',
    editorTool: 'hazard-stalactite',
    category: 'Ground Hazard',
    description: 'Sharp upward-rising rocky stalagmites and mineral spires.',
    defaultWidth: 70,
    defaultHeight: 50,
    accentColor: '#94a3b8',
    badge: 'SPIRE'
  },
  {
    id: 'toxic_barrel',
    name: 'Biohazard Drum',
    hazardType: 'toxic_barrel',
    editorTool: 'hazard-toxic_barrel',
    category: 'Nuclear Waste',
    description: 'Radioactive toxic waste barrel leaking glowing nuclear sludge.',
    defaultWidth: 86,
    defaultHeight: 86,
    accentColor: '#84cc16',
    badge: 'TOXIC'
  },
  {
    id: 'guillotine',
    name: 'Pendulum Blade',
    hazardType: 'guillotine',
    editorTool: 'hazard-guillotine',
    category: 'Heavy Trap',
    description: 'Swinging overhead razor-sharp steel pendulum execution blade.',
    defaultWidth: 60,
    defaultHeight: 70,
    accentColor: '#e11d48',
    badge: 'BLADE'
  },
  {
    id: 'ice_spikes',
    name: 'Cryo Glacier Spikes',
    hazardType: 'ice_spikes',
    editorTool: 'hazard-ice_spikes',
    category: 'Glacial Hazard',
    description: 'Piercing sub-zero translucent frost shards and ice crystal spikes.',
    defaultWidth: 80,
    defaultHeight: 35,
    accentColor: '#38bdf8',
    badge: 'CRYO'
  },
  {
    id: 'blackhole',
    name: 'Dark Singularity',
    hazardType: 'blackhole',
    editorTool: 'hazard-blackhole',
    category: 'Cosmic Anomaly',
    description: 'Swirling gravity void that pulls and annihilates any chassis on contact.',
    defaultWidth: 55,
    defaultHeight: 55,
    accentColor: '#8b5cf6',
    badge: 'VOID'
  },
  {
    id: 'wrecking_ball',
    name: 'Wrecking Ball',
    hazardType: 'wrecking_ball',
    editorTool: 'hazard-wrecking_ball',
    category: 'Demolition Mace',
    description: 'Massive spiked cast-iron demolition wrecking ball hanging from chains.',
    defaultWidth: 55,
    defaultHeight: 65,
    accentColor: '#64748b',
    badge: 'MACE'
  },
  {
    id: 'mine',
    name: 'Naval Proximity Mine',
    hazardType: 'mine',
    editorTool: 'hazard-mine',
    category: 'Explosive Trap',
    description: 'Spiked explosive sea mine with flashing red contact detonator horns.',
    defaultWidth: 48,
    defaultHeight: 48,
    accentColor: '#dc2626',
    badge: 'MINE'
  }
];

export function getObstacleToolByHazard(type: HazardType): ObstacleToolDef | undefined {
  return OBSTACLE_TOOLS.find((t) => t.hazardType === type);
}

export function getObstacleToolByEditorTool(tool: EditorTool): ObstacleToolDef | undefined {
  return OBSTACLE_TOOLS.find((t) => t.editorTool === tool);
}
