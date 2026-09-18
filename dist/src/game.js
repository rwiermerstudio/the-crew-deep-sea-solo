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
export function botChoice(hand, trick, tasks, botIndex, history = []) {
  const legal = legalCards(hand, trick[0]?.card.suit);
  return [...legal].sort((a, b) => scoreBotCard(b, hand, trick, tasks, botIndex, history) - scoreBotCard(a, hand, trick, tasks, botIndex, history) || cardCompare(a, b))[0];
}
function lowestCard(cards) {
  return [...cards].sort((a, b) => (a.suit === 'sub') - (b.suit === 'sub') || a.value - b.value || a.suit.localeCompare(b.suit))[0];
}
export function cardLabel(card) { return `${SUIT_NAMES[card.suit]} ${card.value}`; }
