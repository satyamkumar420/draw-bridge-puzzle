import type { TerrainBlock, WallTheme } from '../types/level';
import { GAME_CONFIG } from '../config/constants.ts';

export interface WallThemeColors {
  name: string;
  tag: string;
  brickBase: string;
  brickMortar: string;
  brickBorder: string;
  roadCap: string;
  roadCurb: string;
}

export const WALL_THEMES: Record<WallTheme, WallThemeColors> = {
  'brick-red': {
    name: 'Classic Red',
    tag: 'CLAY',
    brickBase: GAME_CONFIG.COLORS.BRICK_BASE,
    brickMortar: GAME_CONFIG.COLORS.BRICK_MORTAR,
    brickBorder: GAME_CONFIG.COLORS.BRICK_BORDER,
    roadCap: GAME_CONFIG.COLORS.ROAD_CAP,
    roadCurb: '#9a3412'
  },
  'stone-gray': {
    name: 'Castle Stone',
    tag: 'FORTRESS',
    brickBase: '#64748b',
    brickMortar: '#1e293b',
    brickBorder: '#0f172a',
    roadCap: '#e2e8f0',
    roadCurb: '#475569'
  },
  'stone-grey': {
    name: 'Castle Stone',
    tag: 'FORTRESS',
    brickBase: '#64748b',
    brickMortar: '#1e293b',
    brickBorder: '#0f172a',
    roadCap: '#e2e8f0',
    roadCurb: '#475569'
  },
  'moss-green': {
    name: 'Moss Jungle',
    tag: 'JUNGLE',
    brickBase: '#408e56',
    brickMortar: '#1b4329',
    brickBorder: '#133821',
    roadCap: '#ecfdf5',
    roadCurb: '#26633b'
  },
  'desert-sand': {
    name: 'Canyon Sand',
    tag: 'DESERT',
    brickBase: '#c27838',
    brickMortar: '#3d1e08',
    brickBorder: '#2b1404',
    roadCap: '#fef3c7',
    roadCurb: '#78350f'
  },
  'sand-yellow': {
    name: 'Canyon Sand',
    tag: 'DESERT',
    brickBase: '#c27838',
    brickMortar: '#3d1e08',
    brickBorder: '#2b1404',
    roadCap: '#fef3c7',
    roadCurb: '#78350f'
  },
  'cyber-blue': {
    name: 'Cyber Blue',
    tag: 'CYBER',
    brickBase: '#0284c7',
    brickMortar: '#082f49',
    brickBorder: '#0c4a6e',
    roadCap: '#e0f2fe',
    roadCurb: '#0369a1'
  },
  'magma-orange': {
    name: 'Magma Orange',
    tag: 'VOLCANIC',
    brickBase: '#ea580c',
    brickMortar: '#431407',
    brickBorder: '#7c2d12',
    roadCap: '#ffedd5',
    roadCurb: '#9a3412'
  },
  'ice-cyan': {
    name: 'Glacier Ice',
    tag: 'FROST',
    brickBase: '#0891b2',
    brickMortar: '#164e63',
    brickBorder: '#155e75',
    roadCap: '#cffafe',
    roadCurb: '#0e7490'
  },
  'dark-slate': {
    name: 'Light Silver',
    tag: 'SILVER',
    brickBase: '#cbd5e1',
    brickMortar: '#64748b',
    brickBorder: '#475569',
    roadCap: '#f8fafc',
    roadCurb: '#94a3b8'
  },
  'light-silver': {
    name: 'Light Silver',
    tag: 'SILVER',
    brickBase: '#cbd5e1',
    brickMortar: '#64748b',
    brickBorder: '#475569',
    roadCap: '#f8fafc',
    roadCurb: '#94a3b8'
  },
  'silver-light': {
    name: 'Light Silver',
    tag: 'SILVER',
    brickBase: '#cbd5e1',
    brickMortar: '#64748b',
    brickBorder: '#475569',
    roadCap: '#f8fafc',
    roadCurb: '#94a3b8'
  },
  'dark-obsidian': {
    name: 'Platinum Silver',
    tag: 'PLATINUM',
    brickBase: '#e2e8f0',
    brickMortar: '#94a3b8',
    brickBorder: '#64748b',
    roadCap: '#ffffff',
    roadCurb: '#cbd5e1'
  },
  'gold-metal': {
    name: 'Gold Vault',
    tag: 'ROYAL',
    brickBase: '#eab308',
    brickMortar: '#422006',
    brickBorder: '#713f12',
    roadCap: '#fef08a',
    roadCurb: '#a16207'
  }
};

