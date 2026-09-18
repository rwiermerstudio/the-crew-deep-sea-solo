# AI-player design

AI divers are local browser agents, not a remote model or server service.

1. They receive only their own hand, the public trick, public task ownership, and turn state.
2. `legalCards()` makes following the lead suit mandatory, including when a bot would prefer a trump.
3. When an AI owns an unfinished task and can legally play its target card, it prioritises that card; otherwise it chooses the lowest legal card.
4. Turn automation uses a short delay so the public trick can be read. It remains fully deterministic from the actual state and has no network calls.
5. The policy is intentionally simple. It is a solo-practice crew, not a claim of optimal cooperative strategy or a hidden-information solver.
