import {
  addDayToState,
  addQuestToState,
  addScheduledInstanceToDay,
  archiveDayInState,
  archiveTripInState,
  moveScheduledInstance as moveScheduledInstanceCore,
  normalizeState as normalizeStateCore,
  removeQuestFromState,
  removeScheduledInstanceFromDay,
  reorderQuestInLibrary,
  reorderScheduledInstance as reorderScheduledInstanceCore,
  restoreDayFromArchiveInState,
  restoreTripInState
} from './travel-quest-core.js';

const STORAGE_KEY = 'travel-quest-state-v1';
const UI_STORAGE_KEY = 'travel-quest-ui-v1';
const seedScript = document.getElementById('travel-quest-seed');

function readSeedData() {
  const rawText = seedScript ? seedScript.textContent : '';
  if (!rawText || !rawText.trim()) return { days: [], quests: [], archivedDays: [], archivedTrips: [] };

  try {
    return JSON.parse(rawText);
  } catch (error) {
    console.warn('Unable to parse Travel Quest seed data:', error);
    return { days: [], quests: [], archivedDays: [], archivedTrips: [] };
  }
}

function normalizeState(candidate = { days: [], quests: [], archivedDays: [], archivedTrips: [] }) {
  return normalizeStateCore(candidate);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.warn('Unable to load saved Travel Quest state:', error);
    return null;
  }
}

function loadUiState() {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return { collapsedDayIds: [], libraryFilter: '' };
    const parsed = JSON.parse(raw);
    return {
      collapsedDayIds: Array.isArray(parsed.collapsedDayIds) ? parsed.collapsedDayIds.map((id) => String(id)) : [],
      libraryFilter: String(parsed.libraryFilter || '')
    };
  } catch {
    return { collapsedDayIds: [], libraryFilter: '' };
  }
}

const state = normalizeState(loadState() || readSeedData());
const uiState = loadUiState();
let addQuestTargetDayId = '';
let longPressTimer = null;
let longPressTriggered = false;
let longPressStartPoint = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveUiState() {
  localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(uiState));
}

function findQuestById(questId) {
  return state.quests.find((quest) => quest.id === questId) || null;
}

function countQuestSchedules(questId) {
  return state.days.reduce((total, day) => total + day.quests.filter((instance) => instance.questId === questId).length, 0);
}

function formatDateHeading(dateValue) {
  if (!dateValue) return 'New day';
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return `${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)}\n${new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date)}`;
}

function escapeHTML(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeLink(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) ? trimmed : '';
}

function isDayCollapsed(dayId) {
  return uiState.collapsedDayIds.includes(dayId);
}

function toggleDayCollapsed(dayId) {
  if (isDayCollapsed(dayId)) {
    uiState.collapsedDayIds = uiState.collapsedDayIds.filter((id) => id !== dayId);
  } else {
    uiState.collapsedDayIds.push(dayId);
  }
  saveUiState();
  render();
}

function renderQuestCard(quest, instanceId = '') {
  const location = quest.location ? `<div class="quest-location">${escapeHTML(quest.location)}</div>` : '';
  return `
    <article class="quest-card" tabindex="0" data-quest-id="${escapeHTML(quest.id)}" data-instance-id="${escapeHTML(instanceId)}">
      <div class="quest-name">${escapeHTML(quest.name || 'Untitled quest')}</div>
      ${location}
    </article>
  `;
}

function getListIndex(container, child) {
  return Array.from(container.children).indexOf(child);
}

function addScheduledInstance(dayId, questId, targetIndex = null) {
  addScheduledInstanceToDay(state, dayId, questId, targetIndex);
}

function removeScheduledInstance(dayId, instanceId) {
  removeScheduledInstanceFromDay(state, dayId, instanceId);
}

function moveScheduledInstance(sourceDayId, targetDayId, instanceId, targetIndex = null) {
  moveScheduledInstanceCore(state, sourceDayId, targetDayId, instanceId, targetIndex);
}

function reorderScheduledInstance(dayId, instanceId, targetIndex) {
  reorderScheduledInstanceCore(state, dayId, instanceId, targetIndex);
}

