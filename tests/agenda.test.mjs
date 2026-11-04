import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDays, appointmentsByDay } from '../src/lib/agenda.mjs';

test('calendrier lundi-dimanche et années bissextiles', () => {
  const days = monthDays(2024, 1);
  assert.deepEqual(days.slice(0, 4), [null, null, null, '2024-02-01']);
  assert.equal(days.at(-1), '2024-02-29');
  assert.equal(monthDays(2025, 1).at(-1), '2025-02-28');
  assert.equal(monthDays(2026, 11).at(-1), '2026-12-31');
});

test('agenda regroupe et trie les dates locales en excluant les annulations et fiches non datées', () => {
  const entries = [
    {title:'B',date:'2026-12-01T14:00',status:'Confirmé'},
    {title:'A',date:'2026-12-01T09:00',status:'Demandé'},
    {title:'C',date:'2026-12-01T08:00',status:'Annulé'},
    {title:'D',date:'',status:'Confirmé'},
  ];
  const result = appointmentsByDay(entries);
  assert.deepEqual(Object.keys(result), ['2026-12-01']);
  assert.deepEqual(result['2026-12-01'].map(x => x.title), ['A','B']);
});
