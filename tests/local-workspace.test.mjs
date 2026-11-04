import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyStore, parseBackup, sectionNames, statuses } from '../src/lib/local-workspace.mjs';

test('sauvegarde vide et complète restaurable', () => {
  const data = emptyStore();
  assert.deepEqual(Object.keys(data), sectionNames);
  assert.deepEqual(parseBackup(JSON.stringify(data)), data);
});
test('les éléments sauvegardés conservent leurs champs', () => {
  const data = emptyStore();
  data.prospects.push({ id: '1', title: 'Prospect démo', detail: '', status: statuses.prospects[0], owner: '', date: '' });
  assert.deepEqual(parseBackup(JSON.stringify(data)), data);
});
test('une sauvegarde incomplète ou invalide est refusée', () => {
  assert.throws(() => parseBackup('{}'));
  assert.throws(() => parseBackup('not json'));
  const data = emptyStore();
  data.taches.push({ id: '1', title: 'Tâche', detail: '', status: 'inconnu', owner: '', date: '' });
  assert.throws(() => parseBackup(JSON.stringify(data)));
});
test('les identifiants dupliqués sont refusés', () => {
  const data = emptyStore();
  const item = { id: '1', title: 'Tâche', detail: '', status: statuses.taches[0], owner: '', date: '' };
  data.taches.push(item, item);
  assert.throws(() => parseBackup(JSON.stringify(data)));
});
