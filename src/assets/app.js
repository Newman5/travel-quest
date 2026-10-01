import { generateId, addDayToState, addQuestToState, addScheduledInstanceToDay, removeScheduledInstanceFromDay, moveScheduledInstance as moveScheduledInstanceCore, reorderScheduledInstance as reorderScheduledInstanceCore, removeQuestFromState, normalizeState as normalizeStateCore } from './travel-quest-core.js';

const STORAGE_KEY = 'travel-quest-state-v1';
const seedScript = document.getElementById('travel-quest-seed');
const initialSeed = seedScript ? JSON.parse(seedScript.textContent) : { days: [], quests: [] };
const state = normalizeState(loadState() || initialSeed);

function normalizeState(candidate = { days: [], quests: [] }) {
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

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function findQuestById(questId) {
  return state.quests.find((quest) => quest.id === questId) || null;
}

function findDayById(dayId) {
  return state.days.find((day) => day.id === dayId) || null;
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

function render() {
  const daysContainer = document.getElementById('days-container');
  const library = document.getElementById('quest-library');

  daysContainer.innerHTML = state.days.map((day) => {
    const cards = day.quests.map((instance) => {
      const quest = findQuestById(instance.questId);
      if (!quest) return '';
      return renderQuestCard(quest, instance.id);
    }).join('');

    const [dateText, weekdayText] = formatDateHeading(day.date).split('\n');

    return `
      <div class="day-column" data-day-id="${escapeHTML(day.id)}" data-day-date="${escapeHTML(day.date)}">
        <div class="day-header">
          <div>
            <div class="day-date">${escapeHTML(dateText || '')}</div>
            <div class="day-weekday">${escapeHTML(weekdayText || '')}</div>
          </div>
          <button type="button" class="remove-day" data-day-id="${escapeHTML(day.id)}">Remove</button>
        </div>
        <div class="quest-list" data-day-id="${escapeHTML(day.id)}">
          ${cards || '<div class="day-empty">Drop a quest here</div>'}
        </div>
      </div>
    `;
  }).join('');

  library.innerHTML = state.quests.map((quest) => `
    <article class="quest-card" tabindex="0" data-quest-id="${escapeHTML(quest.id)}" data-instance-id="">
      <button type="button" class="quest-delete" data-quest-id="${escapeHTML(quest.id)}" aria-label="Remove ${escapeHTML(quest.name)}">×</button>
      <div class="quest-name">${escapeHTML(quest.name || 'Untitled quest')}</div>
      ${quest.location ? `<div class="quest-location">${escapeHTML(quest.location)}</div>` : ''}
    </article>
  `).join('');

  bindDragAndDrop();
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
      sort: false,
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
  state.days = state.days.filter((day) => day.id !== dayId);
  saveState();
  render();
}

function addQuest(questData) {
  addQuestToState(state, questData);
  saveState();
  render();
}

function removeQuest(questId) {
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

  dialog.showModal();
}

function setupEventHandlers() {
  document.getElementById('add-day-button').addEventListener('click', addDay);
  document.getElementById('add-quest-button').addEventListener('click', () => {
    document.getElementById('add-quest-dialog').showModal();
  });

  document.getElementById('close-detail-dialog').addEventListener('click', () => {
    document.getElementById('quest-detail-dialog').close();
  });

  document.getElementById('close-add-quest-dialog').addEventListener('click', () => {
    document.getElementById('add-quest-dialog').close();
  });

  document.getElementById('add-quest-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    addQuest({
      name: form.querySelector('#quest-name').value,
      location: form.querySelector('#quest-location').value,
      notes: form.querySelector('#quest-notes').value,
      link: form.querySelector('#quest-link').value
    });
    form.reset();
    document.getElementById('add-quest-dialog').close();
  });

  document.addEventListener('click', (event) => {
    const removeDayButton = event.target.closest('.remove-day');
    if (removeDayButton) {
      removeDay(removeDayButton.dataset.dayId);
      return;
    }

    const deleteQuestButton = event.target.closest('.quest-delete');
    if (deleteQuestButton) {
      removeQuest(deleteQuestButton.dataset.questId);
      return;
    }

    const card = event.target.closest('.quest-card');
    if (card && card.dataset.questId) {
      openQuestDetails(card.dataset.questId);
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('.quest-card')) {
      event.preventDefault();
      const card = event.target.closest('.quest-card');
      if (card && card.dataset.questId) {
        openQuestDetails(card.dataset.questId);
      }
    }
  });
}

window.TravelQuestApp = {
  state,
  addDay,
  removeDay,
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
  openQuestDetails
};

setupEventHandlers();
render();
