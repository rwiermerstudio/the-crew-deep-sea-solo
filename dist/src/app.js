import { NauticalAudio } from './audio.js';
import { SUIT_NAMES, deal, legalCards, trickWinner, captainFor, botChoice, communicationKind, cardLabel, assignTaskOwners, canLeadCard, balanceViolation } from './game.js';

const missions = [
  ['Training dive',1,'Recover a single signal from the shallow shelf.'],['Uncharted tablet',2,'Coordinate two recoveries before the current closes in.'],['Habitat systems',4,'Stabilise the core systems through four precise captures.'],['First descent',3,'Keep the dive team aligned during descent.'],['Five sectors',5,'Survey the habitat in one coordinated sequence.'],['Emergency porthole',5,'One diver must take responsibility for every recovery.',{ownerMode:'single',rule:'One diver is assigned every recovery task.'}],['Near-field map',6,'Map the immediate surroundings without losing any samples.'],['Fair shares',5,'Keep the expedition log balanced.',{balanceValue:9,rule:'No diver may have two more 9s than another.'}],['Wreck approach',7,'Find the wreck’s cargo while the communication current weakens.',{sonarMode:'noMarker',rule:'A sonar broadcast must be used, but it gives no highest/lowest/only marker.'}],['Damaged inscription',4,'The captain directs every recovery from the bridge.',{ownerMode:'captain',rule:'The captain owns every recovery task.'}],['Secure channel',8,'The crew shares only a limited sonar pool.',{sharedSonar:2,rule:'Only two shared sonar broadcasts are available to the crew.'}],['Rosetta fragment',5,'Avoid opening a trick with the restricted current.',{bannedLeads:['coral','sub'],rule:'Coral and Submarine cards cannot open a trick.'}],['Survey plan',5,'The captain assigns the team before the first move.',{ownerMode:'captain',rule:'The captain owns every recovery task.'}],['Emergency drill',6,'Complete the recovery run quickly.',{timer:210,rule:'Complete the mission in 3:30.'}],['Jellyfish swarm',6,'Use calm, exact captures through a hostile swarm.',{timer:180,rule:'Complete the mission in 3:00.'}],['Infirmary leak',6,'Balance simultaneous problems under pressure.',{noSonar:true,rule:'No sonar broadcasts are allowed.'}],['Whispering sculptures',9,'Any diver may select a recovery task.'],['Coordinates',9,'Push into the cave with all systems intact.'],['Explorer tunnels',9,'The captain handles the hardest recovery.',{hardestCaptain:true,rule:'The highest-valued recovery belongs to the captain.'}],['Labyrinth',10,'Communication rules are unstable in the narrow passages.',{randomSonar:true,rule:'A random current determines the sonar restriction.'}],['Jerry’s report',10,'Protect the team balance while the system watches.',{balanceValue:1,rule:'No diver may have two more 1s than another.'}],['Deepening cave',11,'A long dive demands perfect cooperation.'],['Single file',10,'The first winner must establish a clear lead.',{noSonarBefore:1,rule:'No sonar until after the first trick.'}],['Black veil',10,'Trust the evidence, not the uneasy silence.']
].map((m,i)=>({number:i+1,title:m[0],tasks:m[1],copy:m[2],rules:m[3]||{}}));
const names=['You','Ari','Nami','Sol','Kench'];
let state={};
const audio=new NauticalAudio();
const $=id=>document.getElementById(id);
const el={select:$('mission-select'),players:$('players'),start:$('start'),restart:$('restart'),sound:$('sound-toggle'),hand:$('hand'),trick:$('trick'),tasks:$('tasks'),feedback:$('feedback'),captain:$('captain'),count:$('trick-count'),sonar:$('sonar'),sonarState:$('sonar-state'),turn:$('turn-badge'),lead:$('lead-suit'),result:$('result'),title:$('mission-title'),copy:$('mission-copy'),rule:$('mission-rule')};

