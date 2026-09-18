# AI-player design

AI divers are local browser agents, not a remote model or server service.

1. They receive only their own hand, the public trick, public task ownership, and turn state.
2. `legalCards()` makes following the lead suit mandatory, including when a bot would prefer a trump.
3. When a public recovery card enters a trick, an AI tries to secure its own recovery with its lowest winning legal card. It discards safely rather than stealing a teammate’s active recovery when possible.
4. When leading, an AI offers its hardest owned recovery; otherwise it preserves own recovery cards and saves submarine trump unless necessary. The policy remains a transparent heuristic, not an optimal solver.
