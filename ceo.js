(()=>{
const cfg=window.RAIOX_AUTH_CONFIG||{};
const STORE='raiox.auth.session.v1';
const $=id=>document.getElementById(id);
const state={
  session:null,user:null,admin:null,
  months:[],month:null,people:[],teams:[],assignments:[],teamGoals:[],performance:null,
  presence:[],one:[],tasks:[],approvals:[],agenda:[],goals:[],strategy:[],todayArea:'promotor',professionalArea:'promotor',xiaRole:'',reportPeriod:'month',reportText:'',strategyTypeFilter:'all',strategyStatusFilter:'all'
};
const TITLES={
  today:['Hoje','Pulso executivo da operação: performance, presença e atenção.'],
  goals:['Metas','Meta geral, Super Meta, metas por equipe e metas individuais.'],
  teams:['Equipes','Defina equipes, horários e vínculos do mês.'],
  people:['Profissionais','Raio-X individual, metas, presença, performance e acompanhamento.'],
  one:['Olho no Olho','Conversa 1:1, compromissos e acompanhamento.'],
  xia:['XIA','Central única de inteligência: operação, profissional, feedback e próximos passos.'],
  profileintel:['Raio X do Perfil','Inteligência dos casais, exceções, brindes e comportamento de compra.'],
  strategy:['Estratégia','Pautas, decisões e estratégias da operação.'],
  agenda:['Agenda','Treinamentos, meetings, reuniões e compromissos.'],
  tasks:['Pendências','Tudo que você precisa revisar, conversar ou acompanhar.'],
  reports:['Relatórios','Resumo diário e mensal da gestão de pessoas.'],
  approvals:['Acessos','Controle quem pode ou não acessar o RAIO X.']
};
const STATUS={
  present:'Compareceu',
  absent:'Não compareceu',
  unavailable:'Indisponível',
  agreed_off:'Folga combinada',
  late:'Chegou após o combinado',
  left_early:'Saiu antes do combinado',
  training:'Treinamento',
  remote:'Remoto'
};
const ROLE_ORDER=['Promotor de Marketing','Liner / Consultor','Closer / Fechador','Liderança','Gestão','Apoio','Outros'];

function toast(msg,error=false){
  const el=$('ceoToast'); if(!el)return;
  el.textContent=msg; el.className='toast show'+(error?' error':'');
  setTimeout(()=>el.className='toast',2800);
}
function localDate(d=new Date()){
  const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return z.toISOString().slice(0,10);
}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function num(v,d=0){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});}
function pct(v){return num(v,1)+'%';}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();}
function time5(v){return v?String(v).slice(0,5):'';}
function personRoles(p){
  const roles=Array.isArray(p?.roles)?p.roles.filter(Boolean):[];
  return roles.length?roles:[p?.area||'Outros'];
}
function roleOf(p){return personRoles(p)[0]||'Outros';}
function hasRole(p,role){return personRoles(p).some(r=>norm(r)===norm(role));}
function statusLabel(s){return s==='active'?'Ativo':s==='inactive'?'Inativo':s==='away'?'Indisponível':s==='ended'?'Distratado':s;}
function dateBr(v){if(!v)return '—';const [y,m,d]=String(v).slice(0,10).split('-');return d+'/'+m+'/'+y;}
function monthKeyFromDate(v){return String(v||'').slice(0,7)+'-01';}

async function raw(path,options={},token=state.session?.access_token){
  const headers=Object.assign({apikey:cfg.key,'Content-Type':'application/json'},options.headers||{});
  if(token)headers.Authorization='Bearer '+token;
  const res=await fetch(cfg.url+path,Object.assign({},options,{headers}));
  const txt=await res.text();let data={};
  try{data=txt?JSON.parse(txt):{};}catch(_){data={message:txt};}
  if(!res.ok)throw new Error(data.message||data.msg||data.error||'Erro ao acessar o banco.');
  return data;
}
async function rest(path,options={}){return raw('/rest/v1/'+path,options);}

function loadSession(){try{return JSON.parse(localStorage.getItem(STORE)||'null');}catch(_){return null;}}
async function refresh(s){
  const d=await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})},null);
  const n={access_token:d.access_token,refresh_token:d.refresh_token,expires_at:d.expires_at||Math.floor(Date.now()/1000)+(d.expires_in||3600),user:d.user};
  localStorage.setItem(STORE,JSON.stringify(n)); return n;
}
async function validateCEO(){
  let s=loadSession(); if(!s)throw new Error('Faça login no RAIO X primeiro.');
  if(!s.expires_at||s.expires_at-Math.floor(Date.now()/1000)<90)s=await refresh(s);
  const user=await raw('/auth/v1/user',{method:'GET'},s.access_token);
  state.session=s; state.user=user;
  const rows=await rest('raiox_app_users?select=user_id,display_name,role,active,approval_status,email&user_id=eq.'+encodeURIComponent(user.id));
  const access=rows[0];
  if(!access||!access.active||access.approval_status!=='approved'||!['ceo','manager'].includes(access.role)){
    throw new Error('Esta conta não possui acesso ao Portal de Gestão.');
  }
  state.admin=access;
}
async function signOut(){
  try{await raw('/auth/v1/logout',{method:'POST'});}catch(_){}
  localStorage.removeItem(STORE); location.href='./';
}
async function adminAction(action,payload={}){
  const res=await fetch(cfg.url+'/functions/v1/raiox-create-user',{
    method:'POST',
    headers:{apikey:cfg.key,Authorization:'Bearer '+state.session.access_token,'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({action},payload))
  });
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||'Falha ao administrar o acesso.');
  return data;
}

async function loadBase(){
  const [months,people]=await Promise.all([
    rest('ceo_months?select=*&order=ref_month.desc'),
    rest('ceo_people?select=*&order=full_name.asc')
  ]);
  state.months=months; state.people=people;
  fillPeopleSelects();
  await loadApprovals();
  const currentMonth=monthKeyFromDate(localDate());
  const preferred=state.months.find(m=>m.ref_month===currentMonth)||state.months.find(m=>m.status==='open')||state.months[0];
  renderMonths(preferred?.id);
  if(preferred)await selectMonth(preferred.id);
}
function renderMonths(selected){
  if(!$('monthSelect'))return;
  $('monthSelect').innerHTML=state.months.map(m=>'<option value="'+m.id+'">'+esc(m.label)+(m.status==='closed'?' • fechado':'')+'</option>').join('');
  if(selected)$('monthSelect').value=selected;
}
async function selectMonth(id){
  state.month=state.months.find(m=>m.id===id)||state.months[0];
  if(!state.month)return;
  $('monthSelect').value=state.month.id;
  await loadPerformanceForMonth();
  renderMonthGoals();
  const monthPrefix=state.month.ref_month.slice(0,7);
  const today=localDate();
  if(!$('todayDate').value||$('todayDate').value.slice(0,7)!==monthPrefix){
    $('todayDate').value=today.slice(0,7)===monthPrefix?today:state.month.ref_month;
  }
  await Promise.all([loadTeams(),loadTasks(),loadOne(),loadGoals(),loadAgenda(),loadStrategy()]);
  await loadToday(); await loadOperationalHistory();
  fillPeopleSelects();
  renderTeams(); renderPeople(); renderOneHistory(); renderTasks(); renderAgenda(); renderStrategy(); await renderReports(); await renderProfessionalProfile();
  if(document.getElementById('xia')?.classList.contains('on'))await renderXIA();
}
async function loadTeams(){
  const [teams,assignments,teamGoals]=await Promise.all([
    rest('ceo_teams?select=*&month_id=eq.'+state.month.id+'&order=start_time.asc'),
    rest('ceo_team_assignments?select=*&month_id=eq.'+state.month.id+'&valid_to=is.null'),
    rest('ceo_team_goals?select=*&month_id=eq.'+state.month.id)
  ]);
  state.teams=teams;
  state.assignments=assignments;
  state.teamGoals=teamGoals;
}
async function loadTasks(){state.tasks=await rest('ceo_tasks?select=*&month_id=eq.'+state.month.id+'&order=created_at.desc');}
async function loadOne(){state.one=await rest('ceo_one_on_one?select=*&month_id=eq.'+state.month.id+'&order=meeting_date.desc,created_at.desc');}
async function loadGoals(){state.goals=await rest('ceo_person_goals?select=*&month_id=eq.'+state.month.id);}
async function loadAgenda(){state.agenda=await rest('ceo_agenda?select=*&month_id=eq.'+state.month.id+'&order=event_date.asc,start_time.asc');}
async function loadStrategy(){state.strategy=await rest('ceo_strategy_records?select=*&month_id=eq.'+state.month.id+'&order=record_date.desc,created_at.desc');}
async function loadToday(){
  const date=$('todayDate').value||localDate(); $('todayDate').value=date;
  state.presence=await rest('ceo_daily_presence?select=*&work_date=eq.'+date);
  renderToday();
  if($('quickPresenceSearch')?.value)renderQuickPresenceSearch();
}
function activePeople(){return state.people.filter(p=>p.status!=='ended');}
function workingPeople(){return state.people.filter(p=>p.status==='active');}
function personById(id){return state.people.find(p=>p.id===id);}
function goalByPerson(id){return state.goals.find(g=>g.person_id===id)||null;}
function teamByPerson(id){
  const a=state.assignments.find(x=>x.person_id===id&&!x.valid_to);
  return a?state.teams.find(t=>t.id===a.team_id):null;
}
function effectiveStart(p){
  const team=teamByPerson(p.id);
  return time5(p.default_start_time)||time5(team?.start_time)||'—';
}

