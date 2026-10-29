(()=>{'use strict';
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let listening=false,recognition=null;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const panel=document.createElement('aside');panel.id='raiox-voice-panel';panel.innerHTML='<button id="raiox-voice-toggle" type="button" aria-pressed="false">🎙️ Ativar voz</button><div id="raiox-voice-message" role="status" aria-live="polite" hidden>Pronto para ouvir.</div>';
const css=document.createElement('style');css.textContent=`
#voice-stage{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147482999;width:min(900px,90vw);padding:35px;background:linear-gradient(130deg,#09172e,#242052);border:2px solid #e4b958;border-radius:25px;box-shadow:0 24px 90px #000c;color:#fff;text-align:center;font-family:system-ui,sans-serif}#voice-stage h2{font-size:clamp(30px,5vw,65px);color:#ffdc8b;margin:15px 0}#voice-stage p{font-size:clamp(20px,3vw,40px);line-height:1.4}#voice-stage button{float:right;background:#263a69;color:white;border:1px solid #9cb2e5;border-radius:10px;padding:10px;cursor:pointer}

#raiox-voice-panel{position:fixed;right:18px;bottom:18px;top:auto;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;width:auto;max-width:min(310px,calc(100vw - 28px));font-family:system-ui,Arial,sans-serif;pointer-events:none}#raiox-voice-panel>*{pointer-events:auto}
#raiox-voice-toggle{border:2px solid #88a8ff;background:#1b3164;color:white;border-radius:999px;padding:13px 20px;font-size:15px;font-weight:800;box-shadow:0 8px 28px #0009;cursor:pointer;touch-action:manipulation;pointer-events:auto}
#raiox-voice-toggle[aria-pressed=true]{background:#9b243b;border-color:#ffb0b7;animation:raiox-voice-pulse 1.5s infinite}
#raiox-voice-message[hidden]{display:none!important}#raiox-voice-message{background:#101b39;color:#e9f0ff;border:1px solid #4c6099;border-radius:12px;padding:10px 14px;font-size:13px;line-height:1.45;box-shadow:0 6px 22px #0008;max-height:90px;overflow:auto}
@keyframes raiox-voice-pulse{50%{box-shadow:0 0 0 9px #e13c532c}}
@media(max-width:600px){#raiox-voice-panel{right:10px;bottom:12px;top:auto}#raiox-voice-toggle{font-size:13px;padding:11px 15px}}
`;
function msg(s){const e=document.getElementById('raiox-voice-message');if(e){e.textContent=s;e.hidden=!listening}}
function btn(){return document.getElementById('raiox-voice-toggle')}
function activate(section){const cinema=document.getElementById('cin');if(cinema&&!cinema.classList.contains('hide')){const enter=document.getElementById('enter');if(enter)enter.click();else cinema.classList.add('hide')}const b=document.querySelector('.nav [data-go="'+section+'"]');if(b){b.click();return true}return false}
function focusEl(el){if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.style.outline='3px solid #f3c668';el.style.outlineOffset='4px';setTimeout(()=>{el.style.outline='';el.style.outlineOffset=''},4200)}
function findKpi(word){const candidates=[...document.querySelectorAll('#dk > *,#dk .kpi,#dk .card,.kpi-card,.hero-kpi,.stat-card')];return candidates.find(el=>{const s=norm(el.textContent);return word==='conversao'?s.includes('conversao'):word==='vgv'?s.includes('vgv'):word==='casais'?s.includes('casais'):word==='vendas'?s.includes('vendas'):false})}
function command(raw){
 const s=norm(raw);
 const spotlight=(title,description)=>{let box=document.getElementById('voice-stage');if(!box){box=document.createElement('section');box.id='voice-stage';document.body.appendChild(box)}box.replaceChildren();const close=document.createElement('button');close.textContent='✕ Fechar';close.onclick=()=>box.remove();const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=description;box.append(close,h,p);msg('✓ '+title)};
 const kpis=[...document.querySelectorAll('#dk .kpi')].map(e=>({label:norm(e.querySelector('small')?.textContent),value:e.querySelector('b')?.textContent||''}));
 const value=label=>kpis.find(k=>k.label===label)?.value||'0';
 const number=s=>Number(String(s).replace(/[^\d]/g,''))||0;
 const people=[...document.querySelectorAll('#sel option')].map(o=>o.value);
 const words=s.split(/\s+/).filter(w=>w.length>=3&&!/^(raio|mostrar|mostra|abre|abrir|resultado|quero|voce|favor|casais|vendas|dados|sobre|profissional|captador|individual|pode|quanto|fez|como|esta|dele|dela)$/.test(w));
 const match=people.map(n=>({n,score:words.filter(w=>norm(n).includes(w)).length})).filter(x=>x.score).sort((x,y)=>y.score-x.score);
 const person=match.length&&(!match[1]||match[0].score>match[1].score)?match[0].n:null;
 const rank=metric=>{activate('rank');const el=document.getElementById('rm');if(el&&[...el.options].some(o=>o.value===metric)){el.value=metric;el.dispatchEvent(new Event('change',{bubbles:true}))}};
 if(/fechar|esconder destaque/.test(s)){document.getElementById('voice-stage')?.remove();msg('Destaque fechado');return}
 if(/ajuda|comandos|o que voce faz/.test(s)){spotlight('COMANDOS DE VOZ','Mostrar casais, vendas, VGV, conversão, quanto falta para a meta, ranking por vendas, quem lidera, resultado do Paulo, projeções e custos.');return}
 if(person&&/mostrar|mostra|abre|abrir|resultado|dados|individual|como|quanto|fez|relatorio|resumo|fala|fale/.test(s)){
  const report=window.raioxVoiceData?.people?.find(p=>norm(p.name)===norm(person));
  if(report){
   const d=window.raioxVoiceData;
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
   msg('✓ Relatório completo de '+person);return
  }
 }
 if(person&&/mostrar|mostra|abre|abrir|resultado|dados|individual|como|quanto|fez/.test(s)){activate('ind');const sel=document.getElementById('sel');sel.value=person;sel.dispatchEvent(new Event('change',{bubbles:true}));msg('✓ Resultado de '+person);setTimeout(()=>focusEl(document.getElementById('ik')),300);return}
 if(/quanto falta|falta quanto|restante|bater a meta/.test(s)){activate('dash');spotlight('DISTÂNCIA DA META',Math.max(0,589-number(value('casais')))+' casais • '+Math.max(0,120-number(value('vendas')))+' vendas • R$ '+new Intl.NumberFormat('pt-BR').format(Math.max(0,12000000-number(value('vgv'))))+' de VGV');return}
 if(/quem lidera|primeiro lugar|quem esta em primeiro|top 3/.test(s)){rank('couples');const names=[...document.querySelectorAll('#rb tr')].slice(0,/top 3/.test(s)?3:1).map(tr=>tr.querySelectorAll('td')[1]?.innerText?.split('\n')[0]).filter(Boolean);spotlight('LIDERANÇA',names.join(' • ')||'Confira o ranking');return}
 if(/ranking|classificacao|colocacao/.test(s)){rank(/vgv|faturamento/.test(s)?'vgv':/vendas/.test(s)?'sales':/conversao/.test(s)?'conversion':'couples');msg('✓ Ranking aberto e classificado');return}
 if(/conversao|eficiencia/.test(s)){activate('dash');const c=number(value('casais')),v=number(value('vendas'));spotlight('CONVERSÃO',c?(100*v/c).toFixed(1).replace('.',',')+'% • '+v+' vendas em '+c+' casais':'Sem dados de casais');return}
 if(/casais|casal|atendimentos/.test(s)){activate('dash');spotlight('CASAIS',value('casais')+' casais • Meta: 589');return}
 if(/vendas|contratos/.test(s)){activate('dash');spotlight('VENDAS',value('vendas')+' vendas brutas • Meta: 120');return}
 if(/vgv|vgb|faturamento|valor vendido/.test(s)){activate('dash');spotlight('VGV BRUTO',value('vgv')+' • Meta: R$ 12.000.000');return}
 const commands=[[/projecao|projetar/,'proj'],[/brindes|custos/,'custos'],[/perfil|qualificados/,'perfil'],[/diagnostico/,'diag'],[/gestao/,'gestao'],[/individual|profissional/,'ind'],[/inicio|central|painel|voltar/,'dash']];
 for(const [re,target] of commands)if(re.test(s)){activate(target);msg('✓ Abrindo '+target);setTimeout(()=>focusEl(document.getElementById(target)),300);return}
 msg('Ouvi: “'+raw+'”. Diga “ajuda” para ver os comandos.');
}
function stop(){listening=false;if(btn()){btn().setAttribute('aria-pressed','false');btn().textContent='🎙️ Ativar voz'}try{recognition?.stop()}catch(_){}msg('Microfone desligado. Toque para ativar novamente.')}
function start(){if(!SpeechRecognition){msg('Este navegador não oferece reconhecimento de voz. Tente Chrome ou Edge com permissão de microfone.');return}
if(!window.isSecureContext){msg('O microfone exige HTTPS. Abra a versão publicada do RAIO X.');return}
if(!recognition){recognition=new SpeechRecognition();recognition.lang='pt-BR';recognition.continuous=true;recognition.interimResults=false;
recognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)command(e.results[i][0].transcript)};
recognition.onerror=e=>{if(['not-allowed','service-not-allowed','audio-capture'].includes(e.error)){stop();msg('Permita o acesso ao microfone nas configurações do navegador.')}else msg('Reconhecimento: '+e.error+'. Você pode tentar novamente.')};
recognition.onend=()=>{if(listening){try{recognition.start()}catch(e){msg('Não foi possível continuar a escuta: '+e.message)}}};
}
listening=true;btn().setAttribute('aria-pressed','true');btn().textContent='🔴 Desligar voz';msg('🎙️ Escutando. Diga “mostrar casais”, “vendas”, “VGV”, “ranking” ou “projeções”.');try{recognition.start()}catch(e){stop();msg('Falha ao iniciar microfone: '+e.message)}
}
function init(){document.head.appendChild(css);document.body.appendChild(panel);btn().addEventListener('click',()=>listening?stop():start())}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();