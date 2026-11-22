import type { PenColorId } from '../types/level';
import { GAME_CONFIG } from './constants.ts';

export interface PenColorDefinition {
  id: PenColorId;
  name: string;
  color: string;
  border: string;
  accent: string;
  description: string;
}

export const DEFAULT_PEN_COLOR_ID: PenColorId = 'black';

export const PEN_COLORS: Record<PenColorId, PenColorDefinition> = {
  black: {
    id: 'black',
    name: 'Black',
    color: '#111827',
    border: '#374151',
    accent: '#0f172a',
    description: 'Classic bold graphite'
  },
  red: {
    id: 'red',
    name: 'Red',
    color: '#ef4444',
    border: '#b91c1c',
    accent: '#991b1b',
    description: 'Vibrant ruby red'
  },
  white: {
    id: 'white',
    name: 'White',
    color: '#ffffff',
    border: '#cbd5e1',
    accent: '#94a3b8',
    description: 'Bright chalk white'
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow',
    color: '#facc15',
    border: '#ca8a04',
    accent: '#a16207',
    description: 'Electric bright yellow'
  },
  green: {
    id: 'green',
    name: 'Green',
    color: '#22c55e',
    border: '#15803d',
    accent: '#166534',
    description: 'Radioactive green'
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan',
    color: '#06b6d4',
    border: '#0e7490',
    accent: '#155e75',
    description: 'Arcade laser cyan'
  }
};

export function getPenColor(id?: PenColorId): string {
  if (id && PEN_COLORS[id]) {
    return PEN_COLORS[id].color;
  }
  return GAME_CONFIG.COLORS.BRIDGE_LINE;
}