function legacyPerformanceMonth(data){
  const raw=data?.updated||'';
  const m=raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m?m[3]+'-'+m[2]:null;
}
function performanceData(){return state.performance||null;}
async function loadPerformanceForMonth(){
  state.performance=null;
  if(!state.month)return;

  const legacy=window.XIA_PERFORMANCE||null;
  if(legacy&&legacyPerformanceMonth(legacy)===state.month.ref_month.slice(0,7)){
    state.performance=legacy;
    return;
  }

  try{
    const rows=await rest(
      'raiox_performance_records?select=professional_name,role,researches,couples,sales,vgv,q,nq,gifts,active_days,week_volume,week_sales,week_vgv,daily,updated_on&ref_month=eq.'+
      encodeURIComponent(state.month.ref_month)+'&order=professional_name.asc,role.asc'
    );
    if(rows.length){
      const byName=new Map();
      let updated='';
      rows.forEach(r=>{
        if(!byName.has(r.professional_name))byName.set(r.professional_name,[]);
        byName.get(r.professional_name).push({
          role:r.role,
          r:Number(r.researches||0),c:Number(r.couples||0),s:Number(r.sales||0),v:Number(r.vgv||0),
          q:Number(r.q||0),nq:Number(r.nq||0),g:Number(r.gifts||0),d:Number(r.active_days||0),
          w:Number(r.week_volume||0),ws:Number(r.week_sales||0),wv:Number(r.week_vgv||0),
          daily:Array.isArray(r.daily)?r.daily:[]
        });
        if(String(r.updated_on||'')>updated)updated=String(r.updated_on||'');
      });
      state.performance={
        updated:updated?dateBr(updated):state.month.label,
        people:[...byName.entries()].map(([name,roles])=>({name,roles}))
      };
    }
  }catch(err){
    console.warn('RAIO X performance history unavailable',err);
  }
}
function operationMonthTotals(){
  if(!state.month||performanceUpdatedMonth()!==state.month.ref_month.slice(0,7))return null;
  const roles=performanceRoles('Promotor de Marketing');
  const hasResearch=roles.some(r=>Object.prototype.hasOwnProperty.call(r,'r'));
  return roles.reduce((a,r)=>{
    if(hasResearch)a.r+=Number(r.r||0);
    a.c+=Number(r.c||0);a.s+=Number(r.s||0);a.v+=Number(r.v||0);
    return a;
  },{r:hasResearch?0:null,c:0,s:0,v:0});
}
function goalStatus(current,goal,superGoal){
  goal=Number(goal||0);superGoal=Number(superGoal||0);
  if(goal<=0&&superGoal<=0)return {label:'META NÃO DEFINIDA',cls:'empty',pct:0};
  if(current==null)return {label:'AGUARDANDO DADOS',cls:'waiting',pct:0};
  current=Number(current||0);
  if(superGoal>0&&current>=superGoal)return {label:'SUPER META',cls:'super',pct:100};
  if(goal>0&&current>=goal)return {label:'META BATIDA',cls:'hit',pct:100};
  if(goal>0)return {label:pct(current/goal*100),cls:'progress',pct:Math.min(100,current/goal*100)};
  return {label:'META NÃO DEFINIDA',cls:'empty',pct:0};
}
function monthGoalCardsHtml(){
  if(!state.month)return '';
  const m=state.month,total=operationMonthTotals();
  const items=[
    {label:'Pesquisas',current:total?.r??null,goal:m.goal_research,superGoal:m.super_goal_research,fmt:v=>num(v)},
    {label:'Casais',current:total?.c??null,goal:m.goal_couples,superGoal:m.super_goal_couples,fmt:v=>num(v)},
    {label:'Vendas',current:total?.s??null,goal:m.goal_sales,superGoal:m.super_goal_sales,fmt:v=>num(v)},
    {label:'VGV',current:total?.v??null,goal:m.goal_vgv,superGoal:m.super_goal_vgv,fmt:v=>money(v)}
  ];
  return items.map(x=>{
    const s=goalStatus(x.current,x.goal,x.superGoal);
    return '<div class="month-goal-card '+s.cls+'"><div class="month-goal-head"><small>'+x.label+'</small><span>'+s.label+'</span></div>'+
      '<b>'+(x.current==null?'—':x.fmt(x.current))+'</b>'+
      '<p>Meta '+(Number(x.goal||0)>0?x.fmt(x.goal):'—')+(Number(x.superGoal||0)>0?' • Super '+x.fmt(x.superGoal):'')+'</p>'+
      '<div class="month-goal-progress"><i style="width:'+s.pct.toFixed(1)+'%"></i></div></div>';
  }).join('');
}
function renderMonthGoals(){
  if(!state.month)return;
  const html=monthGoalCardsHtml();
  if($('monthGoalsStrip'))$('monthGoalsStrip').innerHTML=html;
  if($('goalBookCards'))$('goalBookCards').innerHTML=html;
}
function openMonthGoals(){
  if(!state.month)return;
  const m=state.month;
  $('monthGoalModalTitle').textContent='Livro de Metas • '+m.label;
  $('monthGoalResearch').value=Number(m.goal_research||0)||'';
  $('monthGoalCouples').value=Number(m.goal_couples||0)||'';
  $('monthGoalSales').value=Number(m.goal_sales||0)||'';
  $('monthGoalVgv').value=Number(m.goal_vgv||0)||'';
  $('monthSuperGoalResearch').value=Number(m.super_goal_research||0)||'';
  $('monthSuperGoalCouples').value=Number(m.super_goal_couples||0)||'';
  $('monthSuperGoalSales').value=Number(m.super_goal_sales||0)||'';
  $('monthSuperGoalVgv').value=Number(m.super_goal_vgv||0)||'';
  $('monthGoalModal').hidden=false;
}
function closeMonthGoals(){if($('monthGoalModal'))$('monthGoalModal').hidden=true;}
async function saveMonthGoals(){
  if(!state.month)return;
  const body={
    goal_research:Number($('monthGoalResearch').value||0),
    goal_couples:Number($('monthGoalCouples').value||0),
    goal_sales:Number($('monthGoalSales').value||0),
    goal_vgv:Number($('monthGoalVgv').value||0),
    super_goal_research:Number($('monthSuperGoalResearch').value||0),
    super_goal_couples:Number($('monthSuperGoalCouples').value||0),
    super_goal_sales:Number($('monthSuperGoalSales').value||0),
    super_goal_vgv:Number($('monthSuperGoalVgv').value||0)
  };
  if(Object.values(body).some(v=>!Number.isFinite(v)||v<0)){toast('As metas precisam ser números válidos e positivos.',true);return;}
  try{
    $('saveMonthGoalsBtn').disabled=true;
    await rest('ceo_months?id=eq.'+state.month.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
    Object.assign(state.month,body);
    const i=state.months.findIndex(x=>x.id===state.month.id);if(i>=0)Object.assign(state.months[i],body);
    renderMonthGoals();renderTeamGoalDistribution();await renderReports();
    toast('Meta e Super Meta salvas para '+state.month.label+'.');
    closeMonthGoals();
  }catch(err){toast(err.message,true);}
  finally{$('saveMonthGoalsBtn').disabled=false;}
}

function performanceUpdatedMonth(){
  const raw=performanceData()?.updated||'';
  const m=raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m?m[3]+'-'+m[2]:null;
}
function performanceAvailableForDate(date){
  return Boolean(date&&performanceUpdatedMonth()===String(date).slice(0,7));
}
const TODAY_AREA_ROLES={
  promotor:'Promotor de Marketing',
  liner:'Liner / Consultor',
  closer:'Closer / Fechador'
};
const PROFESSIONAL_AREA_LABELS={
  promotor:'Promotores de Marketing',
  liner:'Liners / Consultores',
  closer:'Closers / Fechadores'
};
function professionalAreaRole(){return TODAY_AREA_ROLES[state.professionalArea]||TODAY_AREA_ROLES.promotor;}
function matchesProfessionalArea(p){return hasRole(p,professionalAreaRole());}
function professionalWorkingPeople(){return workingPeople().filter(matchesProfessionalArea);}
function professionalListedPeople(){return state.people.filter(p=>p.status!=='ended'&&matchesProfessionalArea(p));}
function professionalEndedPeople(){return state.people.filter(p=>p.status==='ended'&&matchesProfessionalArea(p));}
function professionalAreaKeyForRole(role){
  const n=norm(role);
  return Object.entries(TODAY_AREA_ROLES).find(([,label])=>norm(label)===n)?.[0]||'promotor';
}
function syncProfessionalAreaUi(){
  document.querySelectorAll('[data-profession-area]').forEach(b=>b.classList.toggle('active',b.dataset.professionArea===state.professionalArea));
  if($('peopleDirectoryTitle'))$('peopleDirectoryTitle').textContent=PROFESSIONAL_AREA_LABELS[state.professionalArea]||'Profissionais';
}
function todayAreaRole(){return TODAY_AREA_ROLES[state.todayArea]||null;}
function personMatchesTodayArea(p){
  const role=todayAreaRole();
  return !role||hasRole(p,role);
}
function todayWorkingPeople(){return workingPeople().filter(personMatchesTodayArea);}
function performanceRoles(roleName='Promotor de Marketing'){
  return (performanceData()?.people||[])
    .flatMap(person=>(person.roles||[]).map(role=>({name:person.name,...role})))
    .filter(x=>norm(x.role)===norm(roleName));
}
function areaPerformanceDay(date,roleName){
  if(!performanceAvailableForDate(date))return null;
  const day=Math.max(1,Number(String(date).slice(8,10)||1));
  const roles=performanceRoles(roleName);
  const people=[];
  const total={c:0,s:0,v:0,q:0,nq:0,g:0};
  roles.forEach(r=>{
    const row=r.daily?.[day-1]||[0,0,0,0,0];
    const item={name:r.name,c:Number(row[0]||0),s:Number(row[1]||0),v:Number(row[2]||0),q:Number(row[3]||0),nq:Number(row[4]||0),g:0,month:r,role:r.role};
    people.push(item);
    total.c+=item.c; total.s+=item.s; total.v+=item.v; total.q+=item.q; total.nq+=item.nq;
  });
  return {day,total,people,role:roleName,updated:performanceData()?.updated||'—'};
}
function performanceDay(date){
  const role=todayAreaRole();
  if(role)return areaPerformanceDay(date,role);
  if(!performanceAvailableForDate(date))return null;
  return {
    mode:'all',
    updated:performanceData()?.updated||'—',
    areas:Object.entries(TODAY_AREA_ROLES).map(([key,label])=>({key,label,data:areaPerformanceDay(date,label)}))
  };
}
function performanceMonth(roleName=todayAreaRole()){
  if(!roleName||!state.month||performanceUpdatedMonth()!==state.month.ref_month.slice(0,7))return null;
  const roles=performanceRoles(roleName);
  return roles.reduce((a,r)=>{
    a.c+=Number(r.c||0);a.s+=Number(r.s||0);a.v+=Number(r.v||0);a.q+=Number(r.q||0);a.nq+=Number(r.nq||0);a.g+=Number(r.g||0);
    return a;
  },{c:0,s:0,v:0,q:0,nq:0,g:0});
}
function todayAttention(perf){
  const alerts=[];
  const rows=[...document.querySelectorAll('.presence-row')];
  rows.forEach(row=>{
    const p=personById(row.dataset.person);
    const status=row.querySelector('.presence-status')?.value||'present';
    if(!p)return;
    if(status==='absent')alerts.push({level:'critical',title:p.full_name,text:'Não compareceu hoje.',tag:'PRESENÇA'});
    else if(status==='late')alerts.push({level:'warn',title:p.full_name,text:'Chegou após o horário combinado.',tag:'HORÁRIO'});
    else if(status==='left_early')alerts.push({level:'warn',title:p.full_name,text:'Saiu antes do horário combinado.',tag:'HORÁRIO'});
    else if(status==='unavailable')alerts.push({level:'info',title:p.full_name,text:'Está marcado como indisponível.',tag:'DISPONIBILIDADE'});
  });
  const perfPeople=perf?.mode==='all'
    ? perf.areas.flatMap(a=>(a.data?.people||[]).map(x=>({...x,areaLabel:a.label})))
    : (perf?.people||[]);
  if(perfPeople.length){
    perfPeople.filter(x=>x.c>=2&&x.s===0).sort((a,b)=>b.c-a.c).slice(0,4).forEach(x=>{
      alerts.push({level:'warn',title:x.name,text:x.c+' casais hoje e nenhuma venda registrada.',tag:'CONVERSÃO'});
    });
    perfPeople.filter(x=>x.c>=2&&x.q/Math.max(x.c,1)<.5).sort((a,b)=>b.c-a.c).slice(0,3).forEach(x=>{
      alerts.push({level:'info',title:x.name,text:'Qualificação de '+pct(x.q/Math.max(x.c,1)*100)+' hoje ('+x.q+' Q em '+x.c+').',tag:'QUALIFICAÇÃO'});
    });
  }
  const unique=[];
  const seen=new Set();
  alerts.forEach(a=>{
    const key=norm(a.title)+'|'+a.tag;
    if(!seen.has(key)){seen.add(key);unique.push(a);}
  });
  return unique.slice(0,8);
}
function renderTodayExecutive(){
  const date=$('todayDate')?.value||localDate();
  const perf=performanceDay(date);
  const month=performanceMonth();
  if($('todayPerformance')){
    if(!perf){
      $('todayPerformance').innerHTML='<div class="today-data-empty"><b>Performance do período ainda não carregada</b><span>Presença e gestão continuam disponíveis. Base XIA: '+esc(performanceData()?.updated||'—')+'.</span></div>';
    }else if(perf.mode==='all'){
      const cards=perf.areas.map((a,i)=>{
        const t=a.data?.total||{c:0,s:0,v:0};
        const conv=t.c?t.s/t.c*100:0;
        const volumeLabel=a.key==='promotor'?'casais':'atendimentos';
        return [a.label,t.c+' / '+t.s,volumeLabel+' / vendas • '+pct(conv),['cyan','blue','violet'][i]||'cyan'];
      });
      cards.push(['Visão de gestão',todayWorkingPeople().length+' pessoas','Todas as áreas • base '+perf.updated,'gold']);
      $('todayPerformance').innerHTML=cards.map(x=>'<div class="today-kpi '+x[3]+'"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');
    }else{
      const t=perf.total;
      const conv=t.c?t.s/t.c*100:0;
      const qual=t.c?t.q/t.c*100:0;
      const monthConv=month?.c?month.s/month.c*100:0;
      const volumeLabel=state.todayArea==='promotor'?'Casais':'Atendimentos';
      $('todayPerformance').innerHTML=[
        [volumeLabel+' hoje',t.c,'volume da área','cyan'],
        ['Vendas hoje',t.s,pct(conv)+' conversão','green'],
        ['VGV hoje',money(t.v),month?'Mês '+money(month.v):'base '+perf.updated,'violet'],
        ['Q / NQ',t.q+' / '+t.nq,pct(qual)+' qualificação','blue'],
        ['Mês acumulado',month?month.c+' / '+month.s:'—',month?(volumeLabel.toLowerCase()+' / vendas • '+pct(monthConv)):'sem base','gold']
      ].map(x=>'<div class="today-kpi '+x[3]+'"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');
    }
  }
  const alerts=todayAttention(perf);
  if($('todayAlertCount'))$('todayAlertCount').textContent=alerts.length+' sinal'+(alerts.length===1?'':'s');
  if($('todayAlerts'))$('todayAlerts').innerHTML=alerts.length?alerts.map(a=>
    '<div class="today-alert '+a.level+'"><span>'+esc(a.tag)+'</span><div><b>'+esc(a.title)+'</b><p>'+esc(a.text)+'</p></div></div>'
  ).join(''):'<div class="today-alert-empty"><b>Nenhum sinal crítico agora.</b><span>Continue acompanhando performance e presença ao longo do dia.</span></div>';
}
function todayPresenceSaveState(){
  const ids=new Set(todayWorkingPeople().map(p=>p.id));
  const records=state.presence.filter(x=>ids.has(x.person_id));
  const total=ids.size;
  return {total,saved:records.length,records,complete:total>0&&records.length===total,partial:records.length>0&&records.length<total};
}
function renderTodaySaveState(){
  const s=todayPresenceSaveState(),el=$('todaySaveState');
  if(!el)return s;
  el.className='pill '+(s.complete?'saved':s.partial?'partial':'unsaved');
  el.textContent=s.complete?'dia salvo':s.partial?('parcial '+s.saved+'/'+s.total):'não salvo';
  return s;
}
function effectiveTodayStatus(p){
  const rec=state.presence.find(x=>x.person_id===p.id);
  return rec?.status||'present';
}
function updateTodaySummaryFromRows(){
  const rows=[...document.querySelectorAll('.presence-row')];
  const save=renderTodaySaveState();
  const counts={present:0,absent:0,late:0,other:0};
  save.records.forEach(rec=>{
    const s=rec.status||'present';
    if(s==='present')counts.present++;
    else if(s==='absent')counts.absent++;
    else if(s==='late')counts.late++;
    else counts.other++;
  });
  const cards=save.complete?[
    ['Ativos',rows.length,'pessoas'],
    ['Presentes',counts.present,'confirmados'],
    ['Ausências',counts.absent,'confirmadas'],
    ['Atrasos',counts.late,'confirmados'],
    ['Outros',counts.other,'confirmados']
  ]:[
    ['Previstos',rows.length,'pessoas'],
    ['Salvos',save.saved,'registros confirmados'],
    ['Presentes',counts.present,'já salvos'],
    ['Ausências',counts.absent,'já salvas'],
    ['Atrasos',counts.late,'já salvos']
  ];
  if($('todaySummary'))$('todaySummary').innerHTML=cards.map(x=>'<div class="summary-card"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');
  renderTodayExecutive();
}
function quickPresenceStatusLabel(status){return STATUS[status]||status||'—';}
function quickPresenceClear(){
  if($('quickPresenceSearch'))$('quickPresenceSearch').value='';
  if($('quickPresenceResults'))$('quickPresenceResults').innerHTML='';
  if($('quickPresenceCard'))$('quickPresenceCard').hidden=true;
  if($('quickPresencePersonId'))$('quickPresencePersonId').value='';
}
function renderQuickPresenceSearch(){
  if(!$('quickPresenceSearch')||!$('quickPresenceResults'))return;
  const q=norm($('quickPresenceSearch').value);
  if(!q){$('quickPresenceResults').innerHTML='';return;}
  const rows=workingPeople()
    .filter(p=>norm(p.full_name).includes(q))
    .sort((a,b)=>a.full_name.localeCompare(b.full_name,'pt-BR'))
    .slice(0,8);
  $('quickPresenceResults').innerHTML=rows.length?rows.map(p=>{
    const rec=state.presence.find(x=>x.person_id===p.id);
    const team=teamByPerson(p.id);
    return '<button type="button" class="quick-presence-result" data-quick-person="'+p.id+'">'+
      '<span><b>'+esc(p.full_name)+'</b><small>'+esc(personRoles(p).join(' • '))+(team?' • '+esc(team.name):'')+'</small></span>'+
      '<em>'+esc(rec?quickPresenceStatusLabel(rec.status):'não salvo')+'</em>'+
    '</button>';
  }).join(''):'<div class="quick-presence-empty">Nenhum profissional ativo encontrado.</div>';
  document.querySelectorAll('[data-quick-person]').forEach(b=>b.onclick=()=>selectQuickPresencePerson(b.dataset.quickPerson));
}
function syncQuickPresenceArrival(){
  if(!$('quickPresenceStatus')||!$('quickArrivalWrap'))return;
  const status=$('quickPresenceStatus').value;
  const show=status==='late'||status==='present';
  $('quickArrivalWrap').hidden=!show;
  if(!show&&$('quickPresenceArrival'))$('quickPresenceArrival').value='';
}
function selectQuickPresencePerson(personId){
  const p=personById(personId);
  if(!p)return;
  const rec=state.presence.find(x=>x.person_id===personId)||{};
  const team=teamByPerson(personId);
  $('quickPresencePersonId').value=personId;
  $('quickPresenceName').textContent=p.full_name;
  $('quickPresenceMeta').textContent=personRoles(p).join(' • ')+(team?' • '+team.name:' • sem equipe');
  $('quickPresenceStatus').value=rec.status||'present';
  $('quickPresenceArrival').value=time5(rec.arrival_time)||'';
  $('quickPresenceNote').value=rec.note||'';
  $('quickPresenceCard').hidden=false;
  $('quickPresenceResults').innerHTML='';
  $('quickPresenceSearch').value=p.full_name;
  syncQuickPresenceArrival();
}
async function saveQuickPresence(){
  const personId=$('quickPresencePersonId')?.value;
  if(!personId){toast('Escolha um profissional.',true);return;}
  const workDate=$('todayDate').value;
  if(workDate.slice(0,7)!==state.month.ref_month.slice(0,7)){
    toast('A data escolhida não pertence ao mês selecionado.',true);return;
  }
  const p=personById(personId);
  const body={
    person_id:personId,
    month_id:state.month.id,
    work_date:workDate,
    status:$('quickPresenceStatus').value||'present',
    arrival_time:$('quickPresenceArrival').value||null,
    note:$('quickPresenceNote').value.trim()||null,
    updated_at:new Date().toISOString()
  };
  try{
    $('saveQuickPresenceBtn').disabled=true;
    $('saveQuickPresenceBtn').textContent='Salvando...';
    await rest('ceo_daily_presence?on_conflict=person_id,work_date',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(body)
    });
    toast((p?.full_name||'Profissional')+' • '+quickPresenceStatusLabel(body.status)+' salvo.');
    await loadToday();
    quickPresenceClear();
  }catch(err){toast(err.message,true);}
  finally{
    $('saveQuickPresenceBtn').disabled=false;
    $('saveQuickPresenceBtn').textContent='Salvar presença';
  }
}

function renderToday(){
  const people=todayWorkingPeople();
  const areaLabel=TODAY_AREA_ROLES[state.todayArea]||'Promotor de Marketing';
  $('todayCount').textContent=people.length+' pessoas • '+areaLabel;
  $('todayPeople').innerHTML=people.map(p=>{
    const rec=state.presence.find(x=>x.person_id===p.id)||{};
    const team=teamByPerson(p.id);
    const selected=rec.status||'present';
    const opts=Object.entries(STATUS).map(([k,v])=>'<option value="'+k+'" '+(selected===k?'selected':'')+'>'+v+'</option>').join('');
    const schedule=time5(p.default_start_time)||time5(team?.start_time);
    const teamText=team?team.name:'sem equipe';
    return '<div class="presence-row" data-person="'+p.id+'">'+
      '<div class="person-main"><b>'+esc(p.full_name)+'</b><span>'+esc(areaLabel)+(personRoles(p).length>1?' • multifunção':'')+' • '+esc(teamText)+(schedule?' • '+schedule:'')+'</span></div>'+
      '<select class="presence-status">'+opts+'</select>'+
      '<input class="arrival" type="time" title="Horário real de chegada" value="'+esc(time5(rec.arrival_time))+'">'+
      '<input class="presence-note" placeholder="Observação" value="'+esc(rec.note||'')+'">'+
    '</div>';
  }).join('');
  document.querySelectorAll('.presence-status').forEach(s=>s.onchange=updateTodaySummaryFromRows);
  updateTodaySummaryFromRows();
}
function markAllPresent(){
  document.querySelectorAll('.presence-status').forEach(s=>s.value='present');
  updateTodaySummaryFromRows();
}
async function saveDay(){
  const rows=[...document.querySelectorAll('.presence-row')];
  if(!rows.length)return;
  const workDate=$('todayDate').value;
  if(workDate.slice(0,7)!==state.month.ref_month.slice(0,7)){
    toast('A data escolhida não pertence ao mês de referência selecionado.',true);
    return;
  }
  const body=rows.map(row=>({
    person_id:row.dataset.person,
    month_id:state.month.id,
    work_date:workDate,
    status:row.querySelector('.presence-status').value||'present',
    arrival_time:row.querySelector('.arrival').value||null,
    note:row.querySelector('.presence-note').value||null,
    updated_at:new Date().toISOString()
  }));
  try{
    $('saveDayBtn').disabled=true; $('saveDayBtn').textContent='Salvando...';
    await rest('ceo_daily_presence?on_conflict=person_id,work_date',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(body)
    });
    toast(body.length+' registros do dia salvos.');
    await loadToday();
  }catch(err){toast(err.message,true);}
  finally{$('saveDayBtn').disabled=false;$('saveDayBtn').textContent='Salvar o dia';}
}


