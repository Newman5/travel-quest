export function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createEmptyState() {
  return { days: [], quests: [], archivedDays: [], archivedTrips: [] };
}

export function normalizeState(candidate = createEmptyState()) {
  const base = createEmptyState();

  const normalizeQuest = (quest = {}) => ({
    id: quest.id || generateId('quest'),
    name: String(quest.name || 'Untitled quest'),
    location: String(quest.location || ''),
    notes: String(quest.notes || ''),
    link: String(quest.link || '')
  });

  const normalizeDay = (day = {}) => ({
    id: day.id || generateId('day'),
    date: day.date || new Date().toISOString().slice(0, 10),
    quests: Array.isArray(day.quests)
      ? day.quests.map((instance) => ({
          id: instance.id || generateId('instance'),
          questId: instance.questId || instance.quest || ''
        }))
      : []
  });

  base.quests = Array.isArray(candidate.quests)
    ? candidate.quests.map((quest) => normalizeQuest(quest))
    : [];

  base.days = Array.isArray(candidate.days)
    ? candidate.days.map((day) => normalizeDay(day))
    : [];

  base.archivedDays = Array.isArray(candidate.archivedDays)
    ? candidate.archivedDays.map((entry) => ({
        id: entry.id || generateId('archived-day'),
        archivedAt: String(entry.archivedAt || new Date().toISOString()),
        day: normalizeDay(entry.day || {}),
        questSnapshots: Array.isArray(entry.questSnapshots)
          ? entry.questSnapshots.map((quest) => normalizeQuest(quest))
          : []
      }))
    : [];

  base.archivedTrips = Array.isArray(candidate.archivedTrips)
    ? candidate.archivedTrips.map((entry) => ({
        id: entry.id || generateId('archived-trip'),
        name: String(entry.name || 'Archived trip'),
        archivedAt: String(entry.archivedAt || new Date().toISOString()),
        state: {
          days: Array.isArray(entry.state?.days) ? entry.state.days.map((day) => normalizeDay(day)) : [],
          quests: Array.isArray(entry.state?.quests) ? entry.state.quests.map((quest) => normalizeQuest(quest)) : []
        }
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

export function addQuestToState(state, questData, options = {}) {
  const name = String(questData.name || '').trim();
  if (!name) return null;

  const quest = {
    id: generateId('quest'),
    name,
    location: String(questData.location || '').trim(),
    notes: String(questData.notes || '').trim(),
    link: String(questData.link || '').trim()
  };

  if (options.prepend === false) {
    state.quests.push(quest);
  } else {
    state.quests.unshift(quest);
  }

  return quest;
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

export function reorderQuestInLibrary(state, questId, targetIndex) {
  if (!questId) return state;
  const currentIndex = state.quests.findIndex((quest) => quest.id === questId);
  if (currentIndex < 0) return state;

  const [quest] = state.quests.splice(currentIndex, 1);
  if (!quest) return state;

  const safeTarget = typeof targetIndex === 'number'
    ? Math.max(0, Math.min(targetIndex, state.quests.length))
    : state.quests.length;

  state.quests.splice(safeTarget, 0, quest);
  return state;
}

export function archiveDayInState(state, dayId) {
  const dayIndex = state.days.findIndex((day) => day.id === dayId);
  if (dayIndex < 0) return null;

  const [day] = state.days.splice(dayIndex, 1);
  if (!day) return null;

  const archived = {
    id: generateId('archived-day'),
    archivedAt: new Date().toISOString(),
    day: {
      id: day.id,
      date: day.date,
      quests: day.quests.map((instance) => ({ ...instance }))
    },
    questSnapshots: day.quests
      .map((instance) => state.quests.find((quest) => quest.id === instance.questId))
      .filter(Boolean)
      .map((quest) => ({ ...quest }))
  };

  state.archivedDays.unshift(archived);
  return archived;
}

export function restoreDayFromArchiveInState(state, archivedDayId) {
  const archivedIndex = state.archivedDays.findIndex((entry) => entry.id === archivedDayId);
  if (archivedIndex < 0) return null;

  const [archived] = state.archivedDays.splice(archivedIndex, 1);
  if (!archived) return null;

  archived.questSnapshots.forEach((snapshot) => {
    if (!state.quests.some((quest) => quest.id === snapshot.id)) {
      state.quests.unshift({ ...snapshot });
    }
  });

  state.days.push({
    id: archived.day.id,
    date: archived.day.date,
    quests: archived.day.quests.map((instance) => ({ ...instance }))
  });

  return archived.day;
}

export function archiveTripInState(state, archiveName = '') {
  const archivedTrip = {
    id: generateId('archived-trip'),
    name: String(archiveName || `Trip archived ${new Date().toISOString().slice(0, 10)}`),
    archivedAt: new Date().toISOString(),
    state: {
      days: state.days.map((day) => ({
        id: day.id,
        date: day.date,
        quests: day.quests.map((instance) => ({ ...instance }))
      })),
      quests: state.quests.map((quest) => ({ ...quest }))
    }
  };

  state.archivedTrips.unshift(archivedTrip);
  state.days = [];
  state.quests = [];
  return archivedTrip;
}

export function restoreTripInState(state, archivedTripId) {
  const archivedIndex = state.archivedTrips.findIndex((trip) => trip.id === archivedTripId);
  if (archivedIndex < 0) return null;

  const [archivedTrip] = state.archivedTrips.splice(archivedIndex, 1);
  if (!archivedTrip) return null;

  state.days = archivedTrip.state.days.map((day) => ({
    id: day.id,
    date: day.date,
    quests: day.quests.map((instance) => ({ ...instance }))
  }));
  state.quests = archivedTrip.state.quests.map((quest) => ({ ...quest }));

  return archivedTrip;
}
