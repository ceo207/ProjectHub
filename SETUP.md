# ProjectHub — Setup Instructions

## Prerequisites

### 1. Install Rust
Download and run: https://rustup.rs/

On Windows (PowerShell):
```powershell
winget install Rustlang.Rustup
```
Then restart your terminal.

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Install Tauri CLI prerequisites (Windows)
```powershell
# Install Visual Studio C++ Build Tools (required by Rust on Windows)
winget install Microsoft.VisualStudio.2022.BuildTools
# During install, select "Desktop development with C++"

# Install WebView2 (usually pre-installed on Windows 11)
winget install Microsoft.EdgeWebView2Runtime
```

---

## Running the App

### Development mode
```bash
npm run tauri dev
```

### Build for production
```bash
npm run tauri build
```

---

## Project Structure

```
ProjectHub/
├── src/                        # React frontend
│   ├── components/
│   │   ├── layout/             # Sidebar, TopBar, Layout
│   │   ├── shared/             # DataTable, StatCard, StatusBadge, etc.
│   │   └── ui/                 # shadcn/ui components
│   ├── db/
│   │   ├── schema.ts           # Drizzle ORM schema
│   │   ├── migrations.ts       # SQL CREATE TABLE statements
│   │   └── index.ts            # DB init + sqlite-proxy wrapper
│   ├── pages/                  # All 7 pages
│   ├── services/               # Data access layer
│   ├── locales/
│   │   ├── en.json             # English translations
│   │   └── ar.json             # Arabic translations
│   ├── types/index.ts          # TypeScript interfaces
│   ├── i18n.ts                 # i18next config + RTL direction
│   └── App.tsx                 # Router + DB init
└── src-tauri/                  # Rust/Tauri backend
    ├── src/lib.rs              # Tauri app with SQL plugin
    ├── Cargo.toml
    └── tauri.conf.json
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Stats cards, cost-over-time chart, project progress |
| **Employees** | Full CRUD, total hours & earnings calculated |
| **Projects** | Full CRUD, labor + hardware costs, progress % |
| **Project Details** | Requirements, team, work logs, hardware costs per project |
| **Work Logs** | Log hours per employee/project |
| **Hardware Costs** | Track hardware purchases per project |
| **Smart Search** | Search projects & employees with instant insights |
| **Bilingual** | English (LTR) ↔ Arabic (RTL) toggle |

---

## Language Switching

Click the **language button** in the top-right corner.  
- English → LTR layout, Inter font  
- Arabic → RTL layout (`dir="rtl"`), Cairo font  
- Selection is saved in `localStorage`

---

## Database

SQLite file is stored automatically by Tauri in:
- Windows: `%APPDATA%\com.projecthub.app\projecthub.db`

The database schema is created automatically on first launch.

### Sample Data
On first launch, click **"Load Sample Data"** on the dashboard to populate demo employees, projects, work logs, and hardware costs.

---

## Troubleshooting

**Error: `tauri` not found**  
Run `npm install` first. The Tauri CLI is installed as a dev dependency.

**SQLite permission error**  
Ensure the capabilities file at `src-tauri/capabilities/default.json` includes `sql:allow-execute`, `sql:allow-select`, `sql:allow-load`.

**Rust compilation fails**  
Ensure `rustup` is installed and the `stable` toolchain is active: `rustup default stable`