function xiaFindPeople(text){
  let q=norm(text); if(q.split(/[^a-z0-9]+/).includes('nina'))q+=' weena'; const people=(state.people||[]).filter(p=>p.active!==false&&p.status!=='ended');
  return people.filter(p=>{const full=norm(p.full_name), first=full.split(/\s+/)[0];return (full&&q.includes(full))||(first&&first.length>=3&&q.split(/[^a-z0-9]+/).includes(first));});
}
function xiaDateISO(day,month,year){
  const y=year||Number(state.month.ref_month.slice(0,4)), m=month||Number(state.month.ref_month.slice(5,7));
  return String(y)+'-'+String(m).padStart(2,'0')+'-'+String(day).padStart(2,'0');
}
function xiaParseCommand(raw){
  const t=norm(raw), people=xiaFindPeople(raw); if(!people.length)return {error:'Não encontrei nenhum profissional citado no cadastro.'};
  let status='present', label='Presente';
  if(/mini ferias|ferias|folga/.test(t)){status='agreed_off';label=/mini ferias|ferias/.test(t)?'Mini férias':'Folga combinada';}
  else if(/atras/.test(t)){status='late';label='Atraso';}
  else if(/falta|ausente/.test(t)){status='absent';label='Falta';}
  else if(/trein/.test(t)){status='training';label='Treinamento';}
  else if(/indispon/.test(t)){status='unavailable';label='Indisponível';}
  let start=$('todayDate')?.value||new Date().toISOString().slice(0,10), end=start;
  const range=t.match(/(?:dia\s*)?(\d{1,2})(?:\/(\d{1,2}))?\s*(?:ao|ate|a|e(?:\s+dia)?)\s*(?:dia\s*)?(\d{1,2})(?:\/(\d{1,2}))?/);
  if(range){start=xiaDateISO(+range[1],range[2]?+range[2]:null);end=xiaDateISO(+range[3],range[4]?+range[4]:(range[2]?+range[2]:null));}
  else {const one=t.match(/(?:dia\s+)(\d{1,2})(?:\/(\d{1,2}))?/); if(one)start=end=xiaDateISO(+one[1],one[2]?+one[2]:null);}
  return {people,status,label,start,end,raw};
}
function xiaDays(a,b){const out=[];let d=new Date(a+'T12:00:00'),e=new Date(b+'T12:00:00');while(d<=e&&out.length<62){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}return out;}
async function xiaInterpretCommand(){
  const raw=$('xiaDayCommand').value.trim(); if(!raw)return toast('Escreva o comando primeiro.',true);
  const x=xiaParseCommand(raw); if(x.error){$('xiaCommandPreview').innerHTML='<div class="empty">'+esc(x.error)+'</div>';return;}
  const days=xiaDays(x.start,x.end), names=x.people.map(p=>p.full_name).join(', '); $('xiaCommandPreview').innerHTML='<div class="xia-preview-card"><b>'+x.people.length+' profissional(is)</b><span>'+esc(names)+'<br>'+esc(x.label)+' • '+x.start.split('-').reverse().join('/')+(x.end!==x.start?' até '+x.end.split('-').reverse().join('/'):'')+' • '+days.length+' dia(s)</span><button id="xiaConfirmCommand" class="primary" type="button">Confirmar e registrar</button></div>';
  $('xiaConfirmCommand').onclick=async()=>{try{const body=[];x.people.forEach(p=>days.forEach(date=>body.push({person_id:p.id,month_id:state.month.id,work_date:date,status:x.status,note:'XIA: '+raw,updated_at:new Date().toISOString()})));await rest('ceo_daily_presence?on_conflict=person_id,work_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});toast(x.people.length+' profissional(is) • '+body.length+' registro(s) salvos.');$('xiaDayCommand').value='';$('xiaCommandPreview').innerHTML='';await loadToday();await xiaLoadHistory();}catch(e){toast(e.message,true);}};
}
async function xiaLoadHistory(){
  const box=$('xiaCommandHistory'); if(!box)return; box.hidden=false;
  let rows=[];try{rows=await rest('ceo_daily_presence?select=*&month_id=eq.'+state.month.id+'&note=like.XIA%25&order=work_date.desc');}catch(e){box.innerHTML='<div class="empty">'+esc(e.message)+'</div>';return;}
  const groups=new Map();
  rows.forEach(r=>{const key=(r.note||'')+'|'+r.status;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);});
  box.innerHTML='<div class="panel-head"><div><b>Histórico XIA do mês</b><p>Resumo operacional contínuo. Tudo aqui alimenta presença, histórico individual e diagnóstico.</p></div></div>'+(rows.length?[...groups.values()].map(g=>{const first=g[0],dates=g.map(x=>x.work_date).sort(),people=[...new Set(g.map(x=>personById(x.person_id)?.full_name||'Profissional'))],raw=(first.note||'').replace(/^XIA:\\s*/,'');const fmt=d=>d.split('-').reverse().join('/'),period=dates[0]===dates[dates.length-1]?fmt(dates[0]):fmt(dates[0])+' a '+fmt(dates[dates.length-1]);return '<div class="xia-history-row xia-history-summary"><b>Resumo</b><span>'+period+' • '+esc(STATUS[first.status]||first.status)+'</span><small>'+esc(raw)+'</small><em>'+people.length+' profissional(is): '+esc(people.join(', '))+'</em></div>';}).join(''):'<div class="empty">Nenhum comando registrado neste mês.</div>');
}

let operationalHistoryRows=[];
async function loadOperationalHistory(){
  const box=$('operationalHistoryList');if(!box||!state.month)return;
  try{operationalHistoryRows=await rest('ceo_daily_presence?select=*&month_id=eq.'+state.month.id+'&order=work_date.desc');renderOperationalHistory();}catch(e){box.innerHTML='<div class="empty">'+esc(e.message)+'</div>';}
}
function renderOperationalHistory(){
  const q=norm($('opHistorySearch')?.value||''), st=$('opHistoryStatus')?.value||'';
  const rows=operationalHistoryRows.filter(r=>{const p=personById(r.person_id), hay=norm((p?.full_name||'')+' '+(r.note||''));return (!q||hay.includes(q))&&(!st||r.status===st);});
  const counts={};rows.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);
  if($('operationalHistorySummary'))$('operationalHistorySummary').innerHTML=[['Registros',rows.length],['Faltas',counts.absent||0],['Atrasos',counts.late||0],['Folgas',counts.agreed_off||0]].map(x=>'<div class="summary-card"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
  $('operationalHistoryList').innerHTML=rows.length?rows.map(r=>{const p=personById(r.person_id);return '<div class="op-history-row"><b>'+esc(p?.full_name||'Profissional')+'</b><span>'+r.work_date.split('-').reverse().join('/')+'</span><span>'+esc(STATUS[r.status]||r.status)+'</span><small>'+esc((r.note||'').replace(/^XIA:\\s*/,''))+'</small></div>';}).join(''):'<div class="empty">Nenhum registro encontrado.</div>';
}
function teamGoalFor(teamId){return state.teamGoals.find(g=>g.team_id===teamId)||null;}
function sumTeamGoal(field){return state.teamGoals.reduce((a,g)=>a+Number(g[field]||0),0);}
function distributionCard(label,total,distributed,fmt){
  total=Number(total||0);distributed=Number(distributed||0);
  const remaining=total-distributed;
  const stateLabel=total<=0?'META NÃO DEFINIDA':remaining>0?'FALTAM '+fmt(remaining):remaining<0?'EXCEDEU '+fmt(Math.abs(remaining)):'100% DISTRIBUÍDO';
  const pctValue=total?Math.min(100,distributed/total*100):0;
  return '<div class="distribution-card"><small>'+esc(label)+'</small><b>'+fmt(distributed)+' / '+(total?fmt(total):'—')+'</b><span>'+stateLabel+'</span><div class="month-goal-progress"><i style="width:'+pctValue.toFixed(1)+'%"></i></div></div>';
}
function renderTeamGoalDistribution(){
  if(!$('teamGoalSummary')||!$('teamGoalsEditor')||!state.month)return;
  const m=state.month;
  $('teamGoalSummary').innerHTML=[
    distributionCard('Pesquisas',m.goal_research,sumTeamGoal('research_goal'),v=>num(v)),
    distributionCard('Casais',m.goal_couples,sumTeamGoal('couples_goal'),v=>num(v)),
    distributionCard('Vendas',m.goal_sales,sumTeamGoal('sales_goal'),v=>num(v)),
    distributionCard('VGV',m.goal_vgv,sumTeamGoal('vgv_goal'),v=>money(v))
  ].join('');

  if(!state.teams.length){
    $('teamGoalsEditor').innerHTML='<div class="approval-empty">Crie uma equipe primeiro para dividir a meta do mês.</div>';
    return;
  }

  $('teamGoalsEditor').innerHTML=state.teams.map(team=>{
    const g=teamGoalFor(team.id)||{};
    return '<div class="team-goal-card" data-team-goal="'+team.id+'">'+
      '<div class="team-goal-title"><div><small>EQUIPE</small><h3>'+esc(team.name)+'</h3></div><span>'+time5(team.start_time)+'</span></div>'+
      '<div class="team-goal-section"><b>META</b><div class="team-goal-inputs">'+
        '<label>Pesquisas<input data-tg="research_goal" type="number" min="0" step="1" value="'+Number(g.research_goal||0)+'"></label>'+
        '<label>Casais<input data-tg="couples_goal" type="number" min="0" step="1" value="'+Number(g.couples_goal||0)+'"></label>'+
        '<label>Vendas<input data-tg="sales_goal" type="number" min="0" step="1" value="'+Number(g.sales_goal||0)+'"></label>'+
        '<label>VGV<input data-tg="vgv_goal" type="number" min="0" step="100" value="'+Number(g.vgv_goal||0)+'"></label>'+
      '</div></div>'+
      '<div class="team-goal-section super"><b>SUPER META</b><div class="team-goal-inputs">'+
        '<label>Pesquisas<input data-tg="super_research_goal" type="number" min="0" step="1" value="'+Number(g.super_research_goal||0)+'"></label>'+
        '<label>Casais<input data-tg="super_couples_goal" type="number" min="0" step="1" value="'+Number(g.super_couples_goal||0)+'"></label>'+
        '<label>Vendas<input data-tg="super_sales_goal" type="number" min="0" step="1" value="'+Number(g.super_sales_goal||0)+'"></label>'+
        '<label>VGV<input data-tg="super_vgv_goal" type="number" min="0" step="100" value="'+Number(g.super_vgv_goal||0)+'"></label>'+
      '</div></div>'+
      '<button class="primary small" data-save-team-goal="'+team.id+'">Salvar meta da equipe</button>'+
    '</div>';
  }).join('');
  document.querySelectorAll('[data-save-team-goal]').forEach(b=>b.onclick=()=>saveTeamGoal(b.dataset.saveTeamGoal));
}
async function saveTeamGoal(teamId){
  const card=document.querySelector('[data-team-goal="'+teamId+'"]');
  if(!card)return;
  const body={month_id:state.month.id,team_id:teamId,updated_at:new Date().toISOString()};
  card.querySelectorAll('[data-tg]').forEach(input=>body[input.dataset.tg]=Number(input.value||0));
  if(Object.values(body).some((v,k)=>typeof v==='number'&&(!Number.isFinite(v)||v<0))){toast('Revise os valores da meta da equipe.',true);return;}
  try{
    await rest('ceo_team_goals?on_conflict=month_id,team_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
    state.teamGoals=await rest('ceo_team_goals?select=*&month_id=eq.'+state.month.id);
    renderTeamGoalDistribution();
    toast('Meta da equipe salva.');
  }catch(err){toast(err.message,true);}
}

function individualPerf(p){
  const perf=perfForPerson(p)||[];
  const primary=choosePrimaryPerf(p,perf,roleOf(p));
  return primary&&perfMonthMatches()?{research:Number(primary.r||0),couples:Number(primary.c||0),sales:Number(primary.s||0),vgv:Number(primary.v||0)}:{research:0,couples:0,sales:0,vgv:0};
}
function renderIndividualGoals(){
  if(!$('individualGoalsEditor')||!state.month)return;
  const people=workingPeople();
  const totalGoal=people.reduce((s,p)=>s+Number(goalByPerson(p.id)?.couples_goal||0),0);
  const achieved=people.filter(p=>{const g=Number(goalByPerson(p.id)?.couples_goal||0);return g>0&&individualPerf(p).couples>=g;}).length;
  const withGoal=people.filter(p=>Number(goalByPerson(p.id)?.couples_goal||0)>0).length;
  if($('individualGoalSummary'))$('individualGoalSummary').innerHTML=[
    distributionCard('Casais individuais',state.month.goal_couples,totalGoal,v=>num(v)),
    '<div class="distribution-card"><small>Profissionais com meta</small><b>'+withGoal+' / '+people.length+'</b><span>'+achieved+' já atingiram</span></div>'
  ].join('');
  $('individualGoalsEditor').innerHTML=people.map(p=>{
    const g=goalByPerson(p.id)||{}, perf=individualPerf(p), team=teamByPerson(p.id);
    const target=Number(g.couples_goal||0), pctv=target?perf.couples/target*100:0, missing=Math.max(0,target-perf.couples);
    return '<div class="assignment-row individual-goal-row" data-individual-goal="'+p.id+'">'+
      '<div><b>'+esc(p.full_name)+'</b><span>'+esc(team?.name||'Sem equipe')+' • realizado '+num(perf.couples)+' casais'+(target?' • faltam '+num(missing)+' • '+pct(pctv):' • sem meta')+'</span></div>'+
      '<div class="individual-goal-inputs">'+
      '<label>Pesquisas<input data-pg="research_goal" type="number" min="0" step="1" value="'+Number(g.research_goal||0)+'"></label>'+
      '<label>Casais<input data-pg="couples_goal" type="number" min="0" step="1" value="'+Number(g.couples_goal||0)+'"></label>'+
      '<label>Vendas<input data-pg="sales_goal" type="number" min="0" step="1" value="'+Number(g.sales_goal||0)+'"></label>'+
      '<label>VGV<input data-pg="vgv_goal" type="number" min="0" step="100" value="'+Number(g.vgv_goal||0)+'"></label>'+
      '<button class="primary small" data-save-person-goal="'+p.id+'">Salvar</button></div></div>';
  }).join('')||'<div class="approval-empty">Nenhum profissional ativo.</div>';
  document.querySelectorAll('[data-save-person-goal]').forEach(b=>b.onclick=()=>saveIndividualGoal(b.dataset.savePersonGoal));
}
async function saveIndividualGoal(personId){
  const row=document.querySelector('[data-individual-goal="'+personId+'"]');if(!row)return;
  const body={month_id:state.month.id,person_id:personId,updated_at:new Date().toISOString()};
  row.querySelectorAll('[data-pg]').forEach(i=>body[i.dataset.pg]=Number(i.value||0));
  try{
    await rest('ceo_person_goals?on_conflict=month_id,person_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
    await loadGoals(); renderIndividualGoals(); renderPeople(); await renderProfessionalProfile();
    toast('Meta individual salva.');
  }catch(err){toast(err.message,true);}
}

function renderTeams(){
  $('teamsGrid').innerHTML=state.teams.length?state.teams.map(t=>
    '<div class="team-card"><small>EQUIPE</small><h3>'+esc(t.name)+'</h3><b>'+time5(t.start_time)+'</b><p>Tolerância '+t.tolerance_minutes+' min'+(t.end_time?' • saída '+time5(t.end_time):'')+'</p></div>'
  ).join(''):'<div class="team-card"><h3>Nenhuma equipe criada</h3><p>Crie a primeira e defina o horário combinado.</p></div>';

  renderTeamGoalDistribution();
  renderIndividualGoals();
  fillAgendaTeams();
}
async function ensureDefaultTeams(){
  const defs=[['Diurno','10:00'],['Noturno','13:00'],['Agendamento','10:00']];
  try{
    for(const [name,start] of defs){
      if(!state.teams.some(t=>norm(t.name)===norm(name)))await rest('ceo_teams',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({month_id:state.month.id,name,start_time:start,tolerance_minutes:10})});
    }
    await loadTeams();renderTeams();toast('Equipes padrão configuradas.');
  }catch(err){toast(err.message,true);}
}
async function addTeam(){
  const name=prompt('Nome da equipe:','Equipe 10h'); if(!name)return;
  const start=prompt('Horário combinado de entrada (HH:MM):','10:00');
  if(!/^\d{2}:\d{2}$/.test(start||'')){toast('Horário inválido.',true);return;}
  const tolerance=Number(prompt('Tolerância em minutos:','10')||10);
  try{
    await rest('ceo_teams',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({month_id:state.month.id,name,start_time:start,tolerance_minutes:tolerance})});
    toast('Equipe criada.'); await loadTeams(); renderTeams(); renderPeople();
  }catch(err){toast(err.message,true);}
}
async function assignTeam(personId,teamId){
  try{
    const current=state.assignments.find(a=>a.person_id===personId&&!a.valid_to);
    if(current&&current.team_id!==teamId){
      await rest('ceo_team_assignments?id=eq.'+current.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({valid_to:localDate()})});
    }
    if(teamId&&current?.team_id!==teamId){
      await rest('ceo_team_assignments',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({person_id:personId,team_id:teamId,month_id:state.month.id,valid_from:localDate()})});
    }
    if(!teamId&&current){/* current already closed above */}
    toast('Equipe atualizada.'); await loadTeams(); renderTeams(); renderPeople(); renderToday();
  }catch(err){toast(err.message,true);}
}

