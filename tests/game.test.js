import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, deal, cardCompare, legalCards, trickWinner, communicationKind, botChoice, knownVoidSuits, scoreBotCard, estimateRolloutScore, assignTaskOwners, canLeadCard, balanceViolation } from '../src/game.js';
import { NAUTICAL_PATTERN, soundEventProfile } from '../src/audio.js';
test('deck has 40 distinct cards', () => { const d = makeDeck(); assert.equal(d.length, 40); assert.equal(new Set(d.map(c => c.id)).size, 40); });
test('deal is even at four players', () => assert.deepEqual(deal(4, () => .2).map(h => h.length), [10,10,10,10]));
test('hand sorting keeps submarine trump cards on the right', () => {
  const withTrump=[{suit:'sub',value:1,id:'sub-1'},{suit:'sun',value:9,id:'sun-9'},{suit:'coral',value:1,id:'coral-1'}];
  withTrump.sort(cardCompare);
  assert.equal(withTrump.at(-1).id,'sub-1');
});
test('following suit is mandatory', () => { const hand=[{suit:'coral',value:2},{suit:'sub',value:4}]; assert.deepEqual(legalCards(hand,'coral'), [hand[0]]); });
test('highest trump wins a trick', () => { const t=[{player:0,card:{suit:'sun',value:9}},{player:1,card:{suit:'sub',value:1}},{player:2,card:{suit:'sub',value:3}}]; assert.equal(trickWinner(t).player,2); });
test('communication only permits extrema or only card', () => { const h=[{suit:'kelp',value:2},{suit:'kelp',value:5},{suit:'sun',value:3}]; assert.equal(communicationKind(h,h[0]),'lowest'); assert.equal(communicationKind(h,h[1]),'highest'); assert.equal(communicationKind(h,{suit:'kelp',value:3}),null); });
test('bot avoids stealing an active team-mate recovery when a losing discard exists', () => {
  const hand=[{suit:'sub',value:1,id:'sub-1'},{suit:'sun',value:1,id:'sun-1'}];
  const trick=[{player:0,card:{suit:'coral',value:8,id:'coral-8'}}];
  const tasks=[{card:{suit:'coral',value:8,id:'coral-8'},owner:0,done:false}];
  assert.equal(botChoice(hand,trick,tasks,1).id,'sun-1');
});
test('bot keeps an owned recovery card when leading without a certain win', () => {
  const hand=[{suit:'coral',value:5,id:'coral-5'},{suit:'sun',value:1,id:'sun-1'}];
  const tasks=[{card:{suit:'coral',value:5,id:'coral-5'},owner:1,done:false}];
  assert.equal(botChoice(hand,[],tasks,1).id,'sun-1');
});
test('void history identifies a diver who could trump a lead suit', () => {
  const history=[[{player:0,card:{suit:'coral',value:4}},{player:2,card:{suit:'sun',value:1}}]];
  assert.deepEqual([...knownVoidSuits(history,2)],['coral']);
});
test('bot leads away from a suit with a known void opponent', () => {
  const hand=[{suit:'coral',value:2,id:'coral-2'},{suit:'sun',value:2,id:'sun-2'}];
  const history=[[{player:0,card:{suit:'coral',value:4}},{player:2,card:{suit:'sun',value:1}}]];
  assert.equal(botChoice(hand,[],[],1,history).id,'sun-2');
});
test('task-winning play scores above a legal play that leaves the task exposed', () => {
  const trick=[{player:0,card:{suit:'coral',value:7,id:'coral-7'}}];
  const tasks=[{card:{suit:'coral',value:7,id:'coral-7'},owner:1,done:false}];
  const win={suit:'coral',value:8,id:'coral-8'}, lose={suit:'coral',value:2,id:'coral-2'};
  assert.ok(scoreBotCard(win,[win,lose],trick,tasks,1,[]) > scoreBotCard(lose,[win,lose],trick,tasks,1,[]));
});
test('rollout evaluator favours a simulated task capture over losing it', () => {
  const win={suit:'coral',value:8,id:'coral-8'}, lose={suit:'coral',value:2,id:'coral-2'};
  const trick=[{player:0,card:{suit:'coral',value:7,id:'coral-7'}}];
  const tasks=[{card:{suit:'coral',value:7,id:'coral-7'},owner:1,done:false}];
  const context={playerCount:2,handSizes:[1,2],samples:4,random:()=>0};
  assert.ok(estimateRolloutScore(win,[win,lose],trick,tasks,1,context) > estimateRolloutScore(lose,[win,lose],trick,tasks,1,context));
});
test('captain and single-diver mission rules assign every task to the required owner', () => {
  const tasks=[{card:{id:'coral-1',suit:'coral',value:1}},{card:{id:'sun-2',suit:'sun',value:2}}];
  assert.deepEqual(assignTaskOwners(tasks,2,4,'captain').map(t=>t.owner),[2,2]);
  assert.deepEqual(assignTaskOwners(tasks,2,4,'single',1).map(t=>t.owner),[1,1]);
});
test('lead restrictions prevent banned suits but do not block following suit', () => {
  assert.equal(canLeadCard({suit:'coral'},[],['coral','sub']),false);
  assert.equal(canLeadCard({suit:'sun'},[],['coral','sub']),true);
  assert.equal(canLeadCard({suit:'coral'},[{card:{suit:'sun'}}],['coral','sub']),true);
});
test('balance mission fails when one diver has two more marked cards than another', () => {
  const history=[[{player:0,card:{value:9}},{player:1,card:{value:2}}],[{player:0,card:{value:9}},{player:1,card:{value:3}}]];
  assert.equal(balanceViolation(history,9,2),true);
  assert.equal(balanceViolation(history,9,3),false);
});
test('nautical sound design has a looping pattern and named effect profiles', () => {
  assert.ok(NAUTICAL_PATTERN.length >= 8);
  assert.deepEqual(Object.keys(soundEventProfile).sort(),['loss','play','sonar','win']);
});
