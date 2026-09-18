export const SUITS = ['coral', 'current', 'kelp', 'sun'];
export const SUIT_NAMES = { coral: 'Coral', current: 'Current', kelp: 'Kelp', sun: 'Sun', sub: 'Submarine' };

export function makeDeck() {
  return [...SUITS.flatMap(suit => Array.from({ length: 9 }, (_, i) => ({ suit, value: i + 1, id: `${suit}-${i + 1}` }))),
    ...Array.from({ length: 4 }, (_, i) => ({ suit: 'sub', value: i + 1, id: `sub-${i + 1}` }))];
}
export function shuffle(items, random = Math.random) {
  const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out;
}
export function deal(playerCount, random = Math.random) {
  const deck = shuffle(makeDeck(), random); const hands = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, i) => { if (i < Math.floor(deck.length / playerCount) * playerCount) hands[i % playerCount].push(card); });
  hands.forEach(hand => hand.sort(cardCompare)); return hands;
}
export function cardCompare(a, b) {
  const suitOrder = [...SUITS, 'sub'];
  return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit) || a.value - b.value;
}
export function legalCards(hand, leadSuit) { const matching = leadSuit ? hand.filter(c => c.suit === leadSuit) : []; return matching.length ? matching : hand; }
export function trickWinner(trick) {
  const lead = trick[0].card.suit;
  return trick.reduce((best, entry) => {
    const a = entry.card, b = best.card;
    if (a.suit === 'sub' && b.suit !== 'sub') return entry;
    if (a.suit === b.suit && a.value > b.value) return entry;
    if (b.suit !== 'sub' && a.suit === lead && b.suit !== lead) return entry;
    return best;
  });
}
export function captainFor(hands) { return hands.findIndex(hand => hand.some(c => c.id === 'sub-4')); }
export function communicationKind(hand, card) {
  if (card.suit === 'sub') return null;
  const same = hand.filter(c => c.suit === card.suit).map(c => c.value);
  if (same.length === 1) return 'only';
  if (card.value === Math.max(...same)) return 'highest';
  if (card.value === Math.min(...same)) return 'lowest';
  return null;
}
export function knownVoidSuits(history, playerIndex) {
  const voids = new Set();
  history.forEach(trick => {
    const leadSuit = trick[0]?.card.suit;
    trick.filter(entry => entry.player === playerIndex && entry.card.suit !== leadSuit)
      .forEach(() => voids.add(leadSuit));
  });
  return voids;
}
export function scoreBotCard(card, hand, trick, tasks, botIndex, history = []) {
  const activeTasks = tasks.filter(t => !t.done && !t.failed);
  const taskInTrick = activeTasks.find(t => trick.some(entry => entry.card.id === t.card.id));
  const projectedWinner = trick.length ? trickWinner([...trick, { player: botIndex, card }]).player : null;
  const ownTargetIds = new Set(activeTasks.filter(t => t.owner === botIndex).map(t => t.card.id));
  let score = 0;

  if (taskInTrick) {
    if (taskInTrick.owner === botIndex) score += projectedWinner === botIndex ? 1000 : -700;
    else score += projectedWinner === botIndex ? -1000 : 100;
  } else if (ownTargetIds.has(card.id)) {
    // Do not expose a target card before the public table proves it can be taken safely.
    score -= 900;
  }

  if (!trick.length) {
    const voidOpponents = new Set();
    history.forEach(previous => previous.forEach(entry => {
      if (entry.player !== botIndex && knownVoidSuits(history, entry.player).has(card.suit)) voidOpponents.add(entry.player);
    }));
    // A known void can turn this lead into an unwanted trump opportunity.
    score -= voidOpponents.size * 90;
    score += hand.filter(candidate => candidate.suit === card.suit).length * 10;
    score += card.value;
  }

  // Trump is a scarce rescue resource, so spend it only for an objective.
  if (card.suit === 'sub' && !(taskInTrick?.owner === botIndex && projectedWinner === botIndex)) score -= 35 + card.value;
  return score;
}
export function estimateRolloutScore(card, hand, trick, tasks, botIndex, context = {}) {
  const playerCount = context.playerCount || 0;
  if (!playerCount) return 0;
  const samples = Math.min(Math.max(context.samples || 32, 1), 64);
  const random = context.random || Math.random;
  const publicIds = new Set([...hand, ...trick.map(entry => entry.card), ...(context.history || []).flatMap(round => round.map(entry => entry.card))].map(c => c.id));
  let total = 0;
  for (let sample = 0; sample < samples; sample++) {
    const simulated = [...trick, { player: botIndex, card }];
    const unseen = shuffle(makeDeck().filter(c => !publicIds.has(c.id)), random);
    const unknownHands = Array.from({ length: playerCount }, () => []);
    let offset = 0;
    for (let player = 0; player < playerCount; player++) {
      if (player === botIndex) continue;
      const alreadyPlayed = simulated.filter(entry => entry.player === player).length;
      const size = Math.max((context.handSizes?.[player] || 0) - alreadyPlayed, 0);
      unknownHands[player] = unseen.slice(offset, offset + size); offset += size;
    }
    while (simulated.length < playerCount) {
      const player = (simulated.at(-1).player + 1) % playerCount;
      const legal = legalCards(unknownHands[player], simulated[0].card.suit);
      const pick = rolloutPick(legal, simulated, tasks, player);
      unknownHands[player] = unknownHands[player].filter(c => c.id !== pick.id);
      simulated.push({ player, card: pick });
    }
    const winner = trickWinner(simulated).player;
    const captured = new Set(simulated.map(entry => entry.card.id));
    total += tasks.filter(t => !t.done && !t.failed && captured.has(t.card.id))
      .reduce((score, task) => score + (task.owner === winner ? 1000 : -1000), winner === botIndex ? 8 : 0);
  }
  return total / samples;
}
function rolloutPick(legal, trick, tasks, player) {
  const task = tasks.find(t => !t.done && !t.failed && trick.some(entry => entry.card.id === t.card.id));
  const winning = legal.filter(card => trickWinner([...trick, { player, card }]).player === player);
  if (task?.owner === player && winning.length) return lowestCard(winning);
  if (task && task.owner !== player) { const losing = legal.filter(card => !winning.includes(card)); if (losing.length) return lowestCard(losing); }
  return lowestCard(legal);
}
export function botChoice(hand, trick, tasks, botIndex, history = [], context = {}) {
  const legal = legalCards(hand, trick[0]?.card.suit);
  return [...legal].sort((a, b) => {
    const score = candidate => scoreBotCard(candidate, hand, trick, tasks, botIndex, history) + estimateRolloutScore(candidate, hand, trick, tasks, botIndex, { ...context, history }) * 0.65;
    return score(b) - score(a) || cardCompare(a, b);
  })[0];
}
function lowestCard(cards) {
  return [...cards].sort((a, b) => (a.suit === 'sub') - (b.suit === 'sub') || a.value - b.value || a.suit.localeCompare(b.suit))[0];
}
export function cardLabel(card) { return `${SUIT_NAMES[card.suit]} ${card.value}`; }
