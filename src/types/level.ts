export type HazardType =
  | 'spikes'
  | 'pit'
  | 'water'
  | 'chakra'
  | 'fire'
  | 'laser'
  | 'tnt'
  | 'crusher'
  | 'acid'
  | 'tesla'
  | 'plasma'
  | 'meteor'
  | 'stalactite'
  | 'toxic_barrel'
  | 'guillotine'
  | 'ice_spikes'
  | 'blackhole'
  | 'wrecking_ball'
  | 'mine';
export type WallTheme =
  | 'brick-red'
  | 'stone-gray'
  | 'stone-grey'
  | 'moss-green'
  | 'desert-sand'
  | 'sand-yellow'
  | 'cyber-blue'
  | 'magma-orange'
  | 'ice-cyan'
  | 'dark-slate'
  | 'dark-obsidian'
  | 'light-silver'
  | 'silver-light'
  | 'gold-metal';

export type SkyThemeId =
  | 'azure-noon'
  | 'sunset-glow'
  | 'midnight-nebula'
  | 'dawn-aurora'
  | 'cherry-blossom'
  | 'desert-mirage'
  | 'stormy-tempest'
  | 'glacier-ice'
  | 'volcanic-ember'
  | 'deep-space'
  | 'tropical-emerald';

export interface TerrainBlock {
  id: string;
  type: 'brick';
  theme?: WallTheme;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HazardMovement {
  axis: 'horizontal' | 'vertical';
  distance: number;
  speed: number;
  phase?: number;
}

export interface HazardBlock {
  id: string;
  type: HazardType;
  x: number;
  y: number;
  width: number;
  height: number;
  destroyed?: boolean;
  movement?: HazardMovement;
  currentX?: number;
  currentY?: number;
}

export interface CoinItem {
  id: string;
  x: number;
  y: number;
  collected?: boolean;
}

export interface SpawnPoint {
  x: number;
  y: number;
  angle?: number;
}

export interface GoalArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PenColorId =
  | 'black'
  | 'red'
  | 'white'
  | 'yellow'
  | 'green'
  | 'cyan';

export interface LevelData {
  id: string;
  name: string;
  description?: string;
  gravity: number;
  spawn: SpawnPoint;
  goal: GoalArea;
  terrains: TerrainBlock[];
  hazards: HazardBlock[];
  coins: CoinItem[];
  skyTheme?: SkyThemeId;
  wallTheme?: WallTheme;
  penColor?: PenColorId;
}
