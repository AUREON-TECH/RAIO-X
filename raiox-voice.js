(()=>{'use strict';
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let listening=false,recognition=null,voiceBusy=false;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const panel=document.createElement('aside');panel.id='raiox-voice-panel';panel.innerHTML='<button id="raiox-voice-toggle" type="button" aria-pressed="false">🎙️ Ativar voz</button><div id="raiox-voice-message" role="status" aria-live="polite">Diga “mostrar casais”, “vendas”, “VGV” ou “ranking”.</div>';
const css=document.createElement('style');css.textContent=`
#raiox-voice-panel{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;max-width:min(380px,calc(100vw - 28px));font-family:system-ui,Arial,sans-serif}
#raiox-voice-toggle{border:2px solid #88a8ff;background:#1b3164;color:white;border-radius:999px;padding:13px 20px;font-size:15px;font-weight:800;box-shadow:0 8px 28px #0009;cursor:pointer;touch-action:manipulation;pointer-events:auto}
#raiox-voice-toggle[aria-pressed=true]{background:#9b243b;border-color:#ffb0b7;animation:raiox-voice-pulse 1.5s infinite}
#raiox-voice-message{background:#101b39;color:#e9f0ff;border:1px solid #4c6099;border-radius:12px;padding:10px 14px;font-size:13px;line-height:1.45;box-shadow:0 6px 22px #0008;max-height:125px;overflow:auto}
@keyframes raiox-voice-pulse{50%{box-shadow:0 0 0 9px #e13c532c}}
@media(max-width:600px){#raiox-voice-panel{right:10px;bottom:12px}#raiox-voice-toggle{font-size:13px;padding:11px 15px}}
`;
function msg(s){const e=document.getElementById('raiox-voice-message');if(e)e.textContent=s}
function btn(){return document.getElementById('raiox-voice-toggle')}
function activate(section){const b=document.querySelector('.nav [data-go="'+section+'"]');if(b){b.click();return true}return false}
function focusEl(el){if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.style.outline='3px solid #f3c668';el.style.outlineOffset='4px';setTimeout(()=>{el.style.outline='';el.style.outlineOffset=''},4200)}
function findKpi(word){return [...document.querySelectorAll('#dk .kpi,#dk .card,#dk [class*=kpi],#dk > *')].find(el=>norm(el.textContent).includes(word))}
function command(raw){const s=norm(raw).replace(/^raio\s*x[ ,:]*/,'');let target='';let label='';
if(/(casais|casal|quantidade de casal)/.test(s)){target='dash';label='casais'}
else if(/(vendas|venda|contratos)/.test(s)){target='dash';label='vendas'}
else if(/(vgv|vgb|faturamento|valor geral|valor de vendas)/.test(s)){target='dash';label='vgv'}
else if(/(ranking|classificacao|primeiro lugar|lider|colocacao|quem esta em primeiro)/.test(s)){target='rank';label='ranking'}
else if(/(individual|profissional|captador)/.test(s)){target='ind';label='individual'}
else if(/(projecao|projetar|projetado)/.test(s)){target='proj';label='projeções'}
else if(/(brindes|custos|custo)/.test(s)){target='custos';label='custos'}
else if(/(perfil|qualificado|nao qualificado)/.test(s)){target='perfil';label='perfil'}
else if(/(diagnostico)/.test(s)){target='diag';label='diagnóstico'}
else if(/(gestao|rafael)/.test(s)){target='gestao';label='gestão'}
else if(/(inicio|central|painel|voltar)/.test(s)){target='dash';label='central'};
if(!target){msg('Ouvi: “'+raw+'”. Tente “mostrar casais”, “vendas”, “VGV”, “ranking” ou “projeções”.');return}
if(!activate(target)){msg('A seção '+label+' não está disponível nesta tela.');return}
msg('✓ Abrindo '+label+' — comando: “'+raw+'”');
setTimeout(()=>{if(target==='dash'&&['casais','vendas','vgv'].includes(label))focusEl(findKpi(label));else focusEl(document.getElementById(target)?.querySelector('h2,h3')||document.getElementById(target))},250)
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