import type { HazardType } from './level';

export type EditorTool =
  | 'select'
  | 'terrain'
  | 'tools'
  | 'hazard-spikes'
  | 'hazard-water'
  | 'hazard-chakra'
  | 'hazard-fire'
  | 'hazard-laser'
  | 'hazard-tnt'
  | 'hazard-crusher'
  | 'hazard-acid'
  | 'hazard-tesla'
  | 'hazard-plasma'
  | 'hazard-meteor'
  | 'hazard-stalactite'
  | 'hazard-toxic_barrel'
  | 'hazard-guillotine'
  | 'hazard-ice_spikes'
  | 'hazard-blackhole'
  | 'hazard-wrecking_ball'
  | 'hazard-mine'
  | 'spawn'
  | 'goal'
  | 'background';

export type SelectedObjectType = 'terrain' | 'hazard' | 'spawn' | 'goal' | 'coin';

export interface SelectedObjectRef {
  type: SelectedObjectType;
  id?: string;
}

export interface EditorSettings {
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  currentHazardType: HazardType;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  mode: 'move' | 'resize-se' | 'create';
}
