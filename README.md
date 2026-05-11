# VoiceHub

Desktop application for voice cloning and text-to-speech, built with Electron + React + Vite.

## Features

- **Text to Speech** — Convert text to natural-sounding speech using multiple providers
- **Voice Cloning** — Clone voices using reference audio files
- **API Manager** — Manage multiple API keys with quota tracking
- **Portable** — No installation required, data stays with the app

## Tech Stack

- **Desktop**: Electron
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui-inspired components
- **Database**: better-sqlite3 (embedded, portable)
- **State**: Zustand
- **Audio**: Howler.js
- **HTTP**: Axios
- **Packager**: electron-builder

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run Electron in development mode
npm run electron:dev

# Type check
npm run typecheck

# Build for production
npm run electron:build
```

## Portable Distribution

### Windows
Produces a single `.exe` file (portable). Users just double-click to run — no installer needed.

### macOS
Produces a `.zip` containing the `.app`. Users extract and double-click the app.

### Data Storage
All user data (SQLite database, settings) is stored in a `voicehub-data` folder alongside the executable, keeping everything portable.

## Supported Providers

- TTS.ai
- Fish Audio
- ElevenLabs
- Custom providers

## Project Structure

```
voicehub/
├── electron/           # Electron main process
│   ├── main.ts         # Main process entry
│   ├── preload.ts      # IPC bridge
│   └── db.ts           # SQLite handler
├── src/                # React frontend
│   ├── components/     # UI components
│   ├── pages/          # Page components
│   ├── store/          # Zustand store
│   ├── lib/api/        # API integrations
│   └── types/          # TypeScript types
├── electron-builder.yml
├── vite.config.ts
└── package.json
```