function personTable(rows,ended=false){
  if(!rows.length)return '<div class="approval-empty">'+(ended?'Nenhum distratado.':'Nenhuma pessoa neste grupo.')+'</div>';
  return '<div class="table-wrap"><table class="people-table"><thead><tr>'+
    '<th>Profissional</th><th>CNPJ / Contato</th><th>Horário</th><th>Equipe</th><th>Status</th><th>Metas do mês</th><th>Ações</th>'+
    '</tr></thead><tbody>'+rows.map(p=>{
      const team=teamByPerson(p.id); const goal=goalByPerson(p.id);
      const status=p.status||'active';
      const actions=ended
        ?'<button data-edit-person="'+p.id+'">Ver / editar</button><button class="danger" data-delete-person="'+p.id+'">Excluir</button>'
        :'<button class="profile-action" data-profile-person="'+p.id+'">Raio-X</button><button data-edit-person="'+p.id+'">Editar</button><button data-access-person="'+p.id+'">Acesso</button><button class="danger" data-end-person="'+p.id+'">Distratar</button><button class="danger" data-delete-person="'+p.id+'">Excluir</button>';
      return '<tr>'+
        '<td><b>'+esc(p.full_name)+'</b><small>'+esc((p.roles&&p.roles.length?p.roles:[roleOf(p)]).join(' • '))+(p.email?' • '+esc(p.email):'')+'</small></td>'+
        '<td>'+esc(p.cnpj||'—')+'<small>'+esc(p.phone||'sem telefone')+'</small></td>'+
        '<td><b>'+esc(effectiveStart(p))+'</b><small>'+esc(time5(p.default_end_time)||'saída não definida')+'</small></td>'+
        '<td>'+esc(team?.name||'Sem equipe')+'</td>'+
        '<td><span class="status-badge status-'+esc(status)+'">'+esc(statusLabel(status))+'</span></td>'+
        '<td><b>'+num(goal?.research_goal||0)+' / '+num(goal?.couples_goal||0)+' / '+num(goal?.sales_goal||0)+'</b><small>pesquisas / volume / vendas'+(goal?.vgv_goal?' • '+money(goal.vgv_goal):'')+'</small></td>'+
        '<td><div class="row-actions">'+actions+'</div></td>'+
      '</tr>';
    }).join('')+'</tbody></table></div>';
}
function bindPeopleActions(){
  document.querySelectorAll('[data-profile-person]').forEach(b=>b.onclick=()=>openProfessionalProfile(b.dataset.profilePerson));
  document.querySelectorAll('[data-edit-person]').forEach(b=>b.onclick=()=>openPersonModal(personById(b.dataset.editPerson)));
  document.querySelectorAll('[data-access-person]').forEach(b=>b.onclick=()=>openAccessForPerson(b.dataset.accessPerson));
  document.querySelectorAll('[data-end-person]').forEach(b=>b.onclick=()=>endPerson(b.dataset.endPerson));
  document.querySelectorAll('[data-delete-person]').forEach(b=>b.onclick=()=>deletePerson(b.dataset.deletePerson));
}
function performanceReferenceDay(){
  const raw=performanceData()?.updated||'';
  const m=raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m?Number(m[1]):null;
}
function roleDay(role,day){
  const row=role?.daily?.[Math.max(0,day-1)]||[0,0,0,0,0];
  return {c:Number(row[0]||0),s:Number(row[1]||0),v:Number(row[2]||0),q:Number(row[3]||0),nq:Number(row[4]||0),day};
}
function roleRange(role,startDay,endDay){
  const total={c:0,s:0,v:0,q:0,nq:0,start:startDay,end:endDay,rows:[]};
  for(let d=Math.max(1,startDay);d<=Math.max(startDay,endDay);d++){
    const r=roleDay(role,d);total.rows.push(r);
    total.c+=r.c;total.s+=r.s;total.v+=r.v;total.q+=r.q;total.nq+=r.nq;
  }
  return total;
}
function profileScopeCard(label,data,volumeLabel,sub=''){
  const conv=data?.c?data.s/data.c*100:0;
  return '<div class="profile-scope-card"><small>'+esc(label)+'</small>'+
    '<div class="profile-scope-main"><b>'+num(data?.c||0)+'</b><span>'+esc(volumeLabel)+'</span></div>'+
    '<div class="profile-scope-foot"><strong>'+num(data?.s||0)+' vendas</strong><span>'+pct(conv)+' conversão</span></div>'+
    '<em>'+money(data?.v||0)+' VGV'+(sub?' • '+esc(sub):'')+'</em></div>';
}
function goalProgress(label,current,target,formatter=(v)=>num(v)){
  const t=Number(target||0),c=Number(current||0);
  const p=t?Math.min(100,c/t*100):0;
  return '<div class="profile-goal"><div><span>'+esc(label)+'</span><b>'+formatter(c)+' / '+formatter(t)+'</b></div>'+
    '<div class="profile-goal-bar"><i style="width:'+p.toFixed(1)+'%"></i></div><small>'+(t?pct(c/t*100):'sem meta definida')+'</small></div>';
}
async function renderProfessionalProfile(){
  if(!$('profilePerson')||!state.month)return;
  const filtered=professionalWorkingPeople();
  let personId=$('profilePerson').value;
  if(!filtered.some(p=>p.id===personId))personId=filtered[0]?.id||'';
  if(personId)$('profilePerson').value=personId;
  if(!personId){
    $('professionalIdentity').innerHTML='<div class="xia-empty">Nenhum profissional ativo.</div>';
    return;
  }
  $('profilePerson').value=personId;
  const p=personById(personId);if(!p)return;
  const team=teamByPerson(personId);
  const goal=goalByPerson(personId);
  const perf=perfForPerson(p);
  const selectedRole=professionalAreaRole();
  const primary=choosePrimaryPerf(p,perf,selectedRole);
  const sameMonth=perfMonthMatches();
  const referenceDay=performanceReferenceDay()||31;
  const selectedDate=$('todayDate')?.value||localDate();
  const selectedDay=Number(String(selectedDate).slice(8,10)||referenceDay);
  const dayData=primary&&sameMonth?roleDay(primary,selectedDay):null;
  const week=primary&&sameMonth?roleRange(primary,Math.max(1,referenceDay-6),referenceDay):null;
  const month=primary&&sameMonth?{r:primary.r||0,c:primary.c||0,s:primary.s||0,v:primary.v||0,q:primary.q||0,nq:primary.nq||0}:null;
  const volumeLabel=selectedRole==='Promotor de Marketing'?'casais':'atendimentos';

  $('professionalIdentity').innerHTML=
    '<div class="professional-person"><div class="professional-avatar">'+esc((p.full_name||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())+'</div>'+
    '<div><span class="eyebrow">PROFISSIONAL</span><h3>'+esc(p.full_name)+'</h3><p>'+esc(selectedRole)+(personRoles(p).length>1?' • multifunção: '+esc(personRoles(p).filter(r=>norm(r)!==norm(selectedRole)).join(' • ')):'')+' • '+esc(team?.name||'sem equipe')+' • '+esc(effectiveStart(p))+' • '+esc(statusLabel(p.status))+'</p></div></div>'+
    '<div class="professional-base"><b>'+esc(state.month.label)+'</b><span>Performance: '+esc(performanceData()?.updated||'sem base')+'</span></div>';

  if(primary&&sameMonth){
    $('professionalScope').innerHTML=
      profileScopeCard('DIA '+String(selectedDay).padStart(2,'0'),dayData,volumeLabel)+
      profileScopeCard('ÚLTIMOS 7 DIAS',week,volumeLabel,'dias '+week.start+'–'+week.end)+
      profileScopeCard('MÊS',month,volumeLabel,'Q '+month.q+' / NQ '+month.nq);
  }else{
    $('professionalScope').innerHTML='<div class="profile-data-empty"><b>Performance ainda não ligada a este mês/cadastro.</b><span>Os registros de presença, metas e liderança abaixo continuam disponíveis.</span></div>';
  }

  const current=month||{r:0,c:0,s:0,v:0};
  $('professionalGoals').innerHTML=
    goalProgress('Pesquisas',current.r,goal?.research_goal||0)+
    goalProgress('Volume',current.c,goal?.couples_goal||0)+
    goalProgress('Vendas',current.s,goal?.sales_goal||0)+
    goalProgress('VGV',current.v,goal?.vgv_goal||0,money);

  let presence=[];
  try{
    presence=await rest('ceo_daily_presence?select=*&month_id=eq.'+state.month.id+'&person_id=eq.'+personId+'&order=work_date.asc');
  }catch(_){presence=[];}
  const pc={present:0,absent:0,late:0,other:0};
  presence.forEach(x=>{
    if(x.status==='present')pc.present++;
    else if(x.status==='absent')pc.absent++;
    else if(x.status==='late')pc.late++;
    else pc.other++;
  });
  const incidents=presence.filter(x=>['absent','late','left_early','unavailable'].includes(x.status)).slice(-3).reverse();
  $('professionalPresence').innerHTML=
    '<div class="profile-mini-stats"><div><b>'+pc.present+'</b><span>presentes</span></div><div><b>'+pc.absent+'</b><span>ausências</span></div><div><b>'+pc.late+'</b><span>atrasos</span></div><div><b>'+pc.other+'</b><span>outros</span></div></div>'+
    '<div class="profile-note-list">'+(incidents.length?incidents.map(x=>'<span>'+dateBr(x.work_date)+' • '+esc(STATUS[x.status]||x.status)+(x.note?' • '+esc(x.note):'')+'</span>').join(''):'<span>Sem ocorrência de presença para destacar.</span>')+'</div>';

  const one=state.one.filter(x=>x.person_id===personId);
  const openTasks=state.tasks.filter(x=>x.person_id===personId&&x.status==='open');
  const future=state.agenda.filter(x=>x.person_id===personId&&x.status==='scheduled').sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date)));
  const lastOne=one[0];
  $('professionalLeadership').innerHTML=
    '<div class="profile-lead-row"><span>Último Olho no Olho</span><b>'+(lastOne?dateBr(lastOne.meeting_date):'Nenhum')+'</b></div>'+
    '<div class="profile-lead-row"><span>Pendências abertas</span><b>'+openTasks.length+'</b></div>'+
    '<div class="profile-lead-row"><span>Próximo compromisso</span><b>'+(future[0]?dateBr(future[0].event_date):'Nenhum')+'</b></div>'+
    '<div class="profile-lead-copy">'+(lastOne?esc(lastOne.commitments||lastOne.improvement||lastOne.topic||'Registro salvo.'):'Nenhum compromisso de 1:1 registrado neste mês.')+'</div>';

  if(primary&&sameMonth){
    const start=Math.max(1,referenceDay-13);
    const rows=roleRange(primary,start,referenceDay).rows;
    const max=Math.max(1,...rows.map(x=>x.c));
    $('professionalDaily').innerHTML=rows.map(x=>{
      const h=Math.max(5,Math.round(x.c/max*100));
      return '<div class="profile-day" title="Dia '+x.day+': '+x.c+' '+volumeLabel+', '+x.s+' vendas">'+
        '<div class="profile-day-bar"><i style="height:'+h+'%"></i>'+(x.s?'<strong>'+x.s+'</strong>':'')+'</div>'+
        '<span>'+String(x.day).padStart(2,'0')+'</span></div>';
    }).join('');
  }else{
    $('professionalDaily').innerHTML='<div class="profile-data-empty"><span>Sem série diária de performance para o mês selecionado.</span></div>';
  }
}
function openProfessionalProfile(personId){
  if(!$('profilePerson'))return;
  const p=personById(personId);
  if(p&&!hasRole(p,professionalAreaRole())){
    const commercial=personRoles(p).find(r=>Object.values(TODAY_AREA_ROLES).some(label=>norm(label)===norm(r)));
    state.professionalArea=professionalAreaKeyForRole(commercial||roleOf(p));
  }
  fillPeopleSelects();
  renderPeople();
  $('profilePerson').value=personId;
  setTab('people');
  renderProfessionalProfile();
  document.querySelector('.professional-profile-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function renderPeople(){
  const active=professionalListedPeople();
  const ended=professionalEndedPeople();
  const role=professionalAreaRole();
  $('activePeopleCount').textContent=active.length+' '+(active.length===1?'profissional':'profissionais');
  $('endedPeopleCount').textContent=ended.length+' distratado'+(ended.length===1?'':'s');
  if($('peopleDirectoryTitle'))$('peopleDirectoryTitle').textContent=PROFESSIONAL_AREA_LABELS[state.professionalArea]||role;
  if($('peopleDirectorySubtitle'))$('peopleDirectorySubtitle').textContent='Mostrando somente '+role+'. Troque a área acima para ver os demais.';
  $('peopleTable').innerHTML=active.length
    ?'<div class="role-group single-role"><div class="role-group-head"><h3>'+esc(role)+'</h3><span>'+active.length+' pessoas</span></div>'+personTable(active)+'</div>'
    :'<div class="approval-empty">Nenhum profissional cadastrado nesta função.</div>';
  $('endedPeopleTable').innerHTML=personTable(ended,true);
  syncProfessionalAreaUi();
  bindPeopleActions();
}

function fillPersonTeamSelect(selected=''){
  const el=$('personTeam'); if(!el)return;
  el.innerHTML='<option value="">Sem equipe</option>'+state.teams.map(t=>'<option value="'+t.id+'">'+esc(t.name)+' • '+time5(t.start_time)+'</option>').join('');
  el.value=selected||'';
}
function openPersonModal(p=null){
  const edit=Boolean(p);
  $('personModalTitle').textContent=edit?'Editar cadastro PJ':'Adicionar pessoa';
  $('personEditId').value=p?.id||'';
  $('personName').value=p?.full_name||'';
  $('personCnpj').value=p?.cnpj||'';
  $('personPhone').value=p?.phone||'';
  $('personRole').value=roleOf(p||{roles:['Promotor de Marketing']});
  $('personStatus').value=p?.status==='ended'?'inactive':p?.status||'active';
  $('personEmail').value=p?.email||'';
  $('personStartedOn').value=p?.started_on||'';
  $('personStartTime').value=time5(p?.default_start_time);
  $('personEndTime').value=time5(p?.default_end_time);
  $('personNotes').value=p?.notes||'';
  $('personPassword').value='';
  const goal=p?goalByPerson(p.id):null;
  $('personGoalResearch').value=goal?.research_goal||'';
  $('personGoalCouples').value=goal?.couples_goal||'';
  $('personGoalSales').value=goal?.sales_goal||'';
  $('personGoalVgv').value=goal?.vgv_goal||'';
  fillPersonTeamSelect(p?teamByPerson(p.id)?.id:'');
  $('personModal').hidden=false;
  setTimeout(()=>$('personName')?.focus(),50);
}
function closePersonModal(){if($('personModal'))$('personModal').hidden=true;}
async function savePerson(){
  const id=$('personEditId').value;
  const name=$('personName').value.trim();
  const role=$('personRole').value;
  if(!name){toast('Informe o nome completo.',true);return;}
  const body={
    full_name:name,
    cnpj:$('personCnpj').value.trim()||null,
    phone:$('personPhone').value.trim()||null,
    roles:[role],
    area:role,
    status:$('personStatus').value,
    email:$('personEmail').value.trim().toLowerCase()||null,
    started_on:$('personStartedOn').value||null,
    default_start_time:$('personStartTime').value||null,
    default_end_time:$('personEndTime').value||null,
    notes:$('personNotes').value.trim()||null,
    updated_at:new Date().toISOString()
  };
  try{
    $('savePersonBtn').disabled=true;
    let personId=id;
    if(id){
      await rest('ceo_people?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
    }else{
      const created=await rest('ceo_people',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
      personId=created[0]?.id;
    }
    if(!personId)throw new Error('Não foi possível identificar o cadastro salvo.');

    const goalBody={
      month_id:state.month.id,
      person_id:personId,
      research_goal:Number($('personGoalResearch').value||0),
      couples_goal:Number($('personGoalCouples').value||0),
      sales_goal:Number($('personGoalSales').value||0),
      vgv_goal:Number($('personGoalVgv').value||0),
      updated_at:new Date().toISOString()
    };
    await rest('ceo_person_goals?on_conflict=month_id,person_id',{
      method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(goalBody)
    });

    const teamId=$('personTeam').value;
    await assignTeam(personId,teamId);

    const email=$('personEmail').value.trim();
    const password=$('personPassword').value;
    if(!id&&email&&password){
      if(password.length<8)throw new Error('A senha inicial precisa ter pelo menos 8 caracteres.');
      await adminAction('create_user',{person_id:personId,display_name:name,email,password});
    }

    state.people=await rest('ceo_people?select=*&order=full_name.asc');
    await loadGoals(); await loadApprovals();
    const savedPerson=personById(personId);
    if(savedPerson?.email){
      await syncAccessLinkForPerson(savedPerson);
      await loadApprovals();
    }
    fillPeopleSelects(); renderPeople(); renderToday(); await renderProfessionalProfile(); closePersonModal();
    toast('Cadastro salvo.');
  }catch(err){toast(err.message,true);}
  finally{$('savePersonBtn').disabled=false;}
}
async function syncAccessLinkForPerson(person){
  if(!person?.id)return;
  const email=norm(person.email);
  if(!email)return;
  const access=(state.approvals||[]).find(a=>norm(a.email)===email);
  if(!access?.user_id)return;
  if(access.person_id===person.id)return;
  await rest('raiox_app_users?user_id=eq.'+encodeURIComponent(access.user_id),{
    method:'PATCH',
    headers:{Prefer:'return=minimal'},
    body:JSON.stringify({person_id:person.id,updated_at:new Date().toISOString()})
  });
}
async function disableAccessForPerson(person,{detach=false}={}){
  if(!person?.id)return;
  const approvals=state.approvals||[];
  const byPerson=approvals.find(a=>a.person_id===person.id);
  const email=norm(person.email);
  const byEmail=email?approvals.find(a=>norm(a.email)===email):null;
  const access=byPerson||byEmail;
  const body={active:false,approval_status:'rejected',updated_at:new Date().toISOString()};
  if(detach)body.person_id=null;
  if(access?.user_id){
    await rest('raiox_app_users?user_id=eq.'+encodeURIComponent(access.user_id),{
      method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)
    });
    return;
  }
  await rest('raiox_app_users?person_id=eq.'+person.id,{
    method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)
  });
}
async function endPerson(id){
  const p=personById(id); if(!p)return;
  const reason=prompt('Motivo do distrato de '+p.full_name+':','');
  if(reason===null)return;
  if(!confirm('Distratar '+p.full_name+'? O histórico será preservado.'))return;
  try{
    await rest('ceo_people?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'ended',ended_on:localDate(),end_reason:reason||null,updated_at:new Date().toISOString()})});
    await disableAccessForPerson(p);
    state.people=await rest('ceo_people?select=*&order=full_name.asc');
    await loadApprovals(); fillPeopleSelects(); renderPeople(); renderToday(); await renderProfessionalProfile();
    toast('Profissional movido para Distratados.');
  }catch(err){toast(err.message,true);}
}
async function deletePerson(id){
  const p=personById(id); if(!p)return;
  if(!confirm('Excluir definitivamente o cadastro de '+p.full_name+'? Use apenas para quem não faz parte da operação ou foi cadastrado por engano.'))return;
  try{
    await disableAccessForPerson(p,{detach:true});
    await rest('ceo_people?id=eq.'+id,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    state.people=await rest('ceo_people?select=*&order=full_name.asc');
    await loadGoals(); await loadApprovals(); fillPeopleSelects(); renderPeople(); renderToday(); await renderProfessionalProfile();
    toast('Cadastro excluído.');
  }catch(err){toast(err.message,true);}
}
async function openAccessForPerson(personId){
  const p=personById(personId); if(!p)return;
  const existing=state.approvals.find(a=>a.person_id===personId)||state.approvals.find(a=>norm(a.email)===norm(p.email));
  if(existing){
    const choice=prompt('Digite 1 para alterar a senha, 2 para bloquear/reaprovar acesso:','1');
    if(choice==='1')return resetPassword(existing.user_id,p.full_name);
    if(choice==='2'){
      if(existing.active)return revokeAccess(existing.user_id);
      return approveAccess(existing.user_id,true);
    }
    return;
  }
  const email=p.email||prompt('E-mail de acesso de '+p.full_name+':','');
  if(!email)return;
  const password=prompt('Senha inicial (mínimo 8 caracteres):','');
  if(!password)return;
  try{
    await adminAction('create_user',{person_id:p.id,display_name:p.full_name,email,password});
    await rest('ceo_people?id=eq.'+p.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({email,updated_at:new Date().toISOString()})});
    await loadApprovals(); toast('Acesso criado e aprovado.');
  }catch(err){toast(err.message,true);}
}
async function resetPassword(userId,name='usuário'){
  const password=prompt('Nova senha para '+name+' (mínimo 8 caracteres):','');
  if(password===null)return;
  if(password.length<8){toast('A senha precisa ter pelo menos 8 caracteres.',true);return;}
  try{await adminAction('reset_password',{user_id:userId,password});toast('Senha alterada com sucesso.');}
  catch(err){toast(err.message,true);}
}

async function loadApprovals(){
  try{
    state.approvals=await rest('raiox_app_users?select=user_id,person_id,display_name,email,role,active,approval_status,requested_at,approved_at,created_at&order=requested_at.desc.nullslast,created_at.desc');
    state.approvalsLoadError='';
  }catch(err){
    state.approvals=[];
    state.approvalsLoadError=err?.message||'Não foi possível carregar as aprovações.';
    toast('Não foi possível carregar as aprovações.',true);
  }
  renderApprovals();
}

function approvalLabel(status){return status==='approved'?'Aprovado':status==='rejected'?'Recusado':'Aguardando';}
function renderApprovals(){
  const rows=state.approvals||[];
  if(state.approvalsLoadError){
    const badge=$('approvalBadge');
    if(badge){badge.textContent='!';badge.hidden=false;}
    if($('approvalSummary'))$('approvalSummary').innerHTML=[
      ['Aguardando','—','não foi possível carregar'],
      ['Aprovados','—','não foi possível carregar'],
      ['Recusados/Bloqueados','—','não foi possível carregar']
    ].map(x=>'<div class="summary-card error"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');
    if($('approvalsList'))$('approvalsList').innerHTML='<div class="approval-empty error">Falha ao carregar os acessos. Clique em <b>Atualizar</b> para tentar novamente.</div>';
    return;
  }

  const pending=rows.filter(x=>x.approval_status==='pending'||(!x.active&&x.approval_status!=='rejected'));
  const approved=rows.filter(x=>x.approval_status==='approved'&&x.active);
  const rejected=rows.filter(x=>x.approval_status==='rejected');
  const badge=$('approvalBadge');
  if(badge){badge.textContent=pending.length;badge.hidden=pending.length===0;}

  if($('approvalSummary'))$('approvalSummary').innerHTML=[
    ['Aguardando',pending.length,'precisam da sua decisão'],
    ['Aprovados',approved.length,'podem entrar'],
    ['Recusados/Bloqueados',rejected.length,'sem acesso']
  ].map(x=>'<div class="summary-card"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');

  if(!$('approvalsList'))return;
  const ordered=[...pending,...approved,...rejected.filter(x=>!pending.includes(x)&&!approved.includes(x))];
  $('approvalsList').innerHTML=ordered.length?ordered.map(x=>{
    const isPending=x.approval_status==='pending'||(!x.active&&x.approval_status!=='rejected');
    const cls=isPending?'pending':x.active?'approved':'rejected';
    const when=x.requested_at||x.created_at||'';
    return '<div class="approval-card '+cls+'">'+
      '<div class="approval-person"><span class="approval-dot"></span><div><b>'+esc(x.display_name||'Usuário')+'</b><small>'+esc(x.email||'E-mail não informado')+(x.role?' • '+esc(x.role):'')+'</small></div></div>'+
      '<div class="approval-meta"><span>'+approvalLabel(isPending?'pending':x.approval_status)+'</span><small>'+(when?new Date(when).toLocaleString('pt-BR'):'acesso ativo')+'</small></div>'+
      '<div class="approval-actions">'+
      (isPending
        ?'<button class="approve" data-approve="'+x.user_id+'">Aprovar</button><button class="reject" data-reject="'+x.user_id+'">Recusar</button>'
        :x.active
          ?'<button data-pass="'+x.user_id+'" data-pass-name="'+esc(x.display_name||'usuário')+'">Alterar senha</button><button class="reject" data-revoke="'+x.user_id+'">Bloquear</button>'
          :'<button class="approve" data-approve="'+x.user_id+'">Reaprovar</button>')+
      '</div></div>';
  }).join(''):'<div class="approval-empty">Nenhuma conta ou solicitação de acesso encontrada.</div>';

  document.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>approveAccess(b.dataset.approve,true));
  document.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>approveAccess(b.dataset.reject,false));
  document.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>revokeAccess(b.dataset.revoke));
  document.querySelectorAll('[data-pass]').forEach(b=>b.onclick=()=>resetPassword(b.dataset.pass,b.dataset.passName));
}

async function approveAccess(userId,approve){
  try{
    if(approve){
      await adminAction('approve_user',{user_id:userId});
      toast('Acesso aprovado. A pessoa já pode entrar.');
    }else{
      await rest('raiox_app_users?user_id=eq.'+encodeURIComponent(userId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({active:false,approval_status:'rejected',approved_at:null,approved_by:state.user.id,updated_at:new Date().toISOString()})});
      toast('Solicitação recusada.');
    }
    await loadApprovals();
  }catch(err){toast(err.message,true);}
}
async function revokeAccess(userId){
  if(!confirm('Bloquear o acesso deste usuário?'))return;
  try{
    await rest('raiox_app_users?user_id=eq.'+encodeURIComponent(userId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({active:false,approval_status:'rejected',updated_at:new Date().toISOString()})});
    toast('Acesso bloqueado.'); await loadApprovals();
  }catch(err){toast(err.message,true);}
}

