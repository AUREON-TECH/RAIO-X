(()=>{'use strict';
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let listening=false,recognition=null;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const panel=document.createElement('aside');panel.id='raiox-voice-panel';panel.innerHTML='<button id="raiox-voice-toggle" type="button" aria-pressed="false">🎙️ Falar</button><button id="raiox-voice-help" type="button">💬 Conversar</button><div id="raiox-voice-message" role="status" aria-live="polite" hidden>Pronto para ouvir.</div>';
const css=document.createElement('style');css.textContent=`
#voice-stage{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147482999;width:min(900px,90vw);padding:35px;background:linear-gradient(130deg,#09172e,#242052);border:2px solid #e4b958;border-radius:25px;box-shadow:0 24px 90px #000c;color:#fff;text-align:center;font-family:system-ui,sans-serif}#voice-stage h2{font-size:clamp(30px,5vw,65px);color:#ffdc8b;margin:15px 0}#voice-stage p{font-size:clamp(20px,3vw,40px);line-height:1.4}#voice-stage button{float:right;background:#263a69;color:white;border:1px solid #9cb2e5;border-radius:10px;padding:10px;cursor:pointer}

#voice-stage.voice-help-compact{width:min(850px,calc(100vw - 28px));max-height:min(80vh,740px);overflow:auto;padding:clamp(16px,2vw,26px);text-align:left;border-radius:18px}#voice-stage.voice-help-compact .voice-help-top{display:flex;align-items:center;justify-content:space-between;gap:10px}#voice-stage.voice-help-compact h2{font-size:clamp(19px,2.4vw,28px);margin:0;color:#ffdc8b}#voice-stage.voice-help-compact .voice-help-top button{float:none;flex-shrink:0;font-size:12px}#voice-stage.voice-help-compact>p{font-size:13px;line-height:1.5;margin:12px 0 16px;color:#bfcce7}#voice-stage.voice-help-compact .voice-help-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#voice-stage.voice-help-compact .voice-help-group{background:#142547;border:1px solid #354c78;border-radius:12px;padding:12px 15px}#voice-stage.voice-help-compact h3{font-size:14px;color:#79e7f7;margin:0 0 9px}#voice-stage.voice-help-compact .voice-help-group div{font-size:12px;color:#e6edff;line-height:1.8}@media(max-width:560px){#voice-stage.voice-help-compact{max-height:76vh}#voice-stage.voice-help-compact .voice-help-grid{grid-template-columns:1fr}}
#raiox-voice-panel{position:fixed;right:18px;bottom:18px;top:auto;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;width:auto;max-width:min(240px,calc(100vw - 28px));font-family:system-ui,Arial,sans-serif;pointer-events:none}#raiox-voice-panel>*{pointer-events:auto}
#raiox-voice-toggle{border:2px solid #88a8ff;background:#1b3164;color:white;border-radius:999px;padding:13px 20px;font-size:15px;font-weight:800;box-shadow:0 8px 28px #0009;cursor:pointer;touch-action:manipulation;pointer-events:auto}
#raiox-voice-help{border:1px solid #6075b0;background:#14284d;color:#eaf1ff;border-radius:12px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;pointer-events:auto}#raiox-voice-toggle[aria-pressed=true]{background:#9b243b;border-color:#ffb0b7;animation:raiox-voice-pulse 1.5s infinite}
#raiox-voice-message[hidden]{display:none!important}#raiox-voice-message{background:#101b39;color:#e9f0ff;border:1px solid #4c6099;border-radius:12px;padding:10px 14px;font-size:13px;line-height:1.45;box-shadow:0 6px 22px #0008;max-height:56px;overflow:auto;opacity:.92}
@keyframes raiox-voice-pulse{50%{box-shadow:0 0 0 9px #e13c532c}}
@media(max-width:600px){#raiox-voice-panel{right:10px;bottom:12px;top:auto}#raiox-voice-toggle{font-size:13px;padding:11px 15px}}
`;

// Assistente de boas-vindas: voz masculina quando disponível no dispositivo.
let welcomeSpoken=false;
function chooseVoice(){
 const voices=window.speechSynthesis?.getVoices?.()||[];
 const pt=voices.filter(v=>/^pt[-_]/i.test(v.lang));
 return pt.find(v=>/antonio|daniel|felipe|ricardo|male|masculin|paulo|thiago/i.test(v.name))||pt.find(v=>/br/i.test(v.lang))||pt[0]||null;
}
function speak(text){
 if(!('speechSynthesis' in window))return false;
 try{
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='pt-BR';utterance.rate=1.18;utterance.pitch=.94;utterance.volume=1;
  const voice=chooseVoice();if(voice)utterance.voice=voice;
  window.speechSynthesis.speak(utterance);
  return true;
 }catch(_){return false}
}
function welcome(){
 if(welcomeSpoken||sessionStorage.getItem('raiox-voice-welcomed'))return;
 welcomeSpoken=true;sessionStorage.setItem('raiox-voice-welcomed','1');
 const data=window.raioxVoiceData;
 const phrase='Olá! Bem-vindo ao Raio X. '+(data?.month?'Já tenho os resultados de '+data.month+'. ':'')+'Pode falar comigo. Quer ver a meta, o ranking ou o resultado de alguém?';
 speak(phrase);
 msg('🤖 Bem-vindo ao RAIO X. Estou pronto para ajudar.');
}

function msg(s){const e=document.getElementById('raiox-voice-message');if(e){e.textContent=s;e.hidden=false;if(!listening)setTimeout(()=>{if(e.textContent===s)e.hidden=true},5500)}const log=document.getElementById('raiox-chat-history');if(log){const line=document.createElement('p');line.textContent=s;log.appendChild(line);log.scrollTop=log.scrollHeight}}
function btn(){return document.getElementById('raiox-voice-toggle')}
function syncSide(){const side=document.getElementById('raiox-voice-side-toggle');if(side){side.textContent=listening?'🔴 DESLIGAR VOZ':'🎙️ ATIVAR COMANDO DE VOZ';side.setAttribute('aria-pressed',String(listening))}}
function activate(section){const cinema=document.getElementById('cin');if(cinema&&!cinema.classList.contains('hide')){const enter=document.getElementById('enter');if(enter)enter.click();else cinema.classList.add('hide')}const b=document.querySelector('.nav [data-go="'+section+'"]');if(b){b.click();return true}return false}
function focusEl(el){if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.style.outline='3px solid #f3c668';el.style.outlineOffset='4px';setTimeout(()=>{el.style.outline='';el.style.outlineOffset=''},4200)}
function findKpi(word){const candidates=[...document.querySelectorAll('#dk > *,#dk .kpi,#dk .card,.kpi-card,.hero-kpi,.stat-card')];return candidates.find(el=>{const s=norm(el.textContent);return word==='conversao'?s.includes('conversao'):word==='vgv'?s.includes('vgv'):word==='casais'?s.includes('casais'):word==='vendas'?s.includes('vendas'):false})}
function command(raw){
 const s=norm(raw);const log=document.getElementById('raiox-chat-history');if(log){const line=document.createElement('p');line.textContent='Você: '+raw;log.appendChild(line)}
 if(/bom dia|boa tarde|boa noite|ola raio|oi raio|quem e voce/.test(s)){speak('Olá. Eu sou o assistente do Raio X. Posso consultar casais, vendas, VGV, metas, rankings e resultados individuais. Como posso ajudar?');msg('🤖 Estou à disposição.');return}
 if(/repete|repetir|fale de novo/.test(s)){speak('Claro. Diga o nome do profissional e o indicador que deseja consultar.');return}
 const spotlight=(title,description)=>{let box=document.getElementById('voice-stage');if(!box){box=document.createElement('section');box.id='voice-stage';document.body.appendChild(box)}box.replaceChildren();const close=document.createElement('button');close.textContent='✕ Fechar';close.onclick=()=>box.remove();const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=description;box.append(close,h,p);msg('✓ '+title);speak(title+'. '+description)};
 const kpis=[...document.querySelectorAll('#dk .kpi')].map(e=>({label:norm(e.querySelector('small')?.textContent),value:e.querySelector('b')?.textContent||''}));
 const value=label=>kpis.find(k=>k.label===label)?.value||'0';
 const number=s=>Number(String(s).replace(/[^\d]/g,''))||0;
 const people=[...document.querySelectorAll('#sel option')].map(o=>o.value);
 const aliases={josiene:'josyene',josiane:'josyene',joziene:'josyene',joziane:'josyene',josi:'josyene',jozyene:'josyene',sueni:'suene',sueli:'suene',paulo:'paulo',marcio:'marcio',marcío:'marcio',weina:'weena',uena:'weena',nina:'weena',taina:'taina',tainá:'taina',cassio:'cassio'};
 const canonical=w=>aliases[w]||w;
 const ignored=new Set('raio x me mostra mostrar mostre abre abrir quero queria resultado relatorio resumo desempenho performance dados sobre profissional captador individual pode por favor quanto quantos quantas como esta ta dele dela do da de dos das o a os as um uma para quem fale fala me diga diz diz me quero saber vendas venda casais casal vgv conversao conversão eficiencia qualificados qualificado nq q ticket medio media dias ativos custo custos brindes meta metas projecao projeções projecoes fx ranking posicao colocacao'.split(' '));
 const tokens=s.replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>=3&&!ignored.has(w)).map(canonical);
 const editDistance=(a,b)=>{if(Math.abs(a.length-b.length)>2)return 9;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let curr=[i];for(let j=1;j<=b.length;j++)curr[j]=Math.min(curr[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=curr}return prev[b.length]};
 const scoreName=n=>{const parts=norm(n).split(/\s+/).map(canonical);return tokens.reduce((sum,t)=>{let best=0;for(const p of parts){if(t===p)best=Math.max(best,10);else if(t.length>=4&&p.startsWith(t))best=Math.max(best,7);else if(t.length>=4&&editDistance(t,p)<=1)best=Math.max(best,6)}return sum+best},0)};
 const match=people.map(n=>({n,score:scoreName(n)})).filter(x=>x.score>=6).sort((a,b)=>b.score-a.score);
 const person=match.length&&(!match[1]||match[0].score>match[1].score)?match[0].n:null;
 if(person)window.raioxLastVoicePerson=person;
 const selectedPerson=person||(/\b(dele|dela|ele|ela)\b/.test(s)?window.raioxLastVoicePerson:null);
 const rank=metric=>{activate('rank');const el=document.getElementById('rm');if(el&&[...el.options].some(o=>o.value===metric)){el.value=metric;el.dispatchEvent(new Event('change',{bubbles:true}))}};
 if(/desligar voz|parar de ouvir|desativar voz/.test(s)){document.getElementById('voice-stage')?.remove();stop();return}
 if(/fechar|esconder destaque/.test(s)){document.getElementById('voice-stage')?.remove();msg('Destaque fechado');return}
 if(/ajuda|comandos|o que voce faz/.test(s)){
  let box=document.getElementById('voice-stage');if(!box){box=document.createElement('section');box.id='voice-stage';document.body.appendChild(box)}
  box.replaceChildren();box.removeAttribute('style');box.classList.add('voice-help-compact');
  const top=document.createElement('div');top.className='voice-help-top';
  const title=document.createElement('h2');title.textContent='🎙️ Comandos do RAIO X';
  const close=document.createElement('button');close.textContent='✕ Fechar';close.onclick=()=>box.remove();top.append(title,close);box.append(top);
  const intro=document.createElement('p');intro.textContent='Diga ASSUNTO + NOME. Ex.: “relatório Josyene”, “vendas Josiene”, “casais Paulo”.';box.append(intro);
  const groups=[
    ['📊 Central e metas',['Mostrar casais','Mostrar vendas','Mostrar VGV','Mostrar conversão','Quanto falta para a meta']],
    ['🏆 Ranking',['Abrir ranking','Ranking por vendas','Ranking por VGV','Quem lidera','Top 3']],
    ['👤 Pessoa + assunto',['Relatório Josyene','Vendas Josiene','Casais Paulo','VGV Suene','Conversão Marlon','FX Ricardo']],
    ['🧠 Análise',['Abrir diagnóstico','Mostrar perfil de casais','Mostrar projeções','Mostrar custos','Abrir gestão']],
    ['🧭 Navegação',['Voltar ao início','Fechar destaque','Desligar voz']]
  ];
  const grid=document.createElement('div');grid.className='voice-help-grid';
  groups.forEach(([label,commands])=>{const section=document.createElement('section');section.className='voice-help-group';const h=document.createElement('h3');h.textContent=label;section.append(h);commands.forEach(item=>{const line=document.createElement('div');line.textContent='“'+item+'”';section.append(line)});grid.append(section)});
  box.append(grid);msg('✓ Comandos organizados por área');return
 }
 if(selectedPerson&&/mostrar|mostra|abre|abrir|resultado|dados|individual|como|quanto|fez|relatorio|resumo|fala|fale|quem e|conte|me diz|me diga|vendas|casais|vgv|conversao|qualificados|dias|meta|ticket|fx|desempenho|performance|dele|dela|ele|ela/.test(s)){
  const report=window.raioxVoiceData?.people?.find(p=>norm(p.name)===norm(selectedPerson));
  if(report){
   const d=window.raioxVoiceData;
   const topic=/vendas/.test(s)?'VENDAS':/casais/.test(s)?'CASAIS':/vgv/.test(s)?'VGV':null;
   if(topic){spotlight(topic+' • '+report.name,String(topic==='VENDAS'?report.sales:topic==='CASAIS'?report.couples:report.vgv));return}
   const cv=report.couples?report.sales/report.couples*100:0;
   const rank=[...d.people].sort((a,b)=>b.couples-a.couples||b.sales-a.sales).findIndex(p=>p.name===report.name)+1;
   let box=document.getElementById('voice-stage');if(!box){box=document.createElement('section');box.id='voice-stage';document.body.appendChild(box)}
   box.replaceChildren();
   box.style.cssText='width:min(1050px,94vw);max-height:88vh;overflow:auto;padding:clamp(18px,3vw,40px);text-align:left';
   const close=document.createElement('button');close.textContent='✕ Fechar relatório';close.onclick=()=>box.remove();
   const title=document.createElement('h2');title.textContent=report.name;title.style.cssText='font-size:clamp(24px,4vw,48px);margin:12px 0';
   const sub=document.createElement('div');sub.textContent='RAIO X • RELATÓRIO INDIVIDUAL • '+d.month;sub.style.cssText='color:#80eaff;font-size:13px;font-weight:800;letter-spacing:1px';
   const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:22px 0';
   const fmt=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(n||0);
   const cash=n=>'R$ '+fmt(n);
   const cards=[['CASAIS',fmt(report.couples)],['VENDAS',fmt(report.sales)],['VGV',cash(report.vgv)],['CONVERSÃO',cv.toFixed(1).replace('.',',')+'%'],['QUALIFICADOS',fmt(report.q)],['DIAS ATIVOS',fmt(report.days)],['TICKET MÉDIO',cash(report.sales?report.vgv/report.sales:0)],['POSIÇÃO POR CASAIS',rank+'º']];
   cards.forEach(([k,v])=>{const card=document.createElement('div');card.style.cssText='padding:18px;background:#15284b;border:1px solid #3c6095;border-radius:14px';const label=document.createElement('small');label.textContent=k;label.style.color='#9fc4ed';const val=document.createElement('div');val.textContent=v;val.style.cssText='font-size:clamp(20px,2.5vw,32px);font-weight:800;margin-top:8px;overflow-wrap:anywhere';card.append(label,val);grid.append(card)});
   const next=report.couples<22?22:report.couples<35?35:report.couples<50?50:0;
   const summary=document.createElement('p');summary.style.cssText='font-size:clamp(16px,2vw,23px);line-height:1.5;text-align:left';
   summary.textContent=report.name+' registrou '+fmt(report.couples)+' casais, '+fmt(report.sales)+' vendas e '+cash(report.vgv)+' em VGV bruto. Conversão de '+cv.toFixed(1).replace('.',',')+'%. '+(next?'Faltam '+(next-report.couples)+' casais para a meta de '+next+'.':'Meta de 50 casais atingida!');
   const foot=document.createElement('small');foot.textContent='Resultados mensais oficiais • vendas brutas incluem canceladas';foot.style.color='#b8c8e8';
   box.append(close,sub,title,grid,summary,foot);
   activate('ind');const sel=document.getElementById('sel');if(sel){sel.value=person;sel.dispatchEvent(new Event('change',{bubbles:true}))}
   msg('✓ Relatório completo de '+selectedPerson);speak(summary.textContent);return
  }
 }
 if(person&&/mostrar|mostra|abre|abrir|resultado|dados|individual|como|quanto|fez/.test(s)){activate('ind');const sel=document.getElementById('sel');sel.value=person;sel.dispatchEvent(new Event('change',{bubbles:true}));msg('✓ Resultado de '+person);setTimeout(()=>focusEl(document.getElementById('ik')),300);return}
 if(/quanto falta|falta quanto|restante|bater a meta/.test(s)){activate('dash');spotlight('DISTÂNCIA DA META',Math.max(0,589-number(value('casais')))+' casais • '+Math.max(0,120-number(value('vendas')))+' vendas • R$ '+new Intl.NumberFormat('pt-BR').format(Math.max(0,12000000-number(value('vgv'))))+' de VGV');return}
 if(/quem lidera|primeiro lugar|quem esta em primeiro|top 3/.test(s)){rank('couples');const names=[...document.querySelectorAll('#rb tr')].slice(0,/top 3/.test(s)?3:1).map(tr=>tr.querySelectorAll('td')[1]?.innerText?.split('\n')[0]).filter(Boolean);spotlight('LIDERANÇA',names.join(' • ')||'Confira o ranking');return}
 if(/ranking|classificacao|colocacao/.test(s)){rank(/vgv|faturamento/.test(s)?'vgv':/vendas/.test(s)?'sales':/conversao/.test(s)?'conversion':'couples');msg('✓ Ranking aberto e classificado');speak('Pronto, abri o ranking.');return}
 if(/abrir fx|mostrar fx|analise fx|analisar fx/.test(s)){activate('fx');msg('✓ FX aberto');speak('Abri a análise individual FX.');return}
 if(/conversao|eficiencia/.test(s)){activate('dash');const c=number(value('casais')),v=number(value('vendas'));spotlight('CONVERSÃO',c?(100*v/c).toFixed(1).replace('.',',')+'% • '+v+' vendas em '+c+' casais':'Sem dados de casais');return}
 if(/perfil de casais|perfil dos casais/.test(s)){activate('perfil');msg('✓ Perfil de casais aberto');speak('Aqui está o perfil de casais.');return}
 if(/casais|casal|atendimentos/.test(s)){activate('dash');spotlight('CASAIS',value('casais')+' casais • Meta: 589');return}
 if(/vendas|contratos/.test(s)){activate('dash');spotlight('VENDAS',value('vendas')+' vendas brutas • Meta: 120');return}
 if(/vgv|vgb|faturamento|valor vendido/.test(s)){activate('dash');spotlight('VGV BRUTO',value('vgv')+' • Meta: R$ 12.000.000');return}
 const commands=[[/projecao|projetar/,'proj'],[/brindes|custos/,'custos'],[/perfil|qualificados/,'perfil'],[/diagnostico/,'diag'],[/gestao/,'gestao'],[/individual|profissional/,'ind'],[/inicio|central|painel|voltar/,'dash']];
 for(const [re,target] of commands)if(re.test(s)){activate(target);msg('✓ Abrindo '+target);speak('Certo, abrindo '+target+'.');setTimeout(()=>focusEl(document.getElementById(target)),300);return}
 msg('Ouvi: “'+raw+'”. Pode dizer assunto e nome, por exemplo: vendas Josiene.');speak('Não entendi essa consulta. Pode tentar assunto e nome?');
}
function stop(){window.speechSynthesis?.cancel();listening=false;syncSide();if(btn()){btn().setAttribute('aria-pressed','false');btn().textContent='🎙️ Ativar voz'}try{recognition?.stop()}catch(_){}msg('Microfone desligado. Toque para ativar novamente.')}
function start(){welcome();if(!SpeechRecognition){msg('Este navegador não oferece reconhecimento de voz. Tente Chrome ou Edge com permissão de microfone.');return}
if(!window.isSecureContext){msg('O microfone exige HTTPS. Abra a versão publicada do RAIO X.');return}
if(!recognition){recognition=new SpeechRecognition();recognition.lang='pt-BR';recognition.continuous=true;recognition.interimResults=false;
recognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)command(e.results[i][0].transcript)};
recognition.onerror=e=>{if(['not-allowed','service-not-allowed','audio-capture'].includes(e.error)){stop();msg('Permita o acesso ao microfone nas configurações do navegador.')}else msg('Reconhecimento: '+e.error+'. Você pode tentar novamente.')};
recognition.onend=()=>{if(listening){try{recognition.start()}catch(e){msg('Não foi possível continuar a escuta: '+e.message)}}};
}
listening=true;syncSide();btn().setAttribute('aria-pressed','true');btn().textContent='🔴 Desligar voz';msg('🎙️ Escutando. Diga “mostrar casais”, “vendas”, “VGV”, “ranking” ou “projeções”.');try{recognition.start()}catch(e){stop();msg('Falha ao iniciar microfone: '+e.message)}
}
function init(){document.head.appendChild(css);document.body.appendChild(panel);const enter=document.getElementById('enter');if(enter)enter.addEventListener('click',welcome,{once:true});btn().addEventListener('click',()=>listening?stop():start());document.getElementById('raiox-voice-help').addEventListener('click',()=>{const question=prompt('Pergunte ao RAIO X. Ex.: relatório Josiene, vendas Suene, ranking por VGV');if(question?.trim())command(question)});const side=document.getElementById('raiox-voice-side-toggle');if(side)side.addEventListener('click',()=>listening?stop():start());const sideHelp=document.getElementById('raiox-voice-side-help');if(sideHelp)sideHelp.addEventListener('click',()=>command('ajuda'))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();