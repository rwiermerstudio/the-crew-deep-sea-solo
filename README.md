# Deep Sea Crew — solo mode

A static, browser-only fan companion for *The Crew: Mission Deep Sea*. It gives one human diver a table of AI crew mates so the cooperative trick-taking loop can be explored solo.

## Play

- Choose a mission and a crew size (you + 2–4 AI divers).
- The holder of Submarine 4 captains the first trick.
- Follow suit where possible; submarines are trump.
- Each recovery task names a target card and the diver who must win that trick.
- AI divers take their turns automatically. A scored move evaluator protects recovery cards, prioritises winning an active assigned task, avoids stealing teammates’ tasks, preserves submarine trump, and learns public suit voids to avoid leads likely to be trumped.
- Use **Broadcast sonar** once to disclose an automatically selected legal card fact from your hand.

The mission briefings are short original summaries and the UI uses original CSS artwork. Published card art, task-card faces, exact logbook prose, and mission-card scans are deliberately excluded. This is unofficial, non-commercial, and requires familiarity with the published game rules.

## Local development

Requires Node 22+; there are no runtime dependencies.

```sh
make verify
python3 -m http.server 8080
```

Then open `http://localhost:8080`. `npm run build` copies the portable static site into `dist/`.

## Scope / limitations

- The project implements the core follow-suit, trump, captain, task, and one-use sonar mechanics.
- It currently includes 24 concise original mission briefs, rather than transcribing the commercial logbook.
- The bot policy is intentionally lightweight and deterministic in intent rather than a competitive solver. It is suitable as a solo practice loop, not a claim of optimal play.
- There is no online multiplayer, tracking account, or server.

## Sources and rights

Mechanics were checked against the supplied rulebook. The user also supplied the public logbook page and a community mission-card link; the community source was bot-blocked during implementation and no content was copied from it. The reference links are not bundled or scraped by the site:

- [Official/game logbook page provided by requester](https://www.64ouncegames.com/pages/the-crew-mission-deep-sea)
- [Community mission-card discussion provided by requester](https://boardgamegeek.com/thread/2631311/all-the-mission-cards)

“The Crew: Mission Deep Sea” is used solely to identify the compatible game and remains the property of its rights holders.

## Project documents

- [Implementation plan](docs/plans/implementation-plan.md)
- [AI-player design](docs/ai-player-design.md)
