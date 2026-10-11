(()=>{
const $=id=>document.getElementById(id), cfg=window.RAIOX_AUTH_CONFIG||{}, STORE='raiox.auth.session.v1';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function session(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch(_){return null}}
async function rest(path){const s=session();const r=await fetch(cfg.url+'/rest/v1/'+path,{headers:{apikey:cfg.key,Authorization:'Bearer '+s.access_token}});if(!r.ok)throw Error(await r.text());return r.json()}
function classify(r){
 let reasons=[]; if(Number(r.age_1||0)<25)reasons.push('homem abaixo de 25 anos'); if(Number(r.age_2||0)<18)reasons.push('mulher abaixo de 18 anos');
 if(!/casad|uniao|união/.test(norm(r.relationship_type)))reasons.push('relacionamento fora da regra');
 if(Number(r.income||0)<15000)reasons.push('renda abaixo de R$ 15 mil');
 if(!r.credit_card||/nao|não/.test(norm(r.credit_card)))reasons.push('sem cartão de crédito');
 if(!r.own_home||/nao|não/.test(norm(r.own_home)))reasons.push('sem casa própria');
 if(!r.car_year||Number(r.car_year)<2011)reasons.push('sem carro 2011+');
 if(/do lar/.test(norm(r.profession_1))||/do lar/.test(norm(r.profession_2)))reasons.push('profissão fora: do lar');
 if(/campos do jordao|campos do jordão/.test(norm(r.city)))reasons.push('Campos do Jordão / residência local');
 return {n:reasons.length,reasons,status:reasons.length===0?'PERFIL COMPLETO':reasons.length===1?'PERFIL ACEITÁVEL':'FORA DO PERFIL'};
}
function answer(q,rows){
 const n=norm(q), sales=rows.filter(r=>Number(r.sale_value)>0), cls=rows.map(r=>({...r,_c:classify(r)}));
 if(n.includes('brinde')){const total=rows.reduce((a,r)=>a+Number(r.gift_value||0),0);return 'Foram '+rows.length+' casais e '+money(total)+' em brindes. Média: '+money(rows.length?total/rows.length:0)+' por casal.'}
 if(n.includes('exce')||n.includes('fora do perfil')){const out=cls.filter(r=>r._c.n>=2), one=cls.filter(r=>r._c.n===1), ok=cls.filter(r=>r._c.n===0);return ok.length+' perfil completo, '+one.length+' com 1 exceção aceitável e '+out.length+' fora do perfil (2 ou mais exceções).'}
 if(n.includes('mais compra')||n.includes('mais compr')){const buckets={};sales.forEach(r=>{const k=r.profile_status||classify(r).status;(buckets[k]??=[]).push(r)});const best=Object.entries(buckets).sort((a,b)=>b[1].length-a[1].length)[0];return best?'O grupo com mais vendas é '+best[0]+', com '+best[1].length+' vendas nesta base.':'Ainda não há vendas suficientes na base de perfil.'}
 if(n.includes('profiss')){const m={};sales.forEach(r=>[r.profession_1,r.profession_2].filter(Boolean).forEach(p=>m[p]=(m[p]||0)+1));const top=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,3);return top.length?'Profissões mais presentes nos casais compradores: '+top.map(x=>x[0]+' ('+x[1]+')').join(', ')+'.':'Sem dados suficientes.'}
 return 'Nesta base: '+rows.length+' casais, '+sales.length+' vendas e '+money(sales.reduce((a,r)=>a+Number(r.sale_value||0),0))+' de VGV. Pergunte sobre brindes, exceções, perfil que mais compra ou profissões.';
}
async function load(){
 if(!$('profileIntelSummary'))return;
 try{
  const month=$('monthSelect')?.value||new Date().toISOString().slice(0,7)+'-01';
  const rows=await rest('raiox_couple_profiles?select=*&ref_month=eq.'+month+'&order=attended_on.asc');
  window.__profileRows=rows; const cls=rows.map(r=>classify(r)); const full=cls.filter(x=>x.n===0).length, one=cls.filter(x=>x.n===1).length, out=cls.filter(x=>x.n>=2).length;
  const gifts=rows.reduce((a,r)=>a+Number(r.gift_value||0),0), sales=rows.filter(r=>Number(r.sale_value)>0);
  $('profileIntelSummary').innerHTML=[['Casais',rows.length],['Vendas',sales.length],['Perfil completo',full],['1 exceção',one],['Fora do perfil',out],['Brinde/casal',money(rows.length?gifts/rows.length:0)]].map(x=>'<div class="summary-card"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
  $('profileIntelAnswer').innerHTML='<span>Base carregada: '+rows.length+' casais. Faça uma pergunta ao RAIO X.</span>';
 }catch(e){$('profileIntelAnswer').textContent='A base de perfil ainda não foi importada para este mês.'}
}
document.addEventListener('click',e=>{if(e.target.id==='askProfileIntel'){const q=$('profileIntelQuestion').value.trim();$('profileIntelAnswer').textContent=answer(q,window.__profileRows||[])} if(e.target.dataset.profileQuestion){$('profileIntelQuestion').value=e.target.dataset.profileQuestion;$('profileIntelAnswer').textContent=answer(e.target.dataset.profileQuestion,window.__profileRows||[])}});
document.addEventListener('DOMContentLoaded',()=>setTimeout(load,1200));
})();