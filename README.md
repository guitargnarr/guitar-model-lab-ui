# guitar-model-lab-ui

Standalone React frontend for [guitar-model-lab](https://github.com/guitargnarr/guitar-model-lab). Generates guitar exercises by root, scale, pattern, and tuning with 3D visualization.

> **Note:** For an integrated practice experience (exercise generation + adaptive practice + difficulty analysis + spaced repetition + MIDI playback), use [gp-tab-video](https://github.com/guitargnarr/gp-tab-video)'s practice engine instead:
> ```bash
> node src/practice.mjs serve
> ```
> The practice engine includes the same generation capabilities plus a full browser-based practice UI.

## Setup

```bash
npm install
npm run dev
```

## Stack

- React + TypeScript + Vite
- Connects to guitar-model-lab API for GP5 generation
