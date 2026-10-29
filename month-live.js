(()=>{
  const cfg=window.RAIOX_AUTH_CONFIG||{};
  const $=id=>document.getElementById(id);
  const num=v=>Number(v||0);
  const fmtInt=v=>Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(num(v));
  const fmtMoney=v=>'R$ '+Intl.NumberFormat('pt-BR',{notation:num(v)>=1e6?'compact':'standard',maximumFractionDigits:num(v)>=1e6?1:0}).format(num(v));
  const fmtMoneyFull=v=>'R$ '+Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(num(v));
  const pct=(a,b)=>b>0?(a/b*100):0;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function rest(path,token){
    const res=await fetch(cfg.url+'/rest/v1/'+path,{
      headers:{apikey:cfg.key,Authorization:'Bearer '+(token||cfg.key),Accept:'application/json'}
    });
    if(!res.ok)throw new Error('Falha ao carregar o mês atual.');
    return res.json();
  }

  function areaRole(){
    const key=new URLSearchParams(location.search).get('area')||'promotor';
    return key==='liner'?'Liner / Consultor':key==='closer'?'Closer / Fechador':'Promotor de Marketing';
  }

  function sum(rows,key){return rows.reduce((a,r)=>a+num(r[key]),0);}
  function aggregate(rows){
    return {
      researches:sum(rows,'researches'),
      couples:sum(rows,'couples'),
      sales:sum(rows,'sales'),
      vgv:sum(rows,'vgv'),
      q:sum(rows,'q'),
      nq:sum(rows,'nq'),
      gifts:sum(rows,'gifts'),
      week_volume:sum(rows,'week_volume'),
      week_sales:sum(rows,'week_sales'),
      week_vgv:sum(rows,'week_vgv')
    };
  }

  function goalCard(cls,icon,label,current,goal,formatter,id){
    const p=Math.min(100,pct(current,goal));
    return '<article class="goal-card '+cls+'">'+
      '<div class="goal-icon">'+icon+'</div>'+
      '<div class="goal-copy"><strong>'+formatter(goal)+'</strong><b>'+label+'</b>'+
      '<small>'+formatter(current)+' / '+formatter(goal)+' • '+p.toFixed(1).replace('.',',')+'%</small></div>'+
      '<div class="goal-track"><i id="'+id+'" style="width:'+p+'%"></i></div></article>';
  }

  function updateGoalHero(month,rows){
    const prom=rows.filter(r=>r.role==='Promotor de Marketing');
    const a=aggregate(prom);
    const conv=a.couples>0?a.sales/a.couples*100:0;
    const ticket=a.sales>0?a.vgv/a.sales:0;
    const kpi=(cls,icon,label,value,meta,p)=>'<article class="goal-card '+cls+'"><div class="goal-icon">'+icon+'</div><div class="goal-copy"><b>'+label+'</b><strong>'+value+'</strong><small>'+meta+'</small></div><div class="goal-track"><i style="width:'+Math.min(100,Math.max(0,p||0))+'%"></i></div></article>';
    const grid=document.querySelector('.goal-grid');
    if(grid){
      grid.classList.add('live-month-goals','entry-kpis');
      grid.innerHTML=
        kpi('cyan-goal','●','CASAIS',fmtInt(a.couples),'META: '+fmtInt(month.goal_couples),pct(a.couples,num(month.goal_couples)))+
        kpi('green-goal','◆','VENDAS',fmtInt(a.sales),'META: '+fmtInt(month.goal_sales),pct(a.sales,num(month.goal_sales)))+
        kpi('gold-goal','▥','VGV',fmtMoneyFull(a.vgv),'META: '+fmtMoneyFull(month.goal_vgv),pct(a.vgv,num(month.goal_vgv)))+
        kpi('purple-goal','◎','CONVERSÃO',conv.toFixed(1).replace('.',',')+'%','META: 25%',conv/25*100)+
        kpi('pink-goal','★','TICKET MÉDIO',fmtMoneyFull(ticket),'VGV ÷ VENDAS',100);
      const meta=document.createElement('div');
      meta.className='official-goal-strip';
      meta.innerHTML='<div><small>META OFICIAL DO MÊS</small><b>'+esc(month.label).toUpperCase()+'</b></div><div><strong>'+fmtInt(month.goal_couples)+'</strong><span>CASAIS</span></div><div><strong>'+fmtInt(month.goal_sales)+'</strong><span>VENDAS</span></div><div><strong>'+fmtMoneyFull(month.goal_vgv)+'</strong><span>VGV</span></div><i style="--progress:'+Math.min(100,pct(a.vgv,num(month.goal_vgv)))+'%"></i>';
      grid.appendChild(meta);
    }
    const label=document.querySelector('.mission-label b'); if(label)label.textContent='DADOS OFICIAIS • TEMPO REAL • '+month.label.toUpperCase();
    const captain=captainScores(rows,month);
    const leader=captain.leaders[0]||null;
    const monthLeader=[...prom].sort((x,y)=>num(y.couples)-num(x.couples)||num(y.sales)-num(x.sales))[0];
    const winner=[...prom].filter(x=>num(x.couples)>=22).sort((x,y)=>num(y.couples)-num(x.couples))[0];
    if($('missionText')){ const snap=prom[0]?.snapshot_at?new Date(prom[0].snapshot_at):null; const stamp=snap&&!isNaN(snap)?snap.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):String(prom[0]?.updated_on||'—').split('-').reverse().join('/'); $('missionText').innerHTML='<b>DADOS OFICIAIS</b> • '+esc(month.label)+' • atualizado em '+esc(stamp); }
    if($('heroLeaderName'))$('heroLeaderName').textContent=leader?.n||'Aguardando resultado semanal';
    if($('heroLeaderSub'))$('heroLeaderSub').textContent=leader?'CAPITÃO DA SEMANA • '+fmtInt(leader.w)+' CASAIS • '+captain.week.label:'CAPITÃO DA SEMANA • '+captain.week.label+' • SEM DADOS';
    if($('iCap'))$('iCap').textContent=leader?leader.n+' • '+fmtInt(leader.w)+' casais':'Aguardando dados da semana';
    if($('i22'))$('i22').textContent=winner?winner.professional_name+' • VENCEDOR':monthLeader?monthLeader.professional_name+' • '+fmtInt(monthLeader.couples)+'/22':'—';
    const days=Math.max(1,...prom.map(r=>Number(String(r.updated_on||'').slice(8,10))||0));
    const daysInMonth=new Date(Number(month.ref_month.slice(0,4)),Number(month.ref_month.slice(5,7)),0).getDate();
    if($('iProj'))$('iProj').textContent=fmtInt(a.couples>0?Math.round(a.couples/days*daysInMonth):0)+' casais';
  }

  function currentMonthEmpty(month){
    const empty='<div class="current-month-empty"><b>'+(month.status==='closed'?'Histórico de '+esc(month.label):esc(month.label)+' iniciou')+'</b>'+(month.status==='closed'?'Nenhum resultado foi encontrado para este mês.':'Nenhum resultado de performance foi lançado neste mês ainda.')+'</div>';
    const goalC=num(month.goal_couples),goalS=num(month.goal_sales),goalV=num(month.goal_vgv);

    if($('dk'))$('dk').innerHTML=[
      ['Casais','0','Meta '+fmtInt(goalC)],
      ['Vendas','0','Meta '+fmtInt(goalS)],
      ['VGV','R$ 0','Meta '+fmtMoney(goalV)]
    ].map(x=>'<div class="card kpi"><small>'+x[0]+'</small><b class="c">'+x[1]+'</b><span class="muted">'+x[2]+'</span></div>').join('');

    if($('todayOps'))$('todayOps').innerHTML='<div class="ops-pad">'+empty+'</div>';
    if($('metaPace'))$('metaPace').innerHTML='<div class="ops-pad"><div class="ops-head"><div><span class="ops-kicker">META DO MÊS</span><h3>'+esc(month.label)+'</h3></div></div>'+
      '<div class="pace-summary">'+
      '<div class="pace-box"><small>Casais</small><b class="c">'+fmtInt(goalC)+'</b><span>faltam '+fmtInt(goalC)+'</span></div>'+
      '<div class="pace-box"><small>Vendas</small><b class="g">'+fmtInt(goalS)+'</b><span>faltam '+fmtInt(goalS)+'</span></div>'+
      '<div class="pace-box"><small>VGV</small><b class="v">'+fmtMoney(goalV)+'</b><span>faltam '+fmtMoney(goalV)+'</span></div></div></div>';
    if($('dailyEvolution'))$('dailyEvolution').innerHTML='<div class="ops-pad">'+empty+'</div>';

    ['radarCaptain','radarVgv','radarCouples','arenaX','free','top','di'].forEach(id=>{if($(id))$(id).innerHTML=empty;});
    const radarMini=document.querySelector('#radar .radar-head .mini'); if(radarMini)radarMini.textContent='Base de '+month.label+' • sem lançamentos ainda';
    document.querySelectorAll('#radar .battle-title span').forEach(x=>x.textContent='mês atual');

    if($('rb'))$('rb').innerHTML='<tr><td colspan="11"><div class="current-month-empty">Nenhum ranking de '+esc(month.label)+' ainda.</div></td></tr>';
    if($('rm'))$('rm').disabled=true;

    ['sel','psel','dsel','fxSel'].forEach(id=>{
      const el=$(id); if(!el)return; el.innerHTML='<option>'+esc(month.label)+' • sem dados</option>'; el.disabled=true;
    });

    const blanks={
      ik:empty,cc:empty,cg:'',fxKpis:empty,fxChart:empty,fxDriver:empty,fxPositive:empty,fxNegative:empty,fxUnknown:empty,fxDaily:empty,fxConclusion:empty,
      diagOps:empty,diagOperationAttention:empty,diagPeopleAttention:empty,diagWeak:empty,diagAction:empty,
      pb:empty,ab:empty,ib:empty,cb:empty,pi:empty,sc:empty,tg:empty,ck:empty,cob:empty,ci:empty
    };
    Object.entries(blanks).forEach(([id,html])=>{if($(id))$(id).innerHTML=html;});
    if($('fxValidation'))$('fxValidation').textContent='SEM DADOS DE '+month.label.toUpperCase();
    if($('fxName'))$('fxName').textContent='—';
    const hero=document.querySelector('#perfil .hero');
    if(hero)hero.innerHTML='<div class="eye">PERFIL DO MÊS</div><h3>'+esc(month.label)+'</h3><p>O perfil de casais será exibido quando a base deste mês for carregada.</p>';
  }

  function updateCurrentMonthLabels(month){
    const historical=month.status==='closed';
    const rankMini=document.querySelector('#rank .title .mini');
    if(rankMini)rankMini.textContent=(historical?'Histórico':'Base atual')+' • '+month.label;
    const fxTitle=document.querySelector('.fx-daily-wrap .fx-title h3');
    if(fxTitle)fxTitle.textContent='Calendário de evidências • '+month.label;
    const foot=document.querySelector('aside .foot');
    if(foot){
      [...foot.childNodes].forEach(n=>{
        if(n.nodeType===3&&/(Base oficial|Base atual|Histórico)/i.test(n.textContent||'')){
          n.textContent=(historical?'Histórico':'Base atual')+' • '+month.label+' ';
        }
      });
    }
    if($('monthCurrentLabel'))$('monthCurrentLabel').textContent=month.label+(historical?' • fechado':'');
    if(!historical){
      const projectionHead=document.querySelector('#rank thead th:nth-child(10)');
      if(projectionHead)projectionHead.textContent='Proj. '+month.label;
      const weekTitle=$('radarWeekTitle');
      const weekRange=weekTitle?.parentElement?.querySelector('span');
      if(weekRange)weekRange.textContent=month.label;
      const rankStatus=$('rankStatusHead');
      if(rankStatus&&areaRole()!=='Promotor de Marketing')rankStatus.textContent='Dias ativos';
    }
  }

  function fillMonthSelector(months,selectedRef){
    const select=$('monthCurrentSelect');
    if(!select)return;
    select.innerHTML=months.map(m=>'<option value="'+esc(m.ref_month)+'">'+esc(m.label)+(m.status==='closed'?' • fechado':'')+'</option>').join('');
    select.value=selectedRef;
    select.onchange=()=>{
      try{sessionStorage.setItem('raiox.view.month.v1',select.value);}catch(_){}
      const u=new URL(location.href); u.searchParams.set('month',select.value); location.href=u.toString();
    };
  }


  function daysInRefMonth(ref){
    const y=Number(ref.slice(0,4)),m=Number(ref.slice(5,7));
    return new Date(y,m,0).getDate();
  }
  function elapsedForMonth(month){
    const total=daysInRefMonth(month.ref_month);
    if(month.status==='closed')return total;
    const now=new Date();
    const y=Number(month.ref_month.slice(0,4)),m=Number(month.ref_month.slice(5,7));
    if(now.getFullYear()===y&&now.getMonth()+1===m)return Math.max(1,Math.min(total,now.getDate()));
    return total;
  }
  function legacyPerson(row,month){
    const elapsed=elapsedForMonth(month),totalDays=daysInRefMonth(month.ref_month);
    return {
      n:row.professional_name,
      r:row.role,
      e:1,
      research:num(row.researches),
      c:num(row.couples),
      s:num(row.sales),
      v:num(row.vgv),
      q:num(row.q),
      nq:num(row.nq),
      g:num(row.gifts),
      d:num(row.active_days),
      w:num(row.week_volume),
      ws:num(row.week_sales),
      wv:num(row.week_vgv),
      p:Math.round(num(row.couples)/Math.max(1,elapsed)*totalDays),
      daily:Array.isArray(row.daily)?row.daily:[]
    };
  }
  // Capitão: semana civil de segunda a domingo, no horário de Brasília.
  function captainWeek(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=k=>Number(parts.find(p=>p.type===k)?.value||0);
    const today=new Date(Date.UTC(get('year'),get('month')-1,get('day')));
    const monday=new Date(today);monday.setUTCDate(today.getUTCDate()-((today.getUTCDay()+6)%7));
    const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);
    const iso=d=>d.toISOString().slice(0,10);
    return {start:iso(monday),end:iso(sunday),label:monday.toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'2-digit'})+' a '+sunday.toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'2-digit'})};
  }
  function captainScores(rows,month){
    const week=captainWeek();
    // Nunca usar totais de uma semana anterior como se fossem da atual.
    if(month.ref_month.slice(0,7)!==week.start.slice(0,7))return {week,leaders:[]};
    const leaders=rows.filter(r=>r.role==='Promotor de Marketing' && !(/manara\s+alexandre\s+sousa/i.test(r.professional_name)&&month.ref_month==='2026-10-01')).map(r=>{
      const daily=Array.isArray(r.daily)?r.daily:[];
      let w=0,ws=0,wv=0,hasDaily=false;
      for(let i=0;i<daily.length;i++){
        const day=month.ref_month.slice(0,7)+'-'+String(i+1).padStart(2,'0');
        if(day<week.start||day>week.end||!Array.isArray(daily[i]))continue;
        hasDaily=true;w+=num(daily[i][0]);ws+=num(daily[i][1]);wv+=num(daily[i][2]);
      }
      if(!hasDaily&&String(r.updated_on||'')>=week.start&&String(r.updated_on||'')<=week.end){
        w=num(r.week_volume);ws=num(r.week_sales);wv=num(r.week_vgv);
      }
      return {n:r.professional_name,w,ws,wv};
    }).filter(p=>p.w>0).sort((a,b)=>b.w-a.w||b.ws-a.ws||b.wv-a.wv||a.n.localeCompare(b.n,'pt-BR'));
    return {week,leaders};
  }
  function dynamicPeople(rows,month){
    return rows.map(r=>legacyPerson(r,month)).sort((a,b)=>b.c-a.c||b.s-a.s||b.v-a.v);
  }
  function aggregatePeople(people){
    return people.reduce((a,p)=>{
      a.research+=p.research;a.c+=p.c;a.s+=p.s;a.v+=p.v;a.q+=p.q;a.nq+=p.nq;a.g+=p.g;
      a.w+=p.w;a.ws+=p.ws;a.wv+=p.wv;
      return a;
    },{research:0,c:0,s:0,v:0,q:0,nq:0,g:0,w:0,ws:0,wv:0});
  }
  let officialDaily=[];
  let currentPerformanceRows=[];
  function dynamicDaily(people,month){
    if(areaRole()==='Promotor de Marketing'&&officialDaily.length){const days=daysInRefMonth(month.ref_month),by=new Map(officialDaily.map(r=>[Number(String(r.work_date).slice(8,10)),r]));return Array.from({length:days},(_,i)=>{const r=by.get(i+1);return [i+1,num(r?.couples),num(r?.sales),num(r?.vgv),num(r?.q),num(r?.nq)];});}
    const days=daysInRefMonth(month.ref_month);
    return Array.from({length:days},(_,i)=>{
      const sum=people.reduce((a,p)=>{
        const r=p.daily?.[i]||[];
        a[0]+=num(r[0]);a[1]+=num(r[1]);a[2]+=num(r[2]);a[3]+=num(r[3]);a[4]+=num(r[4]);
        return a;
      },[0,0,0,0,0]);
      return [i+1,...sum];
    });
  }
  function dynamicBars(id,items,fmt=v=>fmtInt(v)){
    const el=$(id);if(!el)return;
    const max=Math.max(1,...items.map(x=>num(x[1])));
    el.innerHTML=items.map(([name,value])=>'<div class="br"><label>'+esc(name)+'</label><div class="bar"><i style="width:'+(num(value)/max*100)+'%"></i></div><b>'+fmt(value)+'</b></div>').join('');
  }
  async function shareFullRanking(rows,month,sortLabel){
    if(!rows.length)throw Error('Ranking sem profissionais para compartilhar');
    const W=1800,H=430+rows.length*96+150,scale=1;
    const canvas=document.createElement('canvas');canvas.width=W*scale;canvas.height=H*scale;
    const x=canvas.getContext('2d');if(!x)throw Error('Canvas indisponível');
    const rect=(px,py,w,h,fill,r=0)=>{x.fillStyle=fill;x.beginPath();x.roundRect(px,py,w,h,r);x.fill()};
    const text=(v,px,py,size=28,color='#fff',weight='500',max)=>{x.fillStyle=color;x.font=weight+' '+size+'px Arial, sans-serif';x.textAlign='left';x.fillText(String(v),px,py,max)};
    const grad=x.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#08142d');grad.addColorStop(0.6,'#121d41');grad.addColorStop(1,'#0a1026');rect(0,0,W,H,grad);
    const gold=x.createLinearGradient(0,0,650,0);gold.addColorStop(0,'#ffe7a4');gold.addColorStop(1,'#e7aa36');
    rect(35,35,W-70,H-70,'#53628a',28);rect(38,38,W-76,H-76,'#0b1630',26);
    text('RAIO',90,134,78,'#ffffff','900');text('X',308,134,94,'#ffc950','900');
    text('CAPTAÇÃO  •  PERFORMANCE',90,172,24,'#a9bde7','700');
    text('RANKING COMPLETO',510,130,67,'#ffffff','900');
    text(String(month.label||'OUTUBRO/2026').toUpperCase()+'  |  ORDEM: '+sortLabel.toUpperCase(),515,178,27,'#e7c57c','700');
    text('DISCIPLINA   •   FOCO   •   RESULTADO',W-660,230,27,'#b6c9f0','700');
    const total=key=>rows.reduce((s,p)=>s+Number(p[key]||0),0);
    const cards=[['PROFISSIONAIS',fmtInt(rows.length)],['CASAIS ATIVOS',fmtInt(total('c'))],['VENDAS ATIVAS',fmtInt(total('s'))],['VGV DOS ATIVOS',fmtMoneyFull(total('v'))]];
    cards.forEach(([label,val],i)=>{const xx=75+i*420;rect(xx,263,402,125,'#182b50',18);rect(xx,263,402,3,i===3?'#ffc65b':'#587ad5',2);text(label,xx+24,306,22,'#b4c9f5','700');text(val,xx+24,365,i===3?35:52,'#ffffff','900',355)});
    const cols=[['#',87],['PROFISSIONAL',180],['CASAIS',850],['VENDAS',975],['VGV',1095],['CONVERSÃO',1370],['CONQUISTA',1570]];
    rect(65,412,W-130,67,'#293b69',12);cols.forEach(([t,px])=>text(t,px,455,24,'#d7e5ff','700'));
    rows.forEach((p,i)=>{
      const yy=487+i*96;rect(65,yy,W-130,88,i%2?'#101d39':'#1a2a4a',10);
      if(i<3)rect(65,yy,7,88,i===0?'#f8c75e':i===1?'#c4d1e8':'#c48e6e',3);
      text(i===0?'1º':i===1?'2º':i===2?'3º':String(i+1)+'º',87,yy+54,31,i<3?'#ffd680':'#e7ecff','900');
      const full=String(p.n||'').trim();text(full,180,yy+39,29,'#fff','800',635);
      text('PROMOTOR DE MARKETING',180,yy+72,17,'#a8bee8','500');
      text(fmtInt(p.c),850,yy+54,34,'#ffffff','800');
      text(fmtInt(p.s),975,yy+54,32,'#ffffff','800');
      text(fmtMoneyFull(p.v),1095,yy+54,29,'#ffffff','800',245);
      text((p.c?p.s/p.c*100:0).toFixed(1).replace('.',',')+'%',1370,yy+54,30,'#ffffff','700');
      const tier=p.c>=50?50:p.c>=35?35:p.c>=22?22:0;
      const tag=tier===50?'50  SUPER META':tier===35?'35  META AVANÇADA':tier===22?'22  META BATIDA':'EM EVOLUÇÃO';
      const tagColor=tier===50?'#7a551a':tier===35?'#4b2c78':tier===22?'#0f5546':'#293754';
      rect(1555,yy+21,170,48,tagColor,14);text(tag,1566,yy+52,tier?17:19,tier?'#fff1b4':'#d1dcf3','800',150);
    });
    const fy=500+rows.length*96;rect(65,fy,W-130,76,'#1b2d50',15);
    text('METAS:  22 CASAIS  •  35 CASAIS  •  50 CASAIS',95,fy+48,27,'#f5d48c','800');
    text('DADOS DO RAIO X  |  APENAS PROFISSIONAIS ATIVOS',910,fy+48,22,'#b7c9ef','700');
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Falha ao gerar PNG');
    const filename='RAIOX-ranking-completo-'+(month.ref_month||'outubro-2026')+'.png';
    if(typeof File!=='undefined'&&navigator.canShare&&navigator.share){
      const file=new File([blob],filename,{type:'image/png'});
      if(navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'Ranking completo RAIO X'});return}catch(err){if(err.name==='AbortError')return}}
    }
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  function dynamicRank(month,people){
    const body=$('rb'),metric=$('rm');if(!body||!metric)return;
    metric.disabled=false;
    const value=(p,key)=>{
      if(key==='weekly')return p.w;
      if(key==='sales')return p.s;
      if(key==='vgv')return p.v;
      if(key==='q')return p.q;
      if(key==='conversion')return p.c?p.s/p.c*100:0;
      if(key==='cost')return p.c?-(p.g/p.c):0;
      if(key==='projection')return p.p;
      return p.c;
    };
    const render=()=>{
      const key=metric.value||'couples';
      const rows=[...people].sort((a,b)=>value(b,key)-value(a,key));
      body.innerHTML=rows.map((p,i)=>{
        const conv=p.c?p.s/p.c*100:0,cost=p.c?p.g/p.c:0;
        const milestone=p.c>=50?{emoji:'🏆',label:'SUPER META 50!',bg:'#423010',fg:'#ffe19a'}:p.c>=35?{emoji:'🥇',label:'META 35 BATIDA!',bg:'#2b2453',fg:'#dfc5ff'}:p.c>=22?{emoji:'🎉',label:'META 22 BATIDA!',bg:'#103f38',fg:'#92f5cf'}:null;
        const achievement=milestone?'<span title="Parabéns! '+milestone.label+'" style="display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:5px 9px;border-radius:999px;background:'+milestone.bg+';color:'+milestone.fg+';font-size:11px;font-weight:800;white-space:nowrap">'+milestone.emoji+' '+milestone.label+'</span>':'';
        return '<tr><td class="pos">'+(['🥇','🥈','🥉'][i]||'#'+(i+1))+'</td>'+
          '<td><div class="person"><div class="av">'+esc(p.n.charAt(0))+'</div><div><b>'+esc(p.n)+'</b><span class="mini">'+esc(p.r)+'</span>'+achievement+'</div></div></td>'+
          '<td><b>'+fmtInt(p.c)+'</b></td><td>'+fmtInt(p.w)+'</td><td>'+fmtInt(p.s)+'</td><td>'+fmtMoneyFull(p.v)+'</td>'+
          '<td>'+conv.toFixed(1).replace('.',',')+'%</td><td>'+fmtInt(p.q)+'</td><td>'+fmtMoneyFull(cost)+'</td><td><b class="v">'+fmtInt(p.p)+'</b></td>'+
          '<td><span class="tag">'+fmtInt(p.d)+' dias ativos</span></td></tr>';
      }).join('');
      const btn=$('raiox-share-full-ranking');if(btn){btn.disabled=false;btn.style.pointerEvents='auto';btn.style.zIndex='999';btn.onclick=async event=>{event.preventDefault();event.stopPropagation();btn.textContent='⏳ Gerando imagem...';try{await shareFullRanking(rows,month,metric.options[metric.selectedIndex]?.text||'Casais');}catch(err){console.error('Falha ao compartilhar ranking',err);alert('Erro ao gerar a imagem: '+(err.message||err));}finally{btn.textContent='📤 Compartilhar ranking completo';}};}
    };
    metric.onchange=render;render();
  }
  function dynamicIndividual(month,people){
    const sel=$('sel'),psel=$('psel'),dsel=$('dsel');if(!sel)return;
    const options=people.map(p=>'<option value="'+esc(p.n)+'">'+esc(p.n)+'</option>').join('');
    [sel,psel,dsel].forEach(x=>{if(x){x.innerHTML=options;x.disabled=false;}});
    const render=()=>{
      const p=people.find(x=>x.n===sel.value)||people[0];if(!p)return;
      const conv=p.c?p.s/p.c*100:0,qual=p.c?p.q/p.c*100:0,cost=p.c?p.g/p.c:0;
      if($('ik'))$('ik').innerHTML=[
        [areaRole()==='Promotor de Marketing'?'Casais':'Atendimentos',p.c,(p.c/Math.max(1,p.d)).toFixed(1).replace('.',',')+'/dia ativo'],
        ['Vendas',p.s,conv.toFixed(1).replace('.',',')+'% conversão'],
        ['VGV',fmtMoneyFull(p.v),p.s?fmtMoneyFull(p.v/p.s)+' ticket':'sem venda'],
        ['Q',p.q,qual.toFixed(1).replace('.',',')+'% qualificação'],
        ['Semana',p.w,p.ws+' venda(s)'],
        ['Projeção',p.p,'fim de '+month.label],
        ['Custo/volume',fmtMoneyFull(cost),'brindes ÷ volume']
      ].map(x=>'<div class="card kpi"><small>'+x[0]+'</small><b class="c">'+x[1]+'</b><span class="muted">'+x[2]+'</span></div>').join('');
      if($('cc'))$('cc').innerHTML='<b>'+esc(p.n)+'</b> está com <b>'+fmtInt(p.c)+'</b> '+(areaRole()==='Promotor de Marketing'?'casais':'atendimentos')+', <b>'+fmtInt(p.s)+'</b> vendas e <b>'+fmtMoneyFull(p.v)+'</b> em VGV no mês '+esc(month.label)+'.';
      if($('cg'))$('cg').innerHTML='<div><small>Conversão</small><b>'+conv.toFixed(1).replace('.',',')+'%</b></div><div><small>Qualificação</small><b>'+qual.toFixed(1).replace('.',',')+'%</b></div><div><small>Dias ativos</small><b>'+fmtInt(p.d)+'</b></div><div><small>Semana</small><b>'+fmtInt(p.w)+'</b></div>';
    };
    sel.onchange=()=>{render();['psel','dsel','fxSel'].forEach(id=>{const el=$(id);if(el&&[...el.options].some(o=>o.value===sel.value)){el.value=sel.value;el.dispatchEvent(new Event('change'));}});};render();
    return {render,options};
  }
  function dynamicProjection(month,people){
    const psel=$('psel');if(!psel)return;
    const totals=aggregatePeople(people),elapsed=elapsedForMonth(month),days=daysInRefMonth(month.ref_month);
    const projection=Math.round(totals.c/Math.max(1,elapsed)*days);
    if($('sc'))$('sc').innerHTML=[
      ['CENÁRIO ATUAL',projection],
      ['+10% PERFORMANCE',Math.round(projection*1.1)],
      ['ALTA PERFORMANCE +25%',Math.round(projection*1.25)]
    ].map((x,i)=>'<div class="card pad sc"><div class="eye">'+x[0]+'</div><b class="'+(i===0?'c':i===1?'v':'g')+'">'+fmtInt(x[1])+'</b><span>'+(areaRole()==='Promotor de Marketing'?'casais':'atendimentos')+' projetados</span></div>').join('');
    const render=()=>{
      const p=people.find(x=>x.n===psel.value)||people[0];if(!p)return;
      if($('projectionTargetTitle'))$('projectionTargetTitle').textContent='Leitura individual • '+areaRole();
      if($('tg'))$('tg').innerHTML=[
        ['Volume',fmtInt(p.c),(p.c/Math.max(1,p.d)).toFixed(1).replace('.',',')+' por dia ativo'],
        ['Conversão',(p.c?p.s/p.c*100:0).toFixed(1).replace('.',',')+'%',p.s+' vendas'],
        ['VGV',fmtMoneyFull(p.v),p.s?fmtMoneyFull(p.v/p.s)+' por venda':'sem venda']
      ].map(x=>'<div class="card pad"><div class="eye">'+x[0]+'</div><b style="font-size:23px">'+x[1]+'</b><span class="muted">'+x[2]+'</span></div>').join('');
    };
    psel.onchange=render;render();
  }
  function dynamicDiagnosis(month,people){
    const dsel=$('dsel');if(!dsel||!people.length)return;
    const totals=aggregatePeople(people);
    const avgC=totals.c/Math.max(1,people.length),avgConv=totals.c?totals.s/totals.c*100:0;
    const render=()=>{
      const p=people.find(x=>x.n===dsel.value)||people[0];
      const conv=p.c?p.s/p.c*100:0,qual=p.c?p.q/p.c*100:0;
      if($('diagName'))$('diagName').textContent=p.n;
      if($('diagTag'))$('diagTag').textContent=month.label+' • '+areaRole()+' • dados do mês selecionado';
      if($('diagOps'))$('diagOps').innerHTML=[
        ['Volume da área',fmtInt(totals.c),'mês'],
        ['Vendas',fmtInt(totals.s),avgConv.toFixed(1).replace('.',',')+'% conversão'],
        ['Q',fmtInt(totals.q),totals.c?(totals.q/totals.c*100).toFixed(1).replace('.',',')+'%':'0%'],
        ['VGV',fmtMoneyFull(totals.v),'mês']
      ].map(x=>'<div class="diag-op"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');
      const reasons=[];
      if(p.c<avgC*.7)reasons.push('Volume abaixo da média da área');
      if(conv<avgConv*.7)reasons.push('Conversão abaixo da média da área');
      if(!p.s&&p.c>=2)reasons.push('Volume sem venda');
      if($('diagOperationCount'))$('diagOperationCount').textContent='Leitura mensal';
      if($('diagOperationAttention'))$('diagOperationAttention').innerHTML='<div class="attention-empty">Média da área: '+avgC.toFixed(1).replace('.',',')+' de volume e '+avgConv.toFixed(1).replace('.',',')+'% de conversão.</div>';
      if($('diagPeopleCount'))$('diagPeopleCount').textContent=(reasons.length?'1 ponto':'0 pontos');
      if($('diagPeopleAttention'))$('diagPeopleAttention').innerHTML=reasons.length?reasons.map(r=>'<div class="attention-empty">'+esc(r)+'</div>').join(''):'<div class="attention-empty">Nenhum alerta simples para este profissional.</div>';
      if($('diagWeak'))$('diagWeak').innerHTML='<div class="diag-item"><div class="diag-item-top"><b>Conversão</b><span class="diag-score">'+conv.toFixed(1).replace('.',',')+'%</span></div><p>Qualificação '+qual.toFixed(1).replace('.',',')+'% • '+fmtInt(p.c)+' de volume.</p></div>';
      if($('diagAction'))$('diagAction').innerHTML='<div class="diag-action-grid"><div><small>LEITURA • '+esc(p.n)+'</small><h3>'+esc(month.label)+'</h3><p>Use os dados do mês selecionado para o acompanhamento 1:1.</p></div></div>';
    };
    dsel.onchange=render;render();
  }
  function dynamicFx(month,people){
    const sel=$('fxSel');if(!sel)return;
    sel.innerHTML=people.map(p=>'<option value="'+esc(p.n)+'">'+esc(p.n)+'</option>').join('');
    sel.disabled=false;
    const mm=month.ref_month.slice(5,7);
    const render=()=>{
      const p=people.find(x=>x.n===sel.value)||people[0];if(!p)return;
      const imported=window.raioxDailyImport?.[month.ref_month]?.[p.n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim()];
      const rows=imported?.rows||p.daily||[];
      const sourceChecked=!!imported;

      const sum=rows.reduce((a,r)=>{a.c+=num(r[0]);a.s+=num(r[1]);a.v+=num(r[2]);a.q+=num(r[3]);a.nq+=num(r[4]);return a;},{c:0,s:0,v:0,q:0,nq:0});
      const consistent=Math.abs(sum.c-p.c)<.01&&(sourceChecked?Math.abs(sum.v-p.v)<.01:Math.abs(sum.s-p.s)<.01);
      if($('fxName'))$('fxName').textContent=p.n;
      if($('fxValidation')){
        $('fxValidation').textContent=consistent?'✓ '+month.label.toUpperCase()+' • DADOS CONFERIDOS':'⚠ SOMA DIÁRIA DIFERE DO TOTAL MENSAL';
        $('fxValidation').className='fx-validate '+(consistent?'ok':'bad');
      }
      if(!rows.length || !consistent){
        const conv=p.c?p.s/p.c*100:0,ticket=p.s?p.v/p.s:0;
        if($('fxValidation')){$('fxValidation').textContent='ℹ HISTÓRICO DIÁRIO INDIVIDUAL INDISPONÍVEL';$('fxValidation').className='fx-validate';}
        if($('fxKpis'))$('fxKpis').innerHTML=[['Volume',p.c,'total mensal oficial'],['Vendas',p.s,conv.toFixed(1).replace('.',',')+'% conversão'],['VGV',fmtMoneyFull(p.v),fmtMoneyFull(ticket)+' ticket'],['Constância','—','sem detalhamento diário']].map(x=>'<div class="fx-kpi"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');
        if($('fxChart'))$('fxChart').innerHTML='<div class="current-month-empty"><b>'+esc(month.label)+' • '+esc(p.n)+'</b>Os totais mensais estão disponíveis, mas o histórico diário individual ainda não foi importado. Não é possível calcular constância ou dias zerados.</div>';
        if($('fxDriver'))$('fxDriver').innerHTML='<small>LEITURA MENSAL</small><h3>Resultado consolidado</h3><p>'+fmtInt(p.c)+' casais, '+fmtInt(p.s)+' vendas e '+conv.toFixed(1).replace('.',',')+'% de conversão.</p>';
        if($('fxPositive'))$('fxPositive').innerHTML='<div class="fx-insight positive"><b>Resultado mensal</b><p>'+fmtInt(p.s)+' vendas registradas.</p></div>';
        if($('fxNegative'))$('fxNegative').innerHTML='<div class="fx-insight unknown"><b>Constância não avaliada</b><p>Não há distribuição diária confiável para identificar dias sem venda.</p></div>';
        if($('fxUnknown'))$('fxUnknown').innerHTML='<div class="fx-insight unknown"><b>Próximo passo</b><p>Importar registros diários individuais para liberar análise de constância.</p></div>';
        if($('fxDaily'))$('fxDaily').innerHTML='';
        if($('fxConclusion'))$('fxConclusion').innerHTML='<h3>Conclusão mensal</h3><p>'+esc(p.n)+' registrou '+fmtInt(p.c)+' casais, '+fmtInt(p.s)+' vendas e '+fmtMoneyFull(p.v)+' em VGV. A análise diária depende da importação do histórico.</p>';
        return;
      }
      const active=rows.filter(r=>num(r[0])>0).length,conv=p.c?p.s/p.c*100:0,ticket=p.s?p.v/p.s:0;
      if($('fxKpis'))$('fxKpis').innerHTML=[
        ['Volume',p.c,(p.c/Math.max(1,active)).toFixed(1).replace('.',',')+' por dia ativo'],
        ['Vendas',p.s,conv.toFixed(1).replace('.',',')+'% conversão'],
        ['VGV',fmtMoneyFull(p.v),fmtMoneyFull(ticket)+' ticket'],
        ['Constância',active+'/'+Math.max(1,rows.length),'dias com volume']
      ].map(x=>'<div class="fx-kpi"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');
      if($('fxChart'))$('fxChart').innerHTML='<div class="current-month-empty"><b>'+esc(month.label)+' • '+esc(p.n)+'</b>Histórico diário conferido: '+active+' dia(s) com casais em '+rows.length+' dias. '+(sourceChecked?'Vendas diárias representam atendimentos com valor; o total mensal de contratos permanece oficial.':'')+'</div>';
      if($('fxDriver'))$('fxDriver').innerHTML='<small>LEITURA PRINCIPAL</small><h3>'+((conv>=20)?'Conversão':'Constância')+'</h3><p>'+fmtInt(p.c)+' de volume, '+fmtInt(p.s)+' vendas e '+conv.toFixed(1).replace('.',',')+'% de conversão.</p>';
      if($('fxPositive'))$('fxPositive').innerHTML='<div class="fx-insight positive"><b>Dias ativos</b><p>'+active+' dias com volume.</p></div>';
      if($('fxNegative'))$('fxNegative').innerHTML='<div class="fx-insight negative"><b>Dias sem venda</b><p>'+rows.filter(r=>num(r[0])>0&&num(r[1])===0).length+' dias tiveram volume e nenhuma venda.</p></div>';
      if($('fxUnknown'))$('fxUnknown').innerHTML='<div class="fx-insight unknown"><b>Contexto</b><p>Confirme folgas, ausências e distribuição antes de concluir sobre dias zerados.</p></div>';
      if($('fxDaily'))$('fxDaily').innerHTML=rows.map((r,i)=>'<div class="fx-day"><div class="fx-day-top"><b>'+String(i+1).padStart(2,'0')+'/'+mm+'</b></div><div class="fx-day-metrics"><div><small>Volume</small><b>'+fmtInt(r[0])+'</b></div><div><small>Vendas</small><b>'+fmtInt(r[1])+'</b></div><div><small>VGV</small><b>'+fmtMoneyFull(r[2])+'</b></div></div></div>').join('');
      if($('fxConclusion'))$('fxConclusion').innerHTML='<h3>Conclusão para conversa</h3><p>'+esc(p.n)+' fechou '+esc(month.label)+' com '+fmtInt(p.c)+' de volume, '+fmtInt(p.s)+' vendas e '+fmtMoneyFull(p.v)+' em VGV.</p>';
    };
    sel.onchange=render;window.raioxRefreshFx=render;render();
  }
  function dynamicProfile(month){
    const empty='<div class="current-month-empty"><b>Perfil de casais • '+esc(month.label)+'</b>Os registros mensais de performance não incluem profissão, idade, renda ou veículo. Esta aba ficará vazia até a base de perfil deste mês ser carregada.</div>';
    ['pb','ab','ib','cb','pi'].forEach(id=>{if($(id))$(id).innerHTML=empty;});
    const hero=document.querySelector('#perfil .hero');
    if(hero)hero.innerHTML='<div class="eye">PERFIL DO MÊS</div><h3>'+esc(month.label)+'</h3><p>Sem base demográfica vinculada a este mês ainda.</p>';
  }
  function dynamicCosts(month,people){
    const t=aggregatePeople(people),cost=t.c?t.g/t.c:0,costSale=t.s?t.g/t.s:0;
    if($('ck'))$('ck').innerHTML=[
      ['Gasto em brindes',fmtMoneyFull(t.g),'valor registrado'],
      ['Custo/volume',fmtMoneyFull(cost),'brindes ÷ volume'],
      ['Custo/venda',fmtMoneyFull(costSale),'brindes ÷ vendas'],
      ['VGV/volume',fmtMoneyFull(t.c?t.v/t.c:0),'resultado por entrada'],
      ['Ticket médio',fmtMoneyFull(t.s?t.v/t.s:0),'por venda']
    ].map(x=>'<div class="card kpi"><small>'+x[0]+'</small><b class="c">'+x[1]+'</b><span class="muted">'+x[2]+'</span></div>').join('');
    dynamicBars('cob',people.filter(p=>p.c).sort((a,b)=>(a.g/Math.max(1,a.c))-(b.g/Math.max(1,b.c))).slice(0,10).map(p=>[p.n,p.g/Math.max(1,p.c)]),v=>fmtMoneyFull(v));
    if($('ci'))$('ci').innerHTML='<div class="in"><strong>Base</strong><span class="muted">'+esc(month.label)+' • '+fmtInt(t.c)+' de volume.</span></div>';
  }
  function dynamicCentral(month,people){
    const t=aggregatePeople(people),daily=dynamicDaily(people,month),nonzero=daily.filter(r=>r.slice(1).some(v=>num(v)!==0));
    const last=nonzero[nonzero.length-1]||daily[0];
    const area=areaRole(),volumeLabel=area==='Promotor de Marketing'?'casais':'atendimentos';
    if($('dk'))$('dk').innerHTML=[
      [volumeLabel.charAt(0).toUpperCase()+volumeLabel.slice(1),fmtInt(t.c),'mês'],
      ['Vendas',fmtInt(t.s),(t.c?t.s/t.c*100:0).toFixed(1).replace('.',',')+'% conversão'],
      ['VGV',fmtMoneyFull(t.v),'mês'],
      ['Q',fmtInt(t.q),t.c?(t.q/t.c*100).toFixed(1).replace('.',',')+'% qualificação':'0%'],
      ['NQ',fmtInt(t.nq),'não qualificados'],
      ['Brindes',fmtMoneyFull(t.g),'valor'],
      ['Custo/volume',fmtMoneyFull(t.c?t.g/t.c:0),'eficiência']
    ].map(x=>'<div class="card kpi"><small>'+x[0]+'</small><b class="c">'+x[1]+'</b><span class="muted">'+x[2]+'</span></div>').join('');
    const captain=captainScores(currentPerformanceRows,month);
    const leaders=captain.leaders;
    const top=leaders[0];
    if($('todayOps'))$('todayOps').innerHTML='<div class="ops-pad"><div class="ops-head"><div><span class="ops-kicker">ÚLTIMO DIA COM DADOS • '+String(last[0]).padStart(2,'0')+'/'+month.ref_month.slice(5,7)+'</span><h3>Pulso da operação</h3></div></div><div class="today-hero"><b>'+fmtInt(last[1])+'</b><span>'+volumeLabel.toUpperCase()+'</span></div><div class="today-strip"><div class="today-stat"><small>Vendas</small><b class="g">'+fmtInt(last[2])+'</b></div><div class="today-stat"><small>VGV</small><b class="v">'+fmtMoneyFull(last[3])+'</b></div><div class="today-stat"><small>Q / NQ</small><b>'+fmtInt(last[4])+' / '+fmtInt(last[5])+'</b></div></div></div>';
    if($('metaPace')){
      const goal=area==='Promotor de Marketing'?num(month.goal_couples):0;
      $('metaPace').innerHTML='<div class="ops-pad"><div class="ops-head"><div><span class="ops-kicker">RITMO DO MÊS</span><h3>'+esc(month.label)+'</h3></div></div><div class="pace-summary"><div class="pace-box"><small>Volume</small><b class="c">'+fmtInt(t.c)+'</b><span>'+fmtInt(goal)+' meta geral</span></div><div class="pace-box"><small>Vendas</small><b class="g">'+fmtInt(t.s)+'</b><span>'+fmtInt(month.goal_sales)+' meta geral</span></div><div class="pace-box"><small>VGV</small><b class="v">'+fmtMoneyFull(t.v)+'</b><span>'+fmtMoneyFull(month.goal_vgv)+' meta geral</span></div></div></div>';
    }
    if($('dailyEvolution'))$('dailyEvolution').innerHTML='<div class="ops-pad"><div class="evo-title"><span class="ops-kicker">EVOLUÇÃO DIÁRIA</span><h3>'+esc(month.label)+'</h3><p>'+nonzero.length+' dia(s) com lançamento na base mensal.</p></div><div class="daily-live-grid">'+nonzero.map(r=>'<div class="daily-live-card"><small>'+String(r[0]).padStart(2,'0')+'/'+month.ref_month.slice(5,7)+'</small><b>'+fmtInt(r[1])+' casais</b><span>'+fmtInt(r[2])+' vendas • '+fmtMoneyFull(r[3])+'</span><em>Q '+fmtInt(r[4])+' • NQ '+fmtInt(r[5])+'</em></div>').join('')+'</div></div>';
    if($('radarCaptain'))$('radarCaptain').innerHTML='<div class="muted">Semana: '+captain.week.label+' • segunda a domingo • prêmio R$ 200</div>'+(leaders.length?leaders.slice(0,5).map((p,i)=>'<div class="fight '+(i===0?'lead':'')+'"><div class="place">'+(i+1)+'</div><div class="who"><b>'+esc(p.n)+'</b><small>'+fmtInt(p.ws)+' venda(s) na semana</small></div><div class="score">'+fmtInt(p.w)+'<span class="gap">casais</span></div></div>').join(''):'<div class="muted">Sem resultados confirmados nesta semana.</div>');
    const byV=[...people].sort((a,b)=>b.v-a.v),byC=[...people].sort((a,b)=>b.c-a.c);
    if($('radarVgv'))$('radarVgv').innerHTML=byV.slice(0,5).map((p,i)=>'<div class="fight '+(i===0?'lead':'')+'"><div class="place">'+(i+1)+'</div><div class="who"><b>'+esc(p.n)+'</b></div><div class="score">'+fmtMoneyFull(p.v)+'</div></div>').join('');
    if($('radarCouples'))$('radarCouples').innerHTML=byC.slice(0,5).map((p,i)=>'<div class="fight '+(i===0?'lead':'')+'"><div class="place">'+(i+1)+'</div><div class="who"><b>'+esc(p.n)+'</b></div><div class="score">'+fmtInt(p.c)+'</div></div>').join('');
    if($('free'))$('free').innerHTML=top?'<span class="badge g">DESTAQUE DO MÊS</span><div class="big"><b>'+esc(byC[0].n)+'</b><span class="g">'+fmtInt(byC[0].c)+' '+volumeLabel+'</span></div><div class="muted">'+esc(month.label)+'</div>':'';
    dynamicBars('top',byC.slice(0,8).map(p=>[p.n,p.c]));
    if($('di'))$('di').innerHTML='<div class="in"><strong>Mês selecionado</strong><span class="muted">'+esc(month.label)+'</span></div><div class="in"><strong>Top volume</strong><span class="muted">'+(byC[0]?esc(byC[0].n)+' • '+fmtInt(byC[0].c):'—')+'</span></div><div class="in"><strong>Top VGV</strong><span class="muted">'+(byV[0]?esc(byV[0].n)+' • '+fmtMoneyFull(byV[0].v):'—')+'</span></div>';
    if($('arenaX'))$('arenaX').innerHTML='<div class="arena-head"><div><span class="arena-kicker">⚡ ARENA X • '+esc(month.label.toUpperCase())+'</span><h3>PERFORMANCE DA ÁREA</h3></div></div><div class="arena-metrics"><div class="arena-metric"><small>VOLUME</small><b>'+fmtInt(t.c)+'</b></div><div class="arena-metric"><small>VENDAS</small><b>'+fmtInt(t.s)+'</b></div><div class="arena-metric"><small>VGV</small><b>'+fmtMoneyFull(t.v)+'</b></div></div>';
  }
  function renderDynamicMonth(month,rows){
    const selected=rows.filter(r=>r.role===areaRole());
    if(!selected.length){currentMonthEmpty(month);return;}
    const allPeople=dynamicPeople(selected,month);
    const people=allPeople.filter(p=>!(month.ref_month==='2026-10-01' && /(?:manara\s+alexandre\s+sousa|clacion\s+de\s+souza\s+braga|gabriell?a\s+furtado)/i.test(p.n)));
    dynamicCentral(month,allPeople);
    dynamicRank(month,people);
    dynamicIndividual(month,people);
    dynamicProjection(month,people);
    dynamicDiagnosis(month,people);
    dynamicFx(month,people);
    dynamicProfile(month);
    dynamicCosts(month,allPeople);
  }

  function markLiveReady(){ document.body.classList.remove('raiox-live-loading'); document.body.classList.add('raiox-live-ready'); }

  async function load(ctx){
    if(!cfg.url||!cfg.key)return;
    document.body.classList.add('raiox-live-loading');
    try{
      const token=ctx?.session?.access_token||cfg.key;
      const months=await rest('ceo_months?select=ref_month,label,status,goal_research,goal_couples,goal_sales,goal_vgv,super_goal_research,super_goal_couples,super_goal_sales,super_goal_vgv&order=ref_month.desc',token);
      if(!months?.length)return;

      let stored='';
      try{stored=sessionStorage.getItem('raiox.view.month.v1')||'';}catch(_){}
      const openMonth=months.find(m=>m.status==='open')||months[0];
      const requested=new URLSearchParams(location.search).get('month')||'';
      const selectedRef=months.some(m=>m.ref_month===requested)?requested:(months.some(m=>m.ref_month===stored)?stored:openMonth.ref_month);
      const month=months.find(m=>m.ref_month===selectedRef)||openMonth;

      fillMonthSelector(months,month.ref_month);

      const rows=await rest('raiox_performance_records?select=professional_name,role,researches,couples,sales,vgv,q,nq,gifts,active_days,week_volume,week_sales,week_vgv,daily,updated_on,snapshot_at&ref_month=eq.'+encodeURIComponent(month.ref_month),token);
      officialDaily=await rest('raiox_daily_totals?select=work_date,couples,sales,vgv,q,nq,snapshot_at&ref_month=eq.'+encodeURIComponent(month.ref_month)+'&order=work_date.asc',token)||[];
      currentPerformanceRows=rows||[];
      updateCurrentMonthLabels(month);
      updateGoalHero(month,rows||[]);
      renderDynamicMonth(month,rows||[]);
      markLiveReady();
    }catch(err){
      console.error('RAIO X mês selecionado:',err);
      document.body.classList.remove('raiox-live-loading');
      document.body.classList.add('raiox-live-error');
    }
  }

  window.addEventListener('raiox:authenticated',e=>load(e.detail));
  load(window.RAIOX_AUTH||null);
})();