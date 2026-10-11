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
    const hasWeekly=prom.some(r=>num(r.week_volume)>0||num(r.week_sales)>0);
    const leader=hasWeekly?[...prom].sort((x,y)=>num(y.week_volume)-num(x.week_volume)||num(y.week_sales)-num(x.week_sales))[0]:null;
    const monthLeader=[...prom].sort((x,y)=>num(y.couples)-num(x.couples)||num(y.sales)-num(x.sales))[0];
    const winner=[...prom].filter(x=>num(x.couples)>=22).sort((x,y)=>num(y.couples)-num(x.couples))[0];
    if($('missionText')){ const snap=prom[0]?.snapshot_at?new Date(prom[0].snapshot_at):null; const stamp=snap&&!isNaN(snap)?snap.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):String(prom[0]?.updated_on||'—').split('-').reverse().join('/'); $('missionText').innerHTML='<b>DADOS OFICIAIS</b> • '+esc(month.label)+' • atualizado em '+esc(stamp); }
    if($('heroLeaderName'))$('heroLeaderName').textContent=leader?.professional_name||monthLeader?.professional_name||'—';
    if($('heroLeaderSub'))$('heroLeaderSub').textContent=leader?'CAPITÃO DA SEMANA • '+fmtInt(leader.week_volume)+' NO PERÍODO':'TOP 1 EM CASAIS • '+fmtInt(monthLeader?.couples||0)+' NO MÊS';
    if($('iCap'))$('iCap').textContent=leader?leader.professional_name+' • '+fmtInt(leader.week_volume):monthLeader?.professional_name||'—';
    if($('i22'))$('i22').textContent=winner?winner.professional_name+' • VENCEDOR':monthLeader?monthLeader.professional_name+' • '+fmtInt(monthLeader.couples)+'/22':'—';
    const days=Math.max(1,...prom.map(r=>Number(String(r.updated_on||'').slice(8,10))||0));
    const daysInMonth=new Date(Number(month.ref_month.slice(0,4)),Number(month.ref_month.slice(5,7)),0).getDate();
    if($('iProj'))$('iProj').textContent=fmtInt(a.couples>0?Math.round(a.couples/days*daysInMonth):0)+' casais';
  }

  function currentMonthEmpty(month){
    const empty='<div class="current-month-empty"><b>'+(month.status==='closed'?'Histórico de '+esc(month.label):esc(month.label)+' iniciou')+'</b>'+(month.status==='closed'?'Nenhum resultado foi encontrado para este mês.':'Nenhum resultado de performance foi lançado neste mês ainda.')+'</div>';
    const goalR=num(month.goal_research),goalC=num(month.goal_couples),goalS=num(month.goal_sales),goalV=num(month.goal_vgv);

    if($('dk'))$('dk').innerHTML=[
      ['Pesquisas','0','Meta '+fmtInt(goalR)],
      ['Casais','0','Meta '+fmtInt(goalC)],
      ['Vendas','0','Meta '+fmtInt(goalS)],
      ['VGV','R$ 0','Meta '+fmtMoney(goalV)]
    ].map(x=>'<div class="card kpi"><small>'+x[0]+'</small><b class="c">'+x[1]+'</b><span class="muted">'+x[2]+'</span></div>').join('');

    if($('todayOps'))$('todayOps').innerHTML='<div class="ops-pad">'+empty+'</div>';
    if($('metaPace'))$('metaPace').innerHTML='<div class="ops-pad"><div class="ops-head"><div><span class="ops-kicker">META DO MÊS</span><h3>'+esc(month.label)+'</h3></div></div>'+
      '<div class="pace-summary"><div class="pace-box"><small>Pesquisas</small><b class="c">'+fmtInt(goalR)+'</b><span>faltam '+fmtInt(goalR)+'</span></div>'+
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
      location.reload();
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
  function dynamicDaily(people,month){
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
        return '<tr><td class="pos">'+(['🥇','🥈','🥉'][i]||'#'+(i+1))+'</td>'+
          '<td><div class="person"><div class="av">'+esc(p.n.charAt(0))+'</div><div><b>'+esc(p.n)+'</b><span class="mini">'+esc(p.r)+'</span></div></div></td>'+
          '<td><b>'+fmtInt(p.c)+'</b></td><td>'+fmtInt(p.w)+'</td><td>'+fmtInt(p.s)+'</td><td>'+fmtMoneyFull(p.v)+'</td>'+
          '<td>'+conv.toFixed(1).replace('.',',')+'%</td><td>'+fmtInt(p.q)+'</td><td>'+fmtMoneyFull(cost)+'</td><td><b class="v">'+fmtInt(p.p)+'</b></td>'+
          '<td><span class="tag">'+fmtInt(p.d)+' dias ativos</span></td></tr>';
      }).join('');
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
        ['Pesquisas',p.research,'no mês'],
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
    sel.onchange=render;render();
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
      const rows=p.daily||[];
      const sum=rows.reduce((a,r)=>{a.c+=num(r[0]);a.s+=num(r[1]);a.v+=num(r[2]);a.q+=num(r[3]);a.nq+=num(r[4]);return a;},{c:0,s:0,v:0,q:0,nq:0});
      const consistent=Math.abs(sum.c-p.c)<.01&&Math.abs(sum.s-p.s)<.01;
      if($('fxName'))$('fxName').textContent=p.n;
      if($('fxValidation')){
        $('fxValidation').textContent=consistent?'✓ '+month.label.toUpperCase()+' • DADOS CONFERIDOS':'⚠ SOMA DIÁRIA DIFERE DO TOTAL MENSAL';
        $('fxValidation').className='fx-validate '+(consistent?'ok':'bad');
      }
      const active=rows.filter(r=>num(r[0])>0).length,conv=p.c?p.s/p.c*100:0,ticket=p.s?p.v/p.s:0;
      if($('fxKpis'))$('fxKpis').innerHTML=[
        ['Volume',p.c,(p.c/Math.max(1,active)).toFixed(1).replace('.',',')+' por dia ativo'],
        ['Vendas',p.s,conv.toFixed(1).replace('.',',')+'% conversão'],
        ['VGV',fmtMoneyFull(p.v),fmtMoneyFull(ticket)+' ticket'],
        ['Constância',active+'/'+Math.max(1,rows.length),'dias com volume']
      ].map(x=>'<div class="fx-kpi"><small>'+x[0]+'</small><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('');
      if($('fxChart'))$('fxChart').innerHTML='<div class="current-month-empty"><b>'+esc(month.label)+' • '+esc(p.n)+'</b>Histórico diário carregado: '+rows.length+' dia(s).</div>';
      if($('fxDriver'))$('fxDriver').innerHTML='<small>LEITURA PRINCIPAL</small><h3>'+((conv>=20)?'Conversão':'Constância')+'</h3><p>'+fmtInt(p.c)+' de volume, '+fmtInt(p.s)+' vendas e '+conv.toFixed(1).replace('.',',')+'% de conversão.</p>';
      if($('fxPositive'))$('fxPositive').innerHTML='<div class="fx-insight positive"><b>Dias ativos</b><p>'+active+' dias com volume.</p></div>';
      if($('fxNegative'))$('fxNegative').innerHTML='<div class="fx-insight negative"><b>Dias sem venda</b><p>'+rows.filter(r=>num(r[0])>0&&num(r[1])===0).length+' dias tiveram volume e nenhuma venda.</p></div>';
      if($('fxUnknown'))$('fxUnknown').innerHTML='<div class="fx-insight unknown"><b>Contexto</b><p>Confirme folgas, ausências e distribuição antes de concluir sobre dias zerados.</p></div>';
      if($('fxDaily'))$('fxDaily').innerHTML=rows.map((r,i)=>'<div class="fx-day"><div class="fx-day-top"><b>'+String(i+1).padStart(2,'0')+'/'+mm+'</b></div><div class="fx-day-metrics"><div><small>Volume</small><b>'+fmtInt(r[0])+'</b></div><div><small>Vendas</small><b>'+fmtInt(r[1])+'</b></div><div><small>VGV</small><b>'+fmtMoneyFull(r[2])+'</b></div></div></div>').join('');
      if($('fxConclusion'))$('fxConclusion').innerHTML='<h3>Conclusão para conversa</h3><p>'+esc(p.n)+' fechou '+esc(month.label)+' com '+fmtInt(p.c)+' de volume, '+fmtInt(p.s)+' vendas e '+fmtMoneyFull(p.v)+' em VGV.</p>';
    };
    sel.onchange=render;render();
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
      ['Pesquisas',fmtInt(t.research),'mês'],
      [volumeLabel.charAt(0).toUpperCase()+volumeLabel.slice(1),fmtInt(t.c),'mês'],
      ['Vendas',fmtInt(t.s),(t.c?t.s/t.c*100:0).toFixed(1).replace('.',',')+'% conversão'],
      ['VGV',fmtMoneyFull(t.v),'mês'],
      ['Q',fmtInt(t.q),t.c?(t.q/t.c*100).toFixed(1).replace('.',',')+'% qualificação':'0%'],
      ['NQ',fmtInt(t.nq),'não qualificados'],
      ['Brindes',fmtMoneyFull(t.g),'valor'],
      ['Custo/volume',fmtMoneyFull(t.c?t.g/t.c:0),'eficiência']
    ].map(x=>'<div class="card kpi"><small>'+x[0]+'</small><b class="c">'+x[1]+'</b><span class="muted">'+x[2]+'</span></div>').join('');
    const leaders=[...people].sort((a,b)=>b.w-a.w||b.c-a.c);
    const top=leaders[0];
    if($('todayOps'))$('todayOps').innerHTML='<div class="ops-pad"><div class="ops-head"><div><span class="ops-kicker">ÚLTIMO DIA COM DADOS • '+String(last[0]).padStart(2,'0')+'/'+month.ref_month.slice(5,7)+'</span><h3>Pulso da operação</h3></div></div><div class="today-hero"><b>'+fmtInt(last[1])+'</b><span>'+volumeLabel.toUpperCase()+'</span></div><div class="today-strip"><div class="today-stat"><small>Vendas</small><b class="g">'+fmtInt(last[2])+'</b></div><div class="today-stat"><small>VGV</small><b class="v">'+fmtMoneyFull(last[3])+'</b></div><div class="today-stat"><small>Q / NQ</small><b>'+fmtInt(last[4])+' / '+fmtInt(last[5])+'</b></div></div></div>';
    if($('metaPace')){
      const goal=area==='Promotor de Marketing'?num(month.goal_couples):0;
      $('metaPace').innerHTML='<div class="ops-pad"><div class="ops-head"><div><span class="ops-kicker">RITMO DO MÊS</span><h3>'+esc(month.label)+'</h3></div></div><div class="pace-summary"><div class="pace-box"><small>Volume</small><b class="c">'+fmtInt(t.c)+'</b><span>'+fmtInt(goal)+' meta geral</span></div><div class="pace-box"><small>Vendas</small><b class="g">'+fmtInt(t.s)+'</b><span>'+fmtInt(month.goal_sales)+' meta geral</span></div><div class="pace-box"><small>VGV</small><b class="v">'+fmtMoneyFull(t.v)+'</b><span>'+fmtMoneyFull(month.goal_vgv)+' meta geral</span></div></div></div>';
    }
    if($('dailyEvolution'))$('dailyEvolution').innerHTML='<div class="ops-pad"><div class="evo-title"><span class="ops-kicker">EVOLUÇÃO DIÁRIA</span><h3>'+esc(month.label)+'</h3><p>'+nonzero.length+' dia(s) com lançamento na base mensal.</p></div></div>';
    if($('radarCaptain'))$('radarCaptain').innerHTML=leaders.slice(0,5).map((p,i)=>'<div class="fight '+(i===0?'lead':'')+'"><div class="place">'+(i+1)+'</div><div class="who"><b>'+esc(p.n)+'</b><small>'+fmtInt(p.ws)+' venda(s) na semana</small></div><div class="score">'+fmtInt(p.w)+'<span class="gap">semana</span></div></div>').join('');
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
    const people=dynamicPeople(selected,month);
    dynamicCentral(month,people);
    dynamicRank(month,people);
    dynamicIndividual(month,people);
    dynamicProjection(month,people);
    dynamicDiagnosis(month,people);
    dynamicFx(month,people);
    dynamicProfile(month);
    dynamicCosts(month,people);
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
      const selectedRef=months.some(m=>m.ref_month===stored)?stored:openMonth.ref_month;
      const month=months.find(m=>m.ref_month===selectedRef)||openMonth;

      fillMonthSelector(months,month.ref_month);

      const rows=await rest('raiox_performance_records?select=professional_name,role,researches,couples,sales,vgv,q,nq,gifts,active_days,week_volume,week_sales,week_vgv,daily,updated_on,snapshot_at&ref_month=eq.'+encodeURIComponent(month.ref_month),token);
      updateCurrentMonthLabels(month);
      if(month.ref_month==='2026-09-01'){
        const selected=(rows||[]).filter(r=>r.role===areaRole());
        if(!selected.length)currentMonthEmpty(month);
      }else{
        updateGoalHero(month,rows||[]);
        renderDynamicMonth(month,rows||[]);
      }
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