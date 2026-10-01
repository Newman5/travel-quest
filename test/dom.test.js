import { JSDOM } from 'jsdom';
import path from 'path';
import { pathToFileURL } from 'node:url';

async function loadDom() {
  const html = `
    <!doctype html>
    <html>
      <body>
        <div id="days-container"></div>
        <div id="quest-library"></div>
        <dialog id="quest-detail-dialog"></dialog>
        <div id="quest-detail-content"></div>
        <h3 id="quest-detail-title"></h3>
        <button id="add-day-button"></button>
        <button id="add-quest-button"></button>
        <button id="close-detail-dialog"></button>
        <button id="close-add-quest-dialog"></button>
        <form id="add-quest-form">
          <input id="quest-name" value="">
          <input id="quest-location" value="">
          <textarea id="quest-notes"></textarea>
          <input id="quest-link" value="">
        </form>
        <input id="new-day-date" value="">
        <script id="travel-quest-seed" type="application/json">{"days":[{"id":"day-1","date":"2026-09-30","quests":[{"id":"inst-1","questId":"qigong"}]},{"id":"day-2","date":"2026-10-01","quests":[]}],"quests":[{"id":"qigong","name":"Qigong","location":"Daan Park","notes":"Morning session","link":""},{"id":"swimming","name":"Swimming","location":"Taipei"}]}</script>
      </body>
    </html>
  `;

  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;

  await import(pathToFileURL(path.resolve('src/assets/app.js')).href);
  return dom;
}

const { test } = await import('node:test');
const { default: assert } = await import('node:assert/strict');

test('dom renders seed data and respects the library vs scheduled instance distinction', async () => {
  const dom = await loadDom();
  const app = dom.window.TravelQuestApp;

  assert.equal(dom.window.document.querySelectorAll('.day-column').length, 2);
  assert.equal(dom.window.document.querySelectorAll('#quest-library .quest-card').length, 2);

  const firstDay = dom.window.document.querySelector('.day-column');
  const libraryQuest = dom.window.document.querySelector('#quest-library .quest-card[data-quest-id]');

  app.addScheduledInstance(firstDay.dataset.dayId, libraryQuest.dataset.questId, 0);
  app.render();

  const renderedDay = dom.window.document.querySelector('.day-column');
  assert.equal(app.state.days[0].quests.length, 2);
  assert.equal(dom.window.document.querySelectorAll('#quest-library .quest-card[data-quest-id]').length, 2);
  assert.equal(renderedDay.querySelectorAll('.quest-card[data-instance-id]').length, 2);
});
