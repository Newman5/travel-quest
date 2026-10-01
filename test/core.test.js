import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeState, addDayToState, addQuestToState, addScheduledInstanceToDay, removeScheduledInstanceFromDay, moveScheduledInstance, reorderScheduledInstance, removeQuestFromState } from '../src/assets/travel-quest-core.js';

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
  addQuestToState(state, { name: 'Sunset Hike', location: 'Elephant Mountain' });
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

  reorderScheduledInstance(state, 'day-2', 0, 1);
  assert.equal(state.days[1].quests[1].questId, 'qigong');
});