function fillPeopleSelects(){
  const current=workingPeople();
  const opts=current.map(p=>'<option value="'+p.id+'">'+esc(p.full_name)+' • '+esc(roleOf(p))+'</option>').join('');
  if($('onePerson'))$('onePerson').innerHTML=opts;
  if($('taskPerson'))$('taskPerson').innerHTML='<option value="">Sem pessoa específica</option>'+opts;
  if($('agendaPerson'))$('agendaPerson').innerHTML='<option value="">Toda a operação / sem pessoa</option>'+opts;
  if($('strategyOwner'))$('strategyOwner').innerHTML='<option value="">Gestão / sem responsável individual</option>'+opts;
  if($('profilePerson')){
    const prior=$('profilePerson').value;
    const filtered=professionalWorkingPeople();
    $('profilePerson').innerHTML=filtered.map(p=>'<option value="'+p.id+'">'+esc(p.full_name)+'</option>').join('');
    if(prior&&filtered.some(p=>p.id===prior))$('profilePerson').value=prior;
    else if(filtered[0])$('profilePerson').value=filtered[0].id;
  }
  if($('xiaPerson')){
    const prior=$('xiaPerson').value;
    $('xiaPerson').innerHTML=current.map(p=>'<option value="'+p.id+'">'+esc(p.full_name)+' • '+esc(roleOf(p))+'</option>').join('');
    if(prior&&current.some(p=>p.id===prior))$('xiaPerson').value=prior;
  }
  syncProfessionalAreaUi();
}
function fillAgendaTeams(){
  if(!$('agendaTeam'))return;
  const prior=$('agendaTeam').value;
  $('agendaTeam').innerHTML='<option value="">Sem equipe específica</option>'+state.teams.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join('');
  if(prior)$('agendaTeam').value=prior;
}

