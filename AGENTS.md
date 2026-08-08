# Run4Travel — Agent Notes

## Priority reading

1. `CONSTITUTION.md` — product + design + Spec-Driven rules (source of truth)
2. `docs/design/batllo.md` — design tokens overview
3. `specs/` — feature specs before implementation (§23)
4. Expo docs for this version: https://docs.expo.dev/versions/v57.0.0/

## Hard constraints from constitution

- LLMs may select/order/explain places — **never invent route geometry**
- Offline-first during runs
- Safety > discovery / photography / community
- AI UX language uses **✦**, never “LLM”
- Important features require a written spec first

## Stack

Expo + React Native + TypeScript. Design tokens live in `src/theme/batllo.ts`.
