# Copilot Instructions for Locasun Frontend Codebase

## Overview
This is a React + Vite + Tailwind CSS project for Locasun's frontend. The codebase is organized by feature and role (admin/client), with reusable UI components and custom hooks. The build system uses Vite, and Tailwind is configured via `tailwind.config.js` and `postcss.config.js`.

## Architecture
- **src/**: Main source folder. Contains:
  - **components/**: Shared React components, grouped by feature and role.
  - **pages/**: Route-level components, organized by user type (admin/client).
  - **layouts/**: Layout wrappers for admin/client views.
  - **ui/**: Atomic UI elements (buttons, dialogs, etc.) using Tailwind.
  - **hooks/**: Custom React hooks (e.g., `useWindowSize.js`).
  - **config/**: Static configuration (e.g., form fields).
  - **data/**: Static data (e.g., `projects.js`).
  - **lib/**: Utility functions.
- **plugins/**: Vite plugins and visual editor scripts. Custom plugins for iframe routing and edit mode.
- **public/**: Static assets.

## Developer Workflows
- **Start dev server:** `npm run dev`
- **Build for production:** `npm run build`
- **Preview production build:** `npm run preview`
- **Tailwind:** Configured via `tailwind.config.js` and `postcss.config.js`. Use utility classes for styling.
- **No test scripts detected** (add if needed).

## Patterns & Conventions
- **Component Structure:** Prefer function components. Group by feature/role. Use atomic UI elements from `ui/`.
- **State Management:** Local state via React hooks. No global state library detected.
- **Routing:** Page components in `pages/` map to routes. Layouts wrap page components.
- **Custom Vite Plugins:** See `plugins/` for iframe route restoration and edit mode integration.
- **Styling:** Use Tailwind utility classes. Avoid custom CSS except in `index.css`.
- **Data:** Static data in `data/`. No API integration detected.

## Integration Points
- **Vite Plugins:** Custom plugins in `plugins/` for advanced routing and editor features.
- **Visual Editor:** Scripts in `plugins/visual-editor/` for edit mode and inline editing.

## Examples
- **Reusable UI:** `src/ui/button.jsx`, `src/ui/dialog.jsx`
- **Admin Features:** `src/components/admin/`, `src/pages/admin/`
- **Client Features:** `src/components/client/`, `src/pages/client/`
- **Custom Hook:** `src/hooks/useWindowSize.js`

## Tips for AI Agents
- Reference atomic UI components for new features.
- Follow feature/role-based organization for new files.
- Use Tailwind classes for all styling.
- For new plugins, place in `plugins/` and follow existing patterns.
- If adding tests, create a `tests/` folder and document conventions here.

---
For questions or missing conventions, ask the user for clarification or examples.
