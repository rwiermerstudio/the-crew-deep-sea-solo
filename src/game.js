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
export function botChoice(hand, trick, tasks, botIndex) {
  const legal = legalCards(hand, trick[0]?.card.suit);
  const activeTasks = tasks.filter(t => !t.done && !t.failed);
  const projectedWinner = card => trickWinner([...trick, { player: botIndex, card }]).player;
  const taskInTrick = activeTasks.find(t => trick.some(entry => entry.card.id === t.card.id));

  // Do not take a teammate's recovery when a legal losing discard exists.
  if (taskInTrick && taskInTrick.owner !== botIndex) {
    const losing = legal.filter(card => projectedWinner(card) !== botIndex);
    if (losing.length) return lowestCard(losing);
  }

  // Secure an active recovery assigned to this bot with the cheapest winning card.
  if (taskInTrick?.owner === botIndex) {
    const winning = legal.filter(card => projectedWinner(card) === botIndex);
    if (winning.length) return lowestCard(winning);
  }

  // When leading, offer an owned recovery, starting with the hardest one.
  if (!trick.length) {
    const ownedTargets = activeTasks.filter(t => t.owner === botIndex).map(t => t.card);
    const leadTarget = ownedTargets.filter(target => legal.some(card => card.id === target.id))
      .sort((a, b) => b.value - a.value)[0];
    if (leadTarget) return leadTarget;
  }

  // Preserve a bot's own recovery card until it has a plausible chance to claim it.
  const ownTargetIds = new Set(activeTasks.filter(t => t.owner === botIndex).map(t => t.card.id));
  const expendable = legal.filter(card => !ownTargetIds.has(card.id));
  return lowestCard(expendable.length ? expendable : legal);
}
function lowestCard(cards) {
  return [...cards].sort((a, b) => (a.suit === 'sub') - (b.suit === 'sub') || a.value - b.value || a.suit.localeCompare(b.suit))[0];
}
export function cardLabel(card) { return `${SUIT_NAMES[card.suit]} ${card.value}`; }
