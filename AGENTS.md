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