missions.forEach(m=>el.select.add(new Option(`${m.number}. ${m.title}`,m.number)));
function mission(){return missions.find(m=>m.number===Number(el.select.value))||missions[0]}
function updateBrief(){const m=mission();el.title.textContent=`Mission ${m.number} · ${m.title}`;el.copy.textContent=m.copy;el.rule.textContent=m.rules.rule||'Standard recovery rules.'}
el.select.addEventListener('change',updateBrief); updateBrief();
el.start.addEventListener('click',start); el.restart.addEventListener('click',start); el.sonar.addEventListener('click',sonar);
el.sound.textContent=audio.enabled?'Sound: on':'Sound: off';el.sound.setAttribute('aria-pressed',String(audio.enabled));el.sound.addEventListener('click',()=>{audio.setEnabled(!audio.enabled);el.sound.textContent=audio.enabled?'Sound: on':'Sound: off';el.sound.setAttribute('aria-pressed',String(audio.enabled));});
function start(){
 audio.unlock();
 if(state.timerId) clearInterval(state.timerId); const count=Number(el.players.value), hands=deal(count); const captain=captainFor(hands); const m=mission(), rules=m.rules;
 const colors=hands.flat().filter(c=>c.suit!=='sub'); const targets=[...colors].sort((a,b)=>a.value-b.value||a.suit.localeCompare(b.suit)).slice(0,m.tasks);
 let tasks=assignTaskOwners(targets.map(card=>({card})),captain,count,rules.ownerMode||'roundRobin',captain);
 if(rules.hardestCaptain&&tasks.length) tasks=tasks.map((task,index)=>index===tasks.length-1?{...task,owner:captain}:task);
 state={count,hands,captain,leader:captain,current:captain,trick:[],completedTricks:[],tasks,rules,tricks:0,over:false,sonar:false,sonarLeft:rules.sharedSonar||1,communicated:null,mission:m,timerLeft:rules.timer||0,timerId:null};
 audio.setMood(state); if(rules.timer) state.timerId=setInterval(()=>{if(state.over)return clearInterval(state.timerId);state.timerLeft--;audio.setMood(state);if(state.timerLeft<=0){state.over=true;audio.setMood(state);el.result.textContent='Mission lost';el.feedback.textContent='Time expired.';clearInterval(state.timerId);}render()},1000);
 el.restart.disabled=false; el.sonar.disabled=!!rules.noSonar; el.result.textContent='Dive in progress'; el.feedback.textContent='The captain starts the first trick.'; render(); queueBots();
}
function cardClass(card){return `card ${card.suit}`}
function render(){
 if(!state.hands)return; el.captain.textContent=names[state.captain]; el.count.textContent=state.timerLeft?`${state.tricks} · ${Math.floor(state.timerLeft/60)}:${String(state.timerLeft%60).padStart(2,'0')}`:`${state.tricks} completed`; el.sonarState.textContent=state.rules.noSonar?'Blocked':state.sonarLeft?`${state.sonarLeft} ready`:'Used';
 const lead=state.trick[0]?.card?.suit; el.lead.textContent=lead?`Lead: ${SUIT_NAMES[lead]}`:''; el.turn.textContent=state.over?'Mission complete':`${names[state.current]} to play`;
 el.hand.replaceChildren(...state.hands[0].map(card=>{const button=document.createElement('button');button.className=cardClass(card);button.disabled=state.over||state.current!==0||!legalCards(state.hands[0],lead).some(c=>c.id===card.id)||!canLeadCard(card,state.trick,state.rules.bannedLeads);if(button.disabled)button.classList.add('illegal');button.innerHTML=`<span>${SUIT_NAMES[card.suit]}</span><b>${card.value}</b><span>${card.suit==='sub'?'TRUMP':'PRESSURE'}</span>`;button.setAttribute('aria-label',cardLabel(card)+(button.disabled?' — not legal now':''));button.onclick=()=>play(0,card.id);return button;}));
 el.trick.style.setProperty('--trick-size',state.count); el.trick.replaceChildren(...state.trick.map((entry,i)=>{const d=document.createElement('div');d.className='played';d.style.setProperty('--tilt',`${(i-1.5)*5}deg`);d.innerHTML=`<div class="${cardClass(entry.card)}"><span>${SUIT_NAMES[entry.card.suit]}</span><b>${entry.card.value}</b><span>${entry.card.suit==='sub'?'TRUMP':'PRESSURE'}</span></div><small>${names[entry.player]}</small>`;return d;}));
 el.tasks.replaceChildren(...state.tasks.map(t=>{const d=document.createElement('div');d.className=`task ${t.card.suit} ${t.done?'done':''} ${t.failed?'fail':''}`;d.innerHTML=`<span class="task-swatch" aria-hidden="true"></span><span>${t.done?'✓ ':t.failed?'× ':''}${cardLabel(t.card)} → ${names[t.owner]}</span>`;return d;}));
}
function play(player,id){
 if(state.over||state.current!==player)return; const hand=state.hands[player],card=hand.find(c=>c.id===id),lead=state.trick[0]?.card?.suit;if(!card||!legalCards(hand,lead).some(c=>c.id===id)||!canLeadCard(card,state.trick,state.rules.bannedLeads))return;
 state.hands[player]=hand.filter(c=>c.id!==id); state.trick.push({player,card}); audio.effect('play'); state.current=(player+1)%state.count; render();
 if(state.trick.length===state.count) resolveTrick(); else queueBots();
}
function queueBots(){if(!state.over&&state.current!==0)window.setTimeout(()=>{const hand=state.hands[state.current],eligible=hand.filter(card=>canLeadCard(card,state.trick,state.rules.bannedLeads));const card=botChoice(eligible.length?eligible:hand,state.trick,state.tasks,state.current,state.completedTricks,{playerCount:state.count,handSizes:state.hands.map(hand=>hand.length),samples:32});play(state.current,card.id)},420)}
function resolveTrick(){
 const winner=trickWinner(state.trick).player; state.tricks++; const captured=state.trick.map(x=>x.card.id); let fail=false;
 state.tasks.forEach(t=>{if(!t.done&&!t.failed&&captured.includes(t.card.id)){if(t.owner===winner)t.done=true;else{t.failed=true;fail=true;}}});
 state.leader=winner; state.current=winner; state.completedTricks.push(state.trick.map(entry=>({...entry}))); if(state.rules.balanceValue&&balanceViolation(state.completedTricks,state.rules.balanceValue,2))fail=true; const summary=`${names[winner]} wins the trick.`; state.trick=[];
 if(fail){state.over=true;audio.effect('loss');el.result.textContent='Mission lost';el.feedback.textContent=`${summary} A recovery was claimed by the wrong diver.`;}
 else if(state.tasks.every(t=>t.done)){state.over=true;audio.effect('win');el.result.textContent='Mission complete';el.feedback.textContent=`${summary} All assigned recoveries secured.`;}
 else if(state.hands.every(h=>h.length===0)){state.over=true;audio.effect('loss');el.result.textContent='Mission lost';el.feedback.textContent=`${summary} The expedition ran out of time.`;}
 else el.feedback.textContent=summary;
 audio.setMood(state); render();queueBots();
}
function sonar(){
 if(!state.sonarLeft||state.over||state.rules.noSonar||state.tricks<(state.rules.noSonarBefore||0)||!state.hands?.[0])return; const card=state.hands[0].find(c=>communicationKind(state.hands[0],c));
 if(!card){el.feedback.textContent='No legal sonar broadcast is available in this hand.';return;} state.sonar=true;state.sonarLeft--;audio.effect('sonar');state.communicated={card,kind:communicationKind(state.hands[0],card)};el.feedback.textContent=state.rules.sonarMode==='noMarker'?`Sonar broadcast: ${SUIT_NAMES[card.suit]} ${card.value}.`:`Sonar broadcast: your ${state.communicated.kind} ${SUIT_NAMES[card.suit]} card is ${card.value}.`;render();
}
