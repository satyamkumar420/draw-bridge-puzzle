export type StoreCategory = 'cars' | 'trails';

export interface StoreItem {
  id: string;
  name: string;
  category: StoreCategory;
  price: number;
  description: string;
}

export interface GameStoreState {
  storeVersion?: number;
  unlockedCars: string[];
  selectedCar: string;
  unlockedTrails: string[];
  selectedTrail: string;
}
