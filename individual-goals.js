(()=>{
const cfg=window.RAIOX_AUTH_CONFIG||{},el=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('pt-BR'),money=n=>'R$ '+fmt(n);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
async function rest(path,token){const r=await fetch(cfg.url+'/rest/v1/'+path,{headers:{apikey:cfg.key,Authorization:'Bearer '+token}});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
let loadId=0;
async function load(ctx){
 const root=el('myGoalContent'),sel=el('myGoalPerson');if(!root||!sel||!cfg.url)return;
 const id=++loadId,token=ctx?.session?.access_token||window.RAIOX_AUTH?.session?.access_token||cfg.key;
 try{
 const months=await rest('ceo_months?select=id,ref_month,label,status&order=ref_month.desc',token);
 const stored=(()=>{try{return sessionStorage.getItem('raiox.view.month.v1')}catch(_){return ''}})();
 const requested=new URLSearchParams(location.search).get('month');
 const active=months.find(m=>m.ref_month===requested)||months.find(m=>m.ref_month===stored)||months.find(m=>m.status==='open')||months[0];
 if(!active)return;
 el('myGoalMonth').textContent=active.label;
 const performance=await rest('raiox_performance_records?select=professional_name,couples,sales,vgv,researches&ref_month=eq.'+encodeURIComponent(active.ref_month)+'&role=eq.Promotor%20de%20Marketing',token);
 if(id!==loadId)return;
 let listed=performance.map(p=>({id:norm(p.professional_name),full_name:p.professional_name})).filter((p,i,arr)=>arr.findIndex(x=>x.id===p.id)===i).sort((a,b)=>a.full_name.localeCompare(b.full_name,'pt-BR'));
 let goals=[],authorized=false;
 try{
 const registry=await rest('ceo_people?select=id,full_name,status',token);
 const privateGoals=await rest('ceo_person_goals?select=person_id,couples_goal,sales_goal,vgv_goal,research_goal&month_id=eq.'+encodeURIComponent(active.id),token);
 goals=privateGoals.map(g=>({...g,person_name:registry.find(p=>p.id===g.person_id)?.full_name||''}));
 authorized=true;
 }catch(accessError){console.info('Metas protegidas; resultados públicos disponíveis.');}
 const matchGoal=(name)=>{
   const nameKey=norm(name), exact=goals.find(x=>norm(x.person_name)===nameKey);
   if(exact)return exact;
   const aliases={'adrianomoreira':'adriano','marcioalfaia':'marcio','josyenefreitas':'josyene','larissaribeiro':'larissa','jessicabarbosa':'jessica','matheusdomingossantos':'matheusdomingos','otaviojosedeoliveiramartin':'otavio','leticialeandradetoledo':'leticia','paulovictorortiz':'paulo','pedrohenriquegomessantos':'pedro','suenecintiadasilva':'suene','marloncruzgoncalves':'marlon'};
   const key=aliases[nameKey]||nameKey;
   const matches=goals.filter(x=>{const gn=norm(x.person_name);return gn===key||gn.startsWith(key)||key.startsWith(gn)&&gn.length>=5});
   return matches.length===1?matches[0]:null;
 };
 if(authorized){
  const known=new Set(listed.map(p=>matchGoal(p.full_name)?.person_id).filter(Boolean));
  goals.forEach(g=>{
   if(!g.person_name||known.has(g.person_id))return;
   listed.push({id:'goal:'+g.person_id,full_name:g.person_name,goalPersonId:g.person_id});
   known.add(g.person_id);
  });
  listed.sort((a,b)=>a.full_name.localeCompare(b.full_name,'pt-BR'));
 }
 const previous=sel.value;
 sel.innerHTML='<option value="">Escolha seu nome</option>'+listed.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.full_name)+'</option>').join('');
 if(listed.some(p=>p.id===previous))sel.value=previous;
 const card=(title,actual,goal,kind)=>{const valid=Number(goal)>0;const ratio=valid?Math.min(100,Number(actual||0)/Number(goal)*100):0;const display=kind==='money'?money:fmt;return '<div style="background:#101f3d;border:1px solid #354e75;border-radius:12px;padding:13px;min-width:0"><small>'+title+'</small><div style="font-size:20px;font-weight:750;margin:8px 0">'+display(actual)+' <span style="font-size:12px;opacity:.7">/ '+(valid?display(goal):'não definida')+'</span></div>'+(valid?'<div style="height:7px;background:#263655;border-radius:9px;overflow:hidden"><div style="height:100%;width:'+ratio+'%;background:#4fd3bb"></div></div><small>'+ratio.toFixed(1).replace('.',',')+'% alcançado • faltam '+display(Math.max(0,goal-actual))+'</small>':'<small>Meta individual ainda não cadastrada</small>')+'</div>'};
 const render=()=>{
 const p=listed.find(x=>x.id===sel.value);
 if(!p){root.textContent='Selecione um profissional para ver a meta e o desempenho.';return}

 const g=p.goalPersonId?goals.find(x=>x.person_id===p.goalPersonId):matchGoal(p.full_name);
 const perf=performance.find(x=>norm(x.professional_name)===norm(p.full_name))||(g?performance.find(x=>matchGoal(x.professional_name)?.person_id===g.person_id):null)||{};
 root.innerHTML='<strong>'+esc(p.full_name)+'</strong><p style="font-size:12px;opacity:.75">'+esc(active.label)+' • resultados oficiais</p>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px">'+
 card('Casais',perf.couples,g?.couples_goal)+card('Vendas / cotas',perf.sales,g?.sales_goal)+card('VGV',perf.vgv,g?.vgv_goal,'money')+
 (Number(g?.research_goal)>0?card('Pesquisas',perf.researches,g.research_goal):'')+'</div>'+
 (!authorized?'<p style="margin-top:12px;color:#f0c884">Resultado oficial disponível. Metas individuais exigem autorização da gestão.</p>':!g?'<p style="margin-top:12px;color:#f0c884">A gestão ainda não cadastrou uma meta individual para este profissional neste mês.</p>':'');
 };
 sel.onchange=render;render();
 }catch(e){if(id===loadId){root.textContent=(e&&(/HTTP (401|403)/.test(String(e.message||e))))?'As metas individuais exigem acesso autorizado. Entre com seu usuário aprovado para consultar; somente o gestor pode editar.':'Não foi possível carregar as metas individuais. Confira a conexão e atualize a página.';}console.error('RAIO X metas individuais',e)}
}
window.addEventListener('raiox:authenticated',e=>load(e.detail));
window.addEventListener('raiox:month-changed',e=>load(e.detail));
load(window.RAIOX_AUTH||null);
})();