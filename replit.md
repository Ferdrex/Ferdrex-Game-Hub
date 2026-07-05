# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── game-center/        # Ferdrex Game Studios React app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Ferdrex Game Studios — Drex Arcade (artifacts/game-center)

React + Vite game center with Pip-Boy green terminal CRT aesthetic from the Game-Fix-Expansion zip (drex-arcade). All Fallout/VAULT-TEC/ROBCO references removed. Ferdrex Game Studios branding throughout.

### Visual Design
- Black background with green (#00FF00) monospace text (`Share Tech Mono`)
- CRT scanline overlay + vignette effects
- Cursor blink, flicker animations, glow effects on headers
- Boot screen with Ferdrex branding, transitions to main menu
- Multi-theme support: Green (default), Amber, Blue, Red

### Main Menu Structure
- **CHESS** (STRATEGY) — Human vs Human or Human vs AI with minimax
- **LASER ADVENTURE** (ACTION) — Pixel shooter vs cyber-drones
- **GAMES OF CHANCE / JUEGOS DE AZAR** (CHANCE) — Card games sub-menu
- **RADIATION RUNNER** (RUNNER) — Infinite runner

### Card Games Sub-menu (Juegos de Azar)
Tab-based sub-menu triggered by "Games of Chance" card:
- **Blackjack** — Betting, Hit/Stand/Double Down
- **Video Poker** — Five-card draw poker with payouts  
- **Solitaire** — Klondike solitaire

### Settings Panel
- Language: English ↔ Spanish toggle
- Theme: Green / Amber / Blue / Red
- Display: Desktop / Mobile

### Key source files
- `src/App.tsx` – Boot screen + main menu + game routing
- `src/context/AppContext.tsx` – Global settings, translations (EN/ES), THEME_COLORS
- `src/components/SettingsPanel.tsx` – Settings modal
- `src/games/ChessGame.tsx` – Chess with minimax AI
- `src/games/CardGames.tsx` – Blackjack + Video Poker + Solitaire
- `src/games/LaserAdventure.tsx` – Canvas-based shooter
- `src/games/RadiationRunner.tsx` – Infinite runner
- `src/index.css` – CRT terminal theme, glow, scanlines, pipboy-btn

### Chess Features (ChessGame.tsx)
- Custom minimax engine with alpha-beta pruning (no external library)
- En passant, castling, pawn promotion (interactive dialog)
- Flip board button for HvH local play
- Board coordinates (a-h, 1-8) rendered around the board
- All button/highlight colors driven by the active theme (`tc`)

### Theme System
- `AppProvider` applies CSS vars to `document.documentElement` via `useEffect` on theme change
- `THEME_COLORS` const (private to `AppContext.tsx`) maps each theme to HSL CSS vars
- Game cards in main menu have distinct accent colors per theme (4 shades per theme in `CARD_COLORS`)
- All games compute `tc` (theme color hex) from `settings.theme` directly

### Translations
All UI text via `t(key)` lookup in `TRANSLATIONS` (AppContext). Keys follow pattern:
`app.*`, `menu.*`, `game.*.name/desc/tag`, `chess.*`, `bj.*`, `poker.*`, `sol.*`, `boot.*`, `launch`

### Dependencies
- No external chess library — custom engine (431 lines with minimax)
- `Share Tech Mono` (Google Fonts) – Terminal monospace font

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