function renderDayJump() {
  const jumpContainer = document.getElementById('days-jump');
  if (!jumpContainer) return;

  jumpContainer.innerHTML = state.days.map((day) => {
    const [dateText] = formatDateHeading(day.date).split('\n');
    return `<button type="button" class="jump-chip" data-jump-day="${escapeHTML(day.id)}">${escapeHTML(dateText || day.date || 'Day')}</button>`;
  }).join('');
}

function renderArchivePanels() {
  const archivedDays = document.getElementById('archived-days-list');
  const archivedTrips = document.getElementById('archived-trips-list');

  if (archivedDays) {
    archivedDays.innerHTML = state.archivedDays.length
      ? state.archivedDays.map((entry) => {
          const [dateText] = formatDateHeading(entry.day.date).split('\n');
          return `
            <div class="archive-item">
              <div class="archive-item-title">${escapeHTML(dateText || entry.day.date || 'Archived day')}</div>
              <button type="button" class="secondary-button" data-restore-day="${escapeHTML(entry.id)}">Restore</button>
            </div>
          `;
        }).join('')
      : '<p class="archive-empty">No archived days</p>';
  }

  if (archivedTrips) {
    archivedTrips.innerHTML = state.archivedTrips.length
      ? state.archivedTrips.map((entry) => `
        <div class="archive-item">
          <div class="archive-item-title">${escapeHTML(entry.name)}</div>
          <button type="button" class="secondary-button" data-restore-trip="${escapeHTML(entry.id)}">Restore trip</button>
        </div>
      `).join('')
      : '<p class="archive-empty">No archived trips</p>';
  }
}

function render() {
  const daysContainer = document.getElementById('days-container');
  const library = document.getElementById('quest-library');

  renderDayJump();

  daysContainer.innerHTML = state.days.map((day) => {
    const cards = day.quests.map((instance) => {
      const quest = findQuestById(instance.questId);
      if (!quest) return '';
      return renderQuestCard(quest, instance.id);
    }).join('');

    const [dateText, weekdayText] = formatDateHeading(day.date).split('\n');
    const collapsed = isDayCollapsed(day.id);

    return `
      <div class="day-column${collapsed ? ' is-collapsed' : ''}" data-day-id="${escapeHTML(day.id)}" data-day-date="${escapeHTML(day.date)}" tabindex="0">
        <div class="day-header">
          <div>
            <div class="day-date">${escapeHTML(dateText || '')}</div>
            <div class="day-weekday">${escapeHTML(weekdayText || '')}</div>
          </div>
          <div class="day-actions">
            <button type="button" class="add-quest-to-day icon-button primary-icon-button" data-day-id="${escapeHTML(day.id)}" aria-label="Add quest to this day">+</button>
            <button type="button" class="collapse-day icon-button" data-day-id="${escapeHTML(day.id)}" aria-label="${collapsed ? 'Expand day' : 'Collapse day'}">${collapsed ? '▸' : '▾'}</button>
            <button type="button" class="day-menu icon-button" data-day-id="${escapeHTML(day.id)}" aria-label="Day options">⋯</button>
          </div>
        </div>
        <div class="quest-list" data-day-id="${escapeHTML(day.id)}">
          ${cards || '<div class="day-empty">Drop a quest here</div>'}
        </div>
      </div>
    `;
  }).join('');

  const filter = uiState.libraryFilter.trim().toLowerCase();
  const filteredQuests = filter
    ? state.quests.filter((quest) => `${quest.name} ${quest.location} ${quest.notes}`.toLowerCase().includes(filter))
    : state.quests;

  library.innerHTML = filteredQuests.map((quest) => `
    <article class="quest-card" tabindex="0" data-quest-id="${escapeHTML(quest.id)}" data-instance-id="">
      <div class="quest-name">${escapeHTML(quest.name || 'Untitled quest')}</div>
      ${quest.location ? `<div class="quest-location">${escapeHTML(quest.location)}</div>` : ''}
    </article>
  `).join('');

  const search = document.getElementById('library-filter');
  if (search && search.value !== uiState.libraryFilter) {
    search.value = uiState.libraryFilter;
  }

  bindDragAndDrop();
  renderArchivePanels();
}