async function saveOne(){
  const personId=$('onePerson').value;
  if(!personId){toast('Escolha o profissional.',true);return;}
  const body={
    person_id:personId,month_id:state.month.id,meeting_date:$('oneDate').value||localDate(),
    topic:$('oneTopic').value||null,what_is_working:$('oneWorking').value||null,
    blockers:$('oneBlockers').value||null,improvement:$('oneImprovement').value||null,
    leadership_support:$('oneSupport').value||null,commitments:$('oneCommitments').value||null,
    review_date:$('oneReviewDate').value||null,visibility:$('oneVisibility').value
  };
  try{
    await rest('ceo_one_on_one',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
    toast('Olho no Olho salvo.');
    ['oneTopic','oneWorking','oneBlockers','oneImprovement','oneSupport','oneCommitments','oneReviewDate'].forEach(id=>$(id).value='');
    await loadOne(); renderOneHistory();
  }catch(err){toast(err.message,true);}
}
function renderOneHistory(){
  $('oneHistory').innerHTML=state.one.length?state.one.map(x=>{
    const p=personById(x.person_id);
    return '<div class="history-card"><header><b>'+esc(p?.full_name||'Profissional')+' • '+esc(x.topic||'Olho no Olho')+'</b><small>'+dateBr(x.meeting_date)+(x.review_date?' • revisar '+dateBr(x.review_date):'')+'</small></header><p>'+
      (x.commitments?'Compromissos: '+esc(x.commitments):esc(x.improvement||x.blockers||'Registro salvo.'))+'</p></div>';
  }).join(''):'<div class="history-card"><p>Nenhuma conversa registrada neste mês.</p></div>';
}

const STRATEGY_TYPE_LABELS={meeting:'Reunião',agenda_item:'Pauta',strategy:'Estratégia',change:'Mudança',decision:'Decisão'};
const STRATEGY_STATUS_LABELS={open:'Em aberto',in_progress:'Em andamento',done:'Concluído',archived:'Arquivado'};
const STRATEGY_AREA_LABELS={captacao:'Captação',vendas:'Vendas',operacao:'Operação',pessoas:'Pessoas',processo:'Processo',geral:'Geral'};

async function saveStrategy(){
  const title=$('strategyTitle').value.trim();
  if(!title){toast('Digite o título do registro.',true);return;}
  const body={
    month_id:state.month.id,
    record_type:$('strategyType').value,
    title,
    record_date:$('strategyDate').value||localDate(),
    area:$('strategyArea').value,
    owner_id:$('strategyOwner').value||null,
    participants:$('strategyParticipants').value.trim()||null,
    priority:$('strategyPriority').value,
    status:$('strategyStatus').value,
    agenda_text:$('strategyAgendaText').value.trim()||null,
    decision_text:$('strategyDecisionText').value.trim()||null,
    next_steps:$('strategyNextSteps').value.trim()||null,
    review_date:$('strategyReviewDate').value||null,
    created_by:state.user?.id||null,
    updated_at:new Date().toISOString()
  };
  try{
    $('saveStrategyBtn').disabled=true;
    await rest('ceo_strategy_records',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
    ['strategyTitle','strategyParticipants','strategyAgendaText','strategyDecisionText','strategyNextSteps','strategyReviewDate'].forEach(id=>$(id).value='');
    $('strategyDate').value=localDate();
    toast('Registro de estratégia salvo.');
    await loadStrategy();renderStrategy();
  }catch(err){toast(err.message,true);}
  finally{$('saveStrategyBtn').disabled=false;}
}
function renderStrategy(){
  if(!$('strategyList'))return;
  const typeFilter=state.strategyTypeFilter||'all';
  const statusFilter=state.strategyStatusFilter||'all';
  const visible=state.strategy.filter(x=>(typeFilter==='all'||x.record_type===typeFilter)&&(statusFilter==='all'||x.status===statusFilter));
  const open=state.strategy.filter(x=>x.status==='open').length;
  const progress=state.strategy.filter(x=>x.status==='in_progress').length;
  const done=state.strategy.filter(x=>x.status==='done').length;
  const today=localDate();
  const reviews=state.strategy.filter(x=>x.review_date&&x.review_date<=today&&!['done','archived'].includes(x.status)).length;
  $('strategySummary').innerHTML=[
    ['Em aberto',open,'registros'],
    ['Em andamento',progress,'registros'],
    ['Concluídos',done,'no mês'],
    ['Revisar',reviews,'pendentes']
  ].map(x=>'<div class="summary-card"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');
  $('strategyCount').textContent=visible.length+' registro'+(visible.length===1?'':'s');
  $('strategyList').innerHTML=visible.length?visible.map(x=>{
    const owner=personById(x.owner_id);
    return '<article class="strategy-card '+esc(x.status)+'">'+
      '<div class="strategy-card-head"><div><span>'+esc(STRATEGY_TYPE_LABELS[x.record_type]||x.record_type)+' • '+esc(STRATEGY_AREA_LABELS[x.area]||x.area)+'</span><h3>'+esc(x.title)+'</h3></div>'+
      '<div><b>'+dateBr(x.record_date)+'</b><small>'+esc(STRATEGY_STATUS_LABELS[x.status]||x.status)+'</small></div></div>'+
      '<div class="strategy-meta">'+(owner?'<span>Responsável: '+esc(owner.full_name)+'</span>':'<span>Responsável: Gestão</span>')+
      (x.participants?'<span>Participantes: '+esc(x.participants)+'</span>':'')+
      (x.review_date?'<span>Revisar: '+dateBr(x.review_date)+'</span>':'')+'</div>'+
      (x.agenda_text?'<div class="strategy-block"><small>PAUTA / CONTEXTO</small><p>'+esc(x.agenda_text)+'</p></div>':'')+
      (x.decision_text?'<div class="strategy-block decision"><small>DECISÃO</small><p>'+esc(x.decision_text)+'</p></div>':'')+
      (x.next_steps?'<div class="strategy-block"><small>PRÓXIMOS PASSOS</small><p>'+esc(x.next_steps)+'</p></div>':'')+
      '<div class="strategy-actions">'+
        (x.status!=='done'&&x.status!=='archived'?'<button data-strategy-progress="'+x.id+'">Em andamento</button><button class="primary" data-strategy-done="'+x.id+'">Concluir</button>':'')+
        (x.status!=='archived'?'<button class="ghost" data-strategy-archive="'+x.id+'">Arquivar</button>':'')+
      '</div></article>';
  }).join(''):'<div class="approval-empty">Nenhum registro para este filtro.</div>';
  document.querySelectorAll('[data-strategy-progress]').forEach(b=>b.onclick=()=>updateStrategyStatus(b.dataset.strategyProgress,'in_progress'));
  document.querySelectorAll('[data-strategy-done]').forEach(b=>b.onclick=()=>updateStrategyStatus(b.dataset.strategyDone,'done'));
  document.querySelectorAll('[data-strategy-archive]').forEach(b=>b.onclick=()=>updateStrategyStatus(b.dataset.strategyArchive,'archived'));
}
async function updateStrategyStatus(id,status){
  try{
    await rest('ceo_strategy_records?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
    await loadStrategy();renderStrategy();toast('Registro atualizado.');
  }catch(err){toast(err.message,true);}
}

async function saveAgenda(){
  const title=$('agendaTitle').value.trim();
  if(!title){toast('Digite o título do compromisso.',true);return;}
  const body={
    month_id:state.month.id,
    person_id:$('agendaPerson').value||null,
    team_id:$('agendaTeam').value||null,
    event_type:$('agendaType').value,
    title,
    event_date:$('agendaDate').value||localDate(),
    start_time:$('agendaStart').value||null,
    end_time:$('agendaEnd').value||null,
    priority:$('agendaPriority').value,
    notes:$('agendaNotes').value.trim()||null
  };
  try{
    await rest('ceo_agenda',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
    $('agendaTitle').value=''; $('agendaNotes').value=''; $('agendaStart').value=''; $('agendaEnd').value='';
    toast('Compromisso adicionado à agenda.'); await loadAgenda(); renderAgenda();
  }catch(err){toast(err.message,true);}
}
function renderAgenda(){
  if(!$('agendaList'))return;
  const today=localDate();
  const scheduled=state.agenda.filter(a=>a.status==='scheduled');
  const todayItems=scheduled.filter(a=>a.event_date===today);
  const overdue=scheduled.filter(a=>a.event_date<today);
  const upcoming=scheduled.filter(a=>a.event_date>today);
  $('agendaSummary').innerHTML=[
    ['Hoje',todayItems.length,'compromissos'],
    ['Próximos',upcoming.length,'agendados'],
    ['Atrasados',overdue.length,'para revisar'],
    ['Concluídos',state.agenda.filter(a=>a.status==='done').length,'no mês']
  ].map(x=>'<div class="summary-card"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');

  const ordered=[...scheduled,...state.agenda.filter(a=>a.status==='done')];
  $('agendaList').innerHTML=ordered.length?ordered.map(a=>{
    const p=personById(a.person_id); const team=state.teams.find(t=>t.id===a.team_id);
    const type={meeting:'Meeting',training:'Treinamento',one_on_one:'Olho no Olho',commitment:'Compromisso',reminder:'Lembrete',operational:'Operacional',other:'Outro'}[a.event_type]||a.event_type;
    return '<div class="agenda-card '+(a.status==='done'?'done':'')+'">'+
      '<div class="agenda-date"><b>'+dateBr(a.event_date)+'</b><span>'+esc(time5(a.start_time)||'sem horário')+'</span></div>'+
      '<div class="agenda-copy"><small>'+esc(type)+' • '+esc(a.priority)+'</small><b>'+esc(a.title)+'</b><p>'+esc(p?.full_name||team?.name||'Operação geral')+(a.notes?' • '+esc(a.notes):'')+'</p></div>'+
      '<div class="agenda-actions">'+(a.status==='scheduled'?'<button data-agenda-done="'+a.id+'">Concluir</button>':'<span>Concluído</span>')+'</div>'+
    '</div>';
  }).join(''):'<div class="approval-empty">Nenhum compromisso neste mês.</div>';
  document.querySelectorAll('[data-agenda-done]').forEach(b=>b.onclick=()=>finishAgenda(b.dataset.agendaDone));
}
async function finishAgenda(id){
  try{
    await rest('ceo_agenda?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'done',updated_at:new Date().toISOString()})});
    toast('Compromisso concluído.'); await loadAgenda(); renderAgenda();
  }catch(err){toast(err.message,true);}
}

async function saveTask(){
  if(!$('taskTitle').value.trim()){toast('Digite o título da pendência.',true);return;}
  const body={month_id:state.month.id,person_id:$('taskPerson').value||null,title:$('taskTitle').value.trim(),due_date:$('taskDue').value||null,priority:$('taskPriority').value,note:$('taskNote').value||null};
  try{
    await rest('ceo_tasks',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
    $('taskTitle').value='';$('taskNote').value='';toast('Pendência adicionada.');await loadTasks();renderTasks();
  }catch(err){toast(err.message,true);}
}
function renderTasks(){
  const open=state.tasks.filter(t=>t.status==='open');
  $('tasksList').innerHTML=open.length?open.map(t=>{
    const p=personById(t.person_id);
    return '<div class="task-card"><header><b>'+esc(t.title)+'</b><small>'+esc(t.priority.toUpperCase())+(t.due_date?' • '+dateBr(t.due_date):'')+'</small></header><p>'+esc(p?.full_name||'Geral')+(t.note?' • '+esc(t.note):'')+'</p><button data-done="'+t.id+'">Concluir</button></div>';
  }).join(''):'<div class="task-card"><p>Nenhuma pendência aberta.</p></div>';
  document.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>finishTask(b.dataset.done));
}
async function finishTask(id){
  try{
    await rest('ceo_tasks?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'done',completed_at:new Date().toISOString()})});
    toast('Pendência concluída.');await loadTasks();renderTasks();
  }catch(err){toast(err.message,true);}
}

function reportDateRange(){
  const period=state.reportPeriod||'month';
  const monthStart=state.month.ref_month;
  const monthDate=new Date(monthStart+'T12:00:00');
  const monthEndDate=new Date(monthDate);monthEndDate.setMonth(monthEndDate.getMonth()+1);monthEndDate.setDate(0);
  if(period==='month')return {start:monthStart,end:localDate(monthEndDate),label:state.month.label};

  let anchor=$('todayDate')?.value||localDate();
  if(String(anchor).slice(0,7)!==monthStart.slice(0,7))anchor=monthStart;
  const endDate=new Date(anchor+'T12:00:00');
  const startDate=new Date(endDate);startDate.setDate(startDate.getDate()-6);
  const floor=startDate<monthDate?monthDate:startDate;
  return {start:localDate(floor),end:localDate(endDate),label:dateBr(localDate(floor))+' a '+dateBr(localDate(endDate))};
}
function reportAreaStats(roleName,range){
  if(performanceUpdatedMonth()!==state.month.ref_month.slice(0,7))return null;
  const roles=performanceRoles(roleName);
  if(state.reportPeriod==='month'){
    return roles.reduce((a,r)=>{a.c+=Number(r.c||0);a.s+=Number(r.s||0);a.v+=Number(r.v||0);a.q+=Number(r.q||0);a.nq+=Number(r.nq||0);return a;},{c:0,s:0,v:0,q:0,nq:0});
  }
  if(range.start.slice(0,7)!==state.month.ref_month.slice(0,7)||range.end.slice(0,7)!==state.month.ref_month.slice(0,7))return null;
  const s=Number(range.start.slice(8,10)),e=Number(range.end.slice(8,10));
  return roles.reduce((a,r)=>{
    const x=roleRange(r,s,e);a.c+=x.c;a.s+=x.s;a.v+=x.v;a.q+=x.q;a.nq+=x.nq;return a;
  },{c:0,s:0,v:0,q:0,nq:0});
}
function reportAreaCard(key,label,stats){
  if(!stats)return '<div class="report-area-card"><small>'+esc(label)+'</small><b>Sem base</b><span>performance não carregada para este período</span></div>';
  const conv=stats.c?stats.s/stats.c*100:0;
  const qual=stats.c?stats.q/stats.c*100:0;
  const volume=key==='promotor'?'casais':'atendimentos';
  return '<div class="report-area-card"><small>'+esc(label)+'</small><b>'+stats.c+' '+volume+'</b><span>'+stats.s+' vendas • '+pct(conv)+' conversão</span><em>'+money(stats.v)+' VGV • Q '+pct(qual)+'</em></div>';
}
function reportGoalCard(label,current,goal,superGoal,fmt){
  const s=goalStatus(current,goal,superGoal);
  return '<div class="report-area-card"><small>'+esc(label)+'</small><b>'+(current==null?'Aguardando dados':fmt(current))+'</b>'+
    '<span>Meta '+(Number(goal||0)>0?fmt(goal):'—')+'</span>'+
    '<em>'+(Number(superGoal||0)>0?'Super Meta '+fmt(superGoal):'Super Meta não definida')+' • '+s.label+'</em></div>';
}
async function renderReports(){
  if(!state.month)return;
  const range=reportDateRange();
  const endExclusive=new Date(range.end+'T12:00:00');endExclusive.setDate(endExclusive.getDate()+1);
  const endExclusiveStr=localDate(endExclusive);
  const presence=await rest('ceo_daily_presence?select=*&work_date=gte.'+range.start+'&work_date=lt.'+endExclusiveStr);
  const counts={present:0,absent:0,late:0,agreed_off:0,unavailable:0,training:0,remote:0,left_early:0};
  presence.forEach(x=>{if(counts[x.status]!=null)counts[x.status]++;});

  const one=state.one.filter(x=>x.meeting_date>=range.start&&x.meeting_date<=range.end);
  const open=state.tasks.filter(t=>t.status==='open').length;
  const urgent=state.tasks.filter(t=>t.status==='open'&&(t.priority==='high'||t.priority==='critical')).length;
  const signals=workingPeople().flatMap(p=>{
    const commercial=personRoles(p).filter(r=>Object.values(TODAY_AREA_ROLES).some(label=>norm(label)===norm(r)));
    const roles=commercial.length?commercial:[roleOf(p)];
    return roles.map(role=>xiaPersonSignal(p,presence,role));
  }).filter(x=>x.reasons.length).sort((a,b)=>b.level-a.level||b.reasons.length-a.reasons.length);
  const areas=Object.entries(TODAY_AREA_ROLES).map(([key,label])=>({key,label,stats:reportAreaStats(label,range)}));

  $('reportMonthTitle').textContent=range.label;
  $('reportPeriodEyebrow').textContent=state.reportPeriod==='week'?'RAIO-X DA SEMANA':'RAIO-X DO MÊS';
  $('reportBaseLabel').textContent='Base de performance '+(performanceData()?.updated||'—');
  document.querySelectorAll('[data-report-period]').forEach(b=>b.classList.toggle('active',b.dataset.reportPeriod===state.reportPeriod));

  $('reportSummary').innerHTML=[
    ['Período',state.reportPeriod==='week'?'7 dias':'Mês inteiro',range.label],
    ['Compareceu',counts.present,'registros'],
    ['Ausências',counts.absent,'registros'],
    ['Atrasos',counts.late,'registros'],
    ['Olho no Olho',one.length,'conversas']
  ].map(x=>'<div class="summary-card"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');

  const attentionHtml=signals.length?signals.slice(0,8).map(x=>
    '<button class="report-person-signal '+(x.level===3?'critical':x.level===2?'warn':'info')+'" data-report-person="'+x.p.id+'">'+
      '<b>'+esc(x.p.full_name)+'</b><span>'+esc(x.role||roleOf(x.p))+'</span><p>'+x.reasons.map(esc).join(' • ')+'</p></button>'
  ).join(''):'<div class="xia-empty">Nenhum sinal relevante pelos critérios atuais.</div>';

  const opTotal=operationMonthTotals();
  const meta=state.month;
  const metaHtml='<div class="report-section"><div class="report-section-head"><div><span class="eyebrow">META DA OPERAÇÃO</span><h3>Meta e Super Meta • '+esc(state.month.label)+'</h3></div></div>'+
    '<div class="report-area-grid">'+
      reportGoalCard('Pesquisas',opTotal?.r??null,meta.goal_research,meta.super_goal_research,v=>num(v))+
      reportGoalCard('Casais',opTotal?.c??null,meta.goal_couples,meta.super_goal_couples,v=>num(v))+
      reportGoalCard('Vendas',opTotal?.s??null,meta.goal_sales,meta.super_goal_sales,v=>num(v))+
      reportGoalCard('VGV',opTotal?.v??null,meta.goal_vgv,meta.super_goal_vgv,v=>money(v))+
    '</div></div>';

  $('reportBody').innerHTML=
    metaHtml+
    '<div class="report-section report-performance"><div class="report-section-head"><div><span class="eyebrow">PERFORMANCE</span><h3>Resultado por área</h3></div></div><div class="report-area-grid">'+areas.map(a=>reportAreaCard(a.key,a.label,a.stats)).join('')+'</div></div>'+
    '<div class="report-section"><div class="report-section-head"><div><span class="eyebrow">PESSOAS</span><h3>Quem merece acompanhamento</h3></div><span class="pill">'+signals.length+' sinais</span></div><div class="report-signal-grid">'+attentionHtml+'</div></div>'+
    '<div class="report-section report-management-grid">'+
      '<div><span class="eyebrow">GESTÃO</span><h3>Presença e liderança</h3><p>'+counts.present+' comparecimentos • '+counts.absent+' ausências • '+counts.late+' atrasos • '+one.length+' Olho no Olho.</p></div>'+
      '<div><span class="eyebrow">PENDÊNCIAS</span><h3>Execução da liderança</h3><p>'+open+' abertas • '+urgent+' de prioridade alta/crítica • '+state.agenda.filter(a=>a.status==='scheduled'&&a.event_date>=range.start&&a.event_date<=range.end).length+' compromissos no período.</p></div>'+
    '</div>'+
    '<div class="report-section"><span class="eyebrow">PRÓXIMOS PASSOS</span><h3>Foco recomendado para o próximo ciclo</h3><div class="report-next-actions">'+
      (signals.filter(x=>x.level===3).length?'<span>Priorizar '+signals.filter(x=>x.level===3).length+' profissional(is) com sinal crítico.</span>':'<span>Sem sinal crítico automático no período.</span>')+
      (counts.absent||counts.late?'<span>Revisar '+(counts.absent+counts.late)+' ocorrência(s) de presença/horário.</span>':'<span>Presença sem ocorrência relevante para revisar.</span>')+
      (urgent?'<span>Resolver '+urgent+' pendência(s) de alta/crítica prioridade.</span>':'<span>Sem pendência alta/crítica aberta.</span>')+
    '</div></div>';

  document.querySelectorAll('[data-report-person]').forEach(b=>b.onclick=()=>openProfessionalProfile(b.dataset.reportPerson));

  const lines=[
    'RAIO X — '+(state.reportPeriod==='week'?'RELATÓRIO SEMANAL':'RELATÓRIO MENSAL'),
    'Período: '+range.label,
    'Base de performance: '+(performanceData()?.updated||'não informada'),
    '',
    'META DA OPERAÇÃO',
    'Pesquisas: meta '+(Number(state.month.goal_research||0)||'não definida')+' | super '+(Number(state.month.super_goal_research||0)||'não definida'),
    'Casais: meta '+(Number(state.month.goal_couples||0)||'não definida')+' | super '+(Number(state.month.super_goal_couples||0)||'não definida'),
    'Vendas: meta '+(Number(state.month.goal_sales||0)||'não definida')+' | super '+(Number(state.month.super_goal_sales||0)||'não definida'),
    'VGV: meta '+(Number(state.month.goal_vgv||0)>0?money(state.month.goal_vgv):'não definida')+' | super '+(Number(state.month.super_goal_vgv||0)>0?money(state.month.super_goal_vgv):'não definida'),
    '',
    'PERFORMANCE POR ÁREA',
    ...areas.map(a=>{
      const s=a.stats;if(!s)return a.label+': sem base de performance.';
      return a.label+': '+s.c+' volume, '+s.s+' vendas, '+pct(s.c?s.s/s.c*100:0)+' conversão, '+money(s.v)+' VGV, Q '+pct(s.c?s.q/s.c*100:0)+'.';
    }),
    '',
    'PRESENÇA E LIDERANÇA',
    counts.present+' comparecimentos, '+counts.absent+' ausências, '+counts.late+' atrasos.',
    one.length+' Olho no Olho no período. '+open+' pendências abertas; '+urgent+' alta/crítica.',
    '',
    'PESSOAS EM ACOMPANHAMENTO',
    ...(signals.length?signals.slice(0,8).map(x=>x.p.full_name+' — '+x.reasons.join(' • ')):['Nenhum sinal relevante pelos critérios atuais.']),
    '',
    'PRÓXIMOS PASSOS',
    (signals.filter(x=>x.level===3).length?'Priorizar os sinais críticos identificados.':'Manter acompanhamento dos indicadores e da constância.'),
    (counts.absent||counts.late?'Revisar ocorrências de presença e horário em conversa individual.':'Sem ocorrência relevante de presença para revisão.'),
    (urgent?'Resolver pendências de alta/crítica prioridade.':'Sem pendência alta/crítica aberta.')
  ];
  state.reportText=lines.join('\n');
}
async function copyReport(){
  if(!state.reportText)await renderReports();
  try{await navigator.clipboard.writeText(state.reportText);toast('Relatório copiado.');}
  catch(_){toast('Não foi possível copiar automaticamente.',true);}
}

function perfForPerson(p){
  const base=performanceData()?.people||[];
  const full=norm(p?.full_name);
  if(!full)return null;
  const exact=base.find(x=>norm(x.name)===full);
  if(exact)return exact;
  const tokens=full.split(/\s+/).filter(Boolean);
  const firstTwo=tokens.slice(0,2).join(' ');
  if(firstTwo){
    const byTwo=base.filter(x=>norm(x.name).startsWith(firstTwo)||firstTwo.startsWith(norm(x.name)));
    if(byTwo.length===1)return byTwo[0];
  }
  const first=tokens[0];
  const byFirst=base.filter(x=>norm(x.name).split(/\s+/)[0]===first);
  return byFirst.length===1?byFirst[0]:null;
}
function perfMonthMatches(){
  const updated=performanceData()?.updated||'';
  const m=updated.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if(!m||!state.month)return false;
  return state.month.ref_month.slice(0,7)===m[3]+'-'+m[2];
}
function choosePrimaryPerf(p,perf,preferredRole=''){
  if(!perf?.roles?.length)return null;
  const r=preferredRole||roleOf(p);
  return perf.roles.find(x=>norm(x.role)===norm(r))||perf.roles[0];
}
function dailyConsistency(role){
  const active=(role?.daily||[]).filter(r=>Number(r[0])>0);
  if(active.length<2)return {label:'Sem amostra suficiente',score:null,activeDays:active.length,avg:active.length?active[0][0]:0,cv:null,saleDays:active.filter(r=>r[1]>0).length};
  const vals=active.map(r=>Number(r[0]||0));
  const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
  const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-avg)**2,0)/vals.length);
  const cv=avg?sd/avg:0;
  const label=cv<=.45?'Alta':cv<=.75?'Moderada':'Baixa';
  return {label,score:Math.max(0,Math.round((1-Math.min(cv,1))*100)),activeDays:active.length,avg,cv,saleDays:active.filter(r=>Number(r[1])>0).length};
}
function xiaList(items,empty){
  return items.length?items.map(x=>'<div class="xia-item '+esc(x.level||'')+'"><b>'+esc(x.title)+'</b><p>'+esc(x.text)+'</p></div>').join(''):'<div class="xia-empty">'+esc(empty)+'</div>';
}
function findPersonFromQuestion(question){
  const q=norm(question);
  if(!q)return null;
  const people=workingPeople();
  const exact=people.filter(p=>q.includes(norm(p.full_name)));
  if(exact.length)return exact.sort((a,b)=>b.full_name.length-a.full_name.length)[0];

  const byTwo=people.filter(p=>{
    const parts=norm(p.full_name).split(/\s+/);
    const two=parts.slice(0,2).join(' ');
    return two&&q.includes(two);
  });
  if(byTwo.length===1)return byTwo[0];

  const words=q.split(/\s+/).filter(Boolean);
  const firstMatches=people.filter(p=>{
    const first=norm(p.full_name).split(/\s+/)[0];
    return first.length>=3&&words.includes(first);
  });
  return firstMatches.length===1?firstMatches[0]:null;
}
function personTrend(primary){
  if(!primary||!perfMonthMatches())return null;
  const ref=performanceReferenceDay()||31;
  const recent=roleRange(primary,Math.max(1,ref-6),ref);
  const previous=roleRange(primary,Math.max(1,ref-13),Math.max(1,ref-7));
  const rc=recent.c?recent.s/recent.c*100:0;
  const pc=previous.c?previous.s/previous.c*100:0;
  return {
    recent,previous,
    volumeDelta:previous.c?((recent.c-previous.c)/previous.c*100):null,
    convDelta:previous.c?(rc-pc):null,
    recentConv:rc,previousConv:pc
  };
}
function answerBlock(title,text,meta=''){
  return '<div class="raio-answer-card"><small>'+esc(title)+'</small><p>'+text+'</p>'+(meta?'<span>'+esc(meta)+'</span>':'')+'</div>';
}
async function answerRaioXQuestion(){
  const input=$('raioQuestion');
  const answer=$('raioAnswer');
  const rawQ=input?.value.trim()||'';
  if(!rawQ){toast('Digite uma pergunta.',true);return;}
  answer.innerHTML='<div class="raio-answer-loading">Analisando os dados do RAIO X...</div>';

  const q=norm(rawQ);
  const person=findPersonFromQuestion(rawQ);
  let monthPresence=[];
  try{monthPresence=await rest('ceo_daily_presence?select=*&month_id=eq.'+state.month.id+'&order=work_date.asc');}catch(_){monthPresence=[];}

  if(person){
    const perf=perfForPerson(person);
    const askedRole=/closer|fechador/.test(q)?'Closer / Fechador':/liner|consultor/.test(q)?'Liner / Consultor':/promotor|captador|captação|captacao/.test(q)?'Promotor de Marketing':'';
    const primary=choosePrimaryPerf(person,perf,askedRole);
    const sameMonth=perfMonthMatches();
    const goal=goalByPerson(person.id);
    const one=state.one.filter(x=>x.person_id===person.id);
    const tasks=state.tasks.filter(x=>x.person_id===person.id&&x.status==='open');
    const pres=monthPresence.filter(x=>x.person_id===person.id);
    const counts={present:0,absent:0,late:0,other:0};
    pres.forEach(x=>{
      if(x.status==='present')counts.present++;
      else if(x.status==='absent')counts.absent++;
      else if(x.status==='late')counts.late++;
      else counts.other++;
    });
    const trend=personTrend(primary);
    const volumeLabel=roleOf(person)==='Promotor de Marketing'?'casais':'atendimentos';

    if(/atras|falt|presen/.test(q)){
      answer.innerHTML=answerBlock(
        'PRESENÇA • '+person.full_name,
        '<b>'+counts.present+'</b> comparecimentos, <b>'+counts.absent+'</b> ausências, <b>'+counts.late+'</b> atrasos e <b>'+counts.other+'</b> outros registros.',
        state.month.label
      );
      return;
    }

    if(/olho no olho|conversei|compromiss/.test(q)){
      const last=one[0];
      answer.innerHTML=last
        ? answerBlock('ÚLTIMO OLHO NO OLHO • '+person.full_name,
            'Em <b>'+dateBr(last.meeting_date)+'</b>: '+esc(last.topic||'Olho no Olho')+'.<br><br><b>Compromissos:</b> '+esc(last.commitments||'não registrados')+
            (last.review_date?'<br><b>Revisão:</b> '+dateBr(last.review_date):''),
            state.month.label)
        : answerBlock('OLHO NO OLHO • '+person.full_name,'Nenhuma conversa registrada neste mês.',state.month.label);
      return;
    }

    if(/meta/.test(q)){
      const r=primary&&sameMonth?Number(primary.r||0):0;
      const c=primary&&sameMonth?Number(primary.c||0):0;
      const s=primary&&sameMonth?Number(primary.s||0):0;
      const v=primary&&sameMonth?Number(primary.v||0):0;
      answer.innerHTML=answerBlock(
        'METAS • '+person.full_name,
        'Pesquisas: <b>'+r+' / '+Number(goal?.research_goal||0)+'</b> • Volume: <b>'+c+' / '+Number(goal?.couples_goal||0)+'</b> • Vendas: <b>'+s+' / '+Number(goal?.sales_goal||0)+'</b> • VGV: <b>'+money(v)+' / '+money(goal?.vgv_goal||0)+'</b>.',
        state.month.label
      );
      return;
    }

    if(/semana|7 dias|ultimos sete|últimos sete/.test(q)){
      if(!trend){
        answer.innerHTML=answerBlock('7 DIAS • '+person.full_name,'Não existe série de performance compatível com o mês selecionado.',state.month.label);
        return;
      }
      const vd=trend.volumeDelta==null?'sem comparação':(trend.volumeDelta>=0?'+':'')+num(trend.volumeDelta,1)+'%';
      const cd=trend.convDelta==null?'sem comparação':(trend.convDelta>=0?'+':'')+num(trend.convDelta,1)+' p.p.';
      answer.innerHTML=answerBlock(
        'ÚLTIMOS 7 DIAS • '+person.full_name,
        '<b>'+trend.recent.c+'</b> '+volumeLabel+', <b>'+trend.recent.s+'</b> vendas, <b>'+pct(trend.recentConv)+'</b> de conversão e <b>'+money(trend.recent.v)+'</b> de VGV.<br><br>'+
        'Comparado aos 7 dias anteriores: volume <b>'+vd+'</b> • conversão <b>'+cd+'</b>.',
        'Base até '+(performanceData()?.updated||'—')
      );
      return;
    }

    if(primary&&sameMonth){
      const conv=primary.c?primary.s/primary.c*100:0;
      const qual=primary.c?primary.q/primary.c*100:0;
      const consistency=dailyConsistency(primary);
      const last=one[0];
      answer.innerHTML=answerBlock(
        'RAIO-X • '+person.full_name,
        '<b>'+primary.c+'</b> '+volumeLabel+', <b>'+primary.s+'</b> vendas, <b>'+pct(conv)+'</b> de conversão, <b>'+money(primary.v)+'</b> de VGV e <b>'+pct(qual)+'</b> de qualificação.<br><br>'+
        'Consistência: <b>'+esc(consistency.label)+'</b>. Presença: '+counts.absent+' ausência(s) e '+counts.late+' atraso(s). '+
        'Pendências abertas: '+tasks.length+'.'+
        (last?'<br>Último Olho no Olho: '+dateBr(last.meeting_date)+' • compromisso: '+esc(last.commitments||'não registrado')+'.':''),
        'Performance '+(performanceData()?.updated||'—')+' • Gestão '+state.month.label
      );
    }else{
      answer.innerHTML=answerBlock(
        'RAIO-X • '+person.full_name,
        'Não há performance compatível com este mês. Na gestão há '+counts.absent+' ausência(s), '+counts.late+' atraso(s), '+one.length+' Olho no Olho e '+tasks.length+' pendência(s) aberta(s).',
        state.month.label
      );
    }
    return;
  }

  if(/meta|super meta/.test(q)&&!person){
    const t=operationMonthTotals();
    answer.innerHTML=answerBlock(
      'META DA OPERAÇÃO • '+state.month.label,
      'Pesquisas: <b>'+(t&&t.r!=null?num(t.r):'—')+'</b> / meta <b>'+(Number(state.month.goal_research||0)?num(state.month.goal_research):'não definida')+'</b>'+
      (Number(state.month.super_goal_research||0)?' / super <b>'+num(state.month.super_goal_research)+'</b>':'')+'<br>'+
      'Casais: <b>'+(t?num(t.c):'—')+'</b> / meta <b>'+(Number(state.month.goal_couples||0)?num(state.month.goal_couples):'não definida')+'</b>'+
      (Number(state.month.super_goal_couples||0)?' / super <b>'+num(state.month.super_goal_couples)+'</b>':'')+'<br>'+
      'Vendas: <b>'+(t?num(t.s):'—')+'</b> / meta <b>'+(Number(state.month.goal_sales||0)?num(state.month.goal_sales):'não definida')+'</b>'+
      (Number(state.month.super_goal_sales||0)?' / super <b>'+num(state.month.super_goal_sales)+'</b>':'')+'<br>'+
      'VGV: <b>'+(t?money(t.v):'—')+'</b> / meta <b>'+(Number(state.month.goal_vgv||0)?money(state.month.goal_vgv):'não definida')+'</b>'+
      (Number(state.month.super_goal_vgv||0)?' / super <b>'+money(state.month.super_goal_vgv)+'</b>':''),
      t?'Base '+(performanceData()?.updated||'—'):'Aguardando dados de performance de '+state.month.label
    );
    return;
  }

  const signals=workingPeople().flatMap(p=>{
    const commercial=personRoles(p).filter(r=>Object.values(TODAY_AREA_ROLES).some(label=>norm(label)===norm(r)));
    const roles=commercial.length?commercial:[roleOf(p)];
    return roles.map(role=>xiaPersonSignal(p,monthPresence,role));
  }).filter(x=>x.reasons.length).sort((a,b)=>b.level-a.level||b.reasons.length-a.reasons.length);

  if(/baixa.*convers|convers.*baixa/.test(q)){
    const rows=workingPeople().map(p=>{const perf=perfForPerson(p),primary=choosePrimaryPerf(p,perf);return {p,primary,conv:primary?.c?primary.s/primary.c*100:null};})
      .filter(x=>x.primary&&perfMonthMatches()&&x.primary.c>=8&&x.conv!=null)
      .sort((a,b)=>a.conv-b.conv).slice(0,5);
    answer.innerHTML=answerBlock('BAIXA CONVERSÃO',rows.length?rows.map(x=>'<b>'+esc(x.p.full_name)+'</b>: '+pct(x.conv)+' ('+x.primary.s+' vendas em '+x.primary.c+').').join('<br>'):'Sem amostra suficiente.',state.month.label);
    return;
  }

  if(/melhor|evolu/.test(q)){
    const rows=workingPeople().map(p=>{const perf=perfForPerson(p),primary=choosePrimaryPerf(p,perf),t=personTrend(primary);return {p,t};})
      .filter(x=>x.t&&x.t.volumeDelta!=null)
      .sort((a,b)=>(b.t.convDelta||0)-(a.t.convDelta||0)||b.t.volumeDelta-a.t.volumeDelta).slice(0,5);
    answer.innerHTML=answerBlock('EVOLUÇÃO • 7 DIAS',rows.length?rows.map(x=>'<b>'+esc(x.p.full_name)+'</b>: conversão '+((x.t.convDelta||0)>=0?'+':'')+num(x.t.convDelta||0,1)+' p.p. • volume '+(x.t.volumeDelta>=0?'+':'')+num(x.t.volumeDelta,1)+'%.').join('<br>'):'Sem comparação suficiente.','Comparado aos 7 dias anteriores');
    return;
  }

  if(/cai|queda|pior/.test(q)){
    const rows=workingPeople().map(p=>{const perf=perfForPerson(p),primary=choosePrimaryPerf(p,perf),t=personTrend(primary);return {p,t};})
      .filter(x=>x.t&&x.t.volumeDelta!=null)
      .sort((a,b)=>(a.t.convDelta||0)-(b.t.convDelta||0)||a.t.volumeDelta-b.t.volumeDelta).slice(0,5);
    answer.innerHTML=answerBlock('QUEDAS • 7 DIAS',rows.length?rows.map(x=>'<b>'+esc(x.p.full_name)+'</b>: conversão '+((x.t.convDelta||0)>=0?'+':'')+num(x.t.convDelta||0,1)+' p.p. • volume '+(x.t.volumeDelta>=0?'+':'')+num(x.t.volumeDelta,1)+'%.').join('<br>'):'Sem comparação suficiente.','Comparado aos 7 dias anteriores');
    return;
  }

  if(/atras|falt|presen/.test(q)){
    const grouped={};
    monthPresence.forEach(x=>{
      if(!['absent','late'].includes(x.status))return;
      grouped[x.person_id]??={absent:0,late:0};
      grouped[x.person_id][x.status]++;
    });
    const rows=Object.entries(grouped).map(([id,v])=>({p:personById(id),...v})).filter(x=>x.p).sort((a,b)=>(b.absent*2+b.late)-(a.absent*2+a.late)).slice(0,8);
    answer.innerHTML=answerBlock('PRESENÇA • PONTOS DE ATENÇÃO',rows.length?rows.map(x=>'<b>'+esc(x.p.full_name)+'</b>: '+x.absent+' ausência(s) • '+x.late+' atraso(s).').join('<br>'):'Sem ausências ou atrasos registrados.',state.month.label);
    return;
  }

  if(/aten|alerta|prioridade|precisa/.test(q)){
    answer.innerHTML=answerBlock('ATENÇÃO DA OPERAÇÃO',signals.length?signals.slice(0,7).map(x=>'<b>'+esc(x.p.full_name)+'</b>: '+x.reasons.map(esc).join(' • ')+'.').join('<br>'):'Nenhum sinal relevante pelos critérios atuais.',state.month.label);
    return;
  }

  answer.innerHTML=answerBlock(
    'PERGUNTA NÃO RECONHECIDA',
    'Tente perguntar por um profissional ou usar termos como <b>semana</b>, <b>mês</b>, <b>meta</b>, <b>atrasos</b>, <b>Olho no Olho</b>, <b>baixa conversão</b>, <b>quem melhorou</b> ou <b>quem precisa de atenção</b>.',
    'Os resultados usam apenas dados registrados no RAIO X'
  );
}
function xiaReferenceDate(){
  const raw=performanceData()?.updated||'';
  const m=raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m?(m[3]+'-'+m[2]+'-'+m[1]):null;
}
function noSaleSequence(primary){
  if(!primary?.daily?.length)return {volume:0,days:0};
  const ref=Math.min(performanceReferenceDay()||primary.daily.length,primary.daily.length);
  let volume=0,days=0;
  for(let i=ref-1;i>=0;i--){
    const row=primary.daily[i]||[0,0,0,0,0];
    const c=Number(row[0]||0),s=Number(row[1]||0);
    if(s>0)break;
    if(c>0){volume+=c;days++;}
  }
  return {volume,days};
}
function recentVolumeDrop(primary){
  const active=(primary?.daily||[])
    .slice(0,performanceReferenceDay()||undefined)
    .map((row,i)=>({day:i+1,c:Number(row?.[0]||0)}))
    .filter(x=>x.c>0);
  if(active.length<6)return null;
  const recent=active.slice(-3);
  const prior=active.slice(0,-3);
  const recentAvg=recent.reduce((a,x)=>a+x.c,0)/recent.length;
  const priorAvg=prior.reduce((a,x)=>a+x.c,0)/prior.length;
  if(!priorAvg)return null;
  return {recentAvg,priorAvg,ratio:recentAvg/priorAvg,recentDays:recent.map(x=>x.day)};
}
function roleCostBenchmark(roleName){
  const rows=performanceRoles(roleName).filter(x=>Number(x.c||0)>=8&&Number(x.g||0)>0);
  const c=rows.reduce((a,x)=>a+Number(x.c||0),0);
  const g=rows.reduce((a,x)=>a+Number(x.g||0),0);
  return c?g/c:0;
}
function goalPaceSignal(p,primary){
  if(!primary||!perfMonthMatches())return null;
  const goal=goalByPerson(p.id);
  if(!goal)return null;
  const ref=performanceReferenceDay()||1;
  const [y,m]=state.month.ref_month.slice(0,7).split('-').map(Number);
  const daysInMonth=new Date(y,m,0).getDate();
  const elapsed=Math.min(1,ref/daysInMonth);
  const checks=[
    {label:'pesquisas',current:Number(primary.r||0),target:Number(goal.research_goal||0)},
    {label:'volume',current:Number(primary.c||0),target:Number(goal.couples_goal||0)},
    {label:'vendas',current:Number(primary.s||0),target:Number(goal.sales_goal||0)},
    {label:'VGV',current:Number(primary.v||0),target:Number(goal.vgv_goal||0)}
  ].filter(x=>x.target>0);
  const risks=checks.map(x=>({...x,actual:x.current/x.target,expected:elapsed}))
    .filter(x=>x.actual<x.expected*.72)
    .sort((a,b)=>(a.actual/a.expected)-(b.actual/b.expected));
  return risks[0]||null;
}
function lastSevenPresenceCounts(presenceRows,personId){
  const ref=xiaReferenceDate();
  if(!ref)return {late:0,absent:0};
  const end=new Date(ref+'T12:00:00');
  const start=new Date(end);start.setDate(start.getDate()-6);
  const from=localDate(start),to=localDate(end);
  const rows=presenceRows.filter(x=>x.person_id===personId&&x.work_date>=from&&x.work_date<=to);
  return {
    late:rows.filter(x=>x.status==='late').length,
    absent:rows.filter(x=>x.status==='absent').length
  };
}

function xiaPersonSignal(p,presenceRows=[],preferredRole=''){
  const perf=perfForPerson(p);
  const primary=choosePrimaryPerf(p,perf,preferredRole);
  const sameMonth=perfMonthMatches();
  const reasons=[];
  let level=0;

  if(primary&&sameMonth){
    const conv=primary.c?primary.s/primary.c*100:0;
    const qual=primary.c?primary.q/primary.c*100:0;
    const consistency=dailyConsistency(primary);

    if(primary.c>=8&&primary.s===0){
      reasons.push('nenhuma venda em '+primary.c+' oportunidades');
      level=Math.max(level,3);
    }else if(primary.c>=8&&conv<10){
      reasons.push('conversão crítica: '+pct(conv));
      level=Math.max(level,3);
    }else if(primary.c>=8&&conv<15){
      reasons.push('conversão abaixo do esperado: '+pct(conv));
      level=Math.max(level,2);
    }

    if(primary.c>=8&&qual<50){
      reasons.push('qualificação baixa: '+pct(qual));
      level=Math.max(level,2);
    }

    const noSale=noSaleSequence(primary);
    if(noSale.volume>=10){
      reasons.push(noSale.volume+' oportunidades desde a última venda');
      level=Math.max(level,3);
    }else if(noSale.volume>=7){
      reasons.push(noSale.volume+' oportunidades seguidas sem venda');
      level=Math.max(level,2);
    }

    const drop=recentVolumeDrop(primary);
    if(drop&&drop.ratio<.65){
      reasons.push('queda recente de volume: média '+num(drop.recentAvg,1)+' vs '+num(drop.priorAvg,1));
      level=Math.max(level,2);
    }

    if(consistency.label==='Baixa'&&primary.d>=8){
      reasons.push('baixa consistência diária');
      level=Math.max(level,2);
    }

    if(norm(primary.role)===norm('Promotor de Marketing')&&primary.c>=8){
      const cost=Number(primary.g||0)/Math.max(Number(primary.c||0),1);
      const bench=roleCostBenchmark(primary.role);
      if(bench&&cost>bench*1.3){
        reasons.push('custo por casal '+money(cost)+' vs média '+money(bench));
        level=Math.max(level,2);
      }
    }

    const paceRisk=goalPaceSignal(p,primary);
    if(paceRisk){
      reasons.push(paceRisk.label+' abaixo do ritmo da meta');
      level=Math.max(level,1);
    }
  }

  const personalPresence=presenceRows.filter(x=>x.person_id===p.id);
  const absent=personalPresence.filter(x=>x.status==='absent').length;
  const late=personalPresence.filter(x=>x.status==='late').length;
  const recentPresence=lastSevenPresenceCounts(presenceRows,p.id);

  if(absent){
    reasons.push(absent+' não comparecimento'+(absent>1?'s':'')+' no período');
    level=Math.max(level,2);
  }
  if(recentPresence.late>=2){
    reasons.push(recentPresence.late+' atrasos nos últimos 7 dias');
    level=Math.max(level,2);
  }else if(late>=2){
    reasons.push(late+' atrasos registrados no mês');
    level=Math.max(level,1);
  }

  const urgent=state.tasks.filter(t=>t.person_id===p.id&&t.status==='open'&&(t.priority==='high'||t.priority==='critical')).length;
  if(urgent){
    reasons.push(urgent+' pendência'+(urgent>1?'s':'')+' prioritária'+(urgent>1?'s':''));
    level=Math.max(level,2);
  }

  return {p,primary,sameMonth,reasons:[...new Set(reasons)],level,role:primary?.role||preferredRole||roleOf(p)};
}
async function renderXiaOperation(){
  if(!$('xiaOperationSummary')||!state.month)return;
  let presence=[];
  try{presence=await rest('ceo_daily_presence?select=person_id,status,work_date&month_id=eq.'+state.month.id);}catch(_){presence=[];}
  const signals=workingPeople().flatMap(p=>{
    const commercial=personRoles(p).filter(r=>Object.values(TODAY_AREA_ROLES).some(label=>norm(label)===norm(r)));
    const roles=commercial.length?commercial:[roleOf(p)];
    return roles.map(role=>xiaPersonSignal(p,presence,role));
  }).filter(x=>x.reasons.length).sort((a,b)=>b.level-a.level||b.reasons.length-a.reasons.length);
  const critical=signals.filter(x=>x.level===3).length;
  const warning=signals.filter(x=>x.level===2).length;
  const urgent=state.tasks.filter(t=>t.status==='open'&&(t.priority==='high'||t.priority==='critical')).length;
  const presenceFlags=presence.filter(x=>x.status==='absent'||x.status==='late').length;

  $('xiaOperationSummary').innerHTML=[
    ['Analisados',workingPeople().length,'profissionais'],
    ['Críticos',critical,'prioridade alta'],
    ['Em atenção',warning,'acompanhamento'],
    ['Pendências fortes',urgent,'alta/crítica'],
    ['Presença',presenceFlags,'atrasos/ausências']
  ].map(x=>'<div class="summary-card"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');

  $('xiaOperationAlerts').innerHTML=signals.length?signals.slice(0,10).map(x=>{
    const sev=x.level===3?'critical':x.level===2?'warn':'info';
    return '<button class="xia-operation-person '+sev+'" data-xia-operation-person="'+x.p.id+'" data-xia-operation-role="'+esc(x.role||'')+'">'+
      '<div><span>'+ (x.level===3?'CRÍTICO':x.level===2?'ATENÇÃO':'ACOMPANHAR') +'</span><b>'+esc(x.p.full_name)+'</b><small>'+esc(x.role||roleOf(x.p))+'</small></div>'+
      '<p>'+x.reasons.map(esc).join(' • ')+'</p><strong>Ver Raio-X →</strong></button>';
  }).join(''):'<div class="xia-empty">Nenhum sinal relevante pelos critérios atuais.</div>';

  document.querySelectorAll('[data-xia-operation-person]').forEach(b=>b.onclick=()=>{
    $('xiaPerson').value=b.dataset.xiaOperationPerson;
    state.xiaRole=b.dataset.xiaOperationRole||'';
    renderXIA();
    $('xiaIdentity')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
}
function xiaFeedbackSummary(primary,sameMonth){
  if(!primary||!sameMonth)return '<div class="xia-feedback-empty">Sem série de performance deste mês para gerar a leitura de tendência.</div>';
  const ref=performanceReferenceDay()||31;
  const recent=roleRange(primary,Math.max(1,ref-6),ref);
  const previous=roleRange(primary,Math.max(1,ref-13),Math.max(1,ref-7));
  const recentConv=recent.c?recent.s/recent.c*100:0;
  const previousConv=previous.c?previous.s/previous.c*100:0;
  const volumeDelta=previous.c?((recent.c-previous.c)/previous.c*100):null;
  const convDelta=previous.c?(recentConv-previousConv):null;
  let direction='estável';
  if(volumeDelta!=null&&volumeDelta>=20)direction='aceleração de volume';
  else if(volumeDelta!=null&&volumeDelta<=-20)direction='queda de volume';
  else if(convDelta!=null&&convDelta>=5)direction='melhora de conversão';
  else if(convDelta!=null&&convDelta<=-5)direction='queda de conversão';

  return '<div class="xia-feedback-head"><div><span class="eyebrow">FEEDBACK XIA • 7 DIAS</span><h3>'+esc(direction)+'</h3></div><span>comparação com os 7 dias anteriores</span></div>'+
    '<div class="xia-feedback-grid">'+
      '<div><small>Volume</small><b>'+recent.c+'</b><span>'+(volumeDelta==null?'sem comparação':(volumeDelta>=0?'+':'')+num(volumeDelta,1)+'%')+'</span></div>'+
      '<div><small>Vendas</small><b>'+recent.s+'</b><span>'+previous.s+' no período anterior</span></div>'+
      '<div><small>Conversão</small><b>'+pct(recentConv)+'</b><span>'+(convDelta==null?'sem comparação':(convDelta>=0?'+':'')+num(convDelta,1)+' p.p.')+'</span></div>'+
      '<div><small>VGV</small><b>'+money(recent.v)+'</b><span>'+money(previous.v)+' anterior</span></div>'+
    '</div>';
}
async function renderXIA(){
  if(!$('xiaPerson'))return;
  await renderXiaOperation();
  const personId=$('xiaPerson').value||workingPeople()[0]?.id;
  if(!personId){$('xiaIdentity').innerHTML='<div class="xia-empty">Nenhum profissional ativo.</div>';return;}
  $('xiaPerson').value=personId;
  const p=personById(personId); if(!p)return;
  const [presence,notes]=await Promise.all([
    rest('ceo_daily_presence?select=*&month_id=eq.'+state.month.id+'&person_id=eq.'+personId+'&order=work_date.asc'),
    rest('ceo_person_notes?select=*&person_id=eq.'+personId+'&order=happened_on.desc')
  ]);
  const goal=goalByPerson(personId);
  const team=teamByPerson(personId);
  const one=state.one.filter(x=>x.person_id===personId);
  const tasks=state.tasks.filter(x=>x.person_id===personId);
  const agenda=state.agenda.filter(x=>x.person_id===personId);
  const perf=perfForPerson(p);
  const roleOptions=(perf?.roles||[]).map(r=>r.role);
  let selectedXiaRole=state.xiaRole;
  if(!roleOptions.some(r=>norm(r)===norm(selectedXiaRole))){
    selectedXiaRole=roleOptions[0]||roleOf(p);
  }
  state.xiaRole=selectedXiaRole;
  if($('xiaRole')){
    $('xiaRole').hidden=roleOptions.length<2;
    $('xiaRole').innerHTML=roleOptions.map(r=>'<option value="'+esc(r)+'">'+esc(r)+'</option>').join('');
    if(roleOptions.length)$('xiaRole').value=selectedXiaRole;
  }
  const primary=choosePrimaryPerf(p,perf,selectedXiaRole);
  const sameMonth=perfMonthMatches();
  const consistency=dailyConsistency(primary);

  const presenceCounts={present:0,absent:0,late:0,other:0};
  presence.forEach(x=>{
    if(x.status==='present')presenceCounts.present++;
    else if(x.status==='absent')presenceCounts.absent++;
    else if(x.status==='late')presenceCounts.late++;
    else presenceCounts.other++;
  });

  const conv=primary?.c?primary.s/primary.c*100:0;
  const qual=primary?.c?primary.q/primary.c*100:0;
  const cost=primary?.c?primary.g/primary.c:0;
  const strengths=[],attention=[],actions=[],consistencyItems=[];

  if(primary&&sameMonth){
    if(primary.s>0&&conv>=20)strengths.push({title:'Boa conversão',text:'Conversão de '+pct(conv)+' em '+primary.c+' '+(primary.role==='Promotor de Marketing'?'casais':'atendimentos')+'.'});
    if(primary.c>=8&&qual>=65)strengths.push({title:'Qualificação consistente',text:'Taxa Q de '+pct(qual)+'.'});
    if(consistency.label==='Alta')strengths.push({title:'Execução consistente',text:'Variação diária baixa entre '+consistency.activeDays+' dias com produção.'});
    if(goal?.research_goal>0&&Number(primary.r||0)>=goal.research_goal)strengths.push({title:'Meta de pesquisas atingida',text:Number(primary.r||0)+' pesquisas para meta de '+goal.research_goal+'.'});
  if(goal?.sales_goal>0&&primary.s>=goal.sales_goal)strengths.push({title:'Meta de vendas atingida',text:primary.s+' vendas para meta de '+goal.sales_goal+'.'});
    if(goal?.couples_goal>0&&primary.c>=goal.couples_goal)strengths.push({title:'Meta de volume atingida',text:primary.c+' para meta de '+goal.couples_goal+'.'});

    if(primary.c>=8&&primary.s===0)attention.push({level:'critical',title:'Conversão crítica',text:'Há '+primary.c+' oportunidades e nenhuma venda registrada.'});
    else if(primary.c>=8&&conv<10)attention.push({level:'critical',title:'Conversão muito baixa',text:'Conversão de '+pct(conv)+' com '+primary.c+' oportunidades.'});
    else if(primary.c>=8&&conv<15)attention.push({level:'warn',title:'Conversão abaixo do esperado',text:'Conversão de '+pct(conv)+'; revisar abordagem e passagem de etapa.'});
    if(primary.c>=8&&qual<50)attention.push({level:'warn',title:'Qualificação baixa',text:'Taxa Q de '+pct(qual)+'.'});
    if(primary.role==='Promotor de Marketing'&&primary.c>=8&&cost>280)attention.push({level:'warn',title:'Custo por casal elevado',text:'Custo médio de '+money(cost)+' por casal.'});
    if(consistency.label==='Baixa')attention.push({level:'warn',title:'Baixa consistência diária',text:'O volume oscila bastante entre os dias com produção.'});
    if(goal?.research_goal>0&&Number(primary.r||0)<goal.research_goal)attention.push({level:'info',title:'Meta de pesquisas ainda aberta',text:Number(primary.r||0)+' de '+goal.research_goal+' pesquisas.'});
  if(goal?.sales_goal>0&&primary.s<goal.sales_goal)attention.push({level:'info',title:'Meta de vendas ainda aberta',text:primary.s+' de '+goal.sales_goal+' vendas.'});
    if(goal?.couples_goal>0&&primary.c<goal.couples_goal)attention.push({level:'info',title:'Meta de volume ainda aberta',text:primary.c+' de '+goal.couples_goal+'.'});
  }else{
    attention.push({level:'info',title:'Performance deste mês ainda não carregada',text:'A base de performance disponível no XIA está atualizada até '+(performanceData()?.updated||'—')+'. Os dados de gestão do mês selecionado continuam válidos.'});
  }

  if(presenceCounts.absent>0)attention.push({level:'warn',title:'Não comparecimentos registrados',text:presenceCounts.absent+' registro(s) no mês selecionado.'});
  if(presenceCounts.late>0)attention.push({level:'info',title:'Chegadas após o combinado',text:presenceCounts.late+' registro(s) no mês selecionado.'});
  const openTasks=tasks.filter(t=>t.status==='open');
  const urgent=openTasks.filter(t=>t.priority==='high'||t.priority==='critical');
  if(urgent.length)attention.push({level:'warn',title:'Pendências prioritárias',text:urgent.length+' acompanhamento(s) de prioridade alta/crítica em aberto.'});

  consistencyItems.push({title:'Ritmo de produção',text:primary&&sameMonth?(consistency.label+' • '+consistency.activeDays+' dias com produção • média '+num(consistency.avg,1)+' por dia ativo'):'Aguardando performance do mês.'});
  consistencyItems.push({title:'Presença operacional',text:presenceCounts.present+' compareceu • '+presenceCounts.absent+' não compareceu • '+presenceCounts.late+' após combinado • '+presenceCounts.other+' outros registros.'});
  consistencyItems.push({title:'Conversas de liderança',text:one.length+' Olho no Olho no mês • '+notes.length+' anotação(ões) históricas.'});
  consistencyItems.push({title:'Agenda individual',text:agenda.filter(a=>a.status==='scheduled').length+' compromisso(s) futuro(s)/aberto(s) vinculado(s).'});

  if(attention.some(x=>x.title.includes('Conversão')))actions.push({title:'Revisar processo comercial',text:'Use 2–3 casos reais recentes para identificar em qual etapa a oportunidade está se perdendo.'});
  if(attention.some(x=>x.title.includes('Qualificação')))actions.push({title:'Revisar qualidade da entrada',text:'Compare os perfis Q/NQ e alinhe critérios antes de aumentar volume.'});
  if(attention.some(x=>x.title.includes('consistência')))actions.push({title:'Criar cadência mínima',text:'Defina um padrão diário simples e acompanhe por blocos, em vez de olhar apenas o acumulado do mês.'});
  if(presenceCounts.absent||presenceCounts.late)actions.push({title:'Olho no Olho operacional',text:'Converse sobre disponibilidade e combinados usando os registros como fatos, sem presumir causa.'});
  if(!actions.length)actions.push({title:'Manter e elevar o padrão',text:'Preserve o que já funciona e defina um próximo ganho mensurável para o ciclo seguinte.'});
  actions.push({title:'Validar com a pessoa',text:'A XIA mostra evidências e padrões. Use o Olho no Olho para validar contexto, causas e próximos compromissos.'});

  const roleCards=(perf?.roles||[]).map(r=>{
    const rconv=r.c?r.s/r.c*100:0;
    return '<div class="xia-role-card"><small>'+esc(r.role)+'</small><b>'+r.c+' / '+r.s+'</b><span>volume / vendas • '+pct(rconv)+' conversão • '+money(r.v)+' VGV</span></div>';
  }).join('');

  $('xiaIdentity').innerHTML='<div class="xia-person-head"><div><span class="eyebrow">PROFISSIONAL</span><h3>'+esc(p.full_name)+'</h3><p>'+esc(selectedXiaRole)+' • '+esc(team?.name||'sem equipe')+' • horário '+esc(effectiveStart(p))+' • status '+esc(statusLabel(p.status))+'</p></div><div class="xia-base">Performance: '+esc(performanceData()?.updated||'sem base')+'<br>Gestão: '+esc(state.month.label)+'</div></div>'+
    '<div class="xia-role-grid">'+(roleCards||'<div class="xia-empty">Sem performance histórica ligada ao nome deste cadastro.</div>')+'</div>';

  $('xiaMetrics').innerHTML=[
    ['Pesquisas',primary&&sameMonth?Number(primary.r||0):'—',goal?.research_goal?'meta '+goal.research_goal:'sem meta'],
    ['Volume',primary&&sameMonth?primary.c:'—',primary?.role||'sem base'],
    ['Vendas',primary&&sameMonth?primary.s:'—',goal?.sales_goal?'meta '+goal.sales_goal:'sem meta'],
    ['Conversão',primary&&sameMonth?pct(conv):'—','base disponível'],
    ['Qualificação',primary&&sameMonth?pct(qual):'—','Q / volume'],
    ['Consistência',primary&&sameMonth?consistency.label:'—',consistency.score!=null?consistency.score+'/100':'sem amostra']
  ].map(x=>'<div class="summary-card"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+esc(x[2])+'</span></div>').join('');

  if($('xiaFeedback'))$('xiaFeedback').innerHTML=xiaFeedbackSummary(primary,sameMonth);

  $('xiaStrengths').innerHTML=xiaList(strengths,'Nenhum ponto forte mensurável foi destacado automaticamente nesta base.');
  $('xiaAttention').innerHTML=xiaList(attention,'Nenhum alerta relevante encontrado pelos critérios atuais.');
  $('xiaConsistency').innerHTML=xiaList(consistencyItems,'Sem dados suficientes.');
  $('xiaActions').innerHTML=xiaList(actions,'Sem ação sugerida.');

  const prompt=buildXiaPrompt({p,goal,team,presenceCounts,one,tasks,agenda,notes,perf,primary,sameMonth,consistency,strengths,attention,actions});
  $('xiaPrompt').value=prompt;
}
function buildXiaPrompt(ctx){
  const {p,goal,team,presenceCounts,one,tasks,agenda,notes,perf,consistency,strengths,attention,actions}=ctx;
  const perfText=(perf?.roles||[]).map(r=>{
    const conv=r.c?r.s/r.c*100:0,qual=r.c?r.q/r.c*100:0,cost=r.c?r.g/r.c:0;
    const dc=dailyConsistency(r);
    return '- '+r.role+': volume '+r.c+', vendas '+r.s+', conversão '+pct(conv)+', VGV '+money(r.v)+', Q '+r.q+', NQ '+r.nq+', qualificação '+pct(qual)+', custo/volume '+money(cost)+', dias com produção '+dc.activeDays+', consistência '+dc.label+'.';
  }).join('\n')||'- Sem performance ligada a este cadastro.';

  const oneText=one.slice(0,5).map(x=>'- '+dateBr(x.meeting_date)+' | '+(x.topic||'Olho no Olho')+' | compromissos: '+(x.commitments||'não registrados')).join('\n')||'- Nenhum Olho no Olho no mês.';
  const taskText=tasks.filter(t=>t.status==='open').map(t=>'- '+t.priority+' | '+t.title+(t.due_date?' | prazo '+dateBr(t.due_date):'')).join('\n')||'- Nenhuma pendência aberta.';
  const agendaText=agenda.filter(a=>a.status==='scheduled').map(a=>'- '+dateBr(a.event_date)+' '+time5(a.start_time)+' | '+a.title).join('\n')||'- Nenhum compromisso individual em aberto.';
  const notesText=notes.slice(0,8).map(n=>'- '+dateBr(n.happened_on)+' | '+n.category+' | '+n.note).join('\n')||'- Nenhuma anotação adicional.';

  return [
    'XIA — DOSSIÊ DE INTELIGÊNCIA ANALÍTICA DO PROFISSIONAL',
    'Objetivo: analisar o profissional com profundidade usando apenas os fatos abaixo. Não invente motivos, traços de personalidade, saúde, intenção ou contexto que não estejam nos dados. Separe claramente FATO, HIPÓTESE A VALIDAR e RECOMENDAÇÃO.',
    '',
    'PROFISSIONAL',
    'Nome: '+p.full_name,
    'Função: '+roleOf(p),
    'Equipe: '+(team?.name||'Sem equipe'),
    'Horário combinado: '+effectiveStart(p),
    'Status: '+statusLabel(p.status),
    'Mês de referência da gestão: '+state.month.label,
    'Base de performance disponível: '+(performanceData()?.updated||'não informada'),
    '',
    'METAS DO MÊS',
    'Pesquisas: '+(goal?.research_goal||0),
    'Volume/casais/atendimentos: '+(goal?.couples_goal||0),
    'Vendas: '+(goal?.sales_goal||0),
    'VGV: '+money(goal?.vgv_goal||0),
    '',
    'PERFORMANCE POR FUNÇÃO',
    perfText,
    '',
    'REGISTRO OPERACIONAL',
    'Compareceu: '+presenceCounts.present,
    'Não compareceu: '+presenceCounts.absent,
    'Chegou após combinado: '+presenceCounts.late,
    'Outros registros: '+presenceCounts.other,
    '',
    'OLHO NO OLHO',
    oneText,
    '',
    'PENDÊNCIAS',
    taskText,
    '',
    'AGENDA INDIVIDUAL',
    agendaText,
    '',
    'ANOTAÇÕES',
    notesText,
    '',
    'PRÉ-LEITURA DO XIA',
    'Forças detectadas: '+(strengths.map(x=>x.title+' — '+x.text).join(' | ')||'nenhuma destacada automaticamente'),
    'Pontos de atenção: '+(attention.map(x=>x.title+' — '+x.text).join(' | ')||'nenhum alerta pelos critérios atuais'),
    'Consistência: '+consistency.label+(consistency.score!=null?' ('+consistency.score+'/100)':''),
    'Ações sugeridas: '+actions.map(x=>x.title+' — '+x.text).join(' | '),
    '',
    'FAÇA A ANÁLISE EM 8 PARTES:',
    '1. Resumo executivo do profissional.',
    '2. Onde está indo bem e quais evidências sustentam isso.',
    '3. Onde está errando ou perdendo resultado e quais evidências sustentam isso.',
    '4. Consistência: o que é estável e o que oscila.',
    '5. Relação entre volume, qualidade, conversão, vendas e VGV.',
    '6. Pontos que precisam ser investigados no próximo Olho no Olho — formule perguntas, não presuma causas.',
    '7. Plano de ação objetivo para os próximos 7 e 30 dias, com métricas.',
    '8. O que a liderança deve acompanhar sem transformar a análise em decisão automática sobre a pessoa.',
    '',
    'Importante: quando os dados forem insuficientes ou de períodos diferentes, diga explicitamente. Não trate correlação como causa.'
  ].join('\n');
}
async function copyXIA(){
  const text=$('xiaPrompt').value;
  if(!text)return;
  try{await navigator.clipboard.writeText(text);toast('Dossiê XIA copiado para a IA.');}
  catch(_){$('xiaPrompt').focus();$('xiaPrompt').select();document.execCommand('copy');toast('Dossiê XIA copiado.');}
}

async function newMonth(){
  const now=new Date();now.setMonth(now.getMonth()+1,1);
  const suggested=localDate(now).slice(0,7);
  const ref=prompt('Novo mês no formato AAAA-MM:',suggested);
  if(!/^\d{4}-\d{2}$/.test(ref||'')){if(ref)toast('Formato inválido. Use AAAA-MM.',true);return;}
  const [y,m]=ref.split('-').map(Number);
  if(m<1||m>12){toast('Mês inválido. Escolha entre 01 e 12.',true);return;}
  const date=ref+'-01';
  const label=new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,s=>s.toUpperCase());

  try{
    let existing=state.months.find(x=>x.ref_month===date);
    if(!existing){
      const rows=await rest('ceo_months?select=*&ref_month=eq.'+encodeURIComponent(date)+'&limit=1');
      existing=rows[0]||null;
    }
    if(existing){
      if(!state.months.some(x=>x.id===existing.id)){
        state.months=await rest('ceo_months?select=*&order=ref_month.desc');
        renderMonths(existing.id);
      }
      await selectMonth(existing.id);
      toast(label+' já existe. Abri o mês existente.');
      return;
    }

    await rest('ceo_months',{
      method:'POST',
      headers:{Prefer:'return=representation'},
      body:JSON.stringify({ref_month:date,label,status:'open',created_by:state.user.id})
    });
    state.months=await rest('ceo_months?select=*&order=ref_month.desc');
    const created=state.months.find(x=>x.ref_month===date);
    renderMonths(created?.id);
    if(created)await selectMonth(created.id);
    toast('Novo mês criado: '+label+'.');
  }catch(err){
    if(/duplicate key|ceo_months_ref_month_key|23505/i.test(String(err?.message||err))){
      state.months=await rest('ceo_months?select=*&order=ref_month.desc');
      const existing=state.months.find(x=>x.ref_month===date);
      renderMonths(existing?.id);
      if(existing)await selectMonth(existing.id);
      toast(label+' já existia. Abri o mês existente.');
      return;
    }
    toast(err.message,true);
  }
}

function setTab(id){
  document.querySelectorAll('.ceo-tab').forEach(s=>s.classList.toggle('on',s.id===id));
  document.querySelectorAll('#ceoNav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  $('ceoTitle').textContent=TITLES[id]?.[0]||id;
  $('ceoSubtitle').textContent=TITLES[id]?.[1]||'';
  if(id==='today')renderTodayExecutive();
  if(id==='goals'){renderMonthGoals();renderTeamGoalDistribution();}
  if(id==='people')renderProfessionalProfile();
  if(id==='reports')renderReports();
  if(id==='approvals')loadApprovals();
  if(id==='agenda')renderAgenda();
  if(id==='strategy')renderStrategy();
  if(id==='xia')renderXIA();
}
function bind(){
  document.querySelectorAll('#ceoNav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $('monthSelect').onchange=()=>selectMonth($('monthSelect').value);
  $('todayDate').onchange=loadToday;
  $('todayArea').onchange=()=>{
    state.todayArea=$('todayArea').value||'promotor';
    renderToday();
  };
  $('reloadToday').onclick=loadToday;
  $('quickPresenceSearch').oninput=renderQuickPresenceSearch;
  $('quickPresenceSearch').onfocus=renderQuickPresenceSearch;
  $('quickPresenceClear').onclick=quickPresenceClear;
  $('quickPresenceStatus').onchange=syncQuickPresenceArrival;
  $('saveQuickPresenceBtn').onclick=saveQuickPresence;
  $('markAllPresentBtn').onclick=markAllPresent;
  $('saveDayBtn').onclick=saveDay;
  if($('addTeamBtn'))$('addTeamBtn').onclick=addTeam;
  if($('ensureDefaultTeamsBtn'))$('ensureDefaultTeamsBtn').onclick=ensureDefaultTeams;
  $('addPersonBtn').onclick=()=>openPersonModal();
  $('closePersonModal').onclick=closePersonModal;
  $('cancelPersonModal').onclick=closePersonModal;
  $('savePersonBtn').onclick=savePerson;
  $('personModal').addEventListener('click',e=>{if(e.target===$('personModal'))closePersonModal();});
  $('profilePerson').onchange=renderProfessionalProfile;
  document.querySelectorAll('[data-profession-area]').forEach(b=>b.onclick=async()=>{
    state.professionalArea=b.dataset.professionArea||'promotor';
    fillPeopleSelects();
    renderPeople();
    await renderProfessionalProfile();
  });
  $('profileOpenXia').onclick=()=>{
    const id=$('profilePerson').value;if(!id)return;
    $('xiaPerson').value=id;setTab('xia');renderXIA();
  };
  $('profileOpenOne').onclick=()=>{
    const id=$('profilePerson').value;if(!id)return;
    $('onePerson').value=id;setTab('one');
  };
  $('profileEdit').onclick=()=>{
    const id=$('profilePerson').value;if(id)openPersonModal(personById(id));
  };
  $('saveOneBtn').onclick=saveOne;
  $('saveStrategyBtn').onclick=saveStrategy;
  $('strategyTypeFilter').onchange=()=>{state.strategyTypeFilter=$('strategyTypeFilter').value;renderStrategy();};
  $('strategyStatusFilter').onchange=()=>{state.strategyStatusFilter=$('strategyStatusFilter').value;renderStrategy();};
  $('saveAgendaBtn').onclick=saveAgenda;
  $('saveTaskBtn').onclick=saveTask;
  $('refreshReports').onclick=renderReports;
  $('copyReportBtn').onclick=copyReport;
  document.querySelectorAll('[data-report-period]').forEach(b=>b.onclick=()=>{
    state.reportPeriod=b.dataset.reportPeriod||'month';
    renderReports();
  });
  $('refreshApprovals').onclick=loadApprovals;
  $('monthGoalsBtn').onclick=()=>setTab('goals');
  $('openMonthGoalsFromBook').onclick=openMonthGoals;
  $('closeMonthGoalModal').onclick=closeMonthGoals;
  $('cancelMonthGoalModal').onclick=closeMonthGoals;
  $('saveMonthGoalsBtn').onclick=saveMonthGoals;
  $('monthGoalModal').addEventListener('click',e=>{if(e.target===$('monthGoalModal'))closeMonthGoals();});
  $('newMonthBtn').onclick=newMonth;
  $('ceoLogout').onclick=signOut;
  $('xiaPerson').onchange=()=>{state.xiaRole='';renderXIA();};
  $('xiaRole').onchange=()=>{state.xiaRole=$('xiaRole').value||'';renderXIA();};
  $('refreshXia').onclick=renderXIA;
  $('askRaioBtn').onclick=answerRaioXQuestion;
  $('raioQuestion').addEventListener('keydown',e=>{if(e.key==='Enter')answerRaioXQuestion();});
  document.querySelectorAll('[data-raio-question]').forEach(b=>b.onclick=()=>{
    $('raioQuestion').value=b.dataset.raioQuestion||b.textContent;
    answerRaioXQuestion();
  });
  $('copyXiaBtn').onclick=copyXIA;
}
async function init(){
  const loading=$('ceoLoading'), app=$('ceoApp');
  const watchdog=setTimeout(()=>{if(loading&&loading.style.display!=='none')loading.innerHTML='<div class="loader-mark">RX</div><b>A validação demorou mais que o esperado.</b><button class="primary small" onclick="location.reload()">Tentar novamente</button><a href="./" style="color:#18e7ff;font-size:11px">Voltar ao RAIO X</a>';},8000);
  try{
    await validateCEO();
    clearTimeout(watchdog);
    if(loading)loading.style.display='none';
    if(app)app.hidden=false;
    $('ceoUserName').textContent=state.admin.display_name||'CEO';
    $('ceoUserEmail').textContent=state.user.email||'';
    $('todayDate').value=localDate();
    if($('todayArea')){$('todayArea').value=state.todayArea;}
    syncProfessionalAreaUi();
    $('oneDate').value=localDate();
    if($('agendaDate'))$('agendaDate').value=localDate();
    if($('strategyDate'))$('strategyDate').value=localDate();
    bind();
    loadBase().catch(err=>{console.error('Falha ao carregar dados do Portal',err);toast('Portal abriu, mas alguns dados não carregaram: '+err.message,true);});
  }catch(err){
    clearTimeout(watchdog);
    if(app)app.hidden=true;
    loading.style.display='';
    loading.innerHTML='<div class="loader-mark">RX</div><b>'+esc(err.message)+'</b><a href="./" style="color:#18e7ff;font-size:11px">Voltar ao RAIO X</a>';
  }
}
document.addEventListener('DOMContentLoaded',init);
if($('xiaInterpretBtn'))$('xiaInterpretBtn').onclick=xiaInterpretCommand;
if($('xiaHistoryBtn'))$('xiaHistoryBtn').onclick=xiaLoadHistory;
if($('refreshOperationalHistory'))$('refreshOperationalHistory').onclick=loadOperationalHistory;
if($('opHistorySearch'))$('opHistorySearch').oninput=renderOperationalHistory;
if($('opHistoryStatus'))$('opHistoryStatus').onchange=renderOperationalHistory;
})();