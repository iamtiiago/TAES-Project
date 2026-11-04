import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  db, activateProfile, ActiveProfileError, deleteInactiveProfile, getActiveProfileId,
} from '../src/db/db.ts';

// The pantry uses the application schema. Shopping and recipes are test-only stores.
db.version(5).stores({ shoppingList: 'id', recipeBook: 'id' });

const profile = {
  name: 'Casa', servings: 2, diet: 'omnivore',
  allergies: ['leite'], excludedIngredients: ['coentros'],
};
const sharedData = {
  pantry: [{
    id: 1, name: 'Arroz', category: 'Despensa', quantity: 3, unit: 'kg',
    expirationDate: '2030-12-31',
  }],
  shoppingList: [{ id: 'milk', quantity: 2, checked: false }],
  recipeBook: [{ id: 'soup', title: 'Sopa', ingredients: ['cenoura'] }],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.profiles.bulkAdd([
    { ...profile, id: 'initial' }, { ...profile, id: 'extra', name: 'Férias' },
  ]);
  await activateProfile('initial');
  for (const [table, rows] of Object.entries(sharedData)) {
    await db.table(table).bulkAdd(rows);
  }
});

afterEach(async () => { await db.delete(); });

async function assertSharedDataPreserved() {
  for (const [table, rows] of Object.entries(sharedData)) {
    assert.deepEqual(await db.table(table).toArray(), rows);
  }
}

test('TP-33: deleting an inactive profile preserves all shared data after reopening', async () => {
  await deleteInactiveProfile('extra');
  db.close();
  await db.open();
  assert.equal(await db.profiles.get('extra'), undefined);
  assert.deepEqual(await db.profiles.get('initial'), { ...profile, id: 'initial' });
  assert.equal(await getActiveProfileId(), 'initial');
  assert.deepEqual(await db.settings.get('activeProfileId'), {
    key: 'activeProfileId', value: 'initial',
  });
  await assertSharedDataPreserved();
});

test('TP-33: deleting the initial profile after switching preserves shared data', async () => {
  await activateProfile('extra');
  await deleteInactiveProfile('initial');
  assert.equal(await db.profiles.get('initial'), undefined);
  assert.equal(await getActiveProfileId(), 'extra');
  await assertSharedDataPreserved();
});

test('TP-33: a rejected deletion preserves both profiles and all shared data', async () => {
  await assert.rejects(deleteInactiveProfile('initial'), ActiveProfileError);
  assert.equal(await db.profiles.count(), 2);
  await assertSharedDataPreserved();
});
