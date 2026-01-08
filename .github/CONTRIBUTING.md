# Contributing to GitHub PR Reminder

Thank you for contributing to GitHub PR Reminder! This document provides guidelines for contributing to the project.

## Development Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Run development mode: `pnpm dev`
4. Run tests: `pnpm test`
5. Run linter: `pnpm lint`

## Code Standards

This project follows the patterns documented in [CLAUDE.md](../CLAUDE.md). Please read this document before contributing to understand:

- Electron architecture patterns (Main/Renderer process separation)
- Database patterns (Drizzle ORM)
- React component patterns
- TailwindCSS best practices
- TypeScript conventions
- Security best practices

## Commit Message Convention

We use conventional commit messages with additional tags for documentation purposes:

### Standard Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or updates
- `chore`: Build process or auxiliary tool changes

### Special Documentation Tags

Use these tags in commit messages to document important lessons:

- `[lesson]`: Important lesson learned during development
- `[antipattern]`: Documents an antipattern that was fixed
- `[security]`: Security-related fix or improvement
- `[breaking]`: Breaking change that affects existing functionality

### Examples

```
fix(tray): prevent tray icon garbage collection [lesson]

Fixed memory leak where tray icon could be garbage collected.
Used module-level variable instead of local variable.

Lesson: Electron Tray objects must be kept in scope to prevent
garbage collection. Always use module-level or persistent storage.

Related: #123
```

```
perf(database): add indexes for frequently queried columns [lesson]

Added indexes on repositories.enabled and repositories.order columns.
Query performance improved from 150ms to 5ms on large datasets.

Lesson: Profile queries before optimizing. Indexes on filter/sort
columns can dramatically improve performance.
```

## Pull Request Process

1. **Create a branch** from `main` with a descriptive name
   - Feature: `feature/description`
   - Bug fix: `fix/description`
   - Refactor: `refactor/description`

2. **Make your changes** following the code standards in CLAUDE.md

3. **Write/update tests** for your changes

4. **Run the test suite** and ensure all tests pass
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

5. **Document lessons learned** in the PR description if applicable
   - Did you fix a bug? Document what went wrong
   - Did you discover a better pattern? Share it
   - Did you encounter a gotcha? Help others avoid it

6. **Create a Pull Request** using the PR template
   - Fill out all sections
   - Include screenshots for UI changes
   - Reference related issues
   - Complete the "Lessons Learned" section if applicable

7. **Address review feedback** promptly and professionally

8. **Keep your branch updated** with main if needed

## Documenting Lessons Learned

When you encounter bugs, mistakes, or learn important lessons:

1. **In Pull Requests**: Use the "Lessons Learned" section in the PR template
2. **In Commit Messages**: Use `[lesson]` tag to highlight important discoveries
3. **In CLAUDE.md**: Add significant lessons to the "Lessons Learned" section

### What to Document

Document lessons when:
- You fix a non-obvious bug
- You discover a better pattern than what was used before
- You encounter Electron/React/TypeScript gotchas
- You make security improvements
- You optimize performance significantly
- You solve an architectural challenge

### What NOT to Document

Don't document:
- Typo fixes
- Simple code formatting changes
- Obvious bug fixes (e.g., "fixed variable name typo")
- Normal feature additions that follow existing patterns

### Entry Format

```markdown
**Date**: YYYY-MM-DD
**Category**: Bug/Performance/Security/Architecture/etc.
**Problem**: What went wrong or what mistake was made
**Solution**: How it was fixed
**Lesson**: What we learned and how to avoid it in the future
**Related**: Links to PRs, issues, or commits
```

## Code Review Guidelines

When reviewing code:

1. **Check against CLAUDE.md patterns**
   - Does it follow the documented best practices?
   - Are there security concerns?
   - Is the TypeScript properly typed?

2. **Provide constructive feedback**
   - Explain why a change is needed
   - Suggest alternatives when possible
   - Link to relevant documentation

3. **Approve when ready**
   - All tests pass
   - Code follows project standards
   - Documentation is updated if needed

## Questions?

If you have questions about contributing:
- Check [CLAUDE.md](../CLAUDE.md) for development patterns
- Open an issue for discussion
- Review closed PRs for examples

Thank you for contributing! 🎉