function bindDragAndDrop() {
  if (typeof Sortable === 'undefined') {
    return;
  }

  const library = document.getElementById('quest-library');
  const dayLists = Array.from(document.querySelectorAll('.quest-list'));

  if (library && library.sortable) {
    library.sortable.destroy();
  }

  dayLists.forEach((list) => {
    if (list.sortable) {
      list.sortable.destroy();
    }
  });

  if (library) {
    library.sortable = new Sortable(library, {
      group: {
        name: 'travel-quest',
        pull: 'clone',
        put: true
      },
      sort: !uiState.libraryFilter.trim(),
      draggable: '.quest-card',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onAdd(event) {
        const sourceDay = event.from && event.from.closest ? event.from.closest('.day-column') : null;
        const draggedInstanceId = event.item && event.item.dataset ? event.item.dataset.instanceId : '';

        if (!sourceDay || !draggedInstanceId) return;

        event.item.remove();
        removeScheduledInstance(sourceDay.dataset.dayId, draggedInstanceId);
        saveState();
        render();
      },
      onUpdate(event) {
        const questId = event.item?.dataset?.questId;
        if (!questId) return;
        const targetIndex = getListIndex(event.to, event.item);
        reorderQuestInLibrary(state, questId, targetIndex);
        saveState();
        render();
      }
    });
  }

  dayLists.forEach((list) => {
    list.sortable = new Sortable(list, {
      group: 'travel-quest',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      draggable: '.quest-card',
      onAdd(event) {
        const sourceDay = event.from && event.from.closest ? event.from.closest('.day-column') : null;
        const targetDay = event.to && event.to.closest ? event.to.closest('.day-column') : null;

        if (event.to && event.to.id === 'quest-library' && sourceDay) {
          event.item.remove();
          removeScheduledInstance(sourceDay.dataset.dayId, event.item.dataset.instanceId);
          saveState();
          render();
          return;
        }

        if (!sourceDay && targetDay) {
          const targetIndex = getListIndex(event.to, event.item);
          addScheduledInstance(targetDay.dataset.dayId, event.item.dataset.questId, targetIndex);
          saveState();
          render();
          return;
        }

        if (sourceDay && targetDay && sourceDay !== targetDay) {
          const targetIndex = getListIndex(event.to, event.item);
          moveScheduledInstance(sourceDay.dataset.dayId, targetDay.dataset.dayId, event.item.dataset.instanceId, targetIndex);
          saveState();
          render();
        }
      },
      onUpdate(event) {
        if (event.from !== event.to) return;
        const day = event.to.closest('.day-column');
        if (!day) return;
        const targetIndex = getListIndex(event.to, event.item);
        reorderScheduledInstance(day.dataset.dayId, event.item.dataset.instanceId, targetIndex);
        saveState();
        render();
      }
    });
  });
}

const DEFAULT_DAY_OFFSET_MS = 24 * 60 * 60 * 1000;

function addDay() {
  const dateInput = document.getElementById('new-day-date');
  const selectedDate = dateInput.value || new Date(Date.now() + DEFAULT_DAY_OFFSET_MS).toISOString().slice(0, 10);
  addDayToState(state, selectedDate);
  saveState();
  render();
  dateInput.value = '';
}

function removeDay(dayId) {
  if (!window.confirm('Delete this day?')) return;
  const index = state.days.findIndex((day) => day.id === dayId);
  if (index < 0) return;
  state.days.splice(index, 1);
  saveState();
  render();
}

function addQuest(questData, targetDayId = '') {
  const quest = addQuestToState(state, questData);
  if (!quest) return null;

  if (targetDayId) {
    addScheduledInstanceToDay(state, targetDayId, quest.id);
  }

  saveState();
  render();
  return quest;
}

function removeQuest(questId) {
  const scheduleCount = countQuestSchedules(questId);
  const warning = scheduleCount > 0
    ? `Delete this quest and remove ${scheduleCount} scheduled instance${scheduleCount === 1 ? '' : 's'}?`
    : 'Delete this quest?';

  if (!window.confirm(warning)) return;
  removeQuestFromState(state, questId);
  saveState();
  render();
}

