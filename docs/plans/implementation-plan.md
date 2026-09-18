# Implementation plan

## Goal

Ship a public, dependency-free static site that lets one player practise the core *Mission Deep Sea* trick-taking loop with 2–4 AI crew mates. The project must not copy card art, card scans, or commercial logbook text.

## Delivered architecture

- `src/game.js`: pure rules primitives (40-card deck, legal-play enforcement, trump resolution, captain finding, legal sonar status, and bot choice).
- `src/app.js`: DOM renderer and state machine for setup, alternating human/bot turns, task success/failure, restart, and single sonar use.
- `tests/game.test.js`: Node tests for deck integrity, dealing, suit-following, trump resolution, and sonar legality.
- `scripts/build.mjs`: portable static build to `dist/`.
- GitHub Actions: test, syntax check, and build on every push/PR; Pages deployment from `main`.

## Acceptance criteria

1. A browser can launch a three-, four-, or five-diver mission with one human and AI crew.
2. The human cannot play an off-suit card when able to follow suit.
3. AI turns advance to a resolved trick without user input.
4. A task succeeds only when its assigned owner wins the card’s trick; a wrong owner ends the mission.
5. Lint, rule tests, production build, live Pages deployment, and a browser loop are verified.

## Rights boundary

Only rules abstractions and short original mission summaries belong in source. Do not add publisher artwork, scanned cards, direct transcription, or scraped BGG content without documented permission.
