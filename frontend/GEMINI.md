# GEMINI.md - Project Context

This file provides instructional context for Gemini CLI when working in this repository.

## Project Overview

- **Type**: Next.js Web Application
- **Core Tech Stack**: Next.js 16.2.2+, React 19 (with React Compiler), TypeScript, Tailwind CSS 4.
- **UI & Styling**: Shadcn UI components, Lucide React icons, OKLCH color space.
- **State Management**: TanStack React Query (v5+) for data fetching and caching.
- **Key Features**:
  - Social-media-like feed with infinite scroll (`PostFeed`, `CommentFeed`).
  - Threaded discussions (`ThreadNode`, `CommentNode`).
  - Authentication simulation via `useAuth` hook.
  - Interactive forms for posts and comments (`SubmitForm`, `ReplyForm`).

## Building and Running

- **Development**: `npm run dev` (or `pnpm dev`, `yarn dev`).
- **Production Build**: `npm run build`.
- **Start Production**: `npm start`.
- **Linting**: No explicit lint command found in `package.json`, but `next lint` is standard for Next.js.
- **Type Checking**: `tsc` (TypeScript compiler).

## Development Conventions

### 1. Architectural Patterns
- **Next.js 15+ Standards**: Always use `use client` for client-side components. Be aware of the "NOT the Next.js you know" warning in `AGENTS.md` regarding breaking changes in newer Next.js versions (e.g., `params` being a Promise in `page.tsx`).
- **Data Fetching**: Use React Query for all server state. Wrap application in `QueryProvider`. Use `queryKey` and `fetchFn` patterns for feeds.
- **Styling**: 
  - Use Tailwind CSS 4 utility classes.
  - Use the `cn` utility from `@/lib/utils` for conditional class merging.
  - Prefer OKLCH colors as defined in `src/app/globals.css`.
- **Layout**: Follow the sticky sidebar + centered main content area (`max-w-2xl`) pattern in `src/app/layout.tsx`.

### 2. Component Guidelines
- **Icons**: Exclusively use `lucide-react`.
- **UI Components**: Use components from `src/components/ui/` (Shadcn UI).
- **Authentication**: Use the `useAuth` hook from `@/hooks/use-auth` to check session state and user info.
- **Forms**: Use `SubmitForm` for post creation and `ReplyForm` for comments.

### 3. File Structure
- `src/app/`: App Router pages and layouts.
- `src/components/`: Reusable UI and layout components.
- `src/hooks/`: Custom React hooks (e.g., `use-auth`).
- `src/lib/`: Utility functions.
- `public/`: Static assets.

## Specific Constraints
- **Next.js Version**: This project uses a very new version of Next.js (16.2.2). Refer to `node_modules/next/dist/docs/` for specific API changes if standard documentation fails.
- **React Compiler**: The React Compiler is enabled in `next.config.ts`. Avoid manual `useMemo` or `useCallback` unless specifically needed for optimization outside the compiler's scope.