export function getWallTheme(themeKey?: string): WallThemeColors {
  if (themeKey && (themeKey as WallTheme) in WALL_THEMES) {
    return WALL_THEMES[themeKey as WallTheme];
  }
  return WALL_THEMES['brick-red'];
}

const BRICK_WIDTH = 52;
const BRICK_HEIGHT = 22;

export interface BrickRenderOptions {
  isEditor?: boolean;
  defaultTheme?: string;
}

/**
 * Draws premium wide 3D stone block wall with continuous global grid alignment,
 * ensuring adjacent terrain blocks merge seamlessly into a single solid wall
 * without any visible joint seams or mismatched mortar lines.
 */
export function renderBrickTerrain(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainBlock,
  options?: BrickRenderOptions
): void {
  const { x, y, width, height } = terrain;
  const colors = getWallTheme(terrain.theme || options?.defaultTheme);

  ctx.save();

  // 1. Clip to terrain bounds
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  // 2. Base Deep Recessed Mortar Background
  ctx.fillStyle = colors.brickMortar;
  ctx.fillRect(x, y, width, height);

  // 3. Draw Wide 3D Embossed Running-Bond Stone Blocks on Global Grid
  // Using global world coordinates (origin 0,0) ensures that any adjacent terrain
  // blocks will have their bricks and mortar lines align with 100% precision.
  const startRow = Math.floor(y / BRICK_HEIGHT) - 1;
  const endRow = Math.ceil((y + height) / BRICK_HEIGHT) + 1;

  for (let r = startRow; r <= endRow; r++) {
    const rowY = r * BRICK_HEIGHT;
    if (rowY >= y + height || rowY + BRICK_HEIGHT <= y) continue;

    // Running-bond stagger: alternate rows are shifted by half brick width
    const isStaggered = ((r % 2) + 2) % 2 === 1;
    const staggerOffset = isStaggered ? BRICK_WIDTH / 2 : 0;

    const startCol = Math.floor((x - staggerOffset) / BRICK_WIDTH) - 1;
    const endCol = Math.ceil((x + width - staggerOffset) / BRICK_WIDTH) + 1;

    for (let c = startCol; c <= endCol; c++) {
      const brickX = c * BRICK_WIDTH + staggerOffset;
      const brickY = rowY + 2;
      const bWidth = BRICK_WIDTH - 3;
      const bHeight = BRICK_HEIGHT - 3;

      // Skip bricks completely outside current terrain bounding box
      if (brickX + bWidth < x || brickX > x + width) continue;

      // 3D Wide Block Body
      ctx.fillStyle = colors.brickBase;
      ctx.fillRect(brickX, brickY, bWidth, bHeight);

      // Top Specular Highlight Bevel (Light from Top-Left)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(brickX, brickY, bWidth, 1.5);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(brickX + 1, brickY + 1.5, bWidth - 2, 1);

      // Left Highlight Bevel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(brickX, brickY, 1.5, bHeight);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(brickX + 1.5, brickY + 1.5, 1, bHeight - 3);

      // Bottom Deep Shadow Groove
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(brickX, brickY + bHeight - 1.8, bWidth, 1.8);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(brickX + 1, brickY + bHeight - 3, bWidth - 2, 1.2);

      // Right Deep Shadow Groove
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(brickX + bWidth - 1.8, brickY, 1.8, bHeight);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(brickX + bWidth - 3, brickY + 1.5, 1.2, bHeight - 3);
    }
  }

  ctx.restore();

  // 4. Editor-Only: Draw subtle dashed block boundary so joints are visible to level designer
  if (options?.isEditor) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }
}
