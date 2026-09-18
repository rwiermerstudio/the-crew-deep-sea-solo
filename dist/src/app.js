import { SUIT_NAMES, deal, legalCards, trickWinner, captainFor, botChoice, communicationKind, cardLabel } from './game.js';

const missions = [
  ['Training dive',1,'Recover a single signal from the shallow shelf.'],['Uncharted tablet',2,'Coordinate two recoveries before the current closes in.'],['Habitat systems',4,'Stabilise the core systems through four precise captures.'],['First descent',3,'Keep the dive team aligned during descent.'],['Five sectors',5,'Survey the habitat in one coordinated sequence.'],['Emergency porthole',5,'One diver must take responsibility for every recovery.'],['Near-field map',6,'Map the immediate surroundings without losing any samples.'],['Fair shares',5,'No diver may surge too far ahead in the expedition log.'],['Wreck approach',7,'Find the wreck’s cargo while the communication current weakens.'],['Damaged inscription',4,'The captain directs every recovery from the bridge.'],['Secure channel',8,'The crew shares only a limited sonar pool.'],['Rosetta fragment',5,'Avoid opening a trick with the restricted current.'],['Survey plan',5,'The captain assigns the team before the first move.'],['Emergency drill',6,'Complete the recovery run quickly.'],['Jellyfish swarm',6,'Use calm, exact captures through a hostile swarm.'],['Infirmary leak',6,'Balance simultaneous problems under pressure.'],['Whispering sculptures',9,'Any diver may select a recovery task.'],['Coordinates',9,'Push into the cave with all systems intact.'],['Explorer tunnels',9,'The captain handles the most difficult recovery.'],['Labyrinth',10,'Communication rules are unstable in the narrow passages.'],['Jerry’s report',10,'Protect the team balance while the system watches.'],['Deepening cave',11,'A long dive demands perfect cooperation.'],['Single file',10,'The first winner must establish a clear lead.'],['Black veil',10,'Trust the evidence, not the uneasy silence.']
].map((m,i)=>({number:i+1,title:m[0],tasks:m[1],copy:m[2]}));
const names=['You','Ari','Nami','Sol','Kench'];
let state={};
const $=id=>document.getElementById(id);
const el={select:$('mission-select'),players:$('players'),start:$('start'),restart:$('restart'),hand:$('hand'),trick:$('trick'),tasks:$('tasks'),feedback:$('feedback'),captain:$('captain'),count:$('trick-count'),sonar:$('sonar'),sonarState:$('sonar-state'),turn:$('turn-badge'),lead:$('lead-suit'),result:$('result'),title:$('mission-title'),copy:$('mission-copy')};

