/* RAIO X — PULSADOR • Simulador gerencial independente */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const format=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
const currency=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2}).format(n);
const read=(id,min=0)=>Math.max(min,Number($(id)?.value)||0);
function calculate(){
const before=read('pul-before'),current=read('pul-current'),unit=read('pul-unit'),base=read('pul-base'),target=read('pul-target'),days=read('pul-days',1),goal=read('pul-goal');
const increase=current-before;
const costBefore=before*unit,costNow=current*unit;
const productivity= current?target/current:0;
const delta=target-base;
const perDay=target/days;
const bonusPerNew=increase>0?delta/increase:null;
const output=[
['pul-headcount',format(increase),increase>=0?'profissionais adicionais':'redução de equipe'],
['pul-fixed',currency(costNow),'custo mensal estimado • antes '+currency(costBefore)],
['pul-output',format(target),'meta total de casais'],
['pul-percap',format(productivity),'casais por captador no mês'],
['pul-day',format(perDay),'casais por dia de operação'],
['pul-gap',format(target-goal),(target-goal)>=0?'acima da meta de referência':'abaixo da meta de referência']
];
for(const [id,value,sub] of output){const node=$(id);if(node){node.querySelector('strong').textContent=value;node.querySelector('small').textContent=sub;}}
const info=$('pul-analysis');if(info)info.textContent='Equipe: '+format(before)+' → '+format(current)+' profissionais. Custo adicional: '+currency(costNow-costBefore)+'. Crescimento planejado: '+format(delta)+' casais sobre a base de '+format(base)+'. '+(bonusPerNew===null?'Não há incremento positivo de equipe para calcular casais adicionais por novo captador.':'Cada novo captador precisaria contribuir, em média, com '+format(bonusPerNew)+' casais adicionais para sustentar esse crescimento.')+' Este é um cenário de planejamento, não um resultado real.';
}
function init(){
const root=$('pulsador');if(!root)return;
root.querySelectorAll('input').forEach(el=>el.addEventListener('input',calculate));
$('pul-reset')?.addEventListener('click',()=>{
const values={'pul-before':11,'pul-current':20,'pul-unit':1500,'pul-base':300,'pul-target':450,'pul-days':22,'pul-goal':605};
for(const [id,val] of Object.entries(values))$(id).value=val;
calculate();
});
calculate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
