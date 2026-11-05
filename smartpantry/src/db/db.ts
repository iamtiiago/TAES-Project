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
  settings: Table<{ key: 'activeProfileId'; value: string }, string>;
};

db.version(2).stores({
  profiles: 'id, name',
});

// Keep compatibility with local databases already opened using version 3.
db.version(3).stores({
  profiles: 'id, name',
  settings: 'key',
});

export async function getActiveProfileId(): Promise<string | undefined> {
  const setting = await db.settings.get('activeProfileId');
  if (setting && await db.profiles.get(setting.value)) return setting.value;
  if (await db.profiles.get('initial')) return 'initial';
  return (await db.profiles.toCollection().first())?.id;
}

export async function getActiveProfile(): Promise<HouseholdProfile | undefined> {
  return db.transaction('r', db.profiles, db.settings, async () => {
    const id = await getActiveProfileId();
    return id === undefined ? undefined : db.profiles.get(id);
  });
}

/**
 * TP-37: mudar de perfil altera apenas a seleção em settings.
 * A despensa, a lista de compras e o livro de receitas pertencem ao agregado:
 * não devem ser apagados, copiados ou separados por perfil nesta operação.
 */
export async function activateProfile(id: string): Promise<void> {
  await db.transaction('rw', db.profiles, db.settings, async () => {
    if (!await db.profiles.get(id)) throw new Error('Este perfil já não existe.');
    await db.settings.put({ key: 'activeProfileId', value: id });
  });
}

export class ActiveProfileError extends Error {
  constructor() {
    super('Não é possível eliminar o perfil ativo.');
  }
}

export async function deleteInactiveProfile(id: string): Promise<void> {
  await db.transaction('rw', db.profiles, db.settings, async () => {
    if (await getActiveProfileId() === id) throw new ActiveProfileError();
    // Shared household data must outlive profiles: never clear other tables here.
    await db.profiles.delete(id);
  });
}