missions.forEach(m=>el.select.add(new Option(`${m.number}. ${m.title}`,m.number)));
function mission(){return missions.find(m=>m.number===Number(el.select.value))||missions[0]}
function updateBrief(){const m=mission();el.title.textContent=`Mission ${m.number} · ${m.title}`;el.copy.textContent=m.copy}
el.select.addEventListener('change',updateBrief); updateBrief();
el.start.addEventListener('click',start); el.restart.addEventListener('click',start); el.sonar.addEventListener('click',sonar);
function start(){
 const count=Number(el.players.value), hands=deal(count); const captain=captainFor(hands); const m=mission();
 const colors=hands.flat().filter(c=>c.suit!=='sub'); const targets=[...colors].sort((a,b)=>a.value-b.value||a.suit.localeCompare(b.suit)).slice(0,m.tasks);
 state={count,hands,captain,leader:captain,current:captain,trick:[],completedTricks:[],tasks:targets.map((card,i)=>({card,owner:(captain+i)%count,done:false,failed:false})),tricks:0,over:false,sonar:false,communicated:null,mission:m};
 el.restart.disabled=false; el.sonar.disabled=false; el.result.textContent='Dive in progress'; el.feedback.textContent='The captain starts the first trick.'; render(); queueBots();
}
function cardClass(card){return `card ${card.suit}`}
function render(){
 if(!state.hands)return; el.captain.textContent=names[state.captain]; el.count.textContent=`${state.tricks} completed`; el.sonarState.textContent=state.sonar?'Used':'Ready';
 const lead=state.trick[0]?.card?.suit; el.lead.textContent=lead?`Lead: ${SUIT_NAMES[lead]}`:''; el.turn.textContent=state.over?'Mission complete':`${names[state.current]} to play`;
 el.hand.replaceChildren(...state.hands[0].map(card=>{const button=document.createElement('button');button.className=cardClass(card);button.disabled=state.over||state.current!==0||!legalCards(state.hands[0],lead).some(c=>c.id===card.id);if(button.disabled)button.classList.add('illegal');button.innerHTML=`<span>${SUIT_NAMES[card.suit]}</span><b>${card.value}</b><span>${card.suit==='sub'?'TRUMP':'PRESSURE'}</span>`;button.setAttribute('aria-label',cardLabel(card)+(button.disabled?' — not legal now':''));button.onclick=()=>play(0,card.id);return button;}));
 el.trick.style.setProperty('--trick-size',state.count); el.trick.replaceChildren(...state.trick.map((entry,i)=>{const d=document.createElement('div');d.className='played';d.style.setProperty('--tilt',`${(i-1.5)*5}deg`);d.innerHTML=`<div class="${cardClass(entry.card)}"><span>${SUIT_NAMES[entry.card.suit]}</span><b>${entry.card.value}</b><span>${entry.card.suit==='sub'?'TRUMP':'PRESSURE'}</span></div><small>${names[entry.player]}</small>`;return d;}));
 el.tasks.replaceChildren(...state.tasks.map(t=>{const d=document.createElement('div');d.className=`task ${t.card.suit} ${t.done?'done':''} ${t.failed?'fail':''}`;d.innerHTML=`<span class="task-swatch" aria-hidden="true"></span><span>${t.done?'✓ ':t.failed?'× ':''}${cardLabel(t.card)} → ${names[t.owner]}</span>`;return d;}));
}
function play(player,id){
 if(state.over||state.current!==player)return; const hand=state.hands[player],card=hand.find(c=>c.id===id),lead=state.trick[0]?.card.suit;if(!card||!legalCards(hand,lead).some(c=>c.id===id))return;
 state.hands[player]=hand.filter(c=>c.id!==id); state.trick.push({player,card}); state.current=(player+1)%state.count; render();
 if(state.trick.length===state.count) resolveTrick(); else queueBots();
}
function queueBots(){if(!state.over&&state.current!==0)window.setTimeout(()=>{const card=botChoice(state.hands[state.current],state.trick,state.tasks,state.current,state.completedTricks);play(state.current,card.id)},420)}
function resolveTrick(){
 const winner=trickWinner(state.trick).player; state.tricks++; const captured=state.trick.map(x=>x.card.id); let fail=false;
 state.tasks.forEach(t=>{if(!t.done&&!t.failed&&captured.includes(t.card.id)){if(t.owner===winner)t.done=true;else{t.failed=true;fail=true;}}});
 state.leader=winner; state.current=winner; state.completedTricks.push(state.trick.map(entry=>({...entry}))); const summary=`${names[winner]} wins the trick.`; state.trick=[];
 if(fail){state.over=true;el.result.textContent='Mission lost';el.feedback.textContent=`${summary} A recovery was claimed by the wrong diver.`;}
 else if(state.tasks.every(t=>t.done)){state.over=true;el.result.textContent='Mission complete';el.feedback.textContent=`${summary} All assigned recoveries secured.`;}
 else if(state.hands.every(h=>h.length===0)){state.over=true;el.result.textContent='Mission lost';el.feedback.textContent=`${summary} The expedition ran out of time.`;}
 else el.feedback.textContent=summary;
 render();queueBots();
}
function sonar(){
 if(state.sonar||state.over||!state.hands?.[0])return; const card=state.hands[0].find(c=>communicationKind(state.hands[0],c));
 if(!card){el.feedback.textContent='No legal sonar broadcast is available in this hand.';return;} state.sonar=true;state.communicated={card,kind:communicationKind(state.hands[0],card)};el.feedback.textContent=`Sonar broadcast: your ${state.communicated.kind} ${SUIT_NAMES[card.suit]} card is ${card.value}.`;render();
}
