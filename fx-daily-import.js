(()=>{'use strict';
const KEY='raiox-fx-daily-v1';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const num=s=>Number(String(s||'0').replace(/\./g,'').replace(',','.'))||0;
try{window.raioxDailyImport=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){window.raioxDailyImport={}}
function csvRows(raw){
 const out=[];let row=[],cell='',quoted=false;
 for(let i=0;i<raw.length;i++){const c=raw[i];
  if(c==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(c===';'&&!quoted){row.push(cell);cell=''}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))out.push(row);row=[];cell=''}
  else cell+=c
 }
 row.push(cell);if(row.some(v=>v.trim()))out.push(row);return out
}
function importText(raw){
 const lines=csvRows(raw),hi=lines.findIndex(r=>r.some(v=>norm(v)==='DATA DE ATENDIMENTO')&&r.some(v=>norm(v)==='PROMOTOR DE MARKETING'));
 if(hi<0)throw Error('Não encontrei as colunas do Controle de sala.');
 const headers=lines[hi].map(norm),col=k=>headers.indexOf(norm(k));
 const id=col('Data de atendimento'),name=col('Promotor de marketing'),value=col('Valor vendido'),qualification=col('Qualificação');
 if([id,name,value].some(i=>i<0))throw Error('Faltam colunas obrigatórias no relatório.');
 const grouped={};let total=0,used=0;
 for(const r of lines.slice(hi+1)){
  const m=String(r[id]||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m||!r[name])continue;
  const day=+m[1],month=m[3]+'-'+m[2]+'-01',n=norm(r[name]);
  if(day<1||day>31)continue;
  const bucket=(grouped[month]??={})[n]??={rows:Array.from({length:31},()=>[0,0,0,0,0])};
  const cell=bucket.rows[day-1],v=num(r[value]);
  cell[0]++;if(v>0)cell[1]++;cell[2]+=v;
  const q=norm(r[qualification]);if(q==='Q')cell[3]++;if(q==='NQ')cell[4]++;
  total++;used++;
 }
 if(!used)throw Error('Nenhum atendimento válido encontrado.');
 const month=Object.keys(grouped).sort().at(-1),list=grouped[month];
 const totals=Object.values(list).reduce((a,p)=>{a.c+=p.rows.reduce((s,r)=>s+r[0],0);a.v+=p.rows.reduce((s,r)=>s+r[2],0);return a},{c:0,v:0});
 // October official source: verify attendance count and total VGV before accepting.
 if(month==='2026-10-01'&&(totals.c!==395||Math.abs(totals.v-7047002)>.01))throw Error('O relatório não fecha com a base oficial de outubro (395 casais / R$ 7.047.002). Nenhuma alteração foi salva.');
 window.raioxDailyImport={...window.raioxDailyImport,...grouped};
 localStorage.setItem(KEY,JSON.stringify(window.raioxDailyImport));
 return {month,people:Object.keys(list).length,attendances:totals.c,vgv:totals.v}
}
function init(){
 const fx=document.getElementById('fx');if(!fx)return;
 const box=document.createElement('div');box.id='raiox-fx-import';box.style.cssText='margin:14px 0;padding:16px 20px;border:1px solid #4771b1;border-radius:14px;background:#10213c;color:#e5f0ff;display:flex;align-items:center;gap:12px;flex-wrap:wrap';
 const button=document.createElement('button');button.type='button';button.textContent='📁 Importar histórico diário (CSV)';button.style.cssText='padding:11px 17px;border-radius:10px;border:1px solid #66a6f9;background:#214b83;color:white;font-weight:750;cursor:pointer';
 const input=document.createElement('input');input.type='file';input.accept='.csv,text/csv';input.hidden=true;
 const status=document.createElement('span');status.style.cssText='font-size:13px;line-height:1.5';status.textContent=window.raioxDailyImport['2026-10-01']?'✓ Histórico diário salvo neste navegador.':'Importe o relatório Controle de sala para habilitar constância e dias ativos reais.';
 button.onclick=()=>input.click();
 input.onchange=async()=>{if(!input.files?.[0])return;button.disabled=true;status.textContent='Lendo e conferindo os registros...';
  try{const raw=await input.files[0].arrayBuffer();const str=new TextDecoder('windows-1252').decode(raw);const result=importText(str);status.textContent='✓ '+result.attendances+' atendimentos de '+result.people+' nomes conferidos. FX atualizado neste navegador.';window.raioxRefreshFx?.()}
  catch(e){status.textContent='⚠ '+e.message}
  finally{button.disabled=false;input.value=''}
 };
 box.append(button,input,status);
 const head=fx.querySelector('.hero')||fx.firstElementChild;head?.insertAdjacentElement('afterend',box);
 if(!head)fx.prepend(box);
 window.raioxRefreshFx?.()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();