function openQuestDetails(questId) {
  const quest = findQuestById(questId);
  if (!quest) return;

  const detailTitle = document.getElementById('quest-detail-title');
  const detailContent = document.getElementById('quest-detail-content');
  const dialog = document.getElementById('quest-detail-dialog');

  detailTitle.textContent = quest.name || 'Quest details';

  const fields = [
    ['Name', quest.name],
    ['Location', quest.location],
    ['Notes', quest.notes],
    ['Link', quest.link]
  ].filter(([, value]) => value && String(value).trim());

  detailContent.innerHTML = fields.length
    ? fields.map(([label, value]) => {
      const safeValue = safeLink(value);
      const renderedValue = label === 'Link' && safeValue
        ? `<a href="${escapeHTML(safeValue)}" target="_blank" rel="noreferrer noopener">${escapeHTML(safeValue)}</a>`
        : escapeHTML(value);

      return `
          <div class="quest-detail-field">
            <strong>${escapeHTML(label)}</strong>
            <div>${renderedValue}</div>
          </div>
        `;
    }).join('')
    : '<p>No additional details yet.</p>';

  if (dialog.showModal) {
    dialog.showModal();
  }
}

function openAddQuestDialog(dayId = '') {
  addQuestTargetDayId = dayId;
  const dialog = document.getElementById('add-quest-dialog');
  const targetInput = document.getElementById('quest-target-day-id');
  const title = document.getElementById('add-quest-title');

  if (targetInput) targetInput.value = dayId;
  if (title) title.textContent = dayId ? 'Add quest to day' : 'Add quest';

  if (dialog.showModal) {
    dialog.showModal();
  }
}

function archiveDay(dayId) {
  archiveDayInState(state, dayId);
  saveState();
  render();
}

function archiveTrip() {
  if (!window.confirm('Archive current trip and clear the active board?')) return;
  archiveTripInState(state, '');
  saveState();
  render();
}

function restoreDay(archivedDayId) {
  restoreDayFromArchiveInState(state, archivedDayId);
  saveState();
  render();
}

function restoreTrip(archivedTripId) {
  if (!window.confirm('Restore this archived trip? Current board data will be replaced unless you archive it first.')) return;
  restoreTripInState(state, archivedTripId);
  saveState();
  render();
}

function closeActionMenu() {
  const dialog = document.getElementById('action-menu-dialog');
  if (dialog?.open) {
    dialog.close();
  }
}

function openActionMenu(options) {
  const dialog = document.getElementById('action-menu-dialog');
  const title = document.getElementById('action-menu-title');
  const actions = document.getElementById('action-menu-actions');
  if (!dialog || !actions || !title) return;

  title.textContent = options.title || 'Options';
  actions.innerHTML = options.items.map((item, index) => `
    <button type="button" class="action-menu-button${item.destructive ? ' destructive' : ''}" data-action-index="${index}">${escapeHTML(item.label)}</button>
  `).join('');

  actions.querySelectorAll('[data-action-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.actionIndex);
      const item = options.items[index];
      closeActionMenu();
      if (item && typeof item.onSelect === 'function') {
        item.onSelect();
      }
    });
  });

  if (dialog.showModal) {
    dialog.showModal();
  }
}

function showQuestMenu(questId) {
  const quest = findQuestById(questId);
  if (!quest) return;

  openActionMenu({
    title: quest.name || 'Quest options',
    items: [
      { label: 'View details', onSelect: () => openQuestDetails(questId) },
      { label: 'Delete quest', destructive: true, onSelect: () => removeQuest(questId) }
    ]
  });
}

function showDayMenu(dayId) {
  const day = state.days.find((entry) => entry.id === dayId);
  if (!day) return;
  const [dateText] = formatDateHeading(day.date).split('\n');

  openActionMenu({
    title: dateText || 'Day options',
    items: [
      { label: 'Add quest to day', onSelect: () => openAddQuestDialog(dayId) },
      { label: 'Archive this day', onSelect: () => archiveDay(dayId) },
      { label: 'Delete day', destructive: true, onSelect: () => removeDay(dayId) }
    ]
  });
}

function showContextForTarget(target) {
  const questCard = target.closest('.quest-card');
  if (questCard?.dataset.questId) {
    showQuestMenu(questCard.dataset.questId);
    return true;
  }

  const dayColumn = target.closest('.day-column');
  if (dayColumn?.dataset.dayId) {
    showDayMenu(dayColumn.dataset.dayId);
    return true;
  }

  return false;
}

function clearLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressStartPoint = null;
}

