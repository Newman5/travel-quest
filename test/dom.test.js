import { JSDOM } from 'jsdom';
import path from 'path';
import { pathToFileURL } from 'node:url';

async function loadDom(options = {}) {
  const html = `
    <!doctype html>
    <html>
      <body>
        <div id="days-jump"></div>
        <div id="days-container"></div>
        <div id="quest-library"></div>
        <div id="archived-days-list"></div>
        <div id="archived-trips-list"></div>
        <dialog id="quest-detail-dialog"></dialog>
        <div id="quest-detail-content"></div>
        <h3 id="quest-detail-title"></h3>
        <button id="add-day-button"></button>
        <button id="add-quest-button"></button>
        <button id="archive-trip-button"></button>
        <button id="close-detail-dialog"></button>
        <button id="close-add-quest-dialog"></button>
        <button id="close-action-menu-dialog"></button>
        <input id="library-filter" value="">
        <dialog id="action-menu-dialog"></dialog>
        <h3 id="action-menu-title"></h3>
        <div id="action-menu-actions"></div>
        <dialog id="add-quest-dialog"></dialog>
        <h3 id="add-quest-title"></h3>
        <form id="add-quest-form">
          <input id="quest-target-day-id" value="">
          <input id="quest-name" value="">
          <input id="quest-location" value="">
          <textarea id="quest-notes"></textarea>
          <input id="quest-link" value="">
        </form>
        <input id="new-day-date" value="">
        <script id="travel-quest-seed" type="application/json">{"days":[{"id":"day-1","date":"2026-09-30","quests":[{"id":"inst-1","questId":"qigong"}]},{"id":"day-2","date":"2026-10-01","quests":[]}],"quests":[{"id":"qigong","name":"Qigong","location":"Daan Park","notes":"Morning session","link":""},{"id":"swimming","name":"Swimming","location":"Taipei"}],"archivedDays":[],"archivedTrips":[]}</script>
      </body>
    </html>
  `;

  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CSS = { escape: (value) => String(value) };
  if (options.Sortable) {
    global.Sortable = options.Sortable;
    dom.window.Sortable = options.Sortable;
  } else {
    delete global.Sortable;
  }
  dom.window.confirm = () => true;

  for (const id of ['quest-detail-dialog', 'add-quest-dialog', 'action-menu-dialog']) {
    const dialog = dom.window.document.getElementById(id);
    dialog.showModal = function showModal() { this.open = true; };
    dialog.close = function close() { this.open = false; };
  }

  await import(pathToFileURL(path.resolve('src/assets/app.js')).href);
  return dom;
}

const { test } = await import('node:test');
const { default: assert } = await import('node:assert/strict');

test('dom supports quick-add to day, top insertion, and archive/restore', async () => {
  const sortableConfigs = [];
  class SortableMock {
    constructor(element, options) {
      this.element = element;
      this.options = options;
      sortableConfigs.push({ element, options });
    }

    destroy() {}
  }

  const dom = await loadDom({ Sortable: SortableMock });
  const app = dom.window.TravelQuestApp;
  const dayListCount = dom.window.document.querySelectorAll('.quest-list').length;

  assert.equal(dom.window.document.querySelectorAll('.day-column').length, 2);
  assert.equal(dom.window.document.querySelectorAll('#quest-library .quest-card').length, 2);
  assert.equal(dom.window.document.querySelectorAll('#quest-library .quest-card .drag-handle').length, 2);
  assert.equal(dom.window.document.querySelectorAll('.quest-list .quest-card .drag-handle').length, 1);
  assert.equal(sortableConfigs.length, dayListCount + 1);
  for (let index = 0; index < sortableConfigs.length; index += 1) {
    const { options } = sortableConfigs[index];
    assert.equal(options.draggable, '.quest-card');
    assert.equal(options.animation, 150);
    assert.equal(options.handle, '.drag-handle');
  }

  const dayId = app.state.days[0].id;
  app.addQuest({ name: 'Tea House', location: 'Maokong' }, dayId);

  assert.equal(app.state.quests[0].name, 'Tea House');
  assert.equal(app.state.days[0].quests.length, 2);

  app.archiveDay(dayId);
  assert.equal(app.state.days.length, 1);
  assert.equal(app.state.archivedDays.length, 1);

  app.restoreDay(app.state.archivedDays[0].id);
  assert.equal(app.state.days.length, 2);

  app.archiveTrip();
  assert.equal(app.state.archivedTrips.length, 1);
  assert.equal(app.state.days.length, 0);

  app.restoreTrip(app.state.archivedTrips[0].id);
  assert.equal(app.state.days.length, 2);
  assert.equal(app.state.quests.length, 3);
});
