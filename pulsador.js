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
const sales=read('pul-sales'),q=read('pul-q'),gifts=read('pul-gifts'),minimum=read('pul-minimum'),other=read('pul-other'),vgv=read('pul-vgv'),rooms=read('pul-rooms'),slots=read('pul-slots'),points=read('pul-points');
const payroll=current*Math.max(unit,minimum),totalCost=payroll+gifts+other,capacity=rooms*slots*days;
const pct=(a,b)=>b?format(100*a/b)+'%':'—';
const avg=(a,b)=>b?format(a/b):'—';
const costAvg=(a,b)=>b?currency(a/b):'—';

const output=[
['pul-headcount',format(increase),increase>=0?'profissionais adicionais':'redução de equipe'],
['pul-fixed',currency(costNow),'custo mensal estimado • antes '+currency(costBefore)],
['pul-output',format(target),'meta total de casais'],
['pul-percap',format(productivity),'casais por captador no mês'],
['pul-day',format(perDay),'casais por dia de operação'],
['pul-gap',format(target-goal),(target-goal)>=0?'acima da meta de referência':'abaixo da meta de referência'],
['pul-conversion',pct(sales,target),'vendas ÷ casais'],['pul-qrate',pct(q,target),'Q ÷ casais'],['pul-giftunit',costAvg(gifts,target),'brindes ÷ casais'],['pul-totalcost',currency(totalCost),'equipe + brindes + outros'],['pul-costsale',costAvg(totalCost,sales),'custo total ÷ vendas'],['pul-capacity',rooms&&slots?format(capacity):'—','atendimentos no período'],['pul-point',avg(target,points),'casais por ponto'],['pul-ticket',costAvg(vgv,sales),'VGV ÷ vendas']
];
for(const [id,value,sub] of output){const node=$(id);if(node){node.querySelector('strong').textContent=value;node.querySelector('small').textContent=sub;}}
const info=$('pul-analysis');if(info)info.textContent='Equipe: '+format(before)+' → '+format(current)+' profissionais. Custo adicional: '+currency(costNow-costBefore)+'. Crescimento planejado: '+format(delta)+' casais sobre a base de '+format(base)+'. '+(bonusPerNew===null?'Não há incremento positivo de equipe para calcular casais adicionais por novo captador.':'Cada novo captador precisaria contribuir, em média, com '+format(bonusPerNew)+' casais adicionais para sustentar esse crescimento.')+(rooms&&slots?(target>capacity?' ALERTA: meta supera a capacidade das salas em '+format(target-capacity)+' atendimentos.':' Capacidade de salas suficiente para o volume projetado.'):' Informe salas e atendimentos por dia para conferir a capacidade.')+(q>target?' ALERTA: Q supera casais.':'')+(sales>target?' ALERTA: vendas superam casais.':'')+' Regime: '+($('pul-shift')?.value||'diurno')+'. Cenário de planejamento, não resultado real.';
}
function init(){
const root=$('pulsador');if(!root)return;
root.querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',calculate);el.addEventListener('change',calculate)});
$('pul-reset')?.addEventListener('click',()=>{
const values={'pul-before':11,'pul-current':20,'pul-unit':1500,'pul-base':300,'pul-target':450,'pul-days':22,'pul-goal':605,'pul-sales':0,'pul-q':0,'pul-gifts':0,'pul-minimum':0,'pul-other':0,'pul-vgv':0,'pul-rooms':0,'pul-slots':0,'pul-points':0};
for(const [id,val] of Object.entries(values))$(id).value=val;
$('pul-shift').value='diurno';
calculate();
});
calculate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