function setupLongPressContextActions() {
  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, input, textarea, dialog')) return;

    longPressTriggered = false;
    clearLongPress();
    longPressStartPoint = { x: event.clientX, y: event.clientY };
    longPressTimer = setTimeout(() => {
      longPressTriggered = showContextForTarget(event.target);
    }, 500);
  });

  document.addEventListener('pointerup', clearLongPress);
  document.addEventListener('pointercancel', clearLongPress);
  document.addEventListener('pointermove', (event) => {
    if (!longPressTimer || !longPressStartPoint) return;
    const distance = Math.hypot(event.clientX - longPressStartPoint.x, event.clientY - longPressStartPoint.y);
    if (distance > 10) {
      clearLongPress();
    }
  });

  document.addEventListener('click', (event) => {
    if (longPressTriggered) {
      event.preventDefault();
      event.stopPropagation();
      longPressTriggered = false;
    }
  }, true);

  document.addEventListener('contextmenu', (event) => {
    if (showContextForTarget(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      if (showContextForTarget(event.target)) {
        event.preventDefault();
        return;
      }
    }

    if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('.quest-card')) {
      event.preventDefault();
      const card = event.target.closest('.quest-card');
      if (card?.dataset.questId) {
        openQuestDetails(card.dataset.questId);
      }
    }
  });
}

function setupEventHandlers() {
  document.getElementById('add-day-button').addEventListener('click', addDay);
  document.getElementById('add-quest-button').addEventListener('click', () => openAddQuestDialog(''));
  document.getElementById('archive-trip-button')?.addEventListener('click', archiveTrip);

  document.getElementById('close-detail-dialog').addEventListener('click', () => {
    document.getElementById('quest-detail-dialog').close();
  });

  document.getElementById('close-add-quest-dialog').addEventListener('click', () => {
    document.getElementById('add-quest-dialog').close();
  });

  document.getElementById('close-action-menu-dialog')?.addEventListener('click', closeActionMenu);

  document.getElementById('library-filter')?.addEventListener('input', (event) => {
    uiState.libraryFilter = String(event.currentTarget.value || '');
    saveUiState();
    render();
  });

  document.getElementById('add-quest-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const targetDayId = form.querySelector('#quest-target-day-id')?.value || addQuestTargetDayId || '';

    addQuest({
      name: form.querySelector('#quest-name').value,
      location: form.querySelector('#quest-location').value,
      notes: form.querySelector('#quest-notes').value,
      link: form.querySelector('#quest-link').value
    }, targetDayId);

    form.reset();
    addQuestTargetDayId = '';
    document.getElementById('add-quest-dialog').close();
  });

  document.addEventListener('click', (event) => {
    const jump = event.target.closest('[data-jump-day]');
    if (jump) {
      document.querySelector(`.day-column[data-day-id="${CSS.escape(jump.dataset.jumpDay)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const addToDay = event.target.closest('.add-quest-to-day');
    if (addToDay) {
      openAddQuestDialog(addToDay.dataset.dayId);
      return;
    }

    const dayMenu = event.target.closest('.day-menu');
    if (dayMenu) {
      showDayMenu(dayMenu.dataset.dayId);
      return;
    }

    const collapseDay = event.target.closest('.collapse-day');
    if (collapseDay) {
      toggleDayCollapsed(collapseDay.dataset.dayId);
      return;
    }

    const restoreDayButton = event.target.closest('[data-restore-day]');
    if (restoreDayButton) {
      restoreDay(restoreDayButton.dataset.restoreDay);
      return;
    }

    const restoreTripButton = event.target.closest('[data-restore-trip]');
    if (restoreTripButton) {
      restoreTrip(restoreTripButton.dataset.restoreTrip);
      return;
    }

    const card = event.target.closest('.quest-card');
    if (card?.dataset.questId) {
      openQuestDetails(card.dataset.questId);
    }
  });

  setupLongPressContextActions();
}

window.TravelQuestApp = {
  state,
  uiState,
  addDay,
  addQuest,
  removeQuest,
  addScheduledInstance,
  removeScheduledInstance,
  moveScheduledInstance,
  reorderScheduledInstance,
  render,
  loadState,
  saveState,
  normalizeState,
  openQuestDetails,
  openAddQuestDialog,
  showDayMenu,
  showQuestMenu,
  archiveDay,
  archiveTrip,
  restoreDay,
  restoreTrip
};

setupEventHandlers();
render();
