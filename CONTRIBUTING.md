# Contributing Guidelines

Thank you for contributing to **Campus Operations Platform (`campus-ops`)**!

---

## 📌 Phase-Based Engineering Approach

This product follows a strict 11-phase, prompt-driven build roadmap for independent, single-tenant college deployments as specified in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 💬 Commit Message Convention

We enforce the **Conventional Commits** specification (`<type>(<scope>): <short description>`) to keep git history readable and automated logs clean.

### Allowed Commit Types:

- `feat`: A new feature or user-facing functionality (e.g. `feat(auth): implement Better Auth session handler`)
- `fix`: A bug fix (e.g. `fix(tc): resolve clearance step status update race condition`)
- `docs`: Documentation only changes (e.g. `docs(architecture): update phase 0 setup notes`)
- `style`: Changes that do not affect code logic (formatting, missing semi-colons, white-space)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `test`: Adding missing tests or correcting existing unit/integration tests
- `chore`: Maintenance tasks, package manager updates, tool configuration (e.g. `chore(deps): update prisma`)
- `ci`: CI/CD pipeline changes (e.g. `ci(github): add vitest step`)

---

## 🛡️ Pre-Commit & CI Quality Checks

Before any commit is accepted into the repository, local and remote hygiene checks are automatically executed:

### Local Pre-Commit Hooks (Husky + lint-staged)

On `git commit`, Husky runs `lint-staged` over staged files:

- **TypeScript/JavaScript**: Runs `eslint --fix` and `prettier --write`.
- **JSON/Markdown/YAML/CSS**: Runs `prettier --write`.

Any linting or formatting error will **block** the commit until resolved.

### Continuous Integration (GitHub Actions)

Every `push` and `pull_request` to `main`/`master` triggers GitHub Actions CI checks (`.github/workflows/ci.yml`):

1. **Typecheck**: `pnpm run typecheck` (`tsc --noEmit`)
2. **Linting**: `pnpm run lint` (`next lint`)
3. **Unit Tests**: `pnpm run test` (`vitest run`)

---

## 🛠️ Useful Commands

```bash
# Run dev server
pnpm dev

# Run type check
pnpm run typecheck

# Run unit tests
pnpm run test

# Format code with Prettier
pnpm run format

# Run ESLint
pnpm run lint
```
