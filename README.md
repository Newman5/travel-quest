# Travel Quest

Travel Quest is a small paper-inspired vacation planner for arranging possible activities across a trip. It keeps the day-by-day structure simple: the top of the screen shows a row of day columns, while the bottom contains a persistent Quest Library of reusable activities.

## Paper-planner concept

The app is intentionally modeled on a physical planning sheet. Days are columns, and quests are cards you can move around visually to sketch out a trip. The goal is to make planning feel lightweight and tactile rather than like a full itinerary tool.

## Quest Library vs. scheduled QuestInstance

A Quest is a reusable activity definition, such as Qigong or Sunset Hike. A QuestInstance is a scheduled copy of that quest on a specific day. This distinction matters:

- Quest Library → Day = clone
- Day → Day = move
- Within Day = reorder
- Day → Quest Library = remove scheduled instance

The Quest Library is not an unscheduled queue. The original quest remains in the library even after it is scheduled multiple times.

## Technology stack

- Eleventy (11ty)
- Nunjucks templates
- YAML seed data
- vanilla JavaScript
- SortableJS for drag-and-drop
- plain CSS
- browser localStorage for persistence

## YAML seed data

The project uses YAML as the initial application seed. The file lives in `src/_data/travelQuestSeed.yaml` and is loaded when the app starts. The app does not modify the YAML file in the browser.

## localStorage persistence

On startup:

1. Check `localStorage` for a saved Travel Quest state.
2. If a saved state exists, load it.
3. Otherwise, initialize the app from the YAML seed data.
4. Render the board.

After meaningful changes such as adding days, removing quests, scheduling quests, moving them, or reordering them, the current state is saved back to `localStorage`.

## Install and run locally

```bash
npm install
npm run build
npm run start
```

Then open the generated local site in your browser (typically at http://localhost:8080).

## MVP scope

This project intentionally stays narrow. It does not include:

- maps or weather
- reservations or calendars
- accounts or cloud sync
- advanced quest editing
- YAML import/export
- generalized trip-domain modeling

The goal is to validate the core interaction: visually arranging possible activities into days and keeping the plan simple, fast, and memorable.
