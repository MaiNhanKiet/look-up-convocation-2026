# Development Agent Guidelines

## Efficiency

- Prefer minimal, targeted changes.
- Inspect only files relevant to the task.
- Search filenames and symbols before reading full files.
- Avoid repository-wide scans unless necessary.
- Do not repeatedly read unchanged files.
- Avoid redundant commands and excessive output.
- Do not generate lengthy plans for simple tasks.

## Scope

- Implement the user's request completely.
- Do not refactor unrelated code.
- Preserve existing architecture and conventions.
- Fix directly related issues when necessary.
- Report unrelated issues without modifying them.

## Full-Stack Consistency

When modifying application data:

- Trace affected paths from database to UI.
- Update Prisma schema and migrations if required.
- Update API queries, response mappings and types.
- Update frontend components consuming changed data.
- Check null handling and backward compatibility.
- Avoid unrelated modifications.

## Database Safety

- Never reset or delete databases or volumes.
- Never modify production DB without approval.
- Check migration history before creating migrations.
- Preserve existing records and data compatibility.
- Do not recreate migrations already applied.

## Validation

- Prefer targeted type checks and tests.
- Do not run full test suites unnecessarily.
- Investigate failures before repeating commands.
- Do not skip essential validation to save tokens.

## Communication

- Be concise.
- Avoid repeating completed reasoning.
- Report only:
  1. Changes made
  2. Validation results
  3. Remaining issues
- Stop once the requested task is complete.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
