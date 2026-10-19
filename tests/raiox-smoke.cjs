const { chromium, devices } = require('playwright');
const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({headless:true});
const base='https://aureon-tech.github.io/RAIO-X/?qa='+Date.now();
const devicesToTest=[
 {name:'galaxy-a14',viewport:{width:412,height:915},isMobile:true,deviceScaleFactor:2},
 {name:'small-android',viewport:{width:360,height:740},isMobile:true,deviceScaleFactor:2},
 {name:'desktop',viewport:{width:1366,height:850},isMobile:false,deviceScaleFactor:1}
];
let failures=0;
for(const profile of devicesToTest){
 const context=await browser.newContext({...profile,hasTouch:profile.isMobile});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(5000);
 await page.evaluate(()=>{document.querySelector('#cin')?.classList.add('hide');const app=document.querySelector('.app');if(app)app.style.display='';});
 const tabs=['dash','rank','ind','fx','diag','perfil','proj','custos','gestao'];
 for(const id of tabs){
  const button=page.locator('.bottom [data-go="'+id+'"]');
  if(!await button.count()){console.log('FAIL missing button',profile.name,id);failures++;continue;}
  await button.click({timeout:10000});
  await page.waitForTimeout(id==='gestao'?5500:500);
  const on=await page.locator('#'+id+'.sec.on').count();
  if(!on){console.log('FAIL tab',profile.name,id);failures++;}
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+5);
  if(overflow){console.log('WARN horizontal page overflow',profile.name,id);}
  if(id==='gestao'){
   const text=await page.locator('#rb-content').innerText();
   if(/Abra a aba para carregar|Consultando o banco de dados/.test(text)){console.log('FAIL management stalled',profile.name);failures++;}
   console.log('MANAGEMENT',profile.name,text.slice(0,180).replace(/\n/g,' '));
  }
  if(id==='dash'||id==='gestao')await page.screenshot({path:'qa-'+profile.name+'-'+id+'.png',fullPage:true});
 }
 // Non-destructive controls: month, area, individual, rankings, report refresh.
 await page.locator('.bottom [data-go="dash"]').click();
 for(const id of ['monthCurrentSelect','areaSel']){
  const sel=page.locator('#'+id);
  if(!await sel.count()||!await sel.isVisible()){console.log('FAIL missing/hidden filter',profile.name,id);failures++;}
  else if(await sel.locator('option').count()===0){console.log('FAIL empty filter',profile.name,id);failures++;}
 }
 await page.locator('.bottom [data-go="ind"]').click();
 const individual=page.locator('#sel');
 if(await individual.count()&&await individual.locator('option').count()>1){
  await individual.selectOption({index:1});await page.waitForTimeout(250);
  const chosen=await individual.inputValue();if(!chosen){console.log('FAIL individual selection',profile.name);failures++;}
 }
 await page.locator('.bottom [data-go="rank"]').click();
 const ranking=page.locator('#rm');
 if(await ranking.count()&&await ranking.locator('option').count()>1){await ranking.selectOption({index:1});await page.waitForTimeout(250);}
 await page.locator('.bottom [data-go="gestao"]').click();
 await page.locator('#rb-refresh').click();
 await page.waitForTimeout(2500);
 const report=await page.locator('#rb-content').innerText();
 if(/Consultando resultados oficiais|Consultando o banco de dados/.test(report)){console.log('WARN report still loading',profile.name);}
 const buttons=['rb-refresh','rb-ppt','rb-csv'];
 for(const id of buttons){const b=page.locator('#'+id);if(!await b.count()||!await b.isEnabled()){console.log('FAIL report button',profile.name,id);failures++;}}
 const selectors=await page.evaluate(()=>[...document.querySelectorAll('select')].map(s=>({id:s.id,options:s.options.length,disabled:s.disabled})));
 console.log('SELECTS',profile.name,JSON.stringify(selectors));
 console.log('JS ERRORS',profile.name,JSON.stringify(errors.slice(0,12)));
 if(errors.length)failures+=errors.length;
 await context.close();
}
await browser.close();
console.log('TOTAL FAILURES',failures);
process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
