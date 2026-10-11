import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const html=read('index.html');
const auth=read('auth.js');
const authCss=read('auth.css');
const ceoHtml=read('ceo.html');
const ceo=read('ceo.js');
const ceoCss=read('ceo.css');
const pendingHtml=read('pending.html');
const pendingJs=read('pending.js');
const sw=read('sw.js');
const xia=read('xia-performance.js');
const monthLive=read('month-live.js');

for(const [name,src] of [['auth.js',auth],['ceo.js',ceo],['pending.js',pendingJs],['sw.js',sw],['xia-performance.js',xia],['month-live.js',monthLive]]){
  assert.doesNotThrow(()=>new Function(src),name+' must be valid JavaScript');
}

assert.doesNotMatch(html,/id=["']authGate["']/,'Operational RAIO X must be open by link');
assert.match(html,/id=["']raioxAppShell["']/,'Operational RAIO X shell must be available directly');
assert.match(auth,/grant_type=password/,'login must use email/password auth');
assert.match(auth,/grant_type=refresh_token/,'persistent session must refresh safely');
assert.match(auth,/localStorage\.setItem\(STORE/,'session must persist locally');
assert.match(auth,/raiox_app_users/,'login must check access allowlist');
assert.match(auth,/approval_status/,'login must enforce CEO approval');
assert.match(auth,/pending\.html/,'pending users must be routed to approval status page');
assert.match(auth,/raiox-request-access-v2/,'new access requests must use the safe v2 endpoint');
assert.match(auth,/const canManage=\[['"]ceo['"],['"]manager['"]\]\.includes\(ctx\.access\.role\)/,'management portal visibility must be limited to CEO or manager roles');
assert.doesNotMatch(auth,/sms|phone|otp/i,'main login must not depend on SMS/phone/OTP');

assert.match(pendingHtml,/Aguardando aprovação/i,'pending status page must exist');
assert.match(pendingHtml,/id=["']checkApproval["']/,'pending page must let user re-check approval');
assert.match(pendingJs,/approval_status/,'pending page must verify approval status');
assert.match(pendingJs,/location\.href=['"]\.\//,'approved user must be able to return to RAIO X');

assert.match(ceoHtml,/Portal (CEO|de Gestão)/i,'private management page must exist');
assert.match(ceoHtml,/Olho no Olho/i,'CEO portal must include one-on-one');
assert.match(ceoHtml,/data-tab=["']xia["']/,'CEO portal must include XIA');
assert.match(ceoHtml,/data-tab=["']agenda["']/,'CEO portal must include intelligent agenda');
assert.match(ceoHtml,/data-tab=["']approvals["']/,'Approvals must be in CEO sidebar');
assert.match(ceoHtml,/MÊS DE REFERÊNCIA/i,'CEO portal must support monthly reference');
assert.match(ceoHtml,/personCnpj/,'PJ registration must include CNPJ');
assert.match(ceoHtml,/personStartTime/,'PJ registration must include individual schedule');
assert.match(ceoHtml,/personGoalCouples/,'professional must support monthly volume goal');
assert.match(ceoHtml,/personGoalSales/,'professional must support monthly sales goal');
assert.match(ceoHtml,/personGoalVgv/,'professional must support monthly VGV goal');
assert.match(ceoHtml,/Distratados/i,'CEO portal must preserve a terminated-professionals area');

assert.match(ceo,/raiox_app_users/,'Portal de Gestão must validate approved account authorization');
assert.match(ceo,/ceo_daily_presence/,'CEO portal must store operational presence');
assert.match(ceo,/status:row\.querySelector\(['"]\.presence-status['"]\)\.value\|\|['"]present['"]/,'day save must default each professional to present');
assert.match(ceo,/function markAllPresent/,'CEO can mark everyone present');
assert.match(ceo,/async function saveDay/,'CEO can save the whole day in one action');
assert.match(ceo,/ceo_team_assignments/,'CEO portal must store team assignments');
assert.match(ceo,/default_start_time/,'person can have an individual start time');
assert.match(ceo,/ceo_person_goals/,'CEO portal must store monthly goals per professional');
assert.match(ceo,/ceo_agenda/,'CEO portal must store intelligent agenda events');
assert.match(ceo,/ceo_one_on_one/,'CEO portal must store one-on-one conversations');
assert.match(ceo,/ceo_tasks/,'CEO portal must store follow-up tasks');
assert.match(ceo,/approval_status/,'CEO portal must manage access approval states');
assert.match(ceo,/reset_password/,'CEO portal must support password changes');
assert.match(ceo,/Distratados|status:'ended'/,'CEO portal must support contract termination history');
assert.match(ceo,/data-delete-person|deletePerson/,'CEO portal must allow deleting erroneous/non-team records');
assert.match(ceo,/performanceData\(\)/,'XIA must consume the performance source for the selected month');
assert.match(ceo,/buildXiaPrompt/,'XIA must generate a complete prompt for external AI analysis');
assert.match(ceo,/Não invente|nao invente/i,'XIA must distinguish evidence from unsupported inference');

assert.match(ceoCss,/\.approval-card/,'Approvals must have dedicated card styling');
assert.match(ceoCss,/\.xia-/,'XIA must have dedicated styling');
assert.match(ceoCss,/\.agenda-/,'Agenda must have dedicated styling');
assert.match(authCss,/\.auth-mode-switch/,'login/create access switch must be styled');
assert.ok(authCss.length>1000,'login must have dedicated visual styling');

assert.match(sw,/xia-performance\.js/,'PWA cache must include XIA data shell');
assert.match(sw,/pending\.html/,'PWA cache must include pending approval page');
assert.match(sw,/ALWAYS_NETWORK_FIRST/,'auth and CEO assets must prioritize fresh network versions');
assert.match(sw,/const CACHE = ['"]raiox-v\d+[-\w]*['"]/,'PWA cache must use a versioned RAIO X cache');

console.log('RAIO X auth + CEO audit passed');

assert.match(html,/id=["']entryCeoPortal["']/,'CEO portal CTA must remain available as a separate management route');

assert.match(auth,/const ctx=await signIn\(email,password\);[\s\S]*?reveal\(ctx\);[\s\S]*?return;/,'approved preauthorized signup must enter RAIO X immediately');

assert.match(ceoHtml,/id=["']todayPerformance["']/,'Today must expose executive performance KPIs');
assert.match(ceoHtml,/id=["']todayAlerts["']/,'Today must expose leadership attention signals');
assert.match(ceo,/function performanceDay\(/,'CEO portal must calculate daily performance from XIA data');
assert.match(ceo,/function renderTodayExecutive\(/,'CEO portal must render the executive Today view');
assert.match(ceo,/function todayAttention\(/,'CEO portal must combine performance and presence attention signals');
assert.match(ceoCss,/\.today-performance-grid/,'executive Today KPIs need dedicated styling');

assert.match(ceoHtml,/id=["']todayArea["']/,'Today must let management filter by operational area');
assert.match(ceoHtml,/Promotor de Marketing/,'Today area filter must include Promotor');
assert.match(ceoHtml,/Liner \/ Consultor/,'Today area filter must include Liner');
assert.match(ceoHtml,/Closer \/ Fechador/,'Today area filter must include Closer');
assert.match(ceo,/TODAY_AREA_ROLES/,'Today filter must map operational roles');
assert.match(ceo,/function todayWorkingPeople\(/,'Today presence must respect selected area');
assert.match(ceo,/todayArea.*onchange|\$\(['"]todayArea['"]\)\.onchange/,'Today area selector must rerender on change');

assert.match(ceo,/ceo_months\?select=\*&ref_month=eq\./,'new month must check the database before inserting');
assert.match(ceo,/já existe\. Abri o mês existente|já existia\. Abri o mês existente/,'duplicate month must resolve to the existing month without raw database error');
assert.match(ceo,/duplicate key\|ceo_months_ref_month_key\|23505/,'new month must safely recover from race-condition duplicates');

assert.match(ceoHtml,/data-tab=["']people["']>Profissionais/,'management navigation must expose Profissionais');
assert.match(ceoHtml,/id=["']profilePerson["']/,'professional profile must have a person selector');
assert.match(ceoHtml,/id=["']professionalIdentity["']/,'professional profile must show identity');
assert.match(ceoHtml,/id=["']professionalScope["']/,'professional profile must show day week and month scopes');
assert.match(ceoHtml,/id=["']professionalGoals["']/,'professional profile must show goals');
assert.match(ceoHtml,/id=["']professionalPresence["']/,'professional profile must show presence');
assert.match(ceoHtml,/id=["']professionalLeadership["']/,'professional profile must show leadership follow-up');
assert.match(ceoHtml,/id=["']professionalDaily["']/,'professional profile must show daily evolution');
assert.match(ceo,/async function renderProfessionalProfile\(/,'portal must render a complete professional profile');
assert.match(ceo,/function roleRange\(/,'professional profile must calculate rolling daily periods');
assert.match(ceo,/function openProfessionalProfile\(/,'directory must open the selected professional Raio-X');
assert.match(ceoCss,/\.professional-profile-panel/,'professional profile must have dedicated visual styling');

assert.match(ceoHtml,/id=["']xiaOperationSummary["']/,'XIA must include operation-level summary');
assert.match(ceoHtml,/id=["']xiaOperationAlerts["']/,'XIA must include operation-level alerts');
assert.match(ceoHtml,/id=["']xiaFeedback["']/,'XIA must include a 7-day feedback block');
assert.match(ceo,/async function renderXiaOperation\(/,'XIA must analyze the operation in one place');
assert.match(ceo,/function xiaPersonSignal\(/,'XIA must combine performance presence and leadership signals');
assert.match(ceo,/function xiaFeedbackSummary\(/,'XIA must compare the last 7 days with the previous period');
assert.match(ceoCss,/\.xia-command-center/,'unified XIA needs dedicated operation styling');

assert.match(ceoHtml,/data-report-period=["']week["']/,'reports must support weekly Raio-X');
assert.match(ceoHtml,/data-report-period=["']month["']/,'reports must support monthly Raio-X');
assert.match(ceoHtml,/id=["']copyReportBtn["']/,'reports must be copyable for meetings');
assert.match(ceo,/function reportDateRange\(/,'reports must calculate weekly and monthly date ranges');
assert.match(ceo,/function reportAreaStats\(/,'reports must calculate performance by operational area');
assert.match(ceo,/async function copyReport\(/,'reports must expose a ready-to-copy executive summary');
assert.match(ceoCss,/\.report-period-switch/,'weekly/monthly switch must have dedicated styling');

assert.match(ceoHtml,/id=["']raioQuestion["']/,'XIA must provide a natural-language RAIO X question field');
assert.match(ceoHtml,/id=["']askRaioBtn["']/,'XIA must provide a question action');
assert.match(ceoHtml,/id=["']raioAnswer["']/,'XIA must render a grounded answer area');
assert.match(ceo,/function findPersonFromQuestion\(/,'question engine must resolve professionals by name');
assert.match(ceo,/async function answerRaioXQuestion\(/,'question engine must answer from RAIO X data');
assert.match(ceo,/function personTrend\(/,'question engine must compare seven-day professional performance');
assert.match(ceoCss,/\.xia-ask-panel/,'question experience must have dedicated styling');

assert.match(ceo,/function noSaleSequence\(/,'smart alerts must detect opportunity streaks without sales');
assert.match(ceo,/function recentVolumeDrop\(/,'smart alerts must detect recent volume drops');
assert.match(ceo,/function roleCostBenchmark\(/,'smart alerts must compare cost against the area benchmark');
assert.match(ceo,/function goalPaceSignal\(/,'smart alerts must detect goal pace risk');
assert.match(ceo,/function lastSevenPresenceCounts\(/,'smart alerts must detect recurring recent lateness');

assert.match(ceoHtml,/data-profession-area=["']promotor["']/,'professional directory must expose Promotor filter');
assert.match(ceoHtml,/data-profession-area=["']liner["']/,'professional directory must expose Liner filter');
assert.match(ceoHtml,/data-profession-area=["']closer["']/,'professional directory must expose Closer filter');
assert.match(ceo,/professionalArea:'promotor'/,'professional directory must default to Promotor');
assert.match(ceo,/function professionalWorkingPeople\(/,'professional profile selector must be filtered by selected profession');
assert.match(ceo,/function professionalListedPeople\(/,'professional directory must show one profession at a time');
assert.match(ceo,/function professionalAreaKeyForRole\(/,'opening a professional from another module must switch to the correct profession');
assert.match(ceoCss,/\.profession-switch/,'profession selector must have dedicated styling');

assert.doesNotMatch(ceoHtml,/option value=["']all["']>Todos<\/option>/,'Today must show one operational profession at a time');
assert.match(ceo,/todayArea:'promotor'/,'Today must default to Promotor for the new month');
assert.match(ceo,/function personRoles\(/,'portal must preserve every role of multi-role professionals');
assert.match(ceo,/function hasRole\(/,'area filters must include multi-role professionals');
assert.match(ceo,/function choosePrimaryPerf\(p,perf,preferredRole=/,'professional analysis must choose the selected role');
assert.match(ceo,/data-profile-person/,'professional directory must restore the Raio-X action');
assert.match(ceoHtml,/id=["']todaySaveState["']/,'Today must distinguish saved attendance from prefilled attendance');
assert.match(ceo,/function todayPresenceSaveState\(/,'presence summary must use persisted records');
assert.match(ceoHtml,/id=["']monthGoalsBtn["']/,'management portal must expose monthly Meta and Super Meta');
assert.match(ceoHtml,/id=["']monthSuperGoalVgv["']/,'Super Meta must support VGV');
assert.match(ceo,/async function saveMonthGoals\(/,'monthly goals must be persisted in ceo_months');
assert.match(ceoHtml,/id=["']xiaRole["']/,'XIA must let multi-role professionals be analyzed in the selected role');
assert.match(ceo,/\['ceo','manager'\]\.includes\(access\.role\)/,'Portal de Gestão must authorize CEO and manager roles');

assert.match(ceo,/async function loadPerformanceForMonth\(/,'Portal must load performance by selected month');
assert.match(ceo,/raiox_performance_records/,'Portal must use persistent monthly performance records');
assert.match(ceo,/function performanceData\(/,'analytics must read the selected month performance source');
assert.match(ceo,/function reportGoalCard\(/,'reports must include Meta and Super Meta progress');
assert.match(ceo,/preferredRole/,'multi-role analytics must support a preferred role');

assert.match(ceoHtml,/id=["']monthGoalResearch["']/,'monthly goals must include research');
assert.match(ceoHtml,/id=["']monthSuperGoalResearch["']/,'monthly super goals must include research');
assert.match(ceoHtml,/id=["']teamGoalSummary["']/,'Teams must expose goal distribution summary');
assert.match(ceoHtml,/id=["']teamGoalsEditor["']/,'Teams must expose per-team goal allocation');
assert.match(ceo,/ceo_team_goals/,'Portal must persist team goals');
assert.match(ceo,/function renderTeamGoalDistribution\(/,'Portal must calculate distributed vs remaining goals');
assert.match(ceo,/function saveTeamGoal\(/,'Portal must save team goals');
assert.match(ceoHtml,/data-tab=["']strategy["']/,'Portal must expose Reuniões & Estratégia tab');
assert.match(ceoHtml,/id=["']strategyList["']/,'Strategy tab must render historical records');
assert.match(ceo,/ceo_strategy_records/,'Portal must persist strategy records');
assert.match(ceo,/async function saveStrategy\(/,'Strategy tab must save records');
assert.match(ceo,/function renderStrategy\(/,'Strategy tab must render monthly history');

assert.match(ceoHtml,/data-tab=["']goals["']/,'Portal must expose Livro de Metas tab');
assert.match(ceoHtml,/id=["']goalBookCards["']/,'Livro de Metas must show all monthly goals');
assert.match(ceoHtml,/id=["']openMonthGoalsFromBook["']/,'Livro de Metas must edit general goals');
assert.match(ceo,/goals:\['Livro de Metas'/,'Portal titles must include Livro de Metas');
assert.match(ceo,/if\(id==='goals'\)/,'Livro de Metas tab must render its content');
assert.match(ceoHtml,/id=["']quickPresenceSearch["']/,'Today must expose quick presence search');
assert.match(ceoHtml,/id=["']saveQuickPresenceBtn["']/,'Quick presence must expose save action');
assert.match(ceo,/async function saveQuickPresence\(/,'Quick presence must persist one person at a time');
assert.match(ceo,/function renderQuickPresenceSearch\(/,'Quick presence must search active professionals');
assert.match(ceo,/function selectQuickPresencePerson\(/,'Quick presence must select a professional');
assert.match(ceoHtml,/class=["'][^"']*strategy-form-grid/,'Strategy form must use readable layout');
assert.match(ceoHtml,/id=["']strategyAgendaText["'][^>]*rows=["']6["']/,'Strategy agenda textarea must be larger');

assert.match(ceo,/META NÃO DEFINIDA/,'Zero goals must be shown as not defined, not as a real target');
assert.match(auth,/password\.length<8/,'New signups must require at least 8 password characters');

assert.match(ceo,/approvalsLoadError/,'Approval load errors must not be rendered as zero counts');

assert.doesNotMatch(ceo,/awaiting_signup|Aguardando cadastro|Pré-aprovado/,'Aprovações must not show pre-approved users without real accounts');
assert.match(ceo,/raiox_app_users\?select=user_id,person_id,display_name,email,role,active,approval_status/,'Aprovações must load real RAIO X accounts');

assert.match(html,/month-live\.js/,'Main RAIO X must load live month data');
assert.match(monthLive,/ceo_months\?select=/,'Live month must read the open CEO month');
assert.match(monthLive,/raiox_performance_records\?select=/,'Live month must read current-month performance');
assert.match(monthLive,/goal_research/,'Live month must include research target');
assert.match(monthLive,/goal_couples/,'Live month must include couples target');
assert.match(monthLive,/goal_sales/,'Live month must include sales target');
assert.match(monthLive,/goal_vgv/,'Live month must include VGV target');
assert.match(monthLive,/currentMonthEmpty/,'Live month must clear stale previous-month data');

assert.match(html,/id=["']monthCurrentSelect["']/,'Central must expose a month selector');
assert.match(html,/id=["']monthCurrentLabel["']/,'Central must show the selected month label');
assert.match(monthLive,/sessionStorage\.setItem\('raiox\.view\.month\.v1'/,'Month selection must persist within the session');
assert.match(monthLive,/order=ref_month\.desc/,'Month selector must load current and historical months');
assert.doesNotMatch(monthLive,/status=eq\.open&order=ref_month/,'Month selector must not be restricted to the open month');
assert.match(monthLive,/month\.status===['"]closed['"]/,'Historical months must be marked as closed');

assert.match(monthLive,/function renderDynamicMonth\(/,'Non-September months must render from monthly database records');
assert.match(monthLive,/month\.ref_month===['"]2026-09-01['"]/,'September must remain isolated as the closed legacy history');
assert.match(monthLive,/function dynamicRank\(/,'Current months must render Ranking dynamically');
assert.match(monthLive,/function dynamicIndividual\(/,'Current months must render Individual dynamically');
assert.match(monthLive,/function dynamicFx\(/,'Current months must render FX dynamically');
assert.match(monthLive,/function dynamicDiagnosis\(/,'Current months must render Diagnosis dynamically');
assert.match(monthLive,/function dynamicProfile\(/,'Current months must explicitly handle profile data availability');
assert.match(monthLive,/function dynamicProjection\(/,'Current months must render projections dynamically');
assert.match(monthLive,/function dynamicCosts\(/,'Current months must render costs dynamically');

assert.match(ceoHtml,/id=["']personGoalResearch["']/,'Professional goals must include Research');
assert.match(ceo,/research_goal:Number\(\$\(['"]personGoalResearch['"]\)/,'Professional Research goal must be persisted');
assert.match(ceo,/goalProgress\(['"]Pesquisas['"]/,'Professional Raio-X must render Research goal');
assert.match(ceo,/syncAccessLinkForPerson/,'Professional save must link exact-email access records');
assert.match(ceo,/disableAccessForPerson/,'Distrato must block linked access safely');
assert.match(ceo,/password\.length<8/,'CEO user creation/reset UI must require at least 8 characters');
assert.doesNotMatch(ceo,/mínimo 6 caracteres|pelo menos 6 caracteres/,'CEO UI must not advertise six-character passwords');
