import { Dexie, type Table } from 'dexie';

export interface HouseholdProfile {
  id: string;
  name: string;
  servings: number;
  diet: 'omnivore' | 'vegetarian' | 'vegan';
  allergies: string[];
  excludedIngredients: string[];
}

export const db = new Dexie('SmartPantryDB') as Dexie & {
  profiles: Table<HouseholdProfile, string>;
};

db.version(2).stores({
  profiles: 'id, name',
});

// Keep compatibility with local databases already opened using version 3.
db.version(3).stores({
  profiles: 'id, name',
  settings: 'key',
});
