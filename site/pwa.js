/* PWA bootstrapping; no automatic cloud writes and no notification permission prompts. */
(() => {
 'use strict';
 if(!('serviceWorker' in navigator)||!['https:','http:'].includes(location.protocol))return;
 const safeContext=location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname);
 if(!safeContext)return;
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('离线资源缓存暂不可用',e)));
 const banner=document.createElement('div');banner.className='suite-offline-banner';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');banner.textContent='当前离线：可以继续编辑本机科研记录，云端同步将在联网后核对版本，确认安全后续传。';
 document.body.appendChild(banner);
 const update=()=>{banner.hidden=navigator.onLine;document.documentElement.classList.toggle('suite-offline',!navigator.onLine)};
 window.addEventListener('online',update);window.addEventListener('offline',update);update();
})();
