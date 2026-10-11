(()=>{
const cfg=window.RAIOX_AUTH_CONFIG||{}, KEY='raiox.phone.access.token.v1';
const $=id=>document.getElementById(id), gate=$('authGate'), shell=$('raioxAppShell'), msg=$('phoneAccessMessage');
const headers={'apikey':cfg.key,'Authorization':'Bearer '+cfg.key,'Content-Type':'application/json'};
function showApp(name){if(gate)gate.hidden=true;if(shell)shell.hidden=false;document.body.classList.add('raiox-access-approved');if(name)localStorage.setItem('raiox.access.name',name)}
function say(t,ok=false){if(msg){msg.textContent=t;msg.className='auth-message '+(ok?'success':'')}}
async function status(token){const r=await fetch(cfg.url+'/rest/v1/rpc/raiox_access_status',{method:'POST',headers,body:JSON.stringify({p_token:token})});if(!r.ok)return null;const a=await r.json();return a&&a[0]}
async function check(){
 const token=localStorage.getItem(KEY); if(!token)return;
 const st=await status(token);
 if(st?.status==='approved')return showApp(st.full_name);
 if(st?.status==='pending')say('Solicitação enviada. Aguardando aprovação do CEO.');
 if(st?.status==='rejected')say('Acesso não aprovado. Fale com a gestão.');
}
$('phoneAccessForm')?.addEventListener('submit',async e=>{
 e.preventDefault(); const full_name=$('accessFullName').value.trim(), phone=$('accessPhone').value.replace(/\D/g,'');
 if(full_name.split(/\s+/).length<2)return say('Digite seu nome completo.');
 if(phone.length<10)return say('Digite um telefone válido com DDD.');
 say('Enviando solicitação...');
 const token=crypto.randomUUID();
 const r=await fetch(cfg.url+'/rest/v1/raiox_access_requests',{method:'POST',headers:{...headers,'Prefer':'return=representation'},body:JSON.stringify({full_name,phone,device_token:token,status:'pending'})});
 if(r.ok){localStorage.setItem(KEY,token);say('Solicitação enviada. Aguardando aprovação do CEO.',true);return}
 if(r.status===409){say('Este telefone já possui uma solicitação. A gestão pode revisar o acesso no Portal CEO.');return}
 say('Não foi possível solicitar agora. Tente novamente.');
});
check();
})();