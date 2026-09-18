# AI-player design

AI divers are local browser agents, not a remote model or server service.

1. They receive only their own hand, the public trick, public task ownership, and turn state.
2. `legalCards()` makes following the lead suit mandatory, including when a bot would prefer a trump.
3. The AI scores every legal card against the public trick: securing its own recovery dominates, stealing another diver’s recovery is heavily penalised, and submarine trump carries a reserve penalty unless it secures an objective.
4. It records public suit failures from completed tricks. When leading, it avoids suits that a known-void opponent could trump, favours longer safe suits, and preserves recovery cards until a winning play is publicly visible. The policy remains a transparent heuristic, not an optimal solver.
