(()=>{
const cfg=window.RAIOX_AUTH_CONFIG||{}, KEY='raiox.phone.access.token.v1';
const $=id=>document.getElementById(id), gate=$('authGate'), shell=$('raioxAppShell'), msg=$('phoneAccessMessage');
const headers={'apikey':cfg.key,'Authorization':'Bearer '+cfg.key,'Content-Type':'application/json'};\nconst LEGACY='raiox.auth.session.v1';
function showApp(name){if(gate)gate.hidden=true;if(shell)shell.hidden=false;document.body.classList.add('raiox-access-approved');if(name)localStorage.setItem('raiox.access.name',name)}
function say(t,ok=false){if(msg){msg.textContent=t;msg.className='auth-message '+(ok?'success':'')}}
async function status(token){const r=await fetch(cfg.url+'/rest/v1/rpc/raiox_access_status',{method:'POST',headers,body:JSON.stringify({p_token:token})});if(!r.ok)return null;const a=await r.json();return a&&a[0]}
async function legacyCeo(){try{const old=JSON.parse(localStorage.getItem(LEGACY)||'null');if(!old?.access_token)return false;const r=await fetch(cfg.url+'/rest/v1/raiox_app_users?select=display_name,role,active,approval_status&user_id=eq.'+encodeURIComponent(old.user?.id||''),{headers:{apikey:cfg.key,Authorization:'Bearer '+old.access_token}});if(!r.ok)return false;const a=await r.json(),u=a?.[0];if(u?.active&&u?.approval_status==='approved'&&['ceo','manager'].includes(u.role)){showApp(u.display_name);window.RAIOX_AUTH={user:old.user,access:u,session:old};return true}}catch{}return false}\nasync function check(){\n if(await legacyCeo())return;
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
 const r=await fetch(cfg.url+'/rest/v1/rpc/raiox_request_access',{method:'POST',headers,body:JSON.stringify({p_full_name:full_name,p_phone:phone,p_device_token:token})});\n if(r.ok){const data=await r.json();localStorage.setItem(KEY,data?.token||token);if(data?.status==='approved'){return showApp(data?.name||full_name)}say('Solicitação enviada. Aguardando aprovação do CEO.',true);return}
 if(r.status===409){say('Este telefone já possui uma solicitação. A gestão pode revisar o acesso no Portal CEO.');return}
 say('Não foi possível solicitar agora. Tente novamente.');
});
check();
})();