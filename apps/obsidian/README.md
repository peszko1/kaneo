# Kaneo for Obsidian

Show live Kaneo task lists in your notes and check tasks off without leaving Obsidian.

## Install

1. Run `pnpm --filter @kaneo/obsidian build` from the repository root.
2. Copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/kaneo/`.
3. Turn on **Kaneo** under Settings → Community plugins.

Needs Obsidian 1.11.4 or later, for its secret storage.

## Connect

1. In Kaneo, create an API key under Account settings → Developer.
2. In Obsidian, open Settings → Kaneo.
3. Set **Kaneo address** to the address you open Kaneo at.
4. Set **API address** only when the API runs on a different host.
5. Pick or create a secret for **API key** and paste the key. Obsidian keeps it in its secret storage; `data.json` holds only the secret's name.
6. Press **Check**.

## Query blocks

````markdown
```kaneo
name: My week
assignee: me
project: [KAN]
priority: [high, urgent]
label: backend
due: dueThisWeek
status: [to-do, in-progress]
q: "{{filename}}"
groupBy: project
sort: [due, priority]
show: [ticket, due, project, labels]
autorefresh: 120
```
````

Every option is optional. A single value or a list works for each list option.

| Option        | Values                                                                 | Default                 |
| ------------- | ---------------------------------------------------------------------- | ----------------------- |
| `name`        | Block title                                                            | `Kaneo`                 |
| `assignee`    | `me`, `unassigned`, a member's name or user ID                         | anyone                  |
| `project`     | Project keys such as `KAN`, or project IDs                             | every project           |
| `priority`    | `no-priority`, `low`, `medium`, `high`, `urgent`                       | any                     |
| `label`       | Label names; a task matches with any of them                           | any                     |
| `due`         | `dueThisWeek`, `dueNextWeek`, `noDueDate`                              | any                     |
| `status`      | `to-do`, `in-progress`, `done` (global board statuses)                 | `[to-do, in-progress]`  |
| `q`           | Title text or a ticket ID such as `KAN-12`; `{{filename}}` is the note | none                    |
| `groupBy`     | `project`, `status`, `priority`, `label`                               | none                    |
| `sort`        | `due`, `priority`, `title`, `project`, `status`                        | priority, then due date |
| `show`        | `ticket`, `due`, `project`, `labels`, `priority`, `status`, `assignee` | `[ticket, due, project]` |
| `autorefresh` | Seconds; `0` turns it off                                              | plugin setting (300)    |

Each status costs one request and returns at most 100 tasks. The block says when it shows fewer tasks than match.

## Actions

- Check a task to move it to its project's first done column. Uncheck it to move it back to the first to-do column.
- Click a title to open the task in Kaneo.
- Press the refresh button on a block, or run **Kaneo: Refresh task blocks**, to load every block again.

Blocks refresh only while they are on screen. Blocks with the same query share requests, which keeps the plugin under Kaneo's limit of 100 requests per minute per API key.
