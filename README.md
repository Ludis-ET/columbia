# Columbia

React + Vite + TypeScript app managed with pnpm. Commits run ESLint and Prettier via Husky + lint-staged.

## Setup

```bash
pnpm install
```

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Start the Vite dev server          |
| `pnpm build`        | Typecheck and build for production |
| `pnpm preview`      | Preview the production build       |
| `pnpm lint`         | Run ESLint                         |
| `pnpm lint:fix`     | Run ESLint with auto-fix           |
| `pnpm format`       | Format with Prettier               |
| `pnpm format:check` | Check Prettier formatting          |

## Git hooks

After `pnpm install`, Husky installs a `pre-commit` hook that runs `lint-staged` (ESLint `--fix` + Prettier on staged files).
