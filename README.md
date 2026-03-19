# Daily Planner

A modern, professional daily task planner built with Next.js 16, TypeScript, and SQLite.

## Features

### Task Management
- **Rich task properties** — title, description, priority (high/medium/low/none), date, deadline, time estimate, actual time spent
- **Subtasks** — break tasks into smaller steps with a visual progress bar
- **Labels** — tag tasks with colored labels for flexible categorization
- **Recurring tasks** — daily, weekly, weekdays, monthly, yearly, or custom schedules
- **Reminders** — set datetime reminders on any task
- **Audit log** — every change to a task is tracked and viewable

### Organization
- **Inbox** — a default list that catches all new tasks
- **Custom lists** — create lists with a name, emoji icon, and color
- **Four views** — Today, Next 7 Days, Upcoming, and All Tasks
- **Overdue tracking** — overdue tasks are highlighted with a badge count
- **Toggle completed** — show or hide completed tasks in any view

### Search
- **Fuzzy search** powered by Fuse.js — finds tasks by title, description, or labels

### Interface
- **Dark and light themes** — defaults to system preference, toggle in sidebar
- **Responsive layout** — collapsible sidebar on desktop, slide-out sheet on mobile
- **Split view** — sidebar for navigation, main panel for tasks, slide-in detail panel
- **Smooth animations** — Framer Motion for list transitions, panel slides, and interactions
- **Calendar date pickers** — visual scheduling for dates and deadlines

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript (strict) |
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Styling | [Tailwind CSS](https://tailwindcss.com) v4 |
| Components | [shadcn/ui](httpsui.com) (base-ui primitives) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Search | [Fuse.js](https://fusejs.io) |
| Theming | [next-themes](https://github.com/pacocoursey/next-themes) |
| Dates | [date-fns](https://date-fns.org) |
| Icons | [Lucide](https://lucide.dev) |
| Testing | Node.js test runner via tsx |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js 18+)
- macOS, Linux, or Windows

### Installation

```bash
git clone <repository-url>
cd todo-mimo-v2-pro
bun install
```

The `better-sqlite3` native module needs to be compiled for your platform:

```bash
cd node_modules/better-sqlite3 && npm run build-release && cd ../..
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
bun run build
bun run start
```

### Tests

```bash
bun run test
```

Runs 76 unit tests across 8 suites covering all query functions (lists, labels, tasks, subtasks, task labels, reminders, audit log, search).

## Project Structure

```
src/
├── app/
│   ├── api/                    # 16 API route handlers
│   │   ├── labels/             # Label CRUD
│   │   ├── lists/              # List CRUD
│   │   ├── reminders/          # Reminder deletion
│   │   ├── search/             # Fuzzy task search
│   │   ├── subtasks/           # Subtask CRUD + toggle
│   │   └── tasks/              # Task CRUD, toggle, subtasks, labels, reminders, audit, overdue
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Entry point
│   └── globals.css             # Theme variables + base styles
├── components/
│   ├── app-shell.tsx           # Main layout (sidebar + content + detail panel)
│   ├── sidebar.tsx             # Navigation, lists, labels, search, theme toggle
│   ├── task-list.tsx           # Task list with grouping and quick-add
│   ├── task-detail.tsx         # Slide-in detail panel with all task properties
│   ├── search-results.tsx      # Fuzzy search results view
│   ├── theme-provider.tsx      # next-themes wrapper
│   └── ui/                     # 18 shadcn/ui components
└── lib/
    ├── db.ts                   # SQLite initialization and schema
    ├── queries.ts              # 25+ database query functions
    ├── store.tsx               # React context for UI state
    ├── types.ts                # TypeScript type definitions
    ├── utils.ts                # Utility functions (cn)
    └── __tests__/
        └── queries.test.ts     # 76 unit tests
```

## Database

The app uses a local SQLite database stored at `data/planner.db`. The schema is created automatically on first run and includes:

| Table | Purpose |
|-------|---------|
| `lists` | Task lists (inbox + custom) |
| `labels` | Color-coded labels |
| `tasks` | Main task records |
| `subtasks` | Subtask checklist items |
| `reminders` | Datetime reminders per task |
| `task_labels` | Many-to-many task-label junction |
| `attachments` | File attachment metadata |
| `audit_logs` | Change history for every task |

## API Reference

### Lists
- `GET /api/lists` — List all lists
- `POST /api/lists` — Create a list (`{ name, color?, emoji? }`)
- `GET /api/lists/:id` — Get a list
- `PATCH /api/lists/:id` — Update a list
- `DELETE /api/lists/:id` — Delete a list (cannot delete Inbox)

### Labels
- `GET /api/labels` — List all labels
- `POST /api/labels` — Create a label (`{ name, color?, icon? }`)
- `GET /api/labels/:id` — Get a label
- `PATCH /api/labels/:id` — Update a label
- `DELETE /api/labels/:id` — Delete a label

### Tasks
- `GET /api/tasks?listId=&view=&showCompleted=&labelId=` — List tasks with filters
- `POST /api/tasks` — Create a task (`{ title, listId, priority?, date?, deadline?, estimate?, recurring? }`)
- `GET /api/tasks/:id` — Get a task with relations
- `PATCH /api/tasks/:id` — Update a task
- `DELETE /api/tasks/:id` — Delete a task
- `POST /api/tasks/:id/toggle` — Toggle task completion
- `GET /api/tasks/overdue` — Get overdue tasks

### Subtasks
- `POST /api/tasks/:id/subtasks` — Create a subtask (`{ title }`)
- `PATCH /api/subtasks/:id` — Update a subtask
- `DELETE /api/subtasks/:id` — Delete a subtask
- `POST /api/subtasks/:id/toggle` — Toggle subtask completion

### Task Labels
- `POST /api/tasks/:id/labels` — Add a label (`{ labelId }`)
- `DELETE /api/tasks/:id/labels?labelId=` — Remove a label

### Reminders
- `POST /api/tasks/:id/reminders` — Create a reminder (`{ reminderAt }`)
- `DELETE /api/reminders/:id` — Delete a reminder

### Audit Log
- `GET /api/tasks/:id/audit` — Get change history for a task

### Search
- `GET /api/search?q=` — Fuzzy search across tasks

## License

Private
