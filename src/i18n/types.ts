export type LanguageCode =
  | 'ar'
  | 'de'
  | 'en'
  | 'es'
  | 'fr'
  | 'hi'
  | 'id'
  | 'it'
  | 'ja'
  | 'ko'
  | 'ms'
  | 'nl'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'th'
  | 'tr'
  | 'uk'
  | 'vi'
  | 'zh-Hans'
  | 'zh-Hant';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir?: 'ltr' | 'rtl';
}

export type TranslationKeys = {
  // Settings & Modals
  setting: string;
  sound: string;
  language: string;
  select_language: string;
  enable_sound: string;
  disable_sound: string;
  close: string;

  // Game HUD
  select_level: string;
  all_levels: string;
  locked: string;
  unlocked_count: string;
  easy: string;
  hard: string;
  extreme: string;
  complete_previous_first: string;
  level: string;
  level_n: string;
  settings: string;
  reset_level: string;
  open_level_editor: string;
  store: string;

  // Victory Modal
  level_complete: string;
  your_reward: string;
  claim: string;
  claim_2x: string;
  replay: string;
  next: string;

  // All Levels Complete Modal
  congrats?: string;
  all_levels_complete?: string;
  all_levels_complete_desc?: string;
  start_from_level_1?: string;
  completed_all_100_levels?: string;

  // Store
  cars: string;
  trails: string;
  back_to_game: string;
  your_cash: string;
  free_cash_ad: string;
  bonus_reward: string;
  free_cash_rewarded: string;
  unlock_random: string;
  unlock: string;
  equipped: string;
  all_unlocked: string;
  unlocked_msg: string;
  need_cash_msg: string;
  all_items_unlocked_msg: string;

  // Store Items (Cars)
  car_army_truck: string;
  car_army_truck_desc: string;
  car_sports_coupe: string;
  car_sports_coupe_desc: string;
  car_delivery_truck: string;
  car_delivery_truck_desc: string;
  car_smart_car: string;
  car_smart_car_desc: string;
  car_dirt_bike: string;
  car_dirt_bike_desc: string;
  car_super_bike: string;
  car_super_bike_desc: string;

  // Store Items (Trails)
  trail_none: string;
  trail_none_desc: string;
  trail_smoke_puff: string;
  trail_smoke_puff_desc: string;
  trail_fire_boost: string;
  trail_fire_boost_desc: string;
  trail_spooky_ghost: string;
  trail_spooky_ghost_desc: string;
  trail_pink_hearts: string;
  trail_pink_hearts_desc: string;
  trail_neon_rings: string;
  trail_neon_rings_desc: string;

  // Header & General
  draw_bridge: string;
  play_game: string;
  level_editor: string;

  // Delete Confirm Modal
  delete_level: string;
  delete_confirm_msg: string;
  delete: string;
  cancel: string;

  // Loading Screen
  draw_bridge_puzzle: string;
  loading_game: string;

  // Editor Toolbar & Panels
  select: string;
  brick_wall: string;
  tools: string;
  car_spawn: string;
  goal_flag: string;
  sky_bg: string;
  undo: string;
  redo: string;
  snap_on: string;
  snap_off: string;
  levels: string;
  props: string;
  level_settings: string;
  title: string;
  gravity: string;
  drawing_pen_color: string;
  colors_count: string;
  select_pen_color_desc: string;
  walls: string;
  hazards: string;
  level_json: string;
  export_json: string;
  downloaded: string;
  import_json: string;
  import_level_json: string;
  load_level: string;
  paste_json_placeholder: string;
  json_paste_required: string;
  json_invalid_structure: string;
  json_invalid_syntax: string;
  selected_object: string;
  clear: string;
  type: string;
  obstacle_traps: string;
  tools_count: string;
  obstacle_hint: string;
  size_label: string;
  use_tool: string;
  near_wall: string;
  wall_n: string;
  variants_count: string;
  wall_hint_selected: string;
  wall_hint_default: string;
  wall_palettes: string;
  position_size: string;
  add_wall_platform: string;
  level_walls: string;
  sky_background: string;
  themes_count: string;
  active: string;
  save_level: string;
  saved: string;
  new_level: string;
  default_badge: string;
  custom_badge: string;

  // Editor & Extra UI
  reset?: string;
  playtest_mode?: string;
  driving?: string;
  test_drive?: string;
  active_level?: string;
  editing?: string;
  draft?: string;
  unsaved_changes?: string;
  modified?: string;
  locate?: string;
  active_level_hint?: string;
  locate_active?: string;
};
