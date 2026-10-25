# Wtyczka Obsidian ↔ Kaneo — ustalenia

Status: MVP (faza 1) gotowe — zob. `README.md`; faza 2 i 3 do zrobienia. Na razie żyje w `apps/obsidian`; później przeniesiemy do osobnego repozytorium (wymóg sklepu wtyczek Obsidiana).

## Stan rynku

Nie znaleziono istniejącej wtyczki Obsidiana dla Kaneo. Wzorzec: [Todoist Sync](https://community.obsidian.md/plugins/todoist-sync-plugin) ([kod](https://github.com/jamiebrynes7/obsidian-todoist-plugin), [query blocks](https://jamiebrynes7.github.io/obsidian-todoist-plugin/docs/query-blocks)).

## Jak działa wtyczka Todoist (wzorzec)

- Blok kodu ` ```todoist ` z YAML (`filter`, `name`, `groupBy`, `sorting`, `show`, `autorefresh`) renderowany jako żywa lista zadań (`registerMarkdownCodeBlockProcessor`).
- Synchronizacja głównie jednokierunkowa (Todoist → Obsidian). Z Obsidiana: odhaczanie zadania i komenda dodawania zadania. Zwykłe checkboxy `- [ ]` nie są synchronizowane.
- Token API weryfikowany zapytaniem o użytkownika, trzymany w bezpiecznym magazynie Obsidiana, okno onboardingu przy braku tokenu.
- Odświeżanie per blok (`autorefresh`) + metadane co 10 minut (`registerInterval`), ekran ustawień, komendy.

**Decyzja:** kopiujemy model „żywe zapytania + ograniczony zapis zwrotny”. Nie robimy dwustronnej synchronizacji checkboxów w notatkach (konflikty, duplikaty, ustalanie źródła prawdy).

## Co już daje API Kaneo (MVP bez zmian serwera)

- Klucze API: nagłówek `x-api-key`, limit 100 zapytań/min (`apps/api/src/auth.ts`).
- Device flow (jak w MCP: `packages/mcp/src/auth/device-flow.ts`); wymaga dopisania `kaneo-obsidian` do `DEVICE_AUTH_CLIENT_IDS`.
- `GET /task/global-board` — filtry: `workspaceId`, `projectId`, `assigneeId` (`me`, `unassigned`), `priority`, `label`, `dueDate` (`dueThisWeek`, `dueNextWeek`, `noDueDate`), `negate`, `q` (tytuł lub ticket ID, np. `KAN-12`), `globalStatus` (jeden na zapytanie), paginacja `page`/`limit` (max 100).
- `GET /task/assigned` — moje otwarte zadania (max 100).
- `PUT /task/status/{id}`, `POST /task/{projectId}`, `GET /task/by-ticket-id/{ticketId}`.
- Typowany klient: `@kaneo/libs`.

## Blok zapytania

````markdown
```kaneo
name: Moje na ten tydzień
assignee: me
project: [KAN]
priority: [high, urgent]
label: backend
due: dueThisWeek
status: [to-do, in-progress]
q: "{{filename}}"
groupBy: project        # project | status | priority | label
sort: [due, priority]
show: [ticket, due, project, labels]
autorefresh: 120
```
````

Mapowanie: `assignee`→`assigneeId`, `project`→`projectId`, `priority`, `label`, `due`→`dueDate`, `q`, `status`→`globalStatus` (jedno zapytanie na status). `{{filename}}` podstawiane nazwą notatki.

## Akcje

- Checkbox → przeniesienie zadania do końcowej kolumny projektu (`isFinal`); kolumny w cache.
- Kliknięcie tytułu → otwarcie zadania w Kaneo w przeglądarce.
- Komenda „Kaneo: dodaj zadanie” → modal (tytuł, projekt, priorytet, termin); zaznaczony tekst jako tytuł; wstawienie linku `[KAN-123](…)` do notatki.
- Komenda „Kaneo: odśwież” + przycisk odświeżania przy bloku.

## Szczegóły techniczne

1. **HTTP przez `requestUrl` Obsidiana**, nie `fetch` — omija CORS, działa z instancjami bundled i z osobno hostowanym API bez zmian w `CORS_ORIGINS`. Klient `@kaneo/libs` z własnym fetch opartym o `requestUrl`.
2. **Polling zamiast WebSocketów w MVP.** Przeglądarkowy WebSocket nie ustawi `x-api-key`, a Obsidian wysyła `Origin: app://obsidian.md`, którego `apps/api/src/ws/security.ts` nie przepuści. Live updates wymagają zmiany API (np. krótkotrwały token w URL) — faza 3.
3. **Limit 100 req/min** → wspólny cache i deduplikacja identycznych zapytań; odświeżamy tylko widoczne bloki.
4. **`globalStatus` pojedynczo** → wiele statusów = wiele zapytań. Ewentualnie później parametr „wszystkie otwarte” w API.
5. **Sekrety** w bezpiecznym magazynie Obsidiana, nigdy w `data.json` ani w logach.

## Struktura

Build: esbuild → `main.js`, `manifest.json`, `styles.css`. UI: czysty DOM lub Preact (mała paczka). Jeden plik — jedna odpowiedzialność, testy obok.

```
apps/obsidian/src/
  main.ts                      # Plugin: rejestracja bloku, komend, ustawień
  settings/settings-tab.ts     # URL instancji, logowanie, interwał
  auth/device-login.ts         # device flow (wzór z packages/mcp)
  auth/token-store.ts          # bezpieczny magazyn Obsidiana
  api/obsidian-fetch.ts        # fetch → requestUrl
  api/client.ts                # @kaneo/libs
  query/parse-query.ts (+test) # YAML → zapytanie
  query/to-board-params.ts (+test)
  query/query-cache.ts         # wspólny cache, deduplikacja
  render/query-block.ts        # MarkdownRenderChild
  render/task-item.ts
  commands/add-task-modal.ts
  commands/complete-task.ts
```

Instalacja na własny użytek: ręcznie lub przez BRAT. Publikacja w sklepie: osobne repo z `manifest.json` w katalogu głównym i release'ami zawierającymi `main.js` (można automatyzować z monorepo). Dokumentacja w `apps/docs`.

## Plan

1. **MVP:** klucz API, blok `kaneo`, odhaczanie, otwieranie w przeglądarce, odświeżanie.
2. Device flow, komenda dodawania zadania, znaczki statusu przy wzmiankach `KAN-123` (markdown post processor + `GET /task/by-ticket-id`).
3. (Opcjonalnie) live updates przez WebSocket po zmianie API; eksport zadania do notatki z `kaneo_id` we frontmatterze.
