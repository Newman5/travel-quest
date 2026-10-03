import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeState,
  addDayToState,
  addQuestToState,
  addScheduledInstanceToDay,
  removeScheduledInstanceFromDay,
  moveScheduledInstance,
  reorderScheduledInstance,
  removeQuestFromState,
  reorderQuestInLibrary,
  archiveDayInState,
  restoreDayFromArchiveInState,
  archiveTripInState,
  restoreTripInState
} from '../src/assets/travel-quest-core.js';

test('normalizeState keeps quest and day data in the expected shape', () => {
  const state = normalizeState({
    quests: [{ id: 'qigong', name: 'Qigong', location: 'Daan Park', notes: 'Morning session' }],
    days: [{ id: 'day-1', date: '2026-09-30', quests: [{ id: 'instance-1', questId: 'qigong' }] }]
  });

  assert.equal(state.quests.length, 1);
  assert.equal(state.days[0].quests[0].questId, 'qigong');
  assert.equal(state.days[0].date, '2026-09-30');
});

test('add and remove day and quest operations persist without mutating the library copy', () => {
  const state = { days: [], quests: [] };

  addDayToState(state, '2026-10-01');
  const quest = addQuestToState(state, { name: 'Sunset Hike', location: 'Elephant Mountain' });
  assert.equal(state.quests[0].id, quest.id);
  addScheduledInstanceToDay(state, state.days[0].id, state.quests[0].id, 0);

  assert.equal(state.days[0].quests.length, 1);
  assert.equal(state.quests.length, 1);

  removeScheduledInstanceFromDay(state, state.days[0].id, state.days[0].quests[0].id);
  assert.equal(state.days[0].quests.length, 0);
  assert.equal(state.quests.length, 1);

  removeQuestFromState(state, state.quests[0].id);
  assert.equal(state.quests.length, 0);
});

test('moving and reordering scheduled instances update the correct day state', () => {
  const state = normalizeState({
    days: [
      { id: 'day-1', date: '2026-09-30', quests: [{ id: 'inst-a', questId: 'qigong' }] },
      { id: 'day-2', date: '2026-10-01', quests: [{ id: 'inst-b', questId: 'swimming' }] }
    ],
    quests: [
      { id: 'qigong', name: 'Qigong' },
      { id: 'swimming', name: 'Swimming' }
    ]
  });

  moveScheduledInstance(state, 'day-1', 'day-2', 'inst-a', 0);
  assert.equal(state.days[1].quests[0].questId, 'qigong');

  reorderScheduledInstance(state, 'day-2', 'inst-a', 1);
  assert.equal(state.days[1].quests[1].questId, 'qigong');
});

test('library quests can be reordered and day/trip archives can be restored', () => {
  const state = normalizeState({
    days: [{ id: 'day-1', date: '2026-09-30', quests: [{ id: 'inst-a', questId: 'qigong' }] }],
    quests: [
      { id: 'qigong', name: 'Qigong' },
      { id: 'swimming', name: 'Swimming' }
    ]
  });

  reorderQuestInLibrary(state, 'swimming', 0);
  assert.equal(state.quests[0].id, 'swimming');

  const archivedDay = archiveDayInState(state, 'day-1');
  assert.equal(state.days.length, 0);
  assert.equal(state.archivedDays.length, 1);

  restoreDayFromArchiveInState(state, archivedDay.id);
  assert.equal(state.days.length, 1);
  assert.equal(state.archivedDays.length, 0);

  const archivedTrip = archiveTripInState(state, 'Taipei Trip');
  assert.equal(state.days.length, 0);
  assert.equal(state.quests.length, 0);
  assert.equal(archivedTrip.name, 'Taipei Trip');

  restoreTripInState(state, archivedTrip.id);
  assert.equal(state.days.length, 1);
  assert.equal(state.quests.length, 2);
});
