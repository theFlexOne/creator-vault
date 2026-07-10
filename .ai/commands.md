# Commands

## Main Commands

- Start a CLI command from source: `npm run start -- <command>`
- Fast startup check: `npm run start -- test-connection`
- Build distributable output: `npm run build`
- Compile TypeScript: `npm run compile`
- Run full test suite: `npm test`
- Run coverage: `npm run test:coverage`

## Focused Tests

- Commands tests: `npm run test:commands`
- Services tests: `npm run test:services`
- Library tests: `npm run test:lib`

## Database Utilities

- Seed database: `npm run db:seed`
- Dump schema: `npm run db:dump:schema`
- Dump one table: `npm run db:dump:table -- <table-name>`
- Dump data: `npm run db:dump:data`

## Command Policy

- Document only commands that already exist in `package.json`.
- Lint is not currently configured as an npm script.
- Format is not currently configured as an npm script.
- Do not invent lint or format commands in agent output; mark them as not configured yet unless the repo adds them later.
