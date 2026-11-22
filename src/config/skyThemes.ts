import type { SkyThemeId } from '../types/level';

export interface SkyTheme {
  id: SkyThemeId;
  name: string;
  category: 'Day' | 'Sunset' | 'Night' | 'Exotic' | 'Nature';
  badge: string;
  skyTop: string;
  skyMiddle?: string;
  skyBottom: string;
  ambientGlow: string;
  ambientLight: string;
  ambientBottom: string;
  ambientDark: string;
  accentColor: string;
  description: string;
}

export const SKY_THEMES: Record<SkyThemeId, SkyTheme> = {
  'azure-noon': {
    id: 'azure-noon',
    name: 'Azure Noon',
    category: 'Day',
    badge: 'CLEAR SKY',
    skyTop: '#38bdf8',
    skyMiddle: '#67e8f9',
    skyBottom: '#bae6fd',
    ambientGlow: 'rgba(56, 189, 248, 0.35)',
    ambientLight: 'rgba(103, 232, 249, 0.28)',
    ambientBottom: 'rgba(186, 230, 253, 0.3)',
    ambientDark: '#0ea5e9',
    accentColor: '#38bdf8',
    description: 'Crisp classic sunny arcade atmosphere'
  },
  'sunset-glow': {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    category: 'Sunset',
    badge: 'GOLDEN HOUR',
    skyTop: '#ea580c',
    skyMiddle: '#f59e0b',
    skyBottom: '#fef08a',
    ambientGlow: 'rgba(245, 158, 11, 0.4)',
    ambientLight: 'rgba(254, 240, 138, 0.34)',
    ambientBottom: 'rgba(254, 215, 170, 0.3)',
    ambientDark: '#c2410c',
    accentColor: '#f59e0b',
    description: 'Blazing golden sunset with warm amber horizons'
  },
  'midnight-nebula': {
    id: 'midnight-nebula',
    name: 'Midnight Nebula',
    category: 'Night',
    badge: 'COSMIC',
    skyTop: '#818cf8',
    skyMiddle: '#a5b4fc',
    skyBottom: '#e0e7ff',
    ambientGlow: 'rgba(129, 140, 248, 0.38)',
    ambientLight: 'rgba(165, 180, 252, 0.34)',
    ambientBottom: 'rgba(224, 231, 255, 0.32)',
    ambientDark: '#6366f1',
    accentColor: '#818cf8',
    description: 'Deep starlight void with cosmic aurora'
  },
  'dawn-aurora': {
    id: 'dawn-aurora',
    name: 'Dawn Aurora',
    category: 'Nature',
    badge: 'BOREALIS',
    skyTop: '#10b981',
    skyMiddle: '#6ee7b7',
    skyBottom: '#d1fae5',
    ambientGlow: 'rgba(16, 185, 129, 0.38)',
    ambientLight: 'rgba(110, 231, 183, 0.34)',
    ambientBottom: 'rgba(209, 250, 229, 0.3)',
    ambientDark: '#059669',
    accentColor: '#34d399',
    description: 'Luminous green northern lights dawn'
  },
  'cherry-blossom': {
    id: 'cherry-blossom',
    name: 'Twilight Dusk',
    category: 'Sunset',
    badge: 'TWILIGHT',
    skyTop: '#4338ca',
    skyMiddle: '#6366f1',
    skyBottom: '#c7d2fe',
    ambientGlow: 'rgba(99, 102, 241, 0.38)',
    ambientLight: 'rgba(199, 210, 254, 0.34)',
    ambientBottom: 'rgba(224, 231, 255, 0.3)',
    ambientDark: '#3730a3',
    accentColor: '#818cf8',
    description: 'Tranquil twilight dusk with deep indigo and periwinkle horizons'
  },
  'desert-mirage': {
    id: 'desert-mirage',
    name: 'Desert Mirage',
    category: 'Exotic',
    badge: 'CANYON',
    skyTop: '#f97316',
    skyMiddle: '#fdba74',
    skyBottom: '#ffedd5',
    ambientGlow: 'rgba(249, 115, 22, 0.4)',
    ambientLight: 'rgba(255, 237, 213, 0.36)',
    ambientBottom: 'rgba(254, 215, 170, 0.3)',
    ambientDark: '#ea580c',
    accentColor: '#fb923c',
    description: 'Warm sandy dunes under blazing sunshine'
  },
  'stormy-tempest': {
    id: 'stormy-tempest',
    name: 'Stormy Tempest',
    category: 'Nature',
    badge: 'THUNDER',
    skyTop: '#0f766e',
    skyMiddle: '#2dd4bf',
    skyBottom: '#ccfbf1',
    ambientGlow: 'rgba(20, 184, 166, 0.38)',
    ambientLight: 'rgba(153, 246, 228, 0.34)',
    ambientBottom: 'rgba(204, 251, 241, 0.32)',
    ambientDark: '#0d9488',
    accentColor: '#2dd4bf',
    description: 'Electric storm clouds and dark seas'
  },
  'glacier-ice': {
    id: 'glacier-ice',
    name: 'Glacier Ice',
    category: 'Nature',
    badge: 'FROZEN',
    skyTop: '#38bdf8',
    skyMiddle: '#7dd3fc',
    skyBottom: '#e0f2fe',
    ambientGlow: 'rgba(56, 189, 248, 0.38)',
    ambientLight: 'rgba(224, 242, 254, 0.36)',
    ambientBottom: 'rgba(186, 230, 253, 0.32)',
    ambientDark: '#0284c7',
    accentColor: '#7dd3fc',
    description: 'Pristine frozen tundra and crystal peaks'
  },
  'volcanic-ember': {
    id: 'volcanic-ember',
    name: 'Volcanic Ember',
    category: 'Exotic',
    badge: 'INFERNO',
    skyTop: '#ef4444',
    skyMiddle: '#fb923c',
    skyBottom: '#fed7aa',
    ambientGlow: 'rgba(239, 68, 68, 0.42)',
    ambientLight: 'rgba(254, 215, 170, 0.36)',
    ambientBottom: 'rgba(254, 202, 202, 0.32)',
    ambientDark: '#dc2626',
    accentColor: '#ef4444',
    description: 'Dramatic molten lava and ember skies'
  },
  'deep-space': {
    id: 'deep-space',
    name: 'Deep Space',
    category: 'Night',
    badge: 'ABYSS',
    skyTop: '#6366f1',
    skyMiddle: '#a5b4fc',
    skyBottom: '#e2e8f0',
    ambientGlow: 'rgba(99, 102, 241, 0.34)',
    ambientLight: 'rgba(226, 232, 240, 0.36)',
    ambientBottom: 'rgba(224, 231, 255, 0.32)',
    ambientDark: '#4f46e5',
    accentColor: '#94a3b8',
    description: 'Minimalist pitch dark intergalactic void'
  },
  'tropical-emerald': {
    id: 'tropical-emerald',
    name: 'Tropical Emerald',
    category: 'Nature',
    badge: 'JUNGLE',
    skyTop: '#22c55e',
    skyMiddle: '#86efac',
    skyBottom: '#dcfce7',
    ambientGlow: 'rgba(34, 197, 94, 0.38)',
    ambientLight: 'rgba(220, 252, 231, 0.36)',
    ambientBottom: 'rgba(187, 247, 208, 0.32)',
    ambientDark: '#16a34a',
    accentColor: '#4ade80',
    description: 'Vibrant lush tropical rainforest atmosphere'
  }
};

export const DEFAULT_SKY_THEME_ID: SkyThemeId = 'azure-noon';

export function getSkyTheme(themeId?: string): SkyTheme {
  if (themeId && themeId in SKY_THEMES) {
    return SKY_THEMES[themeId as SkyThemeId];
  }
  return SKY_THEMES[DEFAULT_SKY_THEME_ID];
}
