export function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createEmptyState() {
  return { days: [], quests: [] };
}

export function normalizeState(candidate = createEmptyState()) {
  const base = createEmptyState();

  base.quests = Array.isArray(candidate.quests)
    ? candidate.quests.map((quest) => ({
        id: quest.id || generateId('quest'),
        name: String(quest.name || 'Untitled quest'),
        location: String(quest.location || ''),
        notes: String(quest.notes || ''),
        link: String(quest.link || '')
      }))
    : [];

  base.days = Array.isArray(candidate.days)
    ? candidate.days.map((day) => ({
        id: day.id || generateId('day'),
        date: day.date || new Date().toISOString().slice(0, 10),
        quests: Array.isArray(day.quests)
          ? day.quests.map((instance) => ({
              id: instance.id || generateId('instance'),
              questId: instance.questId || instance.quest || ''
            }))
          : []
      }))
    : [];

  return base;
}

export function addDayToState(state, dateValue) {
  state.days.push({
    id: generateId('day'),
    date: dateValue,
    quests: []
  });
  return state;
}

export function removeDayFromState(state, dayId) {
  state.days = state.days.filter((day) => day.id !== dayId);
  return state;
}

export function addQuestToState(state, questData) {
  const name = String(questData.name || '').trim();
  if (!name) return state;

  state.quests.push({
    id: generateId('quest'),
    name,
    location: String(questData.location || '').trim(),
    notes: String(questData.notes || '').trim(),
    link: String(questData.link || '').trim()
  });

  return state;
}

export function removeQuestFromState(state, questId) {
  state.quests = state.quests.filter((quest) => quest.id !== questId);
  state.days = state.days.map((day) => ({
    ...day,
    quests: day.quests.filter((instance) => instance.questId !== questId)
  }));
  return state;
}

export function addScheduledInstanceToDay(state, dayId, questId, index) {
  const day = state.days.find((entry) => entry.id === dayId);
  if (!day) return state;

  const nextIndex = typeof index === 'number' ? Math.max(0, Math.min(index, day.quests.length)) : day.quests.length;
  day.quests.splice(nextIndex, 0, {
    id: generateId('instance'),
    questId
  });
  return state;
}

export function removeScheduledInstanceFromDay(state, dayId, instanceId) {
  const day = state.days.find((entry) => entry.id === dayId);
  if (!day) return state;

  day.quests = day.quests.filter((instance) => instance.id !== instanceId);
  return state;
}

export function moveScheduledInstance(state, sourceDayId, targetDayId, instanceId, targetIndex) {
  if (!instanceId) return state;

  const sourceDay = state.days.find((day) => day.id === sourceDayId);
  const targetDay = state.days.find((day) => day.id === targetDayId);
  if (!sourceDay || !targetDay) return state;

  const currentIndex = sourceDay.quests.findIndex((instance) => instance.id === instanceId);
  if (currentIndex < 0) return state;

  const [instance] = sourceDay.quests.splice(currentIndex, 1);
  if (!instance) return state;

  const destinationIndex = typeof targetIndex === 'number' ? Math.max(0, Math.min(targetIndex, targetDay.quests.length)) : targetDay.quests.length;
  targetDay.quests.splice(destinationIndex, 0, instance);

  return state;
}

export function reorderScheduledInstance(state, dayId, instanceId, targetIndex) {
  const day = state.days.find((entry) => entry.id === dayId);
  if (!day || !instanceId) return state;

  const currentIndex = day.quests.findIndex((instance) => instance.id === instanceId);
  if (currentIndex < 0) return state;

  const [item] = day.quests.splice(currentIndex, 1);
  if (!item) return state;

  const safeTarget = typeof targetIndex === 'number'
    ? Math.max(0, Math.min(targetIndex, day.quests.length))
    : day.quests.length;

  day.quests.splice(safeTarget, 0, item);
  return state;
}
