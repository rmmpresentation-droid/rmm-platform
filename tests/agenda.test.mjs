import test from 'node:test';
import assert from 'node:assert/strict';
import { weekDays, appointmentsByDay, appointmentHour } from '../src/lib/agenda.mjs';

test('semaines du lundi au dimanche, y compris changement de mois ou année', () => {
  assert.deepEqual(weekDays(new Date(2027, 0, 1)), ['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
  assert.equal(weekDays(new Date(2024, 1, 29))[3], '2024-02-29');
});

test('agenda classe les rendez-vous datés, par heure, hors annulations', () => {
  const entries = [
    {title:'B',date:'2026-12-01T14:30',status:'Confirmé'},
    {title:'A',date:'2026-12-01T09:15',status:'Demandé'},
    {title:'C',date:'2026-12-01T08:00',status:'Annulé'},
    {title:'D',date:'',status:'Confirmé'},
    {title:'E',date:'2026-12-01',status:'Confirmé'},
  ];
  const result = appointmentsByDay(entries);
  assert.deepEqual(Object.keys(result), ['2026-12-01']);
  assert.deepEqual(result['2026-12-01'].map(x => x.title), ['E','A','B']);
  assert.equal(appointmentHour(entries[0].date),14);
  assert.equal(appointmentHour(entries[1].date),9);
  assert.equal(appointmentHour(entries[4].date),null);
  assert.equal(appointmentHour('2026-12-01T24:00'),null);
});

test('planning de 08:00 à 22:00 inclus', async () => {
  const { inPlanningHours } = await import('../src/lib/agenda.mjs');
  assert.equal(inPlanningHours('2026-12-01T07:59'), false);
  assert.equal(inPlanningHours('2026-12-01T08:00'), true);
  assert.equal(inPlanningHours('2026-12-01T21:59'), true);
  assert.equal(inPlanningHours('2026-12-01T22:00'), true);
  assert.equal(inPlanningHours('2026-12-01T22:01'), false);
  assert.equal(inPlanningHours('2026-12-01'), false);
});
