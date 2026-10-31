/* ScholarFlow Research Suite 2026.11.3: weekly planning and PDF reading annotations.
   Standalone knowledge-centre / global-search UI retired by request. No data deletion. */
(function (root) {
 'use strict';
 const MODS={projects:'科研项目',tasks:'待办事项',advisor:'老师事务',literature:'文献中心',notes:'记录想法',simulations:'程序调试',experiments:'实验记录',papers:'论文跟踪',files:'核心文件',patents:'专利',conferences:'会议',awards:'获奖',simulationCodes:'仿真代码',experimentDatasets:'实验数据'};
 const TYPES=Object.keys(MODS), LABELS={planner:'周计划与提醒'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const dt=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?s:'';
 const today=()=>new Date().toLocaleDateString('sv-SE');
 const makeId=()=>globalThis.crypto?.randomUUID?.()||'suite-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const dayDiff=s=>Math.round((new Date(dt(s)+'T12:00:00').getTime()-new Date(today()+'T12:00:00').getTime())/86400000);
 let ctx=null;
 const db=()=>ctx?.getData();
 const records=()=>TYPES.flatMap(type=>(Array.isArray(db()?.[type])?db()[type]:[]).filter(x=>x&&typeof x==='object'&&x.id).map(x=>({type,id:x.id,title:String(x.title||x.name||x.code||'未命名记录'),r:x})));
 const lookup=(t,i)=>records().find(x=>x.type===t&&x.id===i);
 const option=(value,label,selected)=>`<option value="${esc(value)}"${value===selected?' selected':''}>${esc(label)}</option>`;
 const options=(a,selected)=>a.map(x=>option(x[0],x[1],selected)).join('');
 const btn=(text,action,more='')=>`<button type="button" class="btn btn-outline btn-sm" data-suite-action="${action}" ${more}>${text}</button>`;
 function section(title,subtitle,body){return `<section class="suite-panel card"><div class="suite-panel-title"><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div>${body}</section>`}
 function heading(name,desc){return `<div class="workspace-title suite-title"><div><h1>${name}</h1><p>${desc}</p></div></div>`}
 function saveAndRender(success){if(ctx.save()){ctx.render();ctx.toast(success);return true}ctx.render();return false}
 // The weekly planner lives next to Tasks / Advisor in the 科研日常 navigation group.
 function navHtml(){return `<button type="button" class="nav suite-nav ${ctx?.page()==='planner'?'active':''}" data-suite-route="planner" ${ctx?.page()==='planner'?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">◷</span><span>周计划与提醒</span></button>`}
 function dueItems(){let arr=[];for(const type of ['tasks','advisor','papers','projects'])for(const r of db()?.[type]||[]){if(!r||typeof r!=='object'||!r.id)continue;const d=dt(r.deadline)||dt(r.revisionDeadline)||dt(r.plannedSubmissionDate);if(!d)continue;if(['已完成','已发表','已接收'].includes(r.status))continue;arr.push({type,id:r.id,title:r.title||'未命名事项',date:d,remaining:dayDiff(d),priority:r.priority||''})}return arr.sort((a,b)=>a.date.localeCompare(b.date))}
 function bottomBarHtml(){return `<nav class="suite-bottom-bar" aria-label="手机快捷导航">${[['home','⌂','首页'],['tasks','☑','待办'],['literature','▤','文献'],['planner','◷','计划'],['menu','☷','更多']].map(([id,icon,label])=>`<button type="button" ${id==='menu'?'data-action="menu"':`data-suite-route="${id}"`} ${ctx?.page()===id?'aria-current="page"':''}><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav>`}
 function homeRibbon(){
  const planned=(db()?.weeklyPlans||[]).filter(x=>!x.done),near=dueItems().filter(x=>x.remaining>=0&&x.remaining<=7),overdue=dueItems().filter(x=>x.remaining<0);
  const next=near[0]||overdue[0];
  return `<section class="suite-week-overview" aria-label="本周科研计划摘要">
   <div class="suite-week-heading"><span class="suite-week-kicker">WEEKLY FOCUS · 科研日常</span><h2>本周安排</h2><p>${next?`最近截止：${esc(next.title)} · ${esc(next.date)}`:'合理安排研究节奏，让每一步都有记录'}</p></div>
   <div class="suite-week-summary" aria-label="计划及截止事项统计"><div><strong>${planned.length}</strong><span>待完成计划</span></div><div><strong>${near.length}</strong><span>未来七天截止</span></div>${overdue.length?`<div class="is-overdue"><strong>${overdue.length}</strong><span>逾期关注</span></div>`:''}</div>
   <button type="button" class="suite-week-go" data-suite-route="planner" aria-label="打开周计划与截止提醒">查看周计划 <span aria-hidden="true">→</span></button>
  </section>`;
 }
 function notesFor(id){return (db().annotations||[]).filter(a=>a.literatureId===id).sort((a,b)=>Number(a.page||0)-Number(b.page||0))}
 function pdfSidecarHtml(litId){const r=db()?.literature.find(x=>x.id===litId),anns=notesFor(litId);return `<aside class="suite-pdf-sidecar" aria-label="文献精读批注"><h3>精读摘录与页码批注</h3><p class="suite-hint">在 PDF 内选中文本后复制并粘贴至摘录框；标记保存在侧边栏，不会写入原 PDF 文件。</p><form id="suite-pdf-annotation-form"><input type="hidden" name="literatureId" value="${esc(litId)}"><label>页码<input name="page" class="input" type="number" min="1" max="100000" required value="1"></label><label>原文摘录<textarea name="quote" class="textarea" maxlength="10000" rows="3" required placeholder="复制 PDF 中需要标记的原文"></textarea></label><label>颜色<select name="color" class="select">${options([['yellow','黄色标记'],['blue','蓝色标记'],['green','绿色标记'],['pink','粉色标记']],'yellow')}</select></label><label>阅读批注<textarea name="note" class="textarea" maxlength="20000" rows="3" placeholder="研究意义、疑问、方法等"></textarea></label><button class="btn" type="submit">保存摘录</button></form><div class="suite-sidecar-list"><h4>批注 ${anns.length} 条</h4>${anns.map(a=>annotationCard(a)).join('')||'<p class="suite-hint">暂无批注</p>'}</div>${btn('导出批注 Markdown','export-notes',`data-lit-id="${esc(litId)}"`)}</aside>`}
 function annotationCard(a){return `<article class="suite-annotation-card suite-mark-${esc(a.color)}"><div class="suite-annotation-meta"><strong>第 ${Number(a.page)||1} 页</strong><button type="button" class="suite-delete" data-suite-remove-annotation="${esc(a.id)}">删除</button></div><blockquote>${esc(a.quote)}</blockquote>${a.note?`<p>${esc(a.note)}</p>`:''}</article>`}
 function dateRow(x){const name=MODS[x.type]||x.type;return `<button type="button" class="suite-due-item ${x.remaining<0?'is-late':x.remaining===0?'is-today':''}" data-suite-goto="${x.type}:${esc(x.id)}"><span><strong>${esc(x.title)}</strong><small>${esc(name)} · ${esc(x.date)}</small></span><em>${x.remaining<0?'逾期 '+(-x.remaining)+' 天':x.remaining===0?'今天截止':'还有 '+x.remaining+' 天'}</em></button>`}
 const isoDateAdd=(base,n)=>{let d=new Date(base+'T12:00:00');d.setDate(d.getDate()+n);return d.toLocaleDateString('sv-SE')};
 function plannerPage(){const cur=today(),dow=(new Date(cur+'T12:00:00').getDay()+6)%7,monday=isoDateAdd(cur,-dow),week=Array.from({length:7},(_,n)=>isoDateAdd(monday,n));const due=dueItems(),plans=db().weeklyPlans||[],near=due.filter(d=>d.remaining<=14);
 return heading('截止提醒与每周科研计划','统一查看任务、论文返修、项目和导师事务的截止时间')+
 section('需要关注的截止事项',`未来 14 天及已经逾期的记录 · ${near.length} 项`, `<div class="suite-due-list">${near.length?near.map(dateRow).join(''):'<div class="suite-empty">目前没有临近截止或逾期事项。</div>'}</div><div class="suite-actions">${btn('开启本页通知','notify-enable')}${btn('检测本周提醒','notify-check')}</div><p class="suite-hint">浏览器通知需授权；只在工作台打开时检查，不保证关闭浏览器后准时推送。</p>`)+
 section('本周科研安排',`周一 ${week[0]} — 周日 ${week[6]}`,`<form id="suite-plan-form" class="suite-plan-form"><label>计划日期<input type="date" class="input" name="date" min="${week[0]}" max="${week[6]}" value="${cur}" required></label><label>本周计划内容<input class="input" name="title" maxlength="200" required placeholder="例如：阅读两篇热解烧蚀论文"></label><button class="btn" type="submit">＋ 添加计划</button></form><div class="suite-week-grid">${week.map((date,i)=>{const x=plans.filter(p=>p.date===date);const d=due.filter(z=>z.date===date);return `<section class="suite-day ${date===cur?'is-today':''}"><header><b>${['一','二','三','四','五','六','日'][i]}</b><small>${date.slice(5)}</small></header>${x.map(p=>`<label class="suite-plan-item"><input type="checkbox" data-suite-plan-check="${esc(p.id)}" ${p.done?'checked':''}><span class="${p.done?'done':''}">${esc(p.title)}</span><button type="button" data-suite-plan-delete="${esc(p.id)}" aria-label="删除计划">×</button></label>`).join('')}${d.map(r=>`<button class="suite-deadline-chip" data-suite-goto="${r.type}:${esc(r.id)}">⏰ ${esc(r.title)}</button>`).join('')}${!x.length&&!d.length?'<span class="suite-muted">暂无安排</span>':''}</section>`}).join('')}</div>`) }
 function renderPage(p){return p==='planner'?plannerPage():''}
 function toastMessage(txt){ctx?.toast(txt)}
 function navigateRecord(ref){const idx=String(ref).indexOf(':'),type=ref.slice(0,idx),id=ref.slice(idx+1);if(!lookup(type,id))return toastMessage('记录已不存在，请刷新检查');const route=['projects','patents','conferences','awards','simulationCodes','experimentDatasets'].includes(type)?{projects:'projects',patents:'statistics',conferences:'statistics',awards:'statistics',simulationCodes:'simulations',experimentDatasets:'experiments'}[type]:type;if(ctx.openRecord(type,id))return;ctx.go(route);toastMessage('已进入 '+(MODS[type]||type)+' 模块');}
 function download(name,text,format='text/plain'){const blob=new Blob([text],{type:format+';charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)}
 function exportNotes(id){const notes=(db().annotations||[]).filter(a=>!id||a.literatureId===id);const lines=['# ScholarFlow 文献精读批注',''];for(const a of notes){const rec=lookup('literature',a.literatureId);lines.push('## '+(rec?.title||'文献已删除')+' — 第 '+a.page+' 页','',a.quote,'',a.note||'','')}download('ScholarFlow-阅读批注.md',lines.join('\n'),'text/markdown')}
 async function notifyCheck(){if(!('Notification' in root))return toastMessage('当前浏览器不支持通知，可在周计划页面直接查看截止事项');if(Notification.permission!=='granted')return toastMessage('请先授权通知');const due=dueItems().filter(d=>d.remaining>=0&&d.remaining<=3);if(!due.length)return toastMessage('未来 3 天没有即将截止的事项');try{new Notification('ScholarFlow 截止提醒',{body:`未来 3 天有 ${due.length} 项截止，最近：${due[0].title}`});toastMessage('已发送当前会话提醒')}catch{toastMessage('通知被浏览器限制，请查看周计划页面')}}
 function click(e){const button=e.target.closest('[data-suite-action],[data-suite-route],[data-suite-goto],[data-suite-delete-link],[data-suite-remove-annotation],[data-suite-plan-delete]');if(!button)return;
 if(button.dataset.suiteRoute){ctx.go(button.dataset.suiteRoute);return}
 if(button.dataset.suiteGoto){navigateRecord(button.dataset.suiteGoto);return}
 if(button.dataset.suiteRemoveAnnotation){if(!confirm('确定删除这条批注？'))return;db().annotations=db().annotations.filter(x=>x.id!==button.dataset.suiteRemoveAnnotation);if(ctx.save()){const open=document.querySelector('.suite-pdf-sidecar');if(open){const litId=open.querySelector('[name="literatureId"]')?.value;open.outerHTML=pdfSidecarHtml(litId)}else ctx.render();ctx.toast('批注已删除')}else ctx.render();return}
 if(button.dataset.suitePlanDelete){db().weeklyPlans=db().weeklyPlans.filter(x=>x.id!==button.dataset.suitePlanDelete);saveAndRender('计划已删除');return}
 const action=button.dataset.suiteAction;if(!action)return;
 if(action==='planner'){ctx.go('planner');return}
 if(action==='pdf-notes'){ctx.openPdf(button.dataset.litId);return}
 if(action==='export-notes'){exportNotes(button.dataset.litId);return}
 if(action==='notify-enable'){if(!('Notification' in root))return toastMessage('当前浏览器不支持通知');if(Notification.permission==='granted')return notifyCheck();Notification.requestPermission().then(p=>toastMessage(p==='granted'?'通知已授权，工作台打开时可以提醒':'通知未授权；仍可在页面查看截止日期'));return}
 if(action==='notify-check'){notifyCheck();return}
 }
 function change(e){const el=e.target;
  if(el.dataset.suitePlanCheck){const p=db().weeklyPlans.find(x=>x.id===el.dataset.suitePlanCheck);if(!p)return;p.done=el.checked;p.updatedAt=new Date().toISOString();saveAndRender('计划状态已保存')}
 }
 function submit(e){
 if(e.target.id==='suite-plan-form'){e.preventDefault();const fd=new FormData(e.target),date=dt(fd.get('date')),title=String(fd.get('title')||'').trim().slice(0,200);if(!date||!title)return toastMessage('请输入日期和计划内容');db().weeklyPlans.push({id:makeId(),date,title,done:false,createdAt:new Date().toISOString()});saveAndRender('周计划已添加')}
 if(e.target.id==='suite-pdf-annotation-form'){e.preventDefault();const fd=new FormData(e.target),literatureId=String(fd.get('literatureId')||''),page=Number(fd.get('page')),quote=String(fd.get('quote')||'').trim().slice(0,10000),note=String(fd.get('note')||'').trim().slice(0,20000),color=String(fd.get('color')||'yellow');if(!lookup('literature',literatureId)||!Number.isInteger(page)||page<1||page>100000||!quote)return toastMessage('批注需要有效文献、页码和摘录');db().annotations.push({id:makeId(),literatureId,page,quote,note,color:['yellow','blue','green','pink'].includes(color)?color:'yellow',createdAt:new Date().toISOString()});if(ctx.save()){const panel=document.querySelector('.suite-pdf-sidecar');if(panel)panel.outerHTML=pdfSidecarHtml(literatureId);else ctx.render();ctx.toast('批注已保存')}else ctx.render()}}
 let started=false;function init(api){ctx=api;if(started)return;started=true;
 document.addEventListener('click',click);document.addEventListener('change',change);document.addEventListener('submit',submit)}
 root.SFResearchSuite={init,navHtml,renderPage,pdfSidecarHtml,homeRibbon,bottomBarHtml,pageName:k=>LABELS[k],modules:Object.keys(LABELS)};
})(window);
