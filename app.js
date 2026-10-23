/* ScholarFlow 历史模块 — cohesive design system, usability, integrity and stress fixes. */
(() => {
'use strict';
const BUILD_VERSION='1.1.0';
const PUBLIC_BUILD=globalThis.SCHOLARFLOW_PUBLIC_BUILD===true;
const DBKEY=PUBLIC_BUILD?'scholarflow_public_v128_data':'scholarflow_v1_data'; // Private installation keeps all existing data.
const modules=[
 ['home','工作总览','⌂','首页任务、进度及课题'],
 ['tasks','待办事项','☑','自己与老师安排的事项'],
 ['advisor','老师事务','♧','项目、论文和其他安排'],
 ['literature','文献中心','▤','六类科研文献与 PDF'],
 ['notes','记录想法','✎','创新点、总结和其他想法'],
 ['simulations','程序调试','⚙','UMATHT、UMAT、多场耦合'],
 ['experiments','实验记录','⚗','实验工况、重复试验与数据'],
 ['papers','论文跟踪','▧','写作计划、在写论文和投稿记录'],
 ['statistics','成果统计','▥','论文、专利、学术会议与获奖'],
 ['files','核心文件','▣','路径索引与科研文件定位'],
 ['settings','设置','⚙','科研档案与数据管理']
];
const config={
 tasks:{label:'待办事项',singular:'任务',fields:[['title','任务名称','text',true],['origin','任务来源','select',false,['自己','老师']],['taskType','任务类型','select',false,['科研任务','文献阅读','程序调试','实验研究','论文写作','其他']],['priority','优先级','select',false,['中','高','低']],['status','状态','select',false,['待开始','进行中','已完成']],['startDate','开始日期','date'],['deadline','截止日期','date'],['estimate','预计耗时（小时）','number'],['description','任务说明','textarea']]},
 projects:{label:'科研项目',singular:'项目',fields:[['title','项目名称','text',true],['code','项目编号','text'],['status','状态','select',false,['进行中','筹备中','已完成','已暂停']],['stage','当前研究阶段','select',false,['文献调研','理论建模','仿真验证','实验研究','数据分析','论文撰写']],['progress','无阶段时的手动进度（0-100）','number'],['owner','负责人','text'],['researchGoal','研究目标','textarea'],['researchContent','研究内容','textarea'],['startDate','开始日期','date'],['deadline','截止日期','date'],['milestones','里程碑（逐行输入）','textarea'],['description','研究背景与目标','textarea']]},
 literature:{label:'文献中心',singular:'文献',fields:[['title','文献标题','text',true],['doi','DOI（自动提取）','text'],['authors','作者（自动提取/待核实）','text'],['correspondingAuthor','通讯作者（请核实）','text'],['year','发表年份','number'],['category','分类','select',false,['热解烧蚀','本构模型','多场耦合','航天器再入','气动','其他']],['articleType','文献类型','select',false,['未分类','SCI','中文']],['journal','期刊名','text'],['quartile','分区（JCR / 中科院）','select',false,['未填写','JCR Q1','JCR Q2','JCR Q3','JCR Q4','中科院一区','中科院二区','中科院三区','中科院四区','不适用']],['impactFactor','影响因子（可选）','number'],['metricYear','指标年份','number'],['issn','期刊 ISSN','text'],['metricSource','指标来源 / 版本','text'],['keyFindings','创新点','textarea'],['readStatus','阅读状态','select',false,['未读','待读','阅读中','已精读']],['importance','重要程度','select',false,['中','高','低']],['abstract','摘要和阅读总结','textarea'],['researchQuestion','研究问题','textarea'],['researchMethods','研究方法','textarea'],['abstractZh','摘要','textarea']]},
 notes:{label:'记录想法',singular:'笔记',fields:[['title','标题','text',true],['category','笔记类型','select',false,['创新点','总结','其他']],['tags','标签（逗号分隔）','text'],['content','笔记内容（支持纯文本 / Markdown 源码）','textarea']]},
 simulations:{label:'程序调试',singular:'调试案例',fields:[['title','案例名称','text',true],['category','仿真分类','select',false,['UMATHT','UMAT','多场耦合']],['status','状态','select',false,['计划中','进行中','已完成','待验证']],['codePath','当前代码路径','text'],['code','代码版本或核心代码','textarea'],['verification','验证方案和结论','textarea'],['parameters','仿真参数与边界条件','textarea'],['result','当前调试情况','textarea']]},
 experiments:{label:'实验记录',singular:'实验记录',fields:[['title','实验名称','text',true],['category','实验类型','select',false,['拉伸实验','压缩试验','弯曲实验','热分析','烧蚀实验','其他']],['date','实验日期','date'],['status','实验状态','select',false,['计划中','进行中','已完成']],['method','通用实验方法 / 操作步骤（可选）','textarea'],['dataPath','原始数据总目录（可选）','text'],['conclusion','跨组结论与后续改进（可选）','textarea']]},
 papers:{label:'论文跟踪',singular:'论文',fields:[['title','论文标题','text',true],['category','论文环节','select',false,['写作计划','在写论文','投稿记录']],['journal','目标期刊','text'],['outline','章节大纲 / 写作计划','textarea'],['status','状态','select',false,['准备中','写作中','已投稿','审稿中','返修中','已接收','已发表','已拒稿']],['deadline','写作/返修截止日期','date'],['submissionDate','投稿日期','date'],['publicationDate','发表日期（已发表时填写）','date'],['doi','DOI（可选）','text'],['manuscript','稿件编号','text'],['revisionDeadline','返修截止日期','date'],['progress','写作进度（0-100）','number'],['notes','章节安排、评审意见或修改记录','textarea']]},
 advisor:{label:'老师事务',singular:'老师事务',fields:[['title','事务名称','text',true],['category','分类','select',false,['项目','论文','其他']],['priority','优先级','select',false,['中','高','低']],['status','状态','select',false,['待开始','进行中','已完成']],['date','安排日期','date'],['deadline','截止日期','date'],['description','需做的事','textarea']]},
 timeLogs:{label:'科研时间',singular:'时间记录',fields:[['title','科研活动','text',true],['category','活动类型','select',false,['文献阅读','理论学习','仿真研究','实验研究','论文写作','其他科研']],['date','日期','date'],['hours','用时（小时）','number',true],['description','备注','textarea']]},
 patents:{label:'专利成果',singular:'专利',fields:[['title','专利名称','text',true],['category','专利类型','select',false,['发明专利','实用新型','外观设计','其他']],['applicationNo','申请号','text'],['date','申请日期','date'],['status','状态','select',false,['准备中','已申请','审查中','已授权']],['description','备注','textarea']]}
};
config.files={label:'核心文件',singular:'文件记录',fields:[['title','文件名 / 文件夹名称','text',true],['category','分类','select',false,['论文稿件','仿真代码','实验数据','项目资料','审稿材料','其他']],['path','本地文件或文件夹路径 / HTTPS 链接','text',true],['version','版本','text'],['date','记录日期','date'],['description','内容说明 / 用途','textarea']]};
config.conferences={label:'学术会议成果',singular:'学术会议',fields:[['title','会议名称','text',true],['category','会议类型','select',false,['国际会议','国内会议','学术报告','其他']],['date','会议日期','date'],['location','地点 / 会议方式','text'],['status','状态','select',false,['计划中','已投稿','已录用','已参会']],['presentationType','附加成果类型（可选）','select',false,['未填写','会议报告','会议论文']],['presentationTitle','报告名称 / 会议论文名称（可选）','text']]};
// Two dedicated paper workflows: published outcomes and minimal submission tracking.
// Legacy fields stay in saved JSON for compatibility, but are no longer asked in these forms.
const publishedPaperFields=[
 ['title','论文标题','text',true],
 ['journal','期刊名','text',true],
 ['quartile','分区','select',false,['未填写','JCR Q1','JCR Q2','JCR Q3','JCR Q4','中科院一区','中科院二区','中科院三区','中科院四区','不适用']],
 ['impactFactor','影响因子','number'],
 ['citationFormat','引用格式','textarea'],
 ['authorRole','本人作者身份','select',false,['第一作者','通讯作者','其他作者']],
 ['submissionDate','投稿日期','date'],
 ['publicationDate','发表日期','date'],
 ['doi','DOI（可选）','text']
];
// Dedicated writing workflow; submitting and published-paper records use different minimal forms.
const writingPaperFields=[
 ['title','论文标题','text',true],
 ['category','写作阶段','select',false,['在写论文']],
 ['journal','拟投期刊','text'],
 ['status','写作状态','select',false,['准备中','写作中','待修改','已完成']],
 ['plannedSubmissionDate','计划投稿时间','date'],
 ['fileName','稿件文件名','text'],
 ['fileLocation','稿件存放位置','text'],
 ['deadline','初稿计划完成日期','date']
];
const submissionPaperFields=[
 ['title','论文标题','text',true],
 ['journal','投稿期刊','text',true],
 ['status','投稿阶段','select',false,['Submitted','With Editor','Under Review','Decision in Process','Revise','Accept','Reject','Resubmitted','Withdrawn']],
 ['submissionDate','投稿日期','date']
];
config.awards={label:'获奖成果',singular:'获奖记录',fields:[['title','奖项名称','text',true],['category','奖项类别','select',false,['科研奖','竞赛奖','荣誉称号','其他']],['date','获奖日期','date'],['organization','颁发单位','text'],['awardGrade','奖项等级','select',false,['未填写','国家级','省部级','市厅级','校级','院级','国际级','其他']],['prizeTier','获奖等次','select',false,['未填写','特等奖','一等奖','二等奖','三等奖','优秀奖','金奖','银奖','铜奖','其他']],['level','名次 / 备注','text'],['description','获奖说明','textarea']]};
config.simulationCodes={label:'仿真代码',singular:'代码版本',fields:[['title','文件名 / 代码名称','text',true],['simulationId','所属仿真案例','simulation'],['version','版本号','text'],['date','修改日期','date'],['problem','发现的问题','textarea'],['solution','修改方案','textarea'],['language','语言','select',false,['Fortran','Python','C/C++','MATLAB','其他']],['path','本地代码文件路径','text'],['content','代码内容（纯文本）','textarea'],['description','修改记录','textarea']]};
config.simulationChecks={label:'验证记录',singular:'验证',fields:[['title','验证名称','text',true],['simulationId','所属仿真案例','simulation'],['method','验证方法','textarea'],['condition','验证条件与参考值','textarea'],['result','验证结果','textarea'],['status','验证状态','select',false,['待验证','验证中','通过','未通过']],['date','验证日期','date']]};
config.simulationRuns={label:'仿真记录',singular:'仿真运行',fields:[['title','运行名称 / 编号','text',true],['simulationId','所属仿真案例','simulation'],['date','运行日期','date'],['software','仿真软件版本','text'],['parameters','材料参数 / 边界条件 / 网格','textarea'],['result','主要结果与数据路径','textarea'],['issues','异常与解决办法','textarea'],['next','下一步计划','textarea']]};
config.simulationPaths={label:'过程文件',singular:'文件位置',fields:[['title','文件或文件夹名称','text',true],['simulationId','所属仿真案例','simulation'],['kind','路径类型','select',false,['代码目录','输入文件','结果目录','后处理文件','其他']],['path','本地绝对路径 / URL','text',true],['description','用途说明','textarea']]};
config.experimentDatasets={label:'实验数据',singular:'数据记录',fields:[['title','数据名称','text',true],['experimentId','所属实验','experiment'],['group','试验组编号','text'],['date','采集日期','date'],['unit','单位','text'],['filePath','原始文件路径','text'],['content','数据摘要 / CSV 文本','textarea'],['result','数据分析与结果','textarea']]};
config.projectStages={label:'研究阶段',singular:'阶段',fields:[['title','阶段名称','text',true],['projectId','所属项目','project'],['status','阶段状态','select',false,['待开始','进行中','已完成']],['weight','阶段权重','number'],['owner','负责人','text'],['startDate','开始日期','date'],['deadline','结束日期','date'],['description','阶段说明','textarea']]};
config.projectMilestones={label:'里程碑',singular:'里程碑',fields:[['title','里程碑名称','text',true],['projectId','所属项目','project'],['status','完成状态','select',false,['未完成','已完成']],['deadline','计划日期','date'],['description','完成标准','textarea']]};
const TRASH_TTL_MS=7*24*60*60*1000;
const expiredTrash=(entries,now=Date.now())=>({
 expired:(entries||[]).filter(x=>Number.isFinite(Date.parse(x.deletedAt)) && now-Date.parse(x.deletedAt)>=TRASH_TTL_MS),
 retained:(entries||[]).filter(x=>!Number.isFinite(Date.parse(x.deletedAt)) || now-Date.parse(x.deletedAt)<TRASH_TTL_MS)
});
const trashDaysLeft=(date,now=Date.now())=>{
 const time=Date.parse(date);return Number.isFinite(time)?Math.max(0,Math.ceil((time+TRASH_TTL_MS-now)/86400000)):null;
};
const iso=()=>new Date().toLocaleDateString('sv-SE');
const id=()=>globalThis.crypto?.randomUUID?.()||'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const defaultProfile=()=>({
 name:'研究者',major:'',degree:'',researchDirection:'',institution:'',advisor:'',cohort:'',graduationDate:'',bio:'',avatar:''
});
const defaultSettings=()=>({workspaceName:'科研工作台',autoTranslateAbstract:true,translationEngine:'device',translationEndpoint:'',translationRemoteConsent:false,greeting:'专注当下，持续推进科研进度。',theme:'auto',colorMode:'standard',dailyHours:4,networkMetadata:false,taskTeacherOrigin:'老师',stylePreset:'ocean',layoutScheme:'balanced',wallpaper:'none',wallpaperImage:'',categoryOptions:{},viewModes:{},archiveModes:{}});
const blank=()=>({version:9,trash:[],pdfDeletionQueue:[],profile:defaultProfile(),tasks:[],projects:[],projectStages:[],projectMilestones:[],literature:[],notes:[],simulations:[],simulationCodes:[],simulationChecks:[],simulationRuns:[],simulationPaths:[],files:[],experiments:[],experimentDatasets:[],papers:[],advisor:[],timeLogs:[],patents:[],conferences:[],awards:[],activities:[],settings:defaultSettings()});
const themePalette={blue:'#1679e7',indigo:'#4f61cf',teal:'#0a9286',violet:'#8855bd',orange:'#d57b21'};const presetAccents={ocean:'#1767bc',sage:'#487a65',paper:'#936b4e',graphite:'#52677c',glacier:'#257e98',lavender:'#7668ad'};
function normalizeData(raw){
 const base=blank();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return base;
 for(const key of Object.keys(base)){
  if(Array.isArray(base[key]))base[key]=Array.isArray(raw[key])?raw[key].filter(row=>key==='pdfDeletionQueue'?typeof row==='string'&&row.length>0:row!==null&&typeof row==='object'&&!Array.isArray(row)):[];
 }
 const profile=raw.profile&&typeof raw.profile==='object'&&!Array.isArray(raw.profile)?raw.profile:{};
 const settings=raw.settings&&typeof raw.settings==='object'&&!Array.isArray(raw.settings)?raw.settings:{};
 base.profile={...defaultProfile(),...profile};
 // Do not invent a graduation target for a new user or an empty legacy profile.
 base.settings={...defaultSettings(),...settings};
 // Normalize legacy values without discarding user-entered v1 details.
 if(base.profile.major==='科研工作者')base.profile.major='';
 if(base.profile.degree==='个人科研')base.profile.degree='';
 for(const key of Object.keys(defaultProfile()))base.profile[key]=String(base.profile[key]??'');
 if(!/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(base.profile.avatar)||base.profile.avatar.length>450000)base.profile.avatar='';
 if(!base.profile.name.trim())base.profile.name='研究者';
 base.settings.workspaceName=String(!settings.workspaceName||settings.workspaceName==='ScholarFlow'?'科研工作台':settings.workspaceName).slice(0,36);
 base.settings.autoTranslateAbstract=settings.autoTranslateAbstract!==false;
 base.settings.translationEngine=settings.translationEngine==='remote'?'remote':'device';
 base.settings.translationEndpoint=String(settings.translationEndpoint||'').slice(0,200);
 base.settings.translationRemoteConsent=settings.translationRemoteConsent===true;
 base.settings.greeting=String(base.settings.greeting??'').slice(0,160);
 base.settings.theme=base.settings.theme==='auto'?'auto':themePalette[base.settings.theme]?base.settings.theme:'blue';
 base.settings.colorMode=['standard','eye'].includes(base.settings.colorMode)?base.settings.colorMode:'standard';
 base.settings.dailyHours=Math.min(24,Math.max(0,Number(base.settings.dailyHours)||0));
 base.settings.networkMetadata=base.settings.networkMetadata===true;
 base.settings.taskTeacherOrigin=String(base.settings.taskTeacherOrigin||'老师').slice(0,80);
 base.settings.archiveModes=base.settings.archiveModes&&typeof base.settings.archiveModes==='object'&&!Array.isArray(base.settings.archiveModes)?base.settings.archiveModes:{};
 base.settings.stylePreset=['ocean','sage','paper','graphite','glacier','lavender'].includes(base.settings.stylePreset)?base.settings.stylePreset:'ocean';
  base.settings.layoutScheme=['balanced','dense','reading','night'].includes(base.settings.layoutScheme)?base.settings.layoutScheme:'balanced';
 base.settings.wallpaper=['none','mist','paper-lines','stars','custom'].includes(base.settings.wallpaper)?base.settings.wallpaper:'none';
 base.settings.wallpaperImage=/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(base.settings.wallpaperImage||'') && base.settings.wallpaperImage.length<1100000?base.settings.wallpaperImage:'';
 if(base.settings.wallpaper==='custom'&&!base.settings.wallpaperImage)base.settings.wallpaper='none';
 const categories=base.settings.categoryOptions;
 base.settings.categoryOptions=categories&&typeof categories==='object'&&!Array.isArray(categories)?categories:{};
 base.version=9;
 return base;
}
// A damaged persisted JSON document is never silently replaced by an empty workspace.
// Recovery is an explicit user action, preserving raw bytes for an emergency export.
let data,initialStoredRaw=null,storageFault='',parsedInitialData=null;
try{
 initialStoredRaw=localStorage.getItem(DBKEY);
 if(initialStoredRaw===null){data=blank()}
 else {
  parsedInitialData=JSON.parse(initialStoredRaw);
  if(!parsedInitialData||typeof parsedInitialData!=='object'||Array.isArray(parsedInitialData))throw Error('根对象不是有效的科研数据对象');
  validateImportedData(parsedInitialData);
  data=normalizeData(parsedInitialData);
 }
}catch(error){
 storageFault=String(error?.message||'本地数据读取失败');
 // Salvage well-formed rows for read-only browsing. The raw, possibly malformed
 // source remains untouched until an EXPLICIT restoration or reset.
 data=parsedInitialData&&typeof parsedInitialData==='object'&&!Array.isArray(parsedInitialData)?normalizeData(parsedInitialData):blank();
}
let archiveView=Object.fromEntries(['tasks','simulations','experiments','advisor','papers','projects'].map(k=>[k,['active','archive','all'].includes(data.settings.archiveModes?.[k])?data.settings.archiveModes[k]:'active']));
let noteCategory='全部',simulationCategory='全部',simulationDetail=null,simulationTab='codes',experimentCategory='全部',experimentDetail=null,paperCategory='全部',advisorCategory='全部';
let taskScope='全部',taskView=(['list','board','calendar'].includes(data.settings.viewModes?.tasks)?data.settings.viewModes.tasks:'board'),taskStatusFilter='',taskPriorityFilter='',taskSort='deadline',taskDayFilter='',litCategory='全部',litStatusFilter='',litPriorityFilter='',litSort='year-desc',litTypeFilter='',litTagFilter='',litSelectedId=null,projectDetail=null,projectTab='overview',pdfFor=null;
let outcomeManager=null,categoryManager=null,categoryEditingIndex=-2,homeTaskFilter="all";
let page=location.hash.slice(1).split('?')[0]||'home',dateCursor=new Date(),selectedDate=iso(),filter='',search='',modal=null,menu=false,timerStart=null,timerElapsed=0,timerInterval=null;
let searchDebounce=null,genericLimit=80,boardLimit=90,literatureLimit=110;
const $=s=>document.querySelector(s);const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const safe=s=>escape(s).replace(/\n/g,'<br>');
let externalChangePending=false;
// A successful localStorage.setItem is the durability boundary. Verify the current
// stored value immediately before writing as a second defense when storage events
// were delayed; this comparison is NOT an atomic cross-tab compare-and-swap.
let lastStoredRaw=initialStoredRaw;
let lastSavedSnapshot=JSON.stringify(data);
function showExternalConflict(){
 externalChangePending=true;
 if(document.getElementById('v2-data-conflict'))return;
 const panel=document.createElement('div');panel.id='v2-data-conflict';panel.className='v2-conflict';panel.setAttribute('role','alert');
 panel.innerHTML='<span>检测到其他标签页已修改科研数据。当前页面已暂停保存，请重新载入最新数据。</span><button type="button" class="btn btn-sm" data-action="v2-reload">重新载入最新数据</button>';
 document.body.appendChild(panel);
}
const restoreLastSaved=()=>{data=normalizeData(JSON.parse(lastSavedSnapshot))};
const save=({permitCorruptOverwrite=false}={})=>{
 if(storageFault&&!permitCorruptOverwrite){toast('检测到本地科研数据损坏，已禁止覆盖。请先下载原始数据，再从备份恢复。');return false}
 if(externalChangePending){restoreLastSaved();showExternalConflict();toast('检测到数据冲突，本次修改未保存，请重新载入。');return false}
 try{
  const stored=localStorage.getItem(DBKEY);
  if(stored!==lastStoredRaw){restoreLastSaved();showExternalConflict();toast('其他标签页已有更新，本次保存已取消。');return false}
  const candidate=JSON.stringify(data);
  localStorage.setItem(DBKEY,candidate);
  lastSavedSnapshot=candidate;lastStoredRaw=candidate;storageFault='';literatureSearchCache=new WeakMap();return true;
 }catch(e){
  restoreLastSaved();toast('保存失败，已恢复到最近一次成功保存的状态。请检查浏览器存储容量并导出备份。');return false;
 }
};
// Imported backups must contain record objects; never silently discard damaged rows.
function validateImportedData(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('JSON 顶层必须为对象');
 const schema=blank();
 for(const [key,defaultValue] of Object.entries(schema)){
  if(!Array.isArray(defaultValue)||value[key]===undefined)continue;
  if(!Array.isArray(value[key]))throw Error(key+' 字段必须为数组');
  if(value[key].length>50000)throw Error(key+' 超过本地单次导入的 50000 条上限');
  const ids=new Set();
  for(let i=0;i<value[key].length;i++){
   const item=value[key][i];
   if(key==='pdfDeletionQueue'){
    if(typeof item!=='string'||!item.trim())throw Error(key+' 第 '+(i+1)+' 个 PDF 删除标识格式无效');
    continue;
   }
   if(!item||typeof item!=='object'||Array.isArray(item))throw Error(key+' 第 '+(i+1)+' 条记录不是有效对象');
   if(item.id!==undefined&&typeof item.id!=='string')throw Error(key+' 第 '+(i+1)+' 条记录 ID 格式无效');
   if(typeof item.id==='string'&&item.id.trim()){if(ids.has(item.id))throw Error(key+' 存在重复记录 ID：第 '+(i+1)+' 条；请核对原始备份');ids.add(item.id)}
  }
 }
 for(const name of ['settings','profile'])if(value[name]!==undefined&&(!value[name]||typeof value[name]!=='object'||Array.isArray(value[name])))throw Error(name+' 必须为对象');
 return true;
}
const toast=msg=>{document.querySelector('.toast')?.remove();const e=document.createElement('div');e.className='toast';e.setAttribute('role',/(失败|错误|损坏|禁止|无法|冲突|超出)/.test(msg)?'alert':'status');e.setAttribute('aria-live',e.getAttribute('role')==='alert'?'assertive':'polite');e.setAttribute('aria-atomic','true');e.textContent=msg;document.body.append(e);setTimeout(()=>e.remove(),e.getAttribute('role')==='alert'?5500:3500)};
const log=(text)=>{data.activities.unshift({id:id(),text,time:new Date().toISOString()});data.activities=data.activities.slice(0,150)};
const projectName=pid=>data.projects.find(p=>p.id===pid)?.title||'—';
const dateText=s=>s||'—';const overdue=r=>r.deadline && r.deadline<iso() && !['已完成','已发表','已接收'].includes(r.status);
const statusChip=s=>`<span class="status ${['已完成','已发表','已接收','已精读','已授权'].includes(s)?'success':['高','进行中','阅读中','返修中'].includes(s)?'warn':s==='已逾期'?'danger':''}">${escape(s||'—')}</span>`;
// UI-only module taxonomy. The route ids, module order and persisted data stay unchanged.
const NAV_GROUPS={home:'科研总览',tasks:'科研日常',literature:'科研过程',statistics:'科研登记',settings:'工作台设置'};
// 历史模块 joy layer: intentionally isolated from the scientific data model/DBKEY.
// Short, user-initiated interactions only; no tracking, external requests, or fabricated achievements.
const SF_JOY_KEY='scholarflow_v3_joy_enabled';
let joyEnabled=(()=>{try{return localStorage.getItem(SF_JOY_KEY)!=='off'}catch{return true}})();
let joyIndex=0,joyToastTimer=null,joyJourneyOpen=false,joyQuestIndex=0,joyBearClicks=0;
let joyCompanionMode='focus',joyCompanionIndex=0; // A session-only choice: never recorded as research data.
const joyNotes=[
 '好奇心是科研最好的起点。今天也值得认真探索。',
 '做过的实验会留下证据，走过的弯路也会留下经验。',
 '灵感来得突然，记下来就变成了下一步。',
 '一次小小的推进，也是实实在在的科研进展。',
 '一篇文献读懂一段，比匆忙读完十篇更踏实。',
 '程序里的一个小问题，也值得一次清晰的记录。',
 '科研不必每分钟都有突破，持续积累同样珍贵。',
 '别忘了喝水、伸伸肩。好的状态也是科研资源。'
];
const joyContext={
 tasks:['今天完成一点点，也是在朝目标前进。','任务排好队，科研熊负责给你加一点点油。'],
 advisor:['老师的安排记清楚，研究就少一份遗漏。','把待办写清楚，灵感才有空位坐下。'],
 literature:['读文献不必求快，找到关键问题才是收获。','文献再厚也不怕，今天先读懂一段就很棒。'],
 notes:['一个新想法值得被认真写下。','灵感像小纸飞机，记下来它就不会飞丢。'],
 simulations:['排查一个小问题，让模型更可信一步。','程序说「再试一次」，科研熊说「记得保存版本」。'],
 experiments:['每一组工况与每一次试验，都值得准确记录。','实验结果会说话，先把条件和数据记清楚。'],
 papers:['写下一段清晰的论证，也是一种进展。','论文是一块块拼图，今天拼好一小块。'],
 statistics:['成果值得庆祝，努力的过程同样值得。','每一份科研成果背后，都藏着许多个普通日子。'],
 files:['文件归类整齐了，明天的你会感谢今天的你。','文件夹有家，科研思路就少一次迷路。'],
 settings:['把工作台调得顺手一点，科研少一点打扰。','科研熊悄悄把书桌角落整理得更舒服了。']
};
const joyContextMessage=()=>{const messages=joyContext[page];if(!messages)return joyMessage();return messages[joyBearClicks++%messages.length]};
const dailyJoyIndex=()=>{const d=iso();return [...d].reduce((n,c)=>n+c.charCodeAt(0),0)%joyNotes.length};
const joyMessage=()=>joyNotes[(dailyJoyIndex()+joyIndex)%joyNotes.length];
function joyToast(message){
 if(!joyEnabled)return;
 clearTimeout(joyToastTimer);
 document.querySelector('.sf-joy-toast')?.remove();
 const el=document.createElement('div');el.className='sf-joy-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 const icon=document.createElement('span');icon.className='sf-joy-toast-icon';icon.setAttribute('aria-hidden','true');icon.textContent='✦';
 const content=document.createElement('span');content.textContent=message;
 el.append(icon,content);document.body.append(el);
 joyToastTimer=setTimeout(()=>el.remove(),3400);
}
function joyFlip(){joyIndex=(joyIndex+1)%joyNotes.length;const note=document.getElementById('sf-joy-note');if(note)note.textContent=joyMessage();}
// Four voluntary companion moments. Neither mood, dialogue history nor scores are stored.
// Suggestions read the LAST successfully persisted snapshot, not transient form edits.
const joyCompanionModes=[
 {id:'focus',label:'开始推进',icon:'✎'},
 {id:'stuck',label:'有点卡住',icon:'☁'},
 {id:'rest',label:'休息一下',icon:'☕'},
 {id:'smile',label:'来点幽默',icon:'✦'}
];
const joyCompanionText={
 stuck:[
  '遇到卡点并不等于没有进展。先写下一条能够验证的假设，再决定下一步。',
  '把问题拆成「已经知道 / 还不确定 / 可以验证」三行，复杂问题也会变得更清晰。',
  '科研熊建议：保存当前版本，记录一次失败条件，给明天的自己留下线索。'
 ],
 rest:[
  '科研熊替你守着书桌。抬头望向远处，喝点水，回来再继续也不迟。',
  '允许思路留一点空白。短暂走动，有时比继续盯着屏幕更有效。',
  '休息不是进度归零；照顾状态，也是为持续研究留余量。'
 ],
 smile:[
  '科研熊的仪器说明书第一条：咖啡不等于校准。',
  '今天的 Bug 也有梦想：成为一条写进调试记录的经验。',
  '公式推导到一半？科研熊先帮你看住括号。',
  '实验重复三次，是为了让结果更可信，不是为了考验熊的记忆力。'
 ]
};
function joySavedResearch(){
 try{const parsed=JSON.parse(lastSavedSnapshot);return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};}catch{return {}}
}
function joyCompanionCard(){
 const saved=joySavedResearch();
 const focusOptions=(Array.isArray(saved.tasks)?saved.tasks:[]).filter(t=>t&&t.status!=='已完成'&&typeof t.title==='string'&&t.title.trim())
  .sort((a,b)=>String(a.deadline||'9999-12-31').localeCompare(String(b.deadline||'9999-12-31')));
 let text='',module='tasks',action='打开待办事项';
 if(joyCompanionMode==='focus'){
  if(focusOptions.length){
   const task=focusOptions[Math.floor(joyCompanionIndex/2)%focusOptions.length];
   const title=task.title.trim().slice(0,42);
   text=joyCompanionIndex%2===0
    ?'先推进「'+title+'」的一小步，给自己留下一条可执行的下一步。'
    :'为「'+title+'」写一个今天能验证的小步骤，不必一次完成全部。';
  }else if(Array.isArray(saved.literature)&&saved.literature.length){
   text=joyCompanionIndex%2===0?'手边已有文献，不妨选一篇读懂一个关键问题。':'选一篇已保存的文献，试着用一句话写下尚未解决的问题。';
   module='literature';action='打开文献中心';
  }else{
   text=joyCompanionIndex%2===0?'今天试着把一个小问题写下来，不需要马上解决。':'给自己五分钟，记录一个待验证的科研猜想。';
   module='notes';action='记录一个想法';
  }
 }else{
  const choices=joyCompanionText[joyCompanionMode]||joyCompanionText.stuck;
  text=choices[joyCompanionIndex%choices.length];
  module=joyCompanionMode==='stuck'?(page==='experiments'?'experiments':page==='literature'?'literature':'notes'):'home';
  action=joyCompanionMode==='stuck'?'记下一个线索':'回到工作台';
 }
 return {text,module,action};
}
function joyCompanionRefresh(){
 const result=joyCompanionCard();
 const node=document.getElementById('sf-companion-message');if(node)node.textContent=result.text;
 const link=document.querySelector('[data-action="sf-companion-go"]');if(link){link.textContent=result.action+' →';link.setAttribute('aria-label',result.action)}
 document.querySelectorAll('[data-joy-mood]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.joyMood===joyCompanionMode)));
}
// Gentle, opt-in research journey. All counts are derived from *saved* records, never fabricated or persisted as points.
const joyQuests=[
 {label:'读懂一段文献，记下一个问题',module:'literature',action:'前往文献中心'},
 {label:'把脑海里的一点想法记录下来',module:'notes',action:'前往记录想法'},
 {label:'回顾一次实验条件与原始结果',module:'experiments',action:'前往实验记录'},
 {label:'整理一项任务的下一步',module:'tasks',action:'前往待办事项'},
 {label:'给一段程序调试补上验证思路',module:'simulations',action:'前往程序调试'}
];
function joyJourneyStats(){
 const stored=joySavedResearch();
 const completed=(Array.isArray(stored.tasks)?stored.tasks:[]).filter(t=>t&&t.status==='已完成');
 const dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(6-i));return dayISO(d)});
 const observed=completed.map(completionDay).filter(Boolean);
 const byDate=new Map();for(const d of observed)byDate.set(d,(byDate.get(d)||0)+1);const counts=dates.map(d=>byDate.get(d)||0);
 return {completed:completed.length,week:counts.reduce((s,v)=>s+v,0),dates,counts,
  notes:Array.isArray(stored.notes)?stored.notes.length:0,literature:Array.isArray(stored.literature)?stored.literature.length:0,experiments:Array.isArray(stored.experiments)?stored.experiments.length:0};
}
// Voluntary weekly/monthly summary: exact counts from last successful snapshot only.
function joyTaskReview(){
 const saved=joySavedResearch();
 const finished=(Array.isArray(saved.tasks)?saved.tasks:[]).filter(t=>t&&t.status==='已完成').map(completionDay).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d));
 const today=iso(),month=today.slice(0,7),recent=joyJourneyStats();
 const consecutive=new Set(finished);const dates=recent.dates;
 let index=consecutive.has(dates[6])?6:5,streak=0;
 for(;index>=0&&consecutive.has(dates[index]);index--)streak++;
 return {monthCount:finished.filter(d=>d.startsWith(month)).length,weekCount:recent.week,streak};
}
function joyGraduationMoment(){
 const saved=joySavedResearch();const raw=saved?.profile?.graduationDate;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(raw||'')))return '';
 const day=timelineDayDiff(iso(),raw);if(day===null)return '';
 return ({365:'距离计划毕业日期还有 365 天：可以回顾一次研究主线。',100:'距离计划毕业日期还有 100 天：把重要成果与原始文件再核对一遍。',30:'距离计划毕业日期还有 30 天：记得为论文和数据留出检查时间。',0:'今天是你设置的毕业目标日期。科研熊祝你一切顺利！'})[day]||'';
}
function joyJourneyHtml(){
 const stats=joyJourneyStats();const review=joyTaskReview();const gradMoment=joyGraduationMoment();const quest=joyQuests[joyQuestIndex%joyQuests.length];
 const milestones=[
  ['✦','第一步','完成过一项任务',stats.completed>0],
  ['✎','灵感收藏家','记录过一个想法',stats.notes>0],
  ['▤','文献探索者','收藏过一篇文献',stats.literature>0],
  ['⚗','实验记录者','记录过一次实验',stats.experiments>0]
 ];
 const dayNames=['日','一','二','三','四','五','六'];
 const companion=joyCompanionCard();
 return `<div class="sf-journey-overlay" data-action="sf-journey-close"><section class="sf-journey-card" role="dialog" aria-modal="true" aria-labelledby="sf-journey-title" aria-describedby="sf-journey-intro" tabindex="-1">
  <header class="sf-journey-header"><div class="sf-journey-heading"><img class="sf-journey-bear" src="./assets/graduate-bear.svg" alt="" aria-hidden="true"><div><h2 id="sf-journey-title">科研熊的探索足迹</h2><p id="sf-journey-intro">真实记录里的小进展，值得被温柔看见。</p></div></div><button type="button" class="sf-journey-close" data-action="sf-journey-close" aria-label="关闭科研足迹">×</button></header>
  <div class="sf-journey-body"><div class="sf-journey-counters"><div><strong>${stats.week}</strong><span>近七天完成任务</span></div><div><strong>${stats.completed}</strong><span>全部已完成任务</span></div></div>
  <section class="sf-journey-section" aria-label="近七天的任务足迹"><h3>最近七天的小脚印</h3><div class="sf-journey-week">${stats.dates.map((d,i)=>`<div class="sf-journey-day" title="${escape(d)} 完成 ${stats.counts[i]} 项"><span class="sf-journey-dot ${stats.counts[i]?'has-work':''}" aria-hidden="true">${stats.counts[i]?'✦':'·'}</span><small>周${dayNames[new Date(d+'T12:00:00').getDay()]}</small><span class="sf-journey-day-count">${stats.counts[i]}</span></div>`).join('')}</div><p class="sf-journey-hint">依据已保存任务的完成时间统计；没有记录的日子也完全没关系。</p></section>
  <section class="sf-journey-section sf-research-review" aria-label="科研熊本周回顾"><div class="sf-review-head"><h3>科研熊的温和回顾</h3><span>只统计已保存且带完成日期的任务</span></div><div class="sf-review-data"><p>最近七天完成 <strong>${review.weekCount}</strong> 项任务</p><p>本月完成 <strong>${review.monthCount}</strong> 项任务</p><p>${review.streak?`最近连续 ${review.streak} 天有任务完成记录`:'没有连续记录也没关系，研究节奏可以由你决定。'}</p></div>${gradMoment?`<p class="sf-review-grad">✦ ${escape(gradMoment)}</p>`:''}<p class="sf-journey-hint">未填写完成日期的任务不会计入时间统计；不推断文献精读次数或科研成果。</p></section>
  <section class="sf-journey-section" aria-label="科研小里程碑"><h3>沿途收集的小星光 <small>${milestones.filter(x=>x[3]).length}/${milestones.length}</small></h3><div class="sf-journey-badges">${milestones.map(([icon,title,desc,earned])=>`<div class="sf-journey-badge ${earned?'is-earned':''}" title="${escape(desc)}"><span aria-hidden="true">${icon}</span><strong>${title}</strong><small>${earned?'已点亮':'继续探索'}</small></div>`).join('')}</div></section>
  <section class="sf-companion" aria-label="科研熊情境陪伴"><div class="sf-companion-heading"><div><h3>科研熊陪你一会儿</h3><p>现在更想怎么度过这一小段？仅在当前页面生效，不记录你的选择。</p></div><span aria-hidden="true">♡</span></div>
   <div class="sf-companion-modes" role="group" aria-label="选择陪伴方式">${joyCompanionModes.map(mode=>`<button type="button" data-joy-mood="${mode.id}" aria-pressed="${mode.id===joyCompanionMode}"><span aria-hidden="true">${mode.icon}</span> ${mode.label}</button>`).join('')}</div>
   <div class="sf-companion-response" role="status" aria-live="polite"><p id="sf-companion-message">${escape(companion.text)}</p><div class="sf-companion-actions"><button type="button" data-action="sf-companion-next">再说一句 ↻</button><button type="button" class="sf-companion-go" data-action="sf-companion-go">${escape(companion.action)} →</button></div></div>
  </section>
  <section class="sf-journey-quest" aria-label="轻量科研建议"><div><h3>今天可以做的一件小事</h3><p id="sf-journey-quest-text">${escape(quest.label)}</p></div><div class="sf-journey-quest-actions"><button type="button" data-action="sf-journey-refresh">换个建议 ↻</button><button type="button" class="sf-journey-go" data-action="sf-journey-go">${escape(quest.action)} →</button></div></section></div>
  <footer class="sf-journey-footer">没有积分排名，没有强制连续签到。所有足迹仅来源于当前本地科研记录。</footer>
 </section></div>`;
}
function joyJourneyClose(){joyJourneyOpen=false;document.querySelector('.sf-journey-overlay')?.remove();document.querySelector('[data-action="sf-joy-journey"]')?.focus({preventScroll:true})}
function joyJourneyShow(){if(!joyEnabled||modal||categoryManager||outcomeManager)return;joyJourneyOpen=true;document.querySelector('.sf-journey-overlay')?.remove();document.querySelector('#app')?.insertAdjacentHTML('beforeend',joyJourneyHtml());document.querySelector('.sf-journey-close')?.focus({preventScroll:true})}

function joyToggle(){
 const next=!joyEnabled;
 try{localStorage.setItem(SF_JOY_KEY,next?'on':'off')}catch{toast('浏览器未允许保存趣味模式偏好，本次切换仍然生效')}
 joyEnabled=next;if(!next)joyJourneyOpen=false;clearTimeout(joyToastTimer);document.querySelector('.sf-joy-toast')?.remove();render();
}
const navHtml=()=>`<aside class="sidebar ${menu?'show':''}"><div class="brand"><button class="brand-icon brand-bear sf-bear-button" type="button" data-action="sf-bear-note" aria-label="毕业熊：抽一张科研小纸条" title="和科研熊打个招呼"><img src="./assets/graduate-bear.svg" alt=""></button><div class="brand-text" title="${escape(data.settings.workspaceName)}">${escape(data.settings.workspaceName)}</div></div><nav class="nav-scroll" aria-label="科研模块导航">${modules.map(([key,label,icon])=>`${NAV_GROUPS[key]?`<div class="nav-label sf-module-heading" role="heading" aria-level="2">${NAV_GROUPS[key]}</div>`:''}<button type="button" class="nav ${page===key?'active':''}" data-nav="${key}" title="${escape(modules.find(m=>m[0]===key)?.[3]||label)}" ${page===key?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')}</nav><div class="sidebar-foot"><button type="button" class="sf-joy-toggle" data-action="sf-joy-toggle" aria-pressed="${joyEnabled}" title="${joyEnabled?'关闭趣味反馈':'开启趣味反馈'}">✦ ${joyEnabled?'关闭小惊喜':'开启小惊喜'}</button><div>● 本地存储模式<br>版本 ${BUILD_VERSION} · 数据仅存当前设备</div></div></aside>`;
// Compressed avatar lives in the existing JSON-backed profile (including JSON export).
const avatarSource=()=>/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(data.profile.avatar||'')?data.profile.avatar:'';
const avatarFace=(uri=avatarSource())=>uri?`<img class="avatar-image" src="${escape(uri)}" alt="个人头像">`:`<img class="avatar-image" src="./assets/graduate-bear.svg" alt="科研毕业小熊默认头像">`;
let avatarDraft=null; // null: no changes, empty string: explicitly remove photo
async function shrinkAvatar(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('请选择 JPG、PNG 或 WebP 图片');
 if(file.size>8*1024*1024)throw Error('照片不可超过 8 MB');
 const u=URL.createObjectURL(file);
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('图片无法读取'));img.src=u});
  if(!img.naturalWidth||!img.naturalHeight)throw Error('图片尺寸无效');
  const c=document.createElement('canvas');c.width=320;c.height=320;
  const ctx=c.getContext('2d');if(!ctx)throw Error('当前浏览器不支持图片处理');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,320,320);
  const side=Math.min(img.naturalWidth,img.naturalHeight);
  ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,320,320);
  const jpg=c.toDataURL('image/jpeg',0.8);
  if(!/^data:image\/jpeg;base64,/.test(jpg)||jpg.length>450000)throw Error('压缩后的头像过大，请选择简单一些的照片');
  return jpg;
 }finally{URL.revokeObjectURL(u)}
}
async function compressWallpaper(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>6*1024*1024)throw Error('图片仅支持 JPG、PNG、WebP，且不超过 6 MB');
 const url=URL.createObjectURL(file);
 try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('无法读取壁纸'));img.src=url});
 const scale=Math.min(1,1600/Math.max(img.naturalWidth||1,img.naturalHeight||1));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
 const value=canvas.toDataURL('image/jpeg',0.72);if(value.length>900000)throw Error('壁纸压缩后仍然过大，请使用更简单的图片');return value;
 }finally{URL.revokeObjectURL(url)}
}
function renderAvatarPreview(){const node=$('#previewAvatar');if(node)node.innerHTML=avatarDraft===null?avatarFace():avatarFace(avatarDraft)}
const storageRecoveryBanner=()=>storageFault?`<section class="sf-storage-recovery" role="alert" aria-label="损坏数据保护">
 <div><strong>本地数据需要恢复 · 已停止所有正常保存</strong><p>检测到浏览器保存的科研数据无法安全解析。为避免覆盖原记录，请先下载损坏的原始内容，再导入此前的 JSON 备份；没有备份时请谨慎处理。</p></div>
 <div class="sf-storage-recovery-actions"><button class="btn btn-outline btn-sm" type="button" data-action="sf-raw-backup" ${initialStoredRaw===null?'disabled title="无法从浏览器取得原始数据"':''}>下载原始数据</button><button class="btn btn-sm" type="button" data-action="sf-recovery-import">导入 JSON 备份</button><button class="btn btn-ghost btn-sm" type="button" data-action="sf-recovery-reset">确认清空并新建</button></div></section>`:'';
const appTop=()=>`<div class="topbar"><div style="display:flex;align-items:center;gap:12px"><button class="round mobile-menu" data-action="menu">☰</button><span class="topbar-location">${escape(data.settings.workspaceName)} / ${escape(modules.find(x=>x[0]===page)?.[1]||'工作总览')}</span></div><div class="right-actions"><label class="search"><span>⌕</span><input id="globalSearch" placeholder="搜索当前模块…  /" aria-label="搜索当前模块" title="按 / 或 Ctrl+K 搜索" value="${escape(search)}" autocomplete="off"></label><button class="round eye-mode-toggle" type="button" data-action="toggle-eye" aria-pressed="${data.settings.colorMode==='eye'}" title="${data.settings.colorMode==='eye'?'关闭护眼模式':'开启护眼模式'}" aria-label="${data.settings.colorMode==='eye'?'关闭':'开启'}护眼模式">${data.settings.colorMode==='eye'?'☀':'◐'}</button><button class="round" title="查看今日任务" data-nav="tasks">♧</button><button class="avatar avatar-button" data-nav="settings" title="编辑个人科研档案" aria-label="编辑个人科研档案">${avatarFace()}</button></div></div>`;
function refreshGraduationClock(){
 const el=document.getElementById('sf14-days');if(!el)return;
 const result=graduationCounter(el.dataset.graduationDate||'');
 const unit=document.getElementById('sf14-days-unit');
 el.textContent=result?String(result.days):'—';
 if(unit)unit.textContent=!result?'':result.type==='passed'?'已毕业 · 天':result.type==='today'?'今天':'天';
 const today=document.getElementById('sf14-today');
 if(today)today.textContent=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
}
const actionBtn=(label,act='add',cls='btn')=>`<button class="${cls}" data-action="${act}">${label}</button>`;
function render(){if(!modules.some(x=>x[0]===page)&&page!=='projects')page='home';applyTheme();document.title=data.settings.workspaceName+' · 科研工作台';$('#app').innerHTML=`<div class="shell"><button type="button" class="sf-skip-link" data-action="skip-main">跳转到主要工作区</button>${navHtml()}<main class="main" id="sf-main-content" tabindex="-1">${appTop()}${storageRecoveryBanner()}${page==='home'?homeHtml():page==='tasks'?taskPageHtml():page==='projects'?projectAreaHtml():page==='literature'?literaturePageHtml():page==='notes'?thinkingHtml():page==='simulations'?simulationAreaHtml():page==='experiments'?experimentAreaHtml():page==='papers'?paperAreaHtml():page==='advisor'?advisorAreaHtml():page==='statistics'?outcomesHtml():page==='files'?filesAreaHtml():page==='settings'?settingsHtml():listingHtml(page)}<div class="footer-note">ScholarFlow ${BUILD_VERSION} ·  数据仅保存在当前浏览器 · 建议定期在“设置”中导出 JSON 备份</div></main></div>${outcomeManager?outcomeManagerHtml():''}${categoryManager?categoryManagerHtml():''}${modal||recordPreview?modalHtml():''}${joyEnabled&&joyJourneyOpen?joyJourneyHtml():''}`;if(modal?.type==='experiments'&&document.getElementById('expGroupList'))expSyncGroupDraft();if(['notes','simulations','experiments','papers','advisor','files'].includes(page)&&data[page]?.length>boardLimit&&!viewIsBoard(page)&&document.querySelectorAll('.thought-card,.sim-overview,.paper-card,.advisor-card,.file-item').length>=boardLimit){const n=document.createElement('div');n.className='v2-load-more';n.innerHTML='<span>为保证响应速度，列表每次增加 90 条</span><button class="btn btn-outline btn-sm" data-action="v2-more-board">加载更多</button>';document.querySelector('.main')?.append(n)}}
// v1.6: research overview aggregates actual module records; no fabricated analytics.
const countMonth=(items,field='date')=>items.filter(x=>String(x[field]||x.updatedAt||x.createdAt||'').slice(0,7)===iso().slice(0,7)).length;
function overviewModules(){
 const uncompleted=data.tasks.filter(t=>t.status!=='已完成');
 const unread=data.literature.filter(x=>x.readStatus!=='已精读');
 const activeSim=data.simulations.filter(x=>x.status==='进行中');
 const activeExp=data.experiments.filter(x=>x.status==='进行中');
 const composing=data.papers.filter(x=>['写作计划','在写论文'].includes(x.category)||['准备中','写作中'].includes(x.status));
 const advisorOpen=data.advisor.filter(x=>x.status!=='已完成');
 return [
  {icon:'☑',name:'待办事项',count:uncompleted.length,unit:'项待处理',desc:`共 ${data.tasks.length} 项 · 已完成 ${data.tasks.length-uncompleted.length} 项`,link:'tasks',tone:'blue'},
  {icon:'▤',name:'文献中心',count:data.literature.length,unit:'篇文献',desc:`${unread.length} 篇尚未精读`,link:'literature',tone:'cyan'},
  {icon:'✎',name:'记录想法',count:data.notes.length,unit:'条想法',desc:`创新点 ${data.notes.filter(x=>x.category==='创新点').length} 条`,link:'notes',tone:'violet'},
  {icon:'⌘',name:'程序调试',count:data.simulations.length,unit:'个案例',desc:`进行中 ${activeSim.length} 个 · 代码 ${data.simulationCodes.length} 份`,link:'simulations',tone:'indigo'},
  {icon:'⚗',name:'实验记录',count:data.experiments.length,unit:'项实验',desc:`进行中 ${activeExp.length} 项 · 数据记录 ${data.experimentDatasets.length} 条`,link:'experiments',tone:'mint'},
  {icon:'▧',name:'论文跟踪',count:data.papers.filter(x=>x.status!=='已发表').length,unit:'篇未发表论文',desc:`写作相关 ${composing.length} 篇`,link:'papers',tone:'blue'},
  {icon:'♧',name:'老师事务',count:advisorOpen.length,unit:'项待处理',desc:`全部安排 ${data.advisor.length} 项`,link:'advisor',tone:'amber'},
  {icon:'▥',name:'成果统计',count:data.patents.length+data.conferences.length+data.awards.length,unit:'项其他成果',desc:`专利 ${data.patents.length} · 学术会议 ${data.conferences.length} · 获奖 ${data.awards.length}`,link:'statistics',tone:'rose'}
 ];
}
function homeHtml(){
 const open=data.tasks.filter(t=>t.status!=='已完成');
 const late=open.filter(overdue);
 const today=iso();
 const weekAgo=new Date(Date.now()-6*86400000).toISOString().slice(0,10);
 const weekDone=data.tasks.filter(t=>t.status==='已完成'&&(t.completedAt||'').slice(0,10)>=weekAgo).length;
 const dateLabelFull=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
 const hour=new Date().getHours();const greeting=hour<11?'早上好':hour<18?'下午好':'晚上好';
 const dueToday=open.filter(t=>t.deadline===today);
 const baseTasks=homeTaskFilter==='today'?open.filter(t=>t.deadline===today):homeTaskFilter==='late'?late:open;
 const activeDue=baseTasks.slice().sort((a,b)=>{
   const aRank=a.deadline||'9999-12-31',bRank=b.deadline||'9999-12-31';
   return aRank.localeCompare(bRank)||({高:0,中:1,低:2}[a.priority]??3)-({高:0,中:1,低:2}[b.priority]??3);
 }).slice(0,7);
 const latest=data.activities.slice(0,7);
 const taskList=activeDue.length?`<div class="home-task-list">${activeDue.map(t=>`<div class="home-task-item ${overdue(t)?'is-late':''}"><label class="home-task-main"><input type="checkbox" data-check="${escape(t.id)}" aria-label="完成任务：${escape(t.title)}"><span class="home-task-text"><strong>${escape(t.title)}</strong><small>${escape(taskOriginLabel(t))} · ${escape(t.priority||'中')}优先级</small></span></label><div class="home-task-meta">${dateLabel(t.deadline,false)}${overdue(t)?'<span class="home-task-alert">逾期</span>':''}</div><button class="home-task-edit" data-edit="tasks:${escape(t.id)}" aria-label="编辑任务：${escape(t.title)}">编辑</button></div>`).join('')}</div>`:
 `<div class="home-task-empty"><span class="home-empty-symbol">✓</span><strong>${homeTaskFilter==='today'?'今天没有截止的任务':homeTaskFilter==='late'?'没有逾期任务':'当前没有待完成事项'}</strong><p>${homeTaskFilter==='all'?'可以新建科研任务，或在老师事务中转入待办。':'切换到「全部」查看其他科研任务。'}</p><button class="btn btn-sm" data-action="add:tasks">＋ 新建任务</button></div>`;
 return `<div class="dashboard-v16 dashboard-v18">
 <section class="dash-hero dash-hero-v16 sf13-hero" aria-label="个人科研档案与成果统计">
  <div class="sf13-identity sf35-identity">
   <div class="sf13-avatar-column"><button class="dash-portrait" data-nav="settings" title="在设置中更换头像" aria-label="更换个人头像">${avatarFace()}</button></div>
   <div class="sf13-identity-body sf35-identity-body">
    <div class="sf35-hero-lead">
      <div class="sf35-hero-welcome"><div class="sf13-identity-top"><span class="dash-overline">${escape(data.settings.workspaceName)} · PERSONAL RESEARCH SPACE</span><button class="sf13-profile-link" data-nav="settings" title="修改学术信息、主题和壁纸">编辑档案 / 壁纸 ↗</button></div>
       <h1>${greeting}，${escape(data.profile.name||'研究者')} <span class="wave">✦</span></h1>
       <p class="sf13-greeting"><span id="sf14-today">${escape(dateLabelFull)}</span><span class="sf13-separator">·</span>${escape(data.settings.greeting||'让每一份科研积累都有迹可循')}</p>
      </div>
      <div class="sf14-graduation" aria-label="毕业倒计时" role="status"><div class="sf14-grad-meta"><span class="sf14-grad-kicker">GRADUATION COUNTDOWN</span><strong>距离毕业</strong><small>目标：${escape(data.profile.graduationDate||'未设置')}</small></div><div class="sf14-grad-num"><b id="sf14-days" data-graduation-date="${escape(data.profile.graduationDate||'')}">${graduationCounter(data.profile.graduationDate||'')?.days??'—'}</b><span id="sf14-days-unit">${!graduationCounter(data.profile.graduationDate||'')?'':graduationCounter(data.profile.graduationDate||'').type==='passed'?'已毕业 · 天':'天'}</span></div><button class="sf14-grad-edit" type="button" data-nav="settings" aria-label="修改毕业目标日期">修改日期 ↗</button></div>
    </div>
    <div class="dash-profile-info profile-five-layout sf36-profile-row" aria-label="个人学术信息"><div class="profile-top"><small>姓名</small><strong title="${escape(data.profile.name||'未填写')}">${escape(data.profile.name||'未填写')}</strong></div><div class="profile-top"><small>学历阶段</small><strong title="${escape(data.profile.degree||'未填写')}">${escape(data.profile.degree||'未填写')}</strong></div><div class="profile-bottom"><small>年级</small><strong title="${escape(data.profile.cohort||'未填写')}">${escape(data.profile.cohort||'未填写')}</strong></div><div class="profile-bottom"><small>专业</small><strong title="${escape(data.profile.major||'未填写')}">${escape(data.profile.major||'未填写')}</strong></div><div class="profile-bottom"><small>研究方向</small><strong title="${escape(data.profile.researchDirection||'未填写')}">${escape(data.profile.researchDirection||'未填写')}</strong></div></div>
   </div>
  </div>
  <div class="hero-achievement hero-outcomes sf13-outcomes"><div class="sf13-outcome-title"><span class="hero-achievement-label">成果统计</span><span class="sf13-outcome-hint">已登记的科研成果</span></div><div class="hero-outcomes-grid">
   ${[['论文',publishedPapers().length],['专利',data.patents.length],['学术会议',data.conferences.length],['获奖',data.awards.length]].map(([name,count])=>`<div class="hero-outcome-stat"><strong>${count}</strong><small>${name}</small></div>`).join('')}
  </div><button data-nav="statistics" aria-label="查看所有成果统计">查看成果统计 ↗</button></div>
 </section>
 <div class="home-quick-grid" aria-label="科研快捷操作">
  <button class="home-quick-card" data-action="add:tasks"><span class="home-quick-icon">＋</span><span><strong>新建任务</strong><small>安排今日科研工作</small></span><b aria-hidden="true">↗</b></button>
  <button class="home-quick-card" data-action="add:notes"><span class="home-quick-icon">✧</span><span><strong>记录想法</strong><small>捕捉科研灵感</small></span><b aria-hidden="true">↗</b></button>
 </div>
 ${joyEnabled?`<section class="sf-joy-ribbon" aria-label="科研小纸条"><div class="sf-joy-ribbon-text"><span class="sf-joy-ribbon-star" aria-hidden="true">✦</span><div><strong>科研熊的小纸条</strong><p id="sf-joy-note">${escape(joyMessage())}</p></div></div><div class="sf-joy-ribbon-actions"><button class="sf-joy-next" type="button" data-action="sf-joy-next" aria-label="换一张科研小纸条">换一张 ↻</button><button class="sf-joy-journey" type="button" data-action="sf-joy-journey">看看足迹 ✦</button><button class="sf-joy-quiet" type="button" data-action="sf-joy-quiet" aria-label="开启安静模式，关闭科研熊趣味提示" title="关闭趣味提示，可在侧栏重新开启">安静一下</button></div></section>`:''}
 <div class="home-primary-grid">
  <section class="home-primary-block" aria-label="待办事项">
   <div class="overview-head overview-task-heading"><div><span class="eyebrow">RESEARCH TO-DO</span><h2>待办事项</h2></div><div class="home-heading-actions"></div></div>
   <section class="card home-task-panel">${taskList}${baseTasks.length>activeDue.length?`<button class="home-task-more" data-nav="tasks">还有 ${baseTasks.length-activeDue.length} 项任务，进入任务管理 →</button>`:''}</section>
  </section>
  <section class="home-primary-block" aria-label="科研日历">
   <div class="overview-head home-calendar-heading"><div><span class="eyebrow">RESEARCH CALENDAR</span><h2>科研日历</h2></div></div>
   <section class="card card-pad overview-calendar home-calendar-panel">${calendarHtml()}</section>
  </section>
 </div>
 <section class="card card-pad home-activity-panel"><div class="head"><div><span class="eyebrow">RESEARCH ACTIVITY</span><h3>近期科研动态</h3><p class="section-subtext"></p></div><span class="badge-count">${latest.length} 条</span></div>${latest.length?`<ul class="timeline modern-timeline">${latest.map(a=>`<li><small>${escape(new Date(a.time).toLocaleString('zh-CN'))}</small><strong>${escape(a.text)}</strong></li>`).join('')}</ul>`:`${emptyHtml('还没有科研动态','新增科研记录或完成任务后，这里会记录最新变化。')}`}<button class="activity-add" data-action="add:notes">＋ 记录一个新想法</button></section>
 </div>`;
}
// Lunar dates are rendered offline via the standard Intl Chinese calendar (no network / API key).
const lunarFormatter=(()=>{try{return new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{month:'long',day:'numeric'})}catch{return null}})();
const lunarDays=['','初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
const lunarMemo=new Map();
function lunarInfo(date){const key=dayISO(date);if(lunarMemo.has(key))return lunarMemo.get(key);let obj={month:'',day:0,text:'农历不可用'};try{if(lunarFormatter){const p=lunarFormatter.formatToParts(date);const month=p.find(x=>x.type==='month')?.value||'';const day=Number(p.find(x=>x.type==='day')?.value)||0;obj={month,day,text:day===1?month:(lunarDays[day]||'')}}}catch{}lunarMemo.set(key,obj);return obj;}
function dayISO(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function completionDay(t){if(t.status!=='已完成'||!t.completedAt)return '';const done=new Date(t.completedAt);return Number.isFinite(done.getTime())?dayISO(done):''}
function taskCalendarEntries(day,items=data.tasks){
 const events=[];
 for(const task of items){
  const completed=completionDay(task);
  if(task.deadline===day)events.push({task,eventKind:'deadline',label:task.status==='已完成'?'任务截止（已完成）':'任务截止'});
  else if(!task.deadline&&task.startDate===day)events.push({task,eventKind:'start',label:'任务开始'});
  if(completed===day)events.push({task,eventKind:'completed',label:'任务完成'});
 }
 return events;
}
function dateCalendarEvents(day){
 const tasks=taskCalendarEntries(day).map(({task,eventKind,label})=>({...task,_source:label,_when:day,_recordType:'tasks',_recordId:task.id,_eventKind:eventKind}));
 const others=[...data.papers.map(x=>({...x,_source:'论文',_recordType:'papers',_when:x.deadline||x.revisionDeadline})),...data.advisor.map(x=>({...x,_source:'老师事务',_recordType:'advisor',_when:x.deadline||x.date})),...data.experiments.map(x=>({...x,_source:'实验',_recordType:'experiments',_when:x.date})),...data.conferences.map(x=>({...x,_source:'学术会议',_recordType:'conferences',_when:x.date}))];
 return [...tasks,...others.filter(x=>x._when===day).map(x=>({...x,_recordId:x.id}))];
}
function graduationCounter(date,today=iso()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return null;
 const a=new Date(today+'T12:00:00'),b=new Date(date+'T12:00:00');
 if(!Number.isFinite(b.getTime())||dayISO(b)!==date)return null;
 const diff=Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);
 return {days:Math.abs(diff),type:diff>0?'pending':diff<0?'passed':'today',date};
}

// 2026 official national holidays and compensatory working weekends: 国办发明电〔2025〕7号.
const holiday2026={};
for(const [start,end,label] of [['2026-01-01','2026-01-03','元旦'],['2026-02-15','2026-02-23','春节'],['2026-04-04','2026-04-06','清明节'],['2026-05-01','2026-05-05','劳动节'],['2026-06-19','2026-06-21','端午节'],['2026-09-25','2026-09-27','中秋节'],['2026-10-01','2026-10-07','国庆节']]){
 let d=new Date(start+'T12:00:00'),stop=new Date(end+'T12:00:00');for(;d<=stop;d.setDate(d.getDate()+1)){holiday2026[dayISO(d)]={type:'off',label}}
}
for(const x of ['2026-01-04','2026-02-14','2026-02-28','2026-05-09','2026-09-20','2026-10-10'])holiday2026[x]={type:'work',label:'调休上班'};
function festivalFor(date,lunar){const md=dayISO(date).slice(5),m=lunar.month.replace(/^(闰|閏)/,'');if(md==='01-01')return '元旦';if(md==='05-01')return '劳动节';if(md==='10-01')return '国庆节';if(lunar.month.startsWith('闰')||lunar.month.startsWith('閏'))return '';
 if(m==='正月'&&lunar.day===1)return '春节';if(m==='正月'&&lunar.day===15)return '元宵节';if(m==='五月'&&lunar.day===5)return '端午节';if(m==='七月'&&lunar.day===7)return '七夕';if(m==='八月'&&lunar.day===15)return '中秋节';if(m==='九月'&&lunar.day===9)return '重阳节';return '';
}
function dateDecor(date){const key=dayISO(date),lunar=lunarInfo(date),holiday=holiday2026[key],festival=festivalFor(date,lunar);return {key,lunar,holiday,festival,sub:festival||lunar.text};}
function allDateEvents(date){return dateCalendarEvents(date)}
function calendarHtml(){const y=dateCursor.getFullYear(),m=dateCursor.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();let cells='';for(let i=0;i<42;i++){
 const day=i-first+1,date=new Date(y,m,day,12),d=dateDecor(date),events=allDateEvents(d.key),old=day<1||day>days;
 cells+=`<button type="button" class="day sf-day ${old?'other':''} ${d.key===iso()?'today':''} ${d.key===selectedDate?'selected':''} ${d.holiday?'calendar-'+d.holiday.type:''}" data-date="${d.key}" aria-label="${d.key} ${d.sub} ${d.holiday?.label||''} ${events.length}项科研事件" title="${escape([d.key,d.sub,d.holiday?.label,events.length?`${events.length}项科研事件`:null].filter(Boolean).join(' · '))}"><span class="sf-day-num">${date.getDate()}</span><span class="sf-day-lunar">${escape(d.sub)}</span>${d.holiday?`<em class="sf-day-flag">${d.holiday.type==='off'?'休':'班'}</em>`:''}${events.length?`<i class="dot ${events.some(x=>x._eventKind==='completed')?'dot-completed':''}"></i>`:''}</button>`;
 }
 const chosen=dateDecor(new Date(selectedDate+'T12:00:00')),items=allDateEvents(selectedDate);
 return `<div class="cal-head"><b>${y}年${m+1}月</b><div class="cal-controls"><button data-cal="prev" aria-label="上个月">‹</button><button data-cal="today">今天</button><button data-cal="next" aria-label="下个月">›</button></div></div><div class="cal-week">${['日','一','二','三','四','五','六'].map(x=>`<div>${x}</div>`).join('')}</div><div class="cal-days sf-calendar-days">${cells}</div><div class="calendar-legend"><span><i class="legend-off">休</i>放假</span><span><i class="legend-work">班</i>调休上班</span><span><i class="legend-dot"></i>截止 / 安排</span><span><i class="legend-dot completed"></i>已完成</span></div><div class="calendar-selection"><div><b>${escape(selectedDate)}</b><span>${escape(chosen.festival||chosen.lunar.text)} ${chosen.holiday?' · '+escape(chosen.holiday.label):''}</span></div><div class="calendar-event-summary">${items.length?items.slice(0,12).map(x=>`<button type="button" class="calendar-event-link ${x._eventKind==='completed'?'is-completed':''}" data-record-open="${escape(x._recordType)}:${escape(x._recordId)}" title="打开该记录详情">${x._eventKind==='completed'?'✓ ': '• '}${escape(x._source)}：${escape(x.title||'未命名')}</button>`).join(''):'当天没有安排科研事件'}</div></div>`;
}
const emptyHtml=(headline,sub)=>`<div class="empty"><div class="emoji">✧</div><b>${headline}</b><div>${sub}</div></div>`;
function taskRow(t){return `<div class="task-row"><input type="checkbox" data-check="${escape(t.id)}" ${t.status==='已完成'?'checked':''}><div class="task-title ${t.status==='已完成'?'done':''}">${escape(t.title)}<div class="mini">${t.deadline?'截止 '+escape(t.deadline):'科研任务'}</div></div><button class="links" data-edit="tasks:${escape(t.id)}">编辑</button></div>`;}
/* Dedicated task, project and literature workspaces (v1.4). */
const optionHtml=(items,current)=>items.map(([val,label])=>`<option value="${escape(val)}" ${String(val)===String(current)?'selected':''}>${escape(label)}</option>`).join('');
const filterSelect=(name,choices,value,label)=>`<label class="filter-control"><span class="sr-only">${escape(label)}</span><select class="select" id="${name}" aria-label="${escape(label)}">${optionHtml(choices,value)}</select></label>`;
const segmented=(items,current,attribute)=>`<div class="segmented" role="group">${items.map(([v,label])=>`<button type="button" class="segment ${current===v?'on':''}" ${attribute}="${escape(v)}">${escape(label)}</button>`).join('')}</div>`;
const teacherTaskOrigin=()=>data.settings.taskTeacherOrigin||'老师';
const taskOriginLabel=t=>t.origin==='自己'?'我的任务':(t.advisorId||t.origin===teacherTaskOrigin()||t.origin==='老师')?'老师安排':t.origin||'我的任务';
const taskEffectiveStatus=t=>t.status==='已完成'?'已完成':overdue(t)?'已逾期':t.status||'待开始';
const finiteProgress=n=>Number.isFinite(Number(n))?Math.max(0,Math.min(100,Number(n))):0;
const groupedCounts=(rows,key)=>{const map=new Map();for(const record of rows){const id=record?.[key];if(id!==undefined&&id!==null)map.set(id,(map.get(id)||0)+1)}return map};
const experimentGroups=n=>Number.isSafeInteger(Number(n))&&Number(n)>=0&&Number(n)<=1000000?Number(n):0;
const progressBar=(n,label)=>`<div class="progress-line" ${label?`aria-label="${escape(label)}"`:''}><div class="progress"><i style="width:${finiteProgress(n)}%"></i></div><strong>${Math.round(finiteProgress(n))}%</strong></div>`;
function calcProjectProgress(p){const stages=data.projectStages.filter(s=>s.projectId===p.id);if(!stages.length)return finiteProgress(p.progress);const weights=stages.map(s=>Number.isFinite(Number(s.weight))?Math.max(0,Number(s.weight)):0);const total=weights.reduce((a,b)=>a+b,0);return total>0?Math.round(stages.reduce((acc,s,i)=>acc+weights[i]*(s.status==='已完成'?1:s.status==='进行中'?.5:0),0)/total*100):0}
function calendarDayDistance(a,b){const parse=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return NaN;const [y,m,d]=s.split('-').map(Number);const ms=Date.UTC(y,m-1,d);return new Date(ms).toISOString().slice(0,10)===s?ms:NaN};const aa=parse(a),bb=parse(b);return Number.isFinite(aa)&&Number.isFinite(bb)?Math.round((bb-aa)/86400000):null}
function dateLabel(d,completed){if(!d)return '<span class="dim">未设日期</span>';const diff=calendarDayDistance(iso(),d);const cls=!completed&&diff!==null&&diff<0?'danger-text':!completed&&diff!==null&&diff<=2?'warn-text':'subtle';const supplement=completed||diff===null?'':diff<0?` · 逾期${-diff}天`:diff===0?' · 今天截止':diff>0&&diff<=7?` · ${diff}天后`:'';return `<span class="${cls}">${escape(d.slice(5).replace('-','月'))}日${escape(supplement)}</span>`}
const ARCHIVE_MODULES={tasks:'任务',simulations:'调试案例',experiments:'实验',advisor:'老师事务',papers:'论文',projects:'科研项目'};
function isCompleted(type,r){return type==='papers'?['已完成','已接收','已发表'].includes(r.status):r.status==='已完成'}
const COMPLETION_GRACE_MS=48*60*60*1000;
function completedTimestamp(row){const t=Date.parse(row.completedAt||row.updatedAt||row.createdAt||'');return Number.isFinite(t)?t:Date.now()}
function isArchived(type,row,now=Date.now()){return isCompleted(type,row)&&now-completedTimestamp(row)>COMPLETION_GRACE_MS}
function archiveFilter(type,rows){const mode=archiveView[type]||'active',now=Date.now();return rows.filter(row=>mode==='all'||(mode==='archive'?isArchived(type,row,now):!isArchived(type,row,now)))}
function archiveSwitch(type,source,inline=false){
 const view=archiveView[type]==='archive'?'archive':archiveView[type]==='all'?'all':'active';
 const finished=source.filter(r=>isArchived(type,r)).length;
 const next=view==='archive'?'active':'archive';
 const hint=view==='archive'?'返回近期与进行中记录':'查看已完成超过48小时的归档记录';
 return `<nav class="archive-tabs ${inline?'sf-archive-inline':''}" aria-label="${escape(ARCHIVE_MODULES[type])}归档筛选"><button type="button" class="archive-tab sf-archive-toggle ${view==='archive'?'selected':''}" data-archive-view="${type}:${next}" aria-pressed="${view==='archive'}" aria-label="${escape(hint)}" title="${escape(hint)}">▣ <span class="archive-label">${view==='all'?'查看归档':'已归档'}</span> <span class="archive-count">${finished}</span></button></nav>`;
}
function taskSubset(ignoreDay=false){const needle=search.trim().toLowerCase();let out=archiveFilter('tasks',data.tasks).filter(t=>{
 if(taskScope!=='全部'&&t.origin!==taskScope)return false;
 if(needle&&![t.title,t.description,t.origin,t.priority].join(' ').toLowerCase().includes(needle))return false;
 const st=taskEffectiveStatus(t);
 if(taskStatusFilter&&(taskStatusFilter==='未完成'?st==='已完成':st!==taskStatusFilter))return false;
 if(taskPriorityFilter&&t.priority!==taskPriorityFilter)return false;
 if(!ignoreDay&&taskDayFilter&&!([t.deadline,t.startDate].includes(taskDayFilter)))return false;
 return true;
 });
 out.sort((a,b)=>taskSort==='priority'?({高:0,中:1,低:2}[a.priority]??3)-({高:0,中:1,低:2}[b.priority]??3):taskSort==='created'?String(b.createdAt||'').localeCompare(a.createdAt||''):taskSort==='completed'?String(b.completedAt||'').localeCompare(a.completedAt||''):String(a.deadline||'9999').localeCompare(String(b.deadline||'9999')));
 return out;
}
function taskCalendarRecords(){const needle=search.trim().toLowerCase();return archiveFilter('tasks',data.tasks).filter(t=>(taskScope==='全部'||t.origin===taskScope)&&(!needle||[t.title,t.description,t.origin,t.priority].join(' ').toLowerCase().includes(needle))&&(!taskPriorityFilter||t.priority===taskPriorityFilter)&&(!taskStatusFilter||(taskStatusFilter==='未完成'?t.status!=='已完成':taskStatusFilter==='已逾期'?overdue(t):taskEffectiveStatus(t)===taskStatusFilter)))}
function taskPageHtml(){const rs=taskView==='calendar'?taskCalendarRecords():taskSubset(),all=data.tasks,pending=all.filter(t=>t.status!=='已完成'),late=pending.filter(overdue),done=all.filter(t=>t.status==='已完成');return `<div class="workspace-title"><div><h1>待办事项</h1></div>${actionBtn('＋ 新建任务','add:tasks')}</div>
 <div class="workspace-stats">${[['总任务',all.length],['待完成',pending.length],['已逾期',late.length],['已完成',done.length]].map(([label,v])=>`<div class="stat-mini"><span>${label}</span><strong>${v}</strong></div>`).join('')}</div>
 ${researchToolbar({type:'tasks',placeholder:'搜索任务名称、说明…',cats:['全部',...categoryEntries('tasks')],current:taskScope,attr:'data-task-tab',source:archiveFilter('tasks',all),visible:rs.length,unit:'项任务',extra:`${filterSelect('taskStatusFilter',[['','全部状态'],['待开始','待开始'],['进行中','进行中'],['未完成','未完成'],['已逾期','已逾期'],['已完成','已完成']],taskStatusFilter,'筛选任务状态')}${filterSelect('taskPriorityFilter',[['','全部优先级'],['高','高'],['中','中'],['低','低']],taskPriorityFilter,'筛选优先级')}${filterSelect('taskSort',[['deadline','按截止日期'],['priority','按优先级'],['created','按创建日期'],['completed','按完成日期']],taskSort,'排序方式')}${taskDayFilter?`<span class="active-filter">${escape(taskDayFilter)} <button data-action="clear-filters" title="清除日期筛选">×</button></span>`:''}<button class="filter-reset" data-action="clear-filters">重置</button>`})}

 ${taskView==='list'?taskListHtml(rs):taskView==='board'?taskBoardHtml(rs):taskCalendarHtml(taskCalendarRecords())}${taskView!=='calendar'&&rs.length>boardLimit?`<div class="v2-load-more"><span>已展示 ${Math.min(boardLimit,rs.length)} / ${rs.length} 项任务</span><button class="btn btn-outline btn-sm" data-action="v2-more-board">加载更多任务</button></div>`:''}</div>`;}
function taskListHtml(rs){if(!rs.length)return `<section class="card">${emptyHtml('没有符合条件的任务','试试重置筛选，或创建一项新任务')}</section>`;
 return `<div class="task-tile-grid">${rs.slice(0,boardLimit).map(t=>`<article class="card task-tile ${overdue(t)?'task-tile-overdue':''}"><div class="task-tile-top"><div class="task-cell"><input aria-label="完成任务：${escape(t.title)}" type="checkbox" data-check="${escape(t.id)}" ${t.status==='已完成'?'checked':''}><div><h3 class="${t.status==='已完成'?'done':''}"><button class="record-title-link" data-record-open="tasks:${escape(t.id)}">${escape(t.title)}</button></h3><p>${escape(t.description||'暂无任务说明')}</p></div></div>${statusChip(taskEffectiveStatus(t))}</div><div class="task-tile-bottom"><span>${escape(t.taskType||'科研任务')} · ${escape(taskOriginLabel(t))}</span>${statusChip(t.priority||'中')}<span>${dateLabel(t.deadline,t.status==='已完成')}</span></div><div class="task-tile-actions"><button data-record-open="tasks:${escape(t.id)}">查看详情 →</button></div></article>`).join('')}</div>`;
}
function taskCardHtml(t){return `<article class="board-task" draggable="true" data-drag-task="${escape(t.id)}"><div class="task-board-head"><button class="record-title-link" data-record-open="tasks:${escape(t.id)}">${escape(t.title)}</button>${statusChip(t.priority||'中')}</div><p>${escape(t.description||'暂无说明')}</p><div class="board-task-meta"><span>${escape(t.taskType||'科研任务')} · ${escape(taskOriginLabel(t))}</span><span>${dateLabel(t.deadline,t.status==='已完成')}</span></div><div class="board-task-bottom"><select data-quick-status="${escape(t.id)}" aria-label="更改任务状态">${optionHtml([['待开始','待开始'],['进行中','进行中'],['已完成','已完成']],t.status||'待开始')}</select><button data-record-open="tasks:${escape(t.id)}">查看详情</button></div></article>`}
function taskBoardHtml(rs){const visible=rs.slice(0,boardLimit);return `<div class="board-columns">${(archiveView.tasks==='archive'?[['已完成','已完成']]:archiveView.tasks==='all'?[['待开始','待开始'],['进行中','进行中'],['已完成','已完成']]:[['待开始','待开始'],['进行中','进行中'],['已完成','已完成']]).map(([status,title])=>{const rows=visible.filter(t=>t.status===status||status==='待开始'&&(!t.status||t.status==='待开始'));return `<section class="board-column" data-drop-status="${status}"><div class="board-column-head"><b>${title}</b><span>${rs.filter(t=>t.status===status||status==='待开始'&&(!t.status||t.status==='待开始')).length} 项</span></div>${rows.length?rows.map(taskCardHtml).join(''):'<div class="board-empty">拖入任务卡片，或创建新任务</div>'}</section>`}).join('')}</div><p class="board-help">桌面端可拖动卡片修改状态；手机端使用卡片底部的状态选择框。</p>`}
function taskCalendarHtml(rs){const y=dateCursor.getFullYear(),m=dateCursor.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();let cells='';for(let i=0;i<42;i++){const day=i-first+1,dt=new Date(y,m,day,12),dec=dateDecor(dt),date=dec.key,hit=taskCalendarEntries(date,rs),old=day<1||day>days;
 cells+=`<button class="big-day ${old?'is-other':''} ${date===iso()?'is-today':''} ${date===taskDayFilter?'is-picked':''} ${dec.holiday?'calendar-'+dec.holiday.type:''}" data-date="${date}" title="${escape([date,dec.sub,dec.holiday?.label].filter(Boolean).join(' · '))}"><span class="big-day-head"><b>${dt.getDate()}</b>${dec.holiday?`<em class="big-holiday-flag">${dec.holiday.type==='off'?'休':'班'}</em>`:''}</span><span class="big-lunar">${escape(dec.sub)}</span>${hit.slice(0,2).map(x=>`<small class="${x.eventKind==='completed'?'task-calendar-done':''}">${x.eventKind==='completed'?'✓ ':''}${escape(x.task.title)}</small>`).join('')}${hit.length>2?`<i>+${hit.length-2} 项</i>`:''}</button>`}
 return `<section class="card card-pad"><div class="cal-head"><b>${y}年${m+1}月 · 任务截止日历</b><div class="cal-controls"><button data-cal="prev">‹</button><button data-cal="today">今天</button><button data-cal="next">›</button></div></div><div class="big-calendar"><div class="big-calendar-week">${['日','一','二','三','四','五','六'].map(x=>`<span>${x}</span>`).join('')}</div><div class="big-calendar-grid">${cells}</div></div><p class="mini calendar-disclaimer">日历自动同步全部任务的截止日期及完成日期（包含已归档项目）；带 ✓ 表示完成日期。农历显示不需要联网。2026 年休/班标注依据国务院官方通知；其他年份不提供未经核实的法定调休标记。</p></section>${taskDayFilter?`<section class="card card-pad small-section"><div class="head"><h3>${escape(taskDayFilter)} 的任务事件</h3><button class="links" data-action="clear-filters">清除日期选择</button></div>${taskCalendarEntries(taskDayFilter,rs).map(x=>`<button class="task-calendar-event ${x.eventKind==='completed'?'is-completed':''}" data-record-open="tasks:${escape(x.task.id)}">${x.eventKind==='completed'?'✓':'•'} ${escape(x.task.title)} <small>${escape(x.label)}</small></button>`).join('')||'<p class="mini">当天没有任务事件</p>'}</section>`:''}`}
function projectAreaHtml(){if(projectDetail){const project=data.projects.find(p=>p.id===projectDetail);if(project)return projectDetailHtml(project);projectDetail=null;}return projectListHtml()}
function projectListHtml(){const projects=archiveFilter('projects',data.projects).filter(x=>[x.title,x.code,x.description,x.stage].join(' ').toLowerCase().includes(search.trim().toLowerCase()));return `<div class="workspace-title"><div><h1>科研项目档案</h1><p>独立管理项目基本信息、研究阶段与里程碑；不强制绑定其他模块</p></div>${actionBtn('＋ 新建项目','add:projects')}</div>
 <div class="workspace-stats">${[['全部项目',data.projects.length],['进行中',data.projects.filter(p=>p.status==='进行中').length],['阶段总数',data.projectStages.length],['已完成里程碑',data.projectMilestones.filter(m=>m.status==='已完成').length]].map(([a,b])=>`<div class="stat-mini"><span>${a}</span><strong>${b}</strong></div>`).join('')}</div>
 ${archiveSwitch('projects',data.projects)}${projects.length?`<div class="project-grid">${projects.map(p=>{const prog=calcProjectProgress(p),stages=data.projectStages.filter(x=>x.projectId===p.id),milestones=data.projectMilestones.filter(x=>x.projectId===p.id);return `<article class="card project-card"><div class="project-card-top"><button class="project-link" data-proj="${escape(p.id)}">${escape(p.title)}</button>${statusChip(p.status||'进行中')}</div><span class="mini">${escape(p.code||'未设置编号')}</span><div class="project-card-progress">${progressBar(prog)}</div><div class="project-meta"><span>阶段 ${stages.filter(s=>s.status==='已完成').length}/${stages.length}</span><span>截止：${escape(p.deadline||'未设置')}</span></div><div class="project-card-bottom">${milestones.length?`里程碑 ${milestones.filter(x=>x.status==='已完成').length}/${milestones.length}`:'暂无里程碑'}<button data-proj="${escape(p.id)}">打开项目 →</button></div></article>`}).join('')}</div>`:`<section class="card">${emptyHtml('尚无科研项目','点击“新建项目”，创建一个独立的项目档案')}</section>`}</div>`}
function projectDetailHtml(p){const stages=data.projectStages.filter(x=>x.projectId===p.id),milestones=data.projectMilestones.filter(x=>x.projectId===p.id),prog=calcProjectProgress(p);
 return `<div class="project-detail-head"><button class="back-link" data-action="project-list">‹ 返回项目列表</button><div class="project-detail-title"><h1>${escape(p.title)}</h1>${statusChip(p.status||'进行中')}<button class="btn btn-outline btn-sm" data-edit="projects:${escape(p.id)}">编辑档案</button><button class="btn btn-danger btn-sm" data-del="projects:${escape(p.id)}">删除项目</button></div></div><div class="project-progress-box"><span>阶段进度 ${stages.length?'· 权重自动计算':'· 手动维护'}</span>${progressBar(prog)}</div><div class="project-tabs">${segmented([['overview','档案与阶段'],['milestones','里程碑']],projectTab,'data-projtab')}</div>
 ${projectTab==='milestones'?`<section class="card card-pad"><div class="head"><h3>里程碑 (${milestones.length})</h3>${actionBtn('＋ 新增里程碑','add-milestone','btn btn-sm')}</div>${milestones.length?`<div class="nested-records">${milestones.map(m=>`<div class="stage-item"><button class="stage-check ${m.status==='已完成'?'checked':''}" data-action="toggle-milestone" data-id="${escape(m.id)}">${m.status==='已完成'?'✓':''}</button><div><strong>${escape(m.title)}</strong>${statusChip(m.status||'未完成')}<small>截止 ${escape(m.deadline||'未设')} · ${escape(m.description||'')}</small></div><button class="icon-link" data-edit="projectMilestones:${escape(m.id)}">✎</button><button class="icon-link" data-del="projectMilestones:${escape(m.id)}">×</button></div>`).join('')}</div>`:emptyHtml('尚无里程碑','设置一个重要研究节点')}</section>`:
 `<div class="project-overview"><section class="card card-pad"><div class="head"><h3>项目档案</h3></div><dl class="project-info"><dt>研究背景</dt><dd>${escape(p.description||'暂无')}</dd><dt>研究目标</dt><dd>${escape(p.researchGoal||'暂无')}</dd><dt>研究内容</dt><dd>${escape(p.researchContent||'暂无')}</dd><dt>负责人 / 周期</dt><dd>${escape(p.owner||'本人')} · ${escape(p.startDate||'未设置')} — ${escape(p.deadline||'未设置')}</dd></dl></section><section class="card card-pad"><div class="head"><h3>阶段计划</h3><button class="links" data-action="add-stage">＋ 新增阶段</button></div>${stages.length?`<div class="stage-list">${stages.map(st=>`<div class="stage-item"><button class="stage-check ${st.status==='已完成'?'checked':''}" data-action="toggle-stage" data-id="${escape(st.id)}">${st.status==='已完成'?'✓':''}</button><div><strong>${escape(st.title)}</strong> ${statusChip(st.status||'待开始')}<small>${escape(st.startDate||'未设')} — ${escape(st.deadline||'未设')} · 权重 ${Number(st.weight)||0}</small></div><button class="icon-link" data-edit="projectStages:${escape(st.id)}">✎</button><button class="icon-link" data-del="projectStages:${escape(st.id)}">×</button></div>`).join('')}</div>`:emptyHtml('尚无研究阶段','添加研究阶段后自动计算项目进度')}</section></div>`}`;
}
// v1.9 literature browser: collection rail + paper list + detail reader.
function literatureTags(x){return String(x.keywords||'').split(/[,，;；、]/).map(v=>v.trim()).filter(Boolean)}
// Searchable text is derived from saved records, never from uncommitted form drafts.
// Reset the cache after a successful durable save so editing a paper is immediately
// reflected by searches without rebuilding the same 14-field string on every keypress.
let literatureSearchCache=new WeakMap();
function literatureSearchText(record){
 let existing=literatureSearchCache.get(record);if(existing!==undefined)return existing;
 const text=[record.title,record.correspondingAuthor,record.authors,record.year,record.keywords,record.abstract,record.journal,record.quartile,record.articleType,record.researchQuestion,record.researchMethods,record.keyFindings,record.doi,record.abstractZh].join(' ').toLowerCase();
 literatureSearchCache.set(record,text);return text;
}
function literatureSubset(){const needle=search.trim().toLowerCase();let rs=data.literature.filter(l=>{
 if(litCategory!=='全部'&&l.category!==litCategory)return false;
 if(litStatusFilter&&l.readStatus!==litStatusFilter)return false;
 if(litPriorityFilter&&l.importance!==litPriorityFilter)return false;
 if(litTypeFilter&&l.articleType!==litTypeFilter)return false;
 if(litTagFilter&&!literatureTags(l).includes(litTagFilter))return false;
 return !needle||literatureSearchText(l).includes(needle);
 });rs.sort((a,b)=>litSort==='year-asc'?(Number(a.year)||0)-(Number(b.year)||0):litSort==='name'?String(a.title||'').localeCompare(String(b.title||''),'zh-CN'):(Number(b.year)||0)-(Number(a.year)||0));return rs}
function litReaderText(s,empty='尚未填写，点击右上角“编辑文献”补充。'){return s?`<p class="lit-body-text">${safe(s)}</p>`:`<p class="lit-note-empty">${empty}</p>`}
function literatureDetailHtml(l){if(!l)return `<div class="lit-reader-empty"><span>▤</span><h3>选择一篇文献</h3><p>左侧筛选分类，中间选择文献后，在这里查看详细信息与阅读笔记。</p></div>`;
 const imp=l.impactFactor!==undefined&&l.impactFactor!==null&&String(l.impactFactor).trim()!==''?Number(l.impactFactor):null;
 const chipText=v=>escape(v||'未填写');
 return `<div class="lit-reader-head"><span class="lit-eye">文献详情 / READING NOTES</span><div class="lit-reader-buttons"><button class="btn btn-outline btn-sm" data-edit="literature:${escape(l.id)}">✎ 编辑文献</button><button class="btn btn-outline btn-sm journal-lookup-btn" data-action="journal-lookup" data-id="${escape(l.id)}" title="联网查询 Crossref，仅发送论文标题">✧ 识别期刊</button><button class="btn btn-danger btn-sm" data-del="literature:${escape(l.id)}">删除</button></div></div>
 <h2 class="lit-reader-title">${escape(l.title||'未命名文献')}</h2>${l.metadataSource?`<p class="pdf-recognition-hint">PDF 识别来源：${escape(l.metadataSource)} · 自动识别可能存在误差，需核对作者、期刊及 DOI。</p>`:''}${l.doi?`<p class="lit-authors">DOI：${escape(l.doi)}</p>`:''}${l.authors?`<p class="lit-authors">作者：${escape(l.authors)}</p>`:''}
 <div class="lit-detail-badges"><span class="lit-type-chip ${l.articleType==='SCI'?'is-sci':''}">${chipText(l.articleType||'未分类')}</span>${l.quartile&&l.quartile!=='未填写'?`<span class="lit-quarter-chip">${escape(l.quartile)}</span>`:''}${statusChip(l.readStatus||'未读')}${statusChip(l.importance||'中')}</div>
 <div class="lit-facts"><div><span>期刊名</span><strong>${chipText(l.journal)}</strong></div><div><span>发表年份</span><strong>${chipText(l.year)}</strong></div><div><span>期刊分区</span><strong>${chipText(l.quartile)}</strong></div><div><span>影响因子 IF</span><strong>${imp!==null&&Number.isFinite(imp)?imp.toFixed(imp%1===0?1:Math.min(3,(String(imp).split('.')[1]||'').length)):'未填写'}</strong></div><div><span>文献分类</span><strong>${chipText(l.category)}</strong></div></div>
 
 <div class="lit-reader-file"><div><strong>本地 PDF</strong><small>${escape(l.pdfName||'尚未上传 PDF · 文件存储在当前浏览器')}</small></div><div>${l.pdfName?`<button class="btn btn-outline btn-sm" data-action="pdf-open" data-id="${escape(l.id)}">打开 PDF</button><button class="btn btn-outline btn-sm" data-action="pdf-reanalyze" data-id="${escape(l.id)}" title="从浏览器内保存的 PDF 重新识别期刊与作者">重新识别期刊 / 作者</button><button class="btn btn-ghost btn-sm" data-action="pdf-remove" data-id="${escape(l.id)}">移除</button>`:`<button class="btn btn-outline btn-sm" data-action="pdf-upload" data-id="${escape(l.id)}">＋ 上传 PDF</button>`}</div></div>
 <section class="lit-reading-section"><h3>创新点</h3>${litReaderText(l.keyFindings)}</section>
 <section class="lit-reading-section"><h3>研究问题</h3>${litReaderText(l.researchQuestion)}</section>
 <section class="lit-reading-section"><h3>研究方法</h3>${litReaderText(l.researchMethods)}</section>
 <section class="lit-reading-section"><h3>摘要</h3>${litReaderText(l.abstractZh||(!hasEnglishAbstract(l.abstract)?l.abstract:''),escape(l.abstractTranslationStatus||'中文摘要尚未生成。请在设置中检查翻译服务，或编辑文献手动填写。'))}</section>
 ${l.abstract&&hasEnglishAbstract(l.abstract)?`<details class="lit-english-source"><summary>查看英文原始摘要</summary>${litReaderText(l.abstract)}</details>`:''}
 <div class="lit-end-note">分区与影响因子仅在匹配有权使用的年度指标表时填写，需自行核对。</div>`}
function literaturePageHtml(){const configured=data.settings.categoryOptions.literature||config.literature.fields.find(f=>f[0]==='category')[4],cats=[...new Set([...configured,...data.literature.map(x=>x.category).filter(Boolean)])],rs=literatureSubset(),all=data.literature;
 const tags=[...new Set(all.flatMap(literatureTags))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 const sel=rs.find(l=>l.id===litSelectedId)||rs[0]||null;
 return `<div class="workspace-title lit-title lit-v130-head"><div><h1>文献中心</h1></div></div>
 <div class="lit-v130-tools" role="group" aria-label="文献中心导入、导出与联网选项"><div class="lit-v130-tools-group"><button class="btn btn-outline btn-sm" data-action="literature-import">导入 CSV</button><button class="btn btn-outline btn-sm" data-action="literature-export">导出 CSV</button><button class="btn btn-outline btn-sm lit-pdf-btn" data-action="pdf-import-direct">↑ 导入 PDF</button>${actionBtn('＋ 新建文献','add:literature')}</div><label class="lit-online-control" title="仅向在线文献服务发送 DOI 或论文标题，不上传 PDF"><input type="checkbox" id="networkMetadata" ${data.settings.networkMetadata?'checked':''}> 联网核对题名 / 期刊</label></div>
 <input type="file" hidden id="literatureImport" accept=".csv,text/csv"><input type="file" hidden id="pdfUpload" accept=".pdf,application/pdf">
 <div class="lit-overview-line"><span><strong>${all.length}</strong> 篇文献</span><span><strong>${all.filter(x=>x.articleType==='SCI').length}</strong> 篇 SCI</span><span><strong>${all.filter(x=>x.articleType==='中文').length}</strong> 篇中文</span><span><strong>${all.filter(x=>x.readStatus==='已精读').length}</strong> 篇已精读</span></div>
 <div class="lit-workspace">
 <aside class="lit-rail"><div class="lit-rail-section"><div class="lit-rail-head"><b>文献分类</b><button class="lit-quiet-btn" data-action="lit-manage">管理</button></div><div class="lit-category-list">${[['全部','全部文献'],...cats.map(c=>[c,c])].map(([v,label])=>`<button class="lit-cat ${litCategory===v?'active':''}" data-litcat="${escape(v)}"><span>▤　${escape(label)}</span><em>${v==='全部'?all.length:all.filter(x=>x.category===v).length}</em></button>`).join('')}</div></div>
 <div class="lit-rail-section"><div class="lit-rail-head"><b>文献类型</b></div><div class="lit-type-list">${[['','全部类型'],['SCI','SCI'],['中文','中文']].map(([v,label])=>`<button class="lit-cat ${litTypeFilter===v?'active':''}" data-littype="${escape(v)}"><span>◌　${escape(label)}</span><em>${v?all.filter(x=>x.articleType===v).length:all.length}</em></button>`).join('')}</div></div>
 </aside>
 <section class="lit-list-pane"><div class="lit-pane-title"><h2>文献列表 <span>${rs.length}</span></h2><button class="lit-quiet-btn" data-action="clear-literature">清除筛选</button></div>
 <input id="moduleSearch" class="input lit-search-input" type="search" placeholder="搜索标题、作者、期刊、DOI 与摘要" value="${escape(search)}" aria-label="搜索文献">
 <div class="lit-select-line">${filterSelect('litStatusFilter',[['','全部阅读状态'],['未读','未读'],['待读','待读'],['阅读中','阅读中'],['已精读','已精读']],litStatusFilter,'阅读状态')}${filterSelect('litPriorityFilter',[['','重要程度'],['高','高'],['中','中'],['低','低']],litPriorityFilter,'重要程度')}${filterSelect('litSort',[['year-desc','年份新→旧'],['year-asc','年份旧→新'],['name','标题排序']],litSort,'排序')}</div>
 <div class="lit-paper-items" role="group" aria-label="文献列表">${rs.length?rs.slice(0,literatureLimit).map(l=>`<button class="lit-paper-row ${sel?.id===l.id?'active':''}" aria-pressed="${sel?.id===l.id?'true':'false'}" data-litselect="${escape(l.id)}"><span class="lit-paper-row-type">${escape(l.articleType||'文献')} · ${escape(l.year||'未填年份')}</span><strong>${escape(l.title||'未命名文献')}</strong><small>作者：${escape(l.authors||'待完善')}</small><span class="lit-paper-row-journal">${escape(l.journal||'期刊名未填写')}</span><span class="lit-row-bottom">${l.quartile&&l.quartile!=='未填写'?`<em>${escape(l.quartile)}</em>`:''}<em>${escape(l.readStatus||'未读')}</em></span></button>`).join(''):`<div class="lit-list-empty">没有符合条件的文献<br><small>调整筛选条件或新增文献</small></div>`}</div>${rs.length>literatureLimit?`<div class="v2-load-more"><span>显示前 ${literatureLimit} / ${rs.length} 篇</span><button class="btn btn-outline btn-sm" data-action="v2-more-literature">继续加载文献</button></div>`:''}</section>
 <article class="lit-detail-pane">${literatureDetailHtml(sel)}</article></div>
`}
function downloadFile(filename,content,mime){const blob=new Blob([content],{type:mime||'application/octet-stream'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('已请求浏览器下载，请在下载列表中确认文件已保存')}
const literatureCols=['title','doi','authors','correspondingAuthor','year','category','articleType','journal','quartile','impactFactor','metricYear','issn','metricSource','abstractZh','readStatus','importance','abstract','researchQuestion','researchMethods','keyFindings'];
function csvEscape(v){
 const str=String(v??'');
 // A quoted tab before formula-like cells prevents automatic evaluation in many Excel imports.
 // CSV is an interchange format, so keep JSON backup as the lossless source of truth.
 if(/^[\s\u200b]*[=+\-@＝＋－＠]/u.test(str))return '"\t'+str.replace(/"/g,'""')+'"';
 return /[",\r\n]/.test(str)?'"'+str.replace(/"/g,'""')+'"':str;
}
function literatureCsv(){return '\ufeff'+[literatureCols.join(','),...data.literature.map(l=>literatureCols.map(k=>csvEscape(k==='year'&&String(l[k]??'')==='0'?'':l[k])).join(','))].join('\r\n')}
function parseCSV(content){
 if(content.length>12*1024*1024)throw Error('CSV 超出 12 MB 安全读取限制，请分批导入');
 // A strict RFC-4180-style finite-state parser: malformed quoting is rejected
 // before ANY records are committed. Quoted embedded line breaks remain intact.
 const rows=[];let row=[],field='',state='start';
 content=content.replace(/^\ufeff/,'');
 const addField=()=>{row.push(field);field='';state='start'};
 const addRow=()=>{addField();if(row.some(x=>x.trim()))rows.push(row);row=[];if(rows.length>30002)throw Error('CSV 超出单次导入行数限制')};
 for(let i=0;i<content.length;i++){
  const ch=content[i];
  if(state==='quoted'){
   if(ch==='"'){if(content[i+1]==='"'){field+='"';i++}else state='afterquote'}
   else field+=ch;
   continue;
  }
  if(state==='afterquote'){
   if(ch===' '||ch==='\t')continue; // Common CSV exporters add harmless padding.
   if(ch!==','&&ch!=='\n'&&ch!=='\r')throw Error('CSV 引号结束后包含非法字符（位置 '+(i+1)+'）');
  }else if(ch==='"'){
   if(state!=='start')throw Error('CSV 字段中存在未转义的引号（位置 '+(i+1)+'）');
   state='quoted';continue;
  }
  if(ch===','){addField();continue}
  if(ch==='\n'||ch==='\r'){if(ch==='\r'&&content[i+1]==='\n')i++;addRow();continue}
  field+=ch;state='plain';
 }
 if(state==='quoted')throw Error('CSV 引号不完整');
 addRow();
 if(!rows.length)return [];
 const headers=rows.shift().map(x=>x.trim());
 if(!headers.includes('title'))throw Error('CSV 必须包含 title 列');
 if(headers.length>100||headers.some(x=>!x)||headers.length!==new Set(headers).size)throw Error('CSV 列标题为空、重复或过多');
 const unknown=headers.filter(k=>!literatureCols.includes(k));
 if(unknown.length)throw Error('CSV 含不支持的字段：'+unknown.slice(0,6).join('、')+'。请使用支持的模板或 JSON 完整备份，避免静默丢列。');
 if(rows.length>30000)throw Error('单次最多导入 30000 条文献，请分批处理');
 const result=[];
 for(let i=0;i<rows.length;i++){
  const fields=rows[i];if(fields.length!==headers.length)throw Error('CSV 第 '+(i+2)+' 条数据字段数量与表头不一致');
  const r={};headers.forEach((h,j)=>{r[h]=String(fields[j]??'').trim()});
  if(!r.title)throw Error('CSV 第 '+(i+2)+' 条文献标题为空，已停止整批导入以防数据丢失');
  if(r.year==='0')r.year=''; // Historical unknown-year sentinel, never treat as publication year.
  if(r.year&&!/^(?:19\d{2}|20\d{2}|2100)$/.test(r.year))throw Error('CSV 第 '+(i+2)+' 条数据年份无效');
  result.push(r);
 }
 return result;
}
function importLiterature(file){if(file.size>12*1024*1024){toast('CSV 文件超过 12MB，请分批导入');return}const fr=new FileReader();fr.onload=()=>{try{const rows=parseCSV(String(fr.result));if(!rows.length){toast('CSV 中没有有效文献记录');return}if(!confirm(`即将导入 ${rows.length} 篇文献，已有文献不会被覆盖。继续吗？`))return;
 // Treat storage writes as a transaction: never claim an import succeeded if quota/conflict prevents saving.
 const original=data.literature,originalActivities=data.activities;
 const now=new Date().toISOString();const created=rows.map(row=>({...row,id:id(),year:row.year?Number(row.year):0,createdAt:now,updatedAt:now}));
 data.literature=[...created,...original];data.activities=originalActivities.slice();log('导入文献 CSV：'+rows.length+'篇');
 if(!save()){data.literature=original;data.activities=originalActivities;return}
 litSelectedId=null;render();if(created.length<=20)for(const rec of created)void autoFillAbstract(rec);toast('成功导入 '+rows.length+' 篇文献'+(created.length>20?'（批量导入未自动触发逐篇联网补全）':''));
 }catch(e){alert('CSV 导入失败：'+e.message)}};fr.onerror=()=>toast('CSV 文件读取失败，请重试');fr.readAsText(file,'utf-8')}
// Best-effort import: embedded PDF /Info and XMP metadata. Online pdf.js is optional,
// never relied on for offline operation. Unknown fields are left empty for manual review.
function decodePdfLiteral(value){return String(value||'').replace(/\\([0-7]{1,3})/g,(_,n)=>String.fromCharCode(parseInt(n,8))).replace(/\\([()\\])/g,'$1').replace(/\\n/g,' ').trim()}
function xmlText(s){return String(s||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim()}
let pdfJsLoading=null,ocrJsLoading=null,pdfJsFailureAt=0,ocrJsFailureAt=0;
let pdfJsWorkerUrl='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
function loadExternalLibrary(url,check,timeout=12000){if(PUBLIC_BUILD)return Promise.resolve(null);return new Promise(resolve=>{
 if(check())return resolve(check());
 const script=document.createElement('script');script.async=true;script.src=url;
 let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(timer);resolve(v)};
 const timer=setTimeout(()=>finish(null),timeout);
 script.onload=()=>finish(check());script.onerror=()=>finish(null);
 document.head.appendChild(script);
});}
async function ensurePdfJs(){
 if(window.pdfjsLib)return window.pdfjsLib;
 if(PUBLIC_BUILD||!navigator.onLine||Date.now()-pdfJsFailureAt<120000)return null;
 if(!pdfJsLoading)pdfJsLoading=(async()=>{
  let pdf=await loadExternalLibrary('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',()=>window.pdfjsLib,4800);
  if(!pdf){pdf=await loadExternalLibrary('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',()=>window.pdfjsLib,4800);
   if(pdf)pdfJsWorkerUrl='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
  if(!pdf)pdfJsFailureAt=Date.now();return pdf;
 })();
 const result=await pdfJsLoading;if(!result)pdfJsLoading=null;return result;
}
async function ensureTesseract(){
 if(window.Tesseract)return window.Tesseract;
 if(PUBLIC_BUILD||!navigator.onLine||Date.now()-ocrJsFailureAt<120000)return null;
 if(!ocrJsLoading)ocrJsLoading=loadExternalLibrary('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',()=>window.Tesseract,12000).then(result=>{if(!result)ocrJsFailureAt=Date.now();return result});
 const ocr=await ocrJsLoading;if(!ocr)ocrJsLoading=null;return ocr;
}
let activePdfMessage=null;
function pdfBusy(message){if(!message){activePdfMessage?.remove();activePdfMessage=null;return}if(!activePdfMessage){activePdfMessage=document.createElement('div');activePdfMessage.className='pdf-busy';activePdfMessage.setAttribute('role','status');activePdfMessage.setAttribute('aria-live','polite');document.body.append(activePdfMessage)}activePdfMessage.textContent=message;}
async function extractPdfBibliography(file){
 if(!window.ScholarPDF)throw Error('PDF 识别模块未加载');
 pdfBusy('正在解析 PDF，提取前 3 页的标题、期刊、DOI 与摘要…');
 const pdfjs=await ensurePdfJs();
 if(pdfjs)pdfjs.GlobalWorkerOptions.workerSrc=pdfJsWorkerUrl;
 const recognizeScan=async(canvas)=>{
  pdfBusy('检测到扫描版 PDF，正在初始化 OCR（首次需要下载识别模型）…');
  const engine=await ensureTesseract();if(!engine)return '';
  try{const r=await engine.recognize(canvas,'eng+chi_sim');return r?.data?.text||'';}
  catch(e){try{const r=await engine.recognize(canvas,'eng');return r?.data?.text||'';}catch{return ''}}
 };
 try{return await window.ScholarPDF.extract(file,pdfjs,{ocr:navigator.onLine?recognizeScan:null});}
 finally{pdfBusy(null)}
}
async function completePdfMetadata(local){
 if(!data.settings.networkMetadata||!navigator.onLine||(!local.title&&!local.doi)||!window.ScholarPDF)return local;
 pdfBusy('正在联网核对 Crossref / OpenAlex 期刊、标题与 DOI…');
 try{const remote=await window.ScholarPDF.onlineLookup(local);
  if(remote){const result={...local};
   // DOI exact record: more authoritative. For title lookups require high similarity.
   for(const key of ['title','journal','year','doi','authors','abstract'])if(remote[key]&&(key!=='abstract'||remote.verifiedDOI||remote.score>=.96)&&(!result[key]||key==='title'&&(remote.verifiedDOI||local.confidence==='low')))result[key]=remote[key];
   result.articleType=window.ScholarPDF.inferArticleType(result.title);
   result.source=`${local.source} + ${remote.source}（${Math.round(remote.score*100)}%匹配，待核实）`;result.confidence='high';return result;
  }
 }catch(err){toast('联网补全不可用，保留本地识别结果');}
 finally{pdfBusy(null)}
 return local;
}
// Journal match is opt-in. Only the current title goes to Crossref, never PDF bytes.
function normalizePaperTitle(v){return String(v||'').normalize('NFKC').toLowerCase().replace(/<[^>]+>/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ')}
function journalTitleMatchScore(a,b){
 if(window.ScholarPDF?.similarity)return window.ScholarPDF.similarity(a,b);
 const x=normalizePaperTitle(a),y=normalizePaperTitle(b);
 if(!x||!y)return 0;if(x===y)return 1;
 const xt=x.split(' ').filter(Boolean),yt=y.split(' ').filter(Boolean);
 const setX=new Set(xt),setY=new Set(yt),intersection=[...setX].filter(t=>setY.has(t)).length;
 const overlap=intersection/Math.max(setX.size,setY.size,1);
 const lengthRatio=Math.min(x.length,y.length)/Math.max(x.length,y.length);
 return overlap*0.83+lengthRatio*0.17;
}
async function findCrossrefJournal(title){
 if(!navigator.onLine)throw Error('当前设备处于离线状态');
 const clean=String(title||'').trim();if(clean.length<12)throw Error('论文标题过短，请先补全标题');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
 try{
  const url='https://api.crossref.org/works?rows=5&select=title,container-title,published,DOI,type&filter=type:journal-article&query.bibliographic='+encodeURIComponent(clean);
  const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Crossref 服务暂不可用（HTTP '+response.status+'）');
  const result=await response.json();const items=result?.message?.items||[];
  const matches=items.map(item=>({item,score:journalTitleMatchScore(clean,(item.title||[])[0])})).sort((a,b)=>b.score-a.score);
  const best=matches[0];
  if(!best||best.score<0.88||!best.item['container-title']?.[0])return null;
  const dateParts=best.item.published?.['date-parts']?.[0]||[];
  return {journal:String(best.item['container-title'][0]),year:Number(dateParts[0])||null,score:best.score,source:'Crossref（按标题匹配）',matchedTitle:String(best.item.title?.[0]||'')};
 }finally{clearTimeout(timer)}
}
async function recognizeJournal(recordId){
 const record=data.literature.find(r=>r.id===recordId);if(!record)return;
 if(!confirm('将当前论文标题发送给 Crossref 查询期刊名（不会上传 PDF）。继续吗？'))return;
 toast('正在查询 Crossref 期刊元数据…');
 try{
  const match=await findCrossrefJournal(record.title);
  if(!match){toast('未找到足够可靠的期刊匹配，请手动填写');return}
  const acceptance=`Crossref 高置信度匹配（${Math.round(match.score*100)}%）\n论文：${match.matchedTitle}\n期刊：${match.journal}\n${match.year?'年份：'+match.year+'\n':''}是否采用这条期刊信息？`;
  if(!confirm(acceptance))return;
  const index=data.literature.findIndex(r=>r.id===recordId);
  const old={...record};record.journal=match.journal;if(match.year&&!record.year)record.year=match.year;
  record.metadataSource=match.source;record.metadataVerified=false;record.updatedAt=new Date().toISOString();
  if(!save()){data.literature[index]=old;return}
  litSelectedId=recordId;render();toast('期刊名已填入，请人工核对');
 }catch(err){toast('期刊识别失败：'+(err.name==='AbortError'?'网络超时':err.message))}
}
function fileDB(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(Error('当前环境不支持 IndexedDB'));return}const request=indexedDB.open(PUBLIC_BUILD?'ScholarFlow-PDF-PUBLIC-v128':'ScholarFlow-PDF-v12',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
// IndexedDB request success is NOT transaction durability. Resolve only on tx.complete.
async function fileStore(op,key,value){
 const db=await fileDB();return new Promise((resolve,reject)=>{
  let settled=false,result;const settle=(err)=>{if(settled)return;settled=true;db.close();err?reject(err):resolve(result)};
  try{
   const tx=db.transaction('files',op==='get'?'readonly':'readwrite');
   const store=tx.objectStore('files');
   const req=op==='get'?store.get(key):op==='delete'?store.delete(key):store.put(value,key);
   req.onsuccess=()=>{result=req.result};
   tx.oncomplete=()=>settle();
   tx.onabort=()=>settle(tx.error||Error('PDF 数据库事务被取消'));
   tx.onerror=()=>{}; // abort event is the terminal error; never acknowledge early
  }catch(err){settle(err)}
 });
}
// Reject renamed non-PDF content before allocating IndexedDB space. Signature alone
// is not a full malicious-PDF scanner; PDFs remain local and are never executed here.
async function validatePDFFile(file){
 if(!file||!/\.pdf$/i.test(file.name||'')||!Number.isFinite(file.size)||file.size<8||file.size>30*1024*1024)throw Error('仅支持有效且不超过 30 MB 的 PDF');
 const first=new Uint8Array(await file.slice(0,1024).arrayBuffer());
 const signature=new TextDecoder('latin1').decode(first);
 if(!/%PDF-\d\.\d/.test(signature))throw Error('文件缺少 PDF 标识，已拒绝导入');
 return true;
}
let pdfCleanupRunning=false;
async function cleanupPendingPDFs(){
 if(pdfCleanupRunning||!data.pdfDeletionQueue?.length)return;
 pdfCleanupRunning=true;
 try{
  for(const recordId of [...data.pdfDeletionQueue]){
   // A restored or newly active item should never have its file deleted.
   if(data.literature.some(r=>r.id===recordId)||data.trash.some(t=>t.type==='literature'&&t.record?.id===recordId)){
    data.pdfDeletionQueue=data.pdfDeletionQueue.filter(id=>id!==recordId);save();continue;
   }
   try{await fileStore('delete',recordId);data.pdfDeletionQueue=data.pdfDeletionQueue.filter(id=>id!==recordId);save();}
   catch(err){console.warn('PDF deletion will retry at next launch',err);}
  }
 }finally{pdfCleanupRunning=false;}
}
function purgeExpiredTrash(){
 const {expired,retained}=expiredTrash(data.trash);
 if(!expired.length){void cleanupPendingPDFs();return 0;}
 const pending=expired.filter(t=>t.type==='literature'&&t.record?.id).map(t=>t.record.id);
 const priorTrash=data.trash,priorQueue=data.pdfDeletionQueue;
 data.trash=retained;data.pdfDeletionQueue=[...new Set([...(data.pdfDeletionQueue||[]),...pending])];
 if(!save()){data.trash=priorTrash;data.pdfDeletionQueue=priorQueue;return 0;}
 void cleanupPendingPDFs();return expired.length;
}

async function uploadPDF(recordId,file,skipRecognition=false){
 const record=data.literature.find(l=>l.id===recordId);if(!record)return false;
 const backup={...record};
 try{await validatePDFFile(file)}catch(err){toast(err.message);return false}
 try{
  // Keep the previous attachment until both the blob and JSON index are saved.
  // IndexedDB and localStorage have no shared transaction, so a rollback is best-effort.
  const previousBlob=await fileStore('get',recordId);
  await fileStore('put',recordId,file);
  record.pdfName=file.name;record.pdfSize=file.size;
  if(!skipRecognition){try{
   const meta=await completePdfMetadata(await extractPdfBibliography(file));
   for(const field of ['doi','journal','authors','year','abstract','correspondingAuthor'])if(!record[field]&&meta[field])record[field]=meta[field];
   if((!record.title||record.title===record.pdfName.replace(/\.pdf$/i,''))&&meta.title)record.title=meta.title;
   if(!record.abstractZh&&meta.abstract&&!hasEnglishAbstract(meta.abstract)&&/[\u3400-\u9fff]/.test(meta.abstract)){record.abstractZh=meta.abstract;record.abstractTranslationStatus='中文 PDF：已直接提取原文摘要';}record.metadataSource=meta.source;record.metadataVerified=false;
   if((!record.articleType||record.articleType==='未分类')&&meta.articleType)record.articleType=meta.articleType;
  }catch(err){pdfBusy(null);toast('PDF 已保存；自动识别未完成：'+err.message)}}
  record.updatedAt=new Date().toISOString();if(!save()){Object.assign(record,backup);
    try{await (previousBlob==null?fileStore('delete',recordId):fileStore('put',recordId,previousBlob))}catch(err){toast('附件回滚失败，请备份文献后检查本地 PDF：'+err.message)}
    render();toast('PDF 索引保存失败：已尝试恢复旧附件与元信息');return false}render();void autoFillAbstract(record);toast('PDF 已保存在本地，识别结果请核对');return true;
 }catch(e){Object.assign(record,backup);pdfBusy(null);toast('保存 PDF 失败：'+e.message);return false}
}
// Re-run the improved parser on the PDF already in IndexedDB; no re-upload required.
// Existing manual data stays untouched until the researcher explicitly approves updates.
async function reanalyzePDF(recordId){
 const record=data.literature.find(l=>l.id===recordId);if(!record)return;
 try{
  const stored=await fileStore('get',recordId);
  if(!stored){toast('当前浏览器没有保存此 PDF，请重新上传文件');return}
  const file=stored instanceof File?stored:new File([stored],record.pdfName||'paper.pdf',{type:'application/pdf'});
  const meta=await completePdfMetadata(await extractPdfBibliography(file));
  const changes=['journal','authors'].filter(key=>String(meta[key]||'').trim()&&String(meta[key]).trim()!==String(record[key]||'').trim());
  if(!changes.length){toast('未检测到可更新的期刊名或作者；请检查 PDF 是否为扫描件');return}
  const labels={journal:'期刊名',authors:'作者'};
  const proposal=changes.map(key=>labels[key]+'：'+(record[key]||'（空）')+' → '+meta[key]).join('\n');
  if(!confirm('从本地 PDF 重新识别到以下信息：\n'+proposal+'\n\n是否应用到文献记录？不会修改论文标题及阅读笔记。'))return;
  const previous=Object.fromEntries(changes.map(key=>[key,record[key]]));
  for(const key of changes)record[key]=meta[key];
  const prevUpdatedAt=record.updatedAt,prevSource=record.metadataSource;
  record.updatedAt=new Date().toISOString();record.metadataSource=meta.source+'（重新识别、已人工确认应用）';
  if(!save()){Object.assign(record,previous,{updatedAt:prevUpdatedAt,metadataSource:prevSource});return}
  render();toast('期刊名及作者已更新');
 }catch(err){pdfBusy(null);toast('重新识别失败：'+(err?.message||'无法读取 PDF'))}
}

async function viewPDF(recordId){
 try{
  const f=await fileStore('get',recordId);
  if(!f){toast('此记录的 PDF 不在当前浏览器中，请重新上传');return}
  const url=URL.createObjectURL(new Blob([f],{type:'application/pdf'}));
  const layer=document.createElement('div');layer.className='pdf-viewer-backdrop';
  const safeUrl=escape(url);
  layer.innerHTML=`<div class="pdf-viewer" role="dialog" aria-modal="true" aria-label="PDF 预览"><header><b>PDF 预览</b><div><a class="btn btn-outline btn-sm" href="${safeUrl}" download="${escape(data.literature.find(l=>l.id===recordId)?.pdfName||'文献.pdf')}">另存为 PDF</a><button class="btn btn-sm" data-close-pdf="1">关闭</button></div></header><iframe title="PDF 文件预览" src="${safeUrl}"></iframe></div>`;
  const close=()=>{layer.remove();document.removeEventListener('keydown',onEscape);URL.revokeObjectURL(url)};
  const onEscape=(event)=>{if(event.key==='Escape')close()};
  layer.addEventListener('click',event=>{if(event.target===layer||event.target.closest('[data-close-pdf]'))close()});
  document.addEventListener('keydown',onEscape);document.body.appendChild(layer);
 }catch(e){toast('打开 PDF 失败：'+e.message)}
}
async function removePDF(recordId){
 if(!confirm('确认移除本地 PDF？不会删除原始电脑文件。'))return;
 const r=data.literature.find(x=>x.id===recordId);if(!r)return;
 const original={pdfName:r.pdfName,pdfSize:r.pdfSize};
 delete r.pdfName;delete r.pdfSize;
 if(!save()){render();return}
 try{await fileStore('delete',recordId);render();toast('PDF 已移除')}
 catch(err){
  if(original.pdfName!==undefined)r.pdfName=original.pdfName;
  if(original.pdfSize!==undefined)r.pdfSize=original.pdfSize;
  if(save())toast('PDF 删除失败，文献索引已恢复：'+err.message);
  else toast('PDF 删除失败且索引恢复未成功，请先导出备份核对文件');
  render();
 }
}

/* 历史模块 focused scientific workflows. These share data/state with the legacy modules. */
const workflowTitle=(title,subtitle,button='',action='')=>`<div class="workspace-title streamlined-heading"><h1>${escape(title)}</h1>${button?actionBtn(button,action):''}</div>`;
const countPills=(values,current,attr,source)=>`<div class="category-chips category-chips-roomy">${values.map(x=>`<button type="button" class="category-chip ${current===x?'is-on':''}" ${attr}="${escape(x)}">${escape(x)} <em>${x==='全部'?source.length:source.filter(y=>(y.category||'未分类')===x).length}</em></button>`).join('')}</div>`;
/** The same searchable, keyboard-friendly toolbar is used by every research workflow. */
function researchToolbar({type,placeholder,cats,current,attr,source,visible,views=true,extra='',unit='条'}){
 const field=type==='tasks'?'origin':'category';
 const label=config[type]?.label||type;
 const categoryCounts=Array.isArray(cats)?cats:['全部'];
 const chips=`<div class="category-chips category-chips-roomy" role="group" aria-label="${escape(label)}分类筛选">${categoryCounts.map(cat=>{
  const num=cat==='全部'?source.length:source.filter(r=>(type==='papers'&&r.category==='写作计划'?'在写论文':(r[field]||'未分类'))===cat).length;
  return `<button type="button" class="category-chip ${current===cat?'is-on':''}" ${attr}="${escape(cat)}" aria-pressed="${current===cat}" title="显示${escape(cat)}分类">${escape(type==='tasks'&&cat==='自己'?'我的任务':type==='tasks'&&cat==='老师'?'老师安排':cat)} <em>${num}</em></button>`;
 }).join('')}</div>`;
 const archiveControls=ARCHIVE_MODULES[type]?archiveSwitch(type,type==='tasks'?data.tasks:type==='papers'?data.papers.filter(p=>p.status!=='已发表'):data[type],true):'';
 const viewButtons=type==='tasks'?`<div class="record-view-toggle" role="group" aria-label="任务显示方式">${[['list','☷ 列表'],['board','▦ 看板'],['calendar','▦ 日历']].map(([mode,text])=>`<button data-task-view="${mode}" class="${taskView===mode?'selected':''}" aria-pressed="${taskView===mode}">${text}</button>`).join('')}</div>`:views?boardViewSwitch(type):'';
 return `<section class="control-panel sf-unified-tools" data-toolbar-module="${escape(type)}" aria-label="${escape(label)}筛选和视图设置"><div class="sf-toolbar-layout"><div class="sf-toolbar-scroll" tabindex="0" aria-label="分类与筛选，空间不足时可左右滚动"><div class="filter-strip sf-toolbar-row"><div class="sf-toolbar-search"><span class="sf-search-glyph" aria-hidden="true">⌕</span><input id="moduleSearch" class="input module-search" type="search" placeholder="${escape(placeholder)}" aria-label="搜索${escape(label)}" value="${escape(search)}" autocomplete="off"></div>${chips}${extra?`<div class="sf-toolbar-extra">${extra}</div>`:''}</div></div><div class="sf-toolbar-actions sf-toolbar-fixed-actions">${archiveControls}<span class="result-count sf-toolbar-result" role="status" aria-live="polite">${visible} ${escape(unit)}</span>${viewButtons}<button class="btn btn-outline btn-sm module-manage-btn" data-action="manage-categories" data-type="${escape(type)}" aria-label="管理${escape(label)}分类">⚙ 管理</button></div></div></section>`;
}

// Local paths are displayed as text and resolved only by the trusted desktop / loopback service.
// They are never interpolated into a file:// URL or executed as a program.
const isLocalPath=value=>/^(?:[A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+|\/)/.test(String(value||'').trim());
function pathAction(path){
 const value=String(path||'').trim();if(!value)return '<span class="dim">未记录路径</span>';
 const safePath=escape(value);
 return `<span class="linked-file-path"><code title="${safePath}">${safePath}</code><button type="button" class="btn btn-outline btn-sm" data-action="open-local-path" data-path="${safePath}" title="由本机文件管理器定位路径，不执行文件">↗ 定位文件</button><button type="button" class="btn btn-ghost btn-sm" data-action="copy-path" data-path="${safePath}">复制</button></span>`;
}
async function revealLocalPath(value){
 const target=String(value||'').trim();
 if(!target)return toast('请先填写文件路径');
 if(/^https:\/\//i.test(target)){window.open(target,'_blank','noopener,noreferrer');return}
 if(!isLocalPath(target)){toast('请输入绝对路径，或使用 HTTPS 网址');return}
 try{
  if(window.scholarflowNative?.revealPath){const answer=await window.scholarflowNative.revealPath(target);if(!answer?.ok)throw Error(answer?.error||'定位失败');toast('已在文件管理器中定位');return}
  const tokenResponse=await fetch('/api/file-reveal-token',{cache:'no-store'});
  if(!tokenResponse.ok)throw Error('请使用 start-web.bat 启动本地服务，或使用桌面版');
  const token=(await tokenResponse.json()).token;
  const response=await fetch('/api/reveal-path',{method:'POST',headers:{'Content-Type':'application/json','X-ScholarFlow-Token':token},body:JSON.stringify({path:target})});
  const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'定位失败');toast('已在文件管理器中定位');
 }catch(error){
  if(navigator.clipboard?.writeText)try{await navigator.clipboard.writeText(target)}catch{}
  toast((error.message||'无法直接定位')+'；可复制路径后粘贴到系统文件管理器');
 }
}
const tag=(value)=>`<span class="origin-tag">${escape(value||'未分类')}</span>`;
const miniActions=(type,r)=>`<span class="actions-inline"><button data-edit="${type}:${escape(r.id)}">编辑</button><button class="del-link" data-del="${type}:${escape(r.id)}">删除</button></span>`;
const entityEmpty=(title,text,action,label)=>`<div class="card card-pad workflow-empty"><div class="empty" style="padding:26px 12px"><div class="emoji">✦</div><b>${escape(title)}</b><div>${escape(text)}</div></div>${action?`<div class="center">${actionBtn('＋ '+label,action,'btn btn-sm')}</div>`:''}</div>`;
const textBlock=(s,placeholder='尚未填写')=>s?`<div class="pre-line">${escape(s)}</div>`:`<span class="dim">${escape(placeholder)}</span>`;
// One database per module: list and board are interchangeable views of the SAME records.
// v1.19: category-based boards use exactly the same collection as the category filter.
// Workflow status remains visible as a badge, without creating unrelated empty columns.
const BOARD_MODULES={
 notes:{field:'category',defaultGroup:'其他'},
 simulations:{field:'category',defaultGroup:'UMATHT'},
 experiments:{field:'category',defaultGroup:'其他'},
 advisor:{field:'category',defaultGroup:'其他'},
 papers:{field:'category',defaultGroup:'在写论文'}
};
function viewIsBoard(type){return ((data.settings.viewModes||{})[type]|| ('board'))==='board'}
function boardViewSwitch(type){return `<div class="record-view-toggle" role="group" aria-label="${escape(config[type]?.label||type)}视图"><button class="${!viewIsBoard(type)?'selected':''}" data-view-switch="${type}:list" aria-pressed="${!viewIsBoard(type)}">☷ 列表</button><button class="${viewIsBoard(type)?'selected':''}" data-view-switch="${type}:board" aria-pressed="${viewIsBoard(type)}">▦ 看板</button></div>`}
function selectedBoardCategory(type){return {notes:noteCategory,simulations:simulationCategory,experiments:experimentCategory,advisor:advisorCategory,papers:paperCategory}[type]||'全部'}
function allCategoryNames(type){
 const configured=categoryEntries(type);
 const historical=(data[type]||[]).map(r=>String(r.category||'').trim()).filter(Boolean);
 return [...new Set([...configured,...historical])].filter(Boolean);
}
function availableFilterCategories(type){const groups=allCategoryNames(type);if((data[type]||[]).some(r=>!r.category)&&!groups.includes('未分类'))groups.push('未分类');return ['全部',...groups]}
function kanbanGroups(type,records,selected=selectedBoardCategory(type)){
 const meta=BOARD_MODULES[type];if(!meta)return [];
 // A selected chip is a focused view, not a request for all empty columns.
 if(selected!=='全部')return [selected];
 // Include new, unused categories immediately; preserve historical categories so no record is hidden.
 const groups=allCategoryNames(type);
 if((data[type]||[]).some(r=>!r[meta.field])&&!groups.includes('未分类'))groups.push('未分类');
 return groups.length?groups:[meta.defaultGroup];
}
function boardHtml(type,records){
 const meta=BOARD_MODULES[type];if(!meta)return '';
 const current=selectedBoardCategory(type),groups=kanbanGroups(type,records,current),isFocused=current!=='全部';
 const otherCount=records.filter(r=>!r[meta.field]).length;
 const visibleRecords=records.slice(0,boardLimit);
 const caption=isFocused?`当前仅显示「${escape(current)}」中的 ${records.length} 条记录`:`全部分类 · ${records.length} 条匹配记录 · ${groups.length} 个分类${groups.length>4?' · 可左右滚动查看更多':''}`;
 return `<div class="board-view-caption" role="status"><span>${caption}</span>${isFocused?`<button class="board-back-all" data-board-all="${escape(type)}">查看全部分类 →</button>`:''}</div>
 <div class="research-kanban ${groups.length===1?'kanban-single':''}" tabindex="0" aria-label="${escape(config[type].label)} 分类看板" aria-live="polite">${groups.map((group,i)=>{
 const items=visibleRecords.filter(r=>(r[meta.field]||'未分类')===group);
 const archived=!categoryEntries(type).includes(group);
 const canMove=groups.length>1&&type!=='papers';
 return `<section class="research-kanban-column" data-board-drop="${escape(type)}" data-group="${escape(group)}"><div class="research-kanban-column-head"><div class="board-group-heading"><b>${escape(group)}</b>${archived?`<small title="该分类不在当前管理选项中，旧记录仍保留">历史分类</small>`:''}</div><span>${records.filter(r=>(r[meta.field]||'未分类')===group).length}</span></div><div class="research-kanban-cards">${items.length?items.map(r=>{
 const status=type==='papers'&&r.category==='投稿记录'?normalizeSubmissionDisplay(latestSubmissionEvent(r)?.status||r.status):r.status||'';
 const date=r.deadline||r.date||r.updatedAt?.slice(0,10)||'';
 const route=type==='simulations'?`data-sim="${escape(r.id)}"`:type==='experiments'?`data-exp="${escape(r.id)}"`:`data-record-open="${type}:${escape(r.id)}"`;
 return `<article class="research-kanban-card" draggable="${canMove}" data-board-card="${escape(type)}" data-id="${escape(r.id)}"><div class="research-kanban-card-top"><span class="board-item-kind">${escape(status||config[type].singular||'科研记录')}</span><button type="button" class="board-card-visit" ${route} aria-label="查看${escape(r.title)}的详细内容">查看详情 ↗</button></div><button type="button" class="board-card-title" ${route}>${escape(r.title)}</button><p>${escape(String(r.nextSteps||r.description||r.researchFocus||r.conditions||r.content||r.parameters||r.outline||'').slice(0,120))}</p>${type==='papers'?(r.category==='投稿记录'?submissionProgressBar(r):writingProgressBar(r)):''}${date?`<small class="research-kanban-date">${escape(date)}</small>`:''}${canMove?`<div class="research-kanban-move"><button data-board-move="${type}" data-id="${escape(r.id)}" data-group="${escape(groups[Math.max(0,i-1)])}" ${i===0?'disabled':''} aria-label="将${escape(r.title)}移到上一分类">←</button><span>移动到其他分类</span><button data-board-move="${type}" data-id="${escape(r.id)}" data-group="${escape(groups[Math.min(groups.length-1,i+1)])}" ${i===groups.length-1?'disabled':''} aria-label="将${escape(r.title)}移到下一分类">→</button></div>`:''}</article>`;
 }).join(''):`<div class="research-board-empty"><span>暂无记录</span><small>${search?'可更改搜索关键词':'此分类暂时没有记录'}</small><button class="board-empty-create" data-board-new="${escape(type)}" data-group="${escape(group)}">＋ 在此分类中新建</button></div>`}</div></section>`}).join('')}</div>${records.length>boardLimit?`<div class="v2-load-more"><span>看板已加载 ${Math.min(boardLimit,records.length)} / ${records.length} 条</span><button class="btn btn-outline" data-action="v2-more-board">继续加载 90 条</button></div>`:''}`;
}
function moveBoardRecord(type,id,target){
 const conf=BOARD_MODULES[type],rec=data[type]?.find(r=>r.id===id);
 if(!conf||!rec||!kanbanGroups(type,data[type],'全部').includes(target)||target==='未分类')return;
 if(rec[conf.field]===target)return;
 const prev=rec[conf.field];
 rec[conf.field]=target;
 rec.updatedAt=new Date().toISOString();
 log(`看板归类：${rec.title} → ${target}`);
 if(!save()){rec[conf.field]=prev;data.activities.shift();return}
 render();toast('已归入「'+target+'」');
}

function thinkingHtml(){
 const source=data.notes,cats=availableFilterCategories('notes');
 const rs=source.filter(x=>(noteCategory==='全部'||(x.category||'未分类')===noteCategory)&&[x.title,x.content,x.tags].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
 return workflowTitle('记录想法','记录创新点、研究总结与其他想法，帮助研究思路不断积累','＋ 新建笔记','add:notes')+
 ''+
 researchToolbar({type:'notes',placeholder:'搜索标题、内容、标签…',cats,current:noteCategory,attr:'data-note-cat',source,visible:rs.length})+
 (viewIsBoard('notes')?boardHtml('notes',rs):rs.length?`<div class="thought-grid">${rs.slice(0,boardLimit).map(n=>`<article class="card thought-card"><div class="thought-meta">${tag(n.category)} <span>${escape((n.updatedAt||n.createdAt||'').slice(0,10))}</span></div><h3><button class="record-title-link" data-note-open="${escape(n.id)}">${escape(n.title)}</button></h3><div class="thought-content">${escape(n.content||'还没有填写内容。')}</div><div class="thought-footer"><span>${n.tags?'标签 · '+escape(n.tags):'独立笔记'}</span><button class="btn btn-outline btn-sm" data-record-open="notes:${escape(n.id)}">查看详情</button></div></article>`).join('')}</div>`:entityEmpty('暂时没有此类思考','新增创新点、总结或其他笔记，记录你自己的研究过程。','add:notes','笔记'));
}
function simulationAreaHtml(){
 if(simulationDetail){const s=data.simulations.find(x=>x.id===simulationDetail);if(s)return simulationDetailHtml(s);simulationDetail=null;}
 const source=data.simulations,cats=availableFilterCategories('simulations');
 const codeCounts=groupedCounts(data.simulationCodes,'simulationId'),checkCounts=groupedCounts(data.simulationChecks,'simulationId'),runCounts=groupedCounts(data.simulationRuns,'simulationId');
 const rows=archiveFilter('simulations',source).filter(x=>(simulationCategory==='全部'||(x.category||'未分类')===simulationCategory)&&[x.title,x.category,x.software,x.parameters,x.result].join(' ').toLowerCase().includes(search.toLowerCase()));
 return workflowTitle('程序调试','按 UMATHT、UMAT、多场耦合管理代码、验证、运行记录和过程文件。这里管理记录，不直接运行 Abaqus。','＋ 新建调试案例','add:simulations')+
 `<div class="workspace-stats">${[['调试案例（总数）',source.length],['代码版本',data.simulationCodes.length],['验证记录',data.simulationChecks.length],['运行记录',data.simulationRuns.length]].map(([name,count])=>`<div class="stat-mini"><span>${name}</span><strong>${count}</strong></div>`).join('')}</div>`+
 researchToolbar({type:'simulations',placeholder:'搜索案例、参数与结果…',cats,current:simulationCategory,attr:'data-simcat',source:archiveFilter('simulations',source),visible:rows.length,unit:'个案例'})+
 (source.length&&!rows.length?`<div class="filter-recovery card"><b>已保存 ${source.length} 个调试案例，但当前筛选没有匹配结果</b><span>可能被归档、分类或搜索条件过滤；记录未丢失。</span><button type="button" class="btn btn-outline btn-sm" data-action="show-module-all" data-type="simulations">显示全部已有案例</button></div>`:(viewIsBoard('simulations')?boardHtml('simulations',rows):rows.length?`<div class="simulation-grid">${rows.slice(0,boardLimit).map(s=>{const cs=codeCounts.get(s.id)||0,vs=checkCounts.get(s.id)||0,rs=runCounts.get(s.id)||0;return `<article class="card sim-overview"><div class="sim-overview-head">${tag(s.category)}${statusChip(s.status||'计划中')}</div><button class="record-title-link" data-sim="${escape(s.id)}">${escape(s.title)}</button><p>${escape(s.parameters||s.verification||'点击打开案例，记录代码和验证过程。')}</p><div class="sim-counts"><span>代码 ${cs} 份</span><span>验证 ${vs} 次</span><span>运行 ${rs} 次</span></div><div class="sim-bottom"><span>${escape(s.category||'程序调试')}</span><span class="record-card-actions"><button data-sim="${escape(s.id)}" class="links">查看完整案例 →</button></span></div></article>`}).join('')}</div>`:entityEmpty('尚未建立调试案例','从 UMATHT、UMAT、多场耦合中选择类型，逐步记录验证过程。','add:simulations','调试案例')));
}
const simulationTabData={codes:['simulationCodes','代码','文件名 / 版本 / 代码 / 修改记录'],checks:['simulationChecks','验证','验证方法 / 验证条件 / 验证结论'],runs:['simulationRuns','仿真记录','参数 / 边界条件 / 结果 / 问题'],paths:['simulationPaths','过程文件位置','本地路径索引；浏览器无法直接访问任意磁盘文件']};
function simulationDetailHtml(s){
 const [type,title,subtitle]=simulationTabData[simulationTab]||simulationTabData.codes;
 const records=data[type].filter(x=>x.simulationId===s.id).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
 const sections={codes:x=>`<div class="record-flex"><b>${escape(x.title)}</b><span class="origin-tag">${escape(x.version||'未标版本')}</span>${tag(x.language||'其他')}</div><div class="pre-line muted small-gap">${pathAction(x.path)}</div>${x.content?`<pre class="code-view"><code>${escape(x.content)}</code></pre>`:''}<div class="detail-note">${textBlock(x.description||'')}</div>`,
 checks:x=>`<div class="record-flex"><b>${escape(x.title)}</b>${statusChip(x.status)}</div><p class="muted">${escape(x.date||'未填日期')}</p><div class="detail-info-grid"><div><label>验证方法</label>${textBlock(x.method)}</div><div><label>验证条件与参考值</label>${textBlock(x.condition)}</div></div><div class="detail-note"><strong>结论</strong>${textBlock(x.result)}</div>`,
 runs:x=>`<div class="record-flex"><b>${escape(x.title)}</b><span class="mini">${escape(x.date||'未填日期')}</span></div><p class="muted">${escape(x.software||'未填写软件版本')}</p><div class="detail-info-grid"><div><label>参数与边界条件</label>${textBlock(x.parameters)}</div><div><label>结果与路径</label>${textBlock(x.result)}</div><div><label>异常与解决办法</label>${textBlock(x.issues)}</div><div><label>下一步计划</label>${textBlock(x.next)}</div></div>`,
 paths:x=>`<div class="record-flex"><b>${escape(x.title)}</b>${tag(x.kind)}</div><div class="path-copy">${pathAction(x.path)}</div><p class="muted">${escape(x.description||'')}</p>`};
 return `<div class="detail-back"><button class="back-link" data-action="sim-list">‹ 程序调试</button></div><div class="workspace-title"><div><h1>${escape(s.title)}</h1><p>${escape(s.category||'未分类')} · ${escape(s.software||'仿真软件未填')} </p></div><div class="record-card-actions"><button class="btn btn-outline" data-edit="simulations:${escape(s.id)}">编辑案例</button><button class="btn btn-danger" data-del="simulations:${escape(s.id)}">删除案例</button></div></div><div class="case-summary card card-pad"><div class="record-flex">${tag(s.category)} ${statusChip(s.status||'计划中')}</div><div class="detail-info-grid"><div><label>仿真目标与参数</label>${textBlock(s.parameters)}</div><div><label>当前验证与结果</label>${textBlock(s.verification||s.result)}</div></div>${s.code||s.codePath?`<div class="legacy-hint"><b>旧版案例数据</b><div class="mini">原先直接填写的代码与路径仍保留在“编辑案例”中，可按需复制到下方结构化记录。</div>${s.codePath?`${pathAction(s.codePath)}`:''}${s.code?`<pre class="code-view"><code>${escape(s.code)}</code></pre>`:''}</div>`:''}</div>
 <div class="case-tabs">${segmented([['codes','代码'],['checks','验证'],['runs','仿真记录'],['paths','过程文件位置']],simulationTab,'data-simtab')}</div><div class="head section-heading"><div><h3>${title} <span class="badge-count">${records.length}</span></h3><p class="mini">${subtitle}</p></div>${actionBtn('＋ 新增'+(simulationTab==='codes'?'代码':simulationTab==='checks'?'验证':simulationTab==='runs'?'记录':'路径'),'add-sim-child','btn btn-sm')}</div>
 ${records.length?`<div class="nested-records">${records.map(x=>`<article class="card card-pad nested-record">${sections[simulationTab](x)}<div class="record-actions">${miniActions(type,x)}</div></article>`).join('')}</div>`:entityEmpty('还没有'+title+'记录','点击新增建立第一条结构化记录。','add-sim-child','记录')}
 <p class="limitations-note">源代码和文件位置以文本记录；不会自动读取电脑上的 .for、.odb 等文件，也不执行仿真。建议保留原始文件并单独备份。</p>`;
}
function experimentAreaHtml(){
 if(experimentDetail){const e=data.experiments.find(x=>x.id===experimentDetail);if(e)return experimentDetailHtml(e);experimentDetail=null;}
 const source=data.experiments,cats=availableFilterCategories('experiments');
 const rows=archiveFilter('experiments',source).filter(x=>(experimentCategory==='全部'||(x.category||'未分类')===experimentCategory)&&[x.title,x.category,x.result,x.conditions,x.method,...expSafeGroups(x).flatMap(g=>[g.name,g.conditions,g.result,...(Array.isArray(g.attempts)?g.attempts.flatMap(a=>{const t=expTrialRecord(a);return [t.sample,t.result,t.dataPath]}):[])])].join(' ').toLowerCase().includes(search.toLowerCase()));
 return workflowTitle('实验记录','一个实验包含多组工况，每组独立记录重复试验与结果','＋ 新建实验记录','add:experiments')+
 `<div class="workspace-stats">${[['实验项目',data.experiments.length],['实验分组',data.experiments.reduce((n,x)=>n+expGroupCount(x),0)],['重复试验',data.experiments.reduce((n,x)=>n+expSafeGroups(x).reduce((k,g)=>k+(Array.isArray(g.attempts)?g.attempts.length:0),0),0)],['已完成实验',data.experiments.filter(x=>x.status==='已完成').length]].map(([name,count])=>`<div class="stat-mini"><span>${name}</span><strong>${count}</strong></div>`).join('')}</div>${researchToolbar({type:'experiments',placeholder:'搜索实验名称、类型和结果…',cats,current:experimentCategory,attr:'data-experiment-cat',source:archiveFilter('experiments',source),visible:rows.length,unit:'个实验'})}`+
 (viewIsBoard('experiments')?boardHtml('experiments',rows):rows.length?`<div class="simulation-grid">${rows.slice(0,boardLimit).map(e=>`<article class="card sim-overview"><div class="sim-overview-head">${tag(e.category)}${statusChip(e.status||'计划中')}</div><button data-exp="${escape(e.id)}" class="record-title-link">${escape(e.title)}</button><p>${escape(e.method||expSafeGroups(e).map(g=>g.name||g.conditions).filter(Boolean).join(' / ')||e.conditions||'实验方法与工况尚未填写')}</p><div class="sim-counts"><span>实验组数 ${expGroupCount(e)}</span><span>重复试验 ${expSafeGroups(e).reduce((n,g)=>n+(Array.isArray(g.attempts)?g.attempts.length:0),0)}</span></div><div class="sim-bottom"><span>${escape(e.date||'未设日期')}</span><span class="record-card-actions"><button data-exp="${escape(e.id)}" class="links">查看完整实验 →</button></span></div></article>`).join('')}</div>`:entityEmpty('还没有实验记录','建立实验项目，录入分组、试验条件和原始数据路径。','add:experiments','实验'));
}
function experimentDetailHtml(e){
 const groupRecords=expSafeGroups(e),trialCount=groupRecords.reduce((n,g)=>n+(Array.isArray(g.attempts)?g.attempts.length:0),0);
 return `<div class="detail-back"><button class="back-link" data-action="exp-list">‹ 实验列表</button></div><div class="workspace-title"><div><h1>${escape(e.title)}</h1><p>${escape(e.category||'未分类型')} · ${escape(e.date||'未填实验日期')}</p></div><div class="record-card-actions"><button class="btn btn-outline" data-edit="experiments:${escape(e.id)}">编辑实验</button><button class="btn btn-danger" data-del="experiments:${escape(e.id)}">删除实验</button></div></div>
 <div class="exp-summary-strip"><span>${statusChip(e.status||'计划中')}</span><span><strong>${expGroupCount(e)}</strong> 实验组</span><span><strong>${trialCount}</strong> 次重复试验</span></div>
 <div class="experiment-sections"><section class="card card-pad experiment-wide"><h3><span class="section-number">01</span> 实验基本信息</h3><div class="detail-info-grid"><div><label>实验类型</label>${textBlock(e.category)}</div><div><label>通用实验方法 / 步骤</label>${textBlock(e.method)}</div></div></section>
 <section class="card card-pad experiment-wide"><h3><span class="section-number">02</span> 分组工况</h3><div class="exp-group-results">${expGroupDetails(e)}</div></section>
 <section class="card card-pad experiment-wide"><div class="head"><h3><span class="section-number">03</span> 结果对比</h3><button type="button" class="btn btn-outline btn-sm" data-action="exp-export-comparison">导出对比 CSV</button></div>${expComparisonTable(groupRecords)}</section></div><p class="limitations-note">数据路径仅作为索引，原始文件不包含在 JSON 备份中。旧版数据字段仍在原始记录中保留，不会自动迁移、归组或删除。</p>`;
}
const submissionStates=['Submitted','With Editor','Under Review','Decision in Process','Revise','Accept','Reject','Resubmitted','Withdrawn'];
const submissionStateHint=s=>({'With Editor':'编辑处理','Under Review':'同行评审','Decision in Process':'等待决定',Accept:'接受',Reject:'拒稿',Revision:'需要返修',Revise:'需要返修',Submitted:'已投稿',Resubmitted:'重新投稿',Withdrawn:'已撤稿'}[s]||'自定义状态');
const submissionStatusToPaper=s=>({'With Editor':'已投稿','Under Review':'审稿中','Decision in Process':'审稿中',Accept:'已接收',Reject:'已拒稿',Revision:'返修中',Revise:'返修中',Submitted:'已投稿',Resubmitted:'已投稿',Withdrawn:'准备中'}[s]||'已投稿');
// Submission states are milestones, not likelihood of acceptance. Closed/rejected = process ended, not success.
// The chronological node log is the single source of truth for submission progress.
// Same-day changes preserve insertion order; editing a node does not move it to the end.
function sortedTimeline(events){return (events||[]).map((event,index)=>({...event,_order:index})).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||a._order-b._order)}
function latestSubmissionEvent(p){return sortedTimeline(p.submissionHistory).at(-1)||null}
function syncSubmissionFromHistory(p){const latest=latestSubmissionEvent(p);if(latest){p.status=submissionStatusToPaper(latest.status);if(latest.journal)p.journal=latest.journal;return true}
 // The last node was deleted: do not preserve an inferred Reject/Accept status.
 p.status=p.submissionDate?'已投稿':'准备中';return false;}
// Five manuscript milestones: Submit → With Editor → Under Review → Revise → Accept.
// Closing without acceptance never fills the Accept segment; old stored states remain readable.
const SUBMISSION_MILESTONES=['Submit','With Editor','Under Review','Revise','Accept'];
const submissionMilestoneIndex=status=>({
 '准备中':-1,'写作中':-1,'Submitted':0,'Resubmitted':0,
 'With Editor':1,'已投稿':1,
 'Under Review':2,'Decision in Process':2,'审稿中':2,
 'Revise':3,'Revision':3,'返修中':3,
 'Accept':4,'已接收':4,'已发表':4
})[status];
const normalizeSubmissionDisplay=s=>({'Revision':'Revise','已投稿':'Submit','审稿中':'Under Review','返修中':'Revise','已接收':'Accept','已拒稿':'Reject'}[s]||s);
function submissionStage(p){
 const events=sortedTimeline(p.submissionHistory),latest=events.at(-1),current=latest?.status||p.status||'准备中';
 const closed=['已拒稿','Reject','Withdrawn'].includes(current);
 let index=submissionMilestoneIndex(current);
 if(index===undefined)index=0;
 if(closed){
  // A rejection/withdrawal ends tracking; do not imply Accept was reached.
  const prior=events.slice(0,-1).map(e=>submissionMilestoneIndex(e.status)).filter(n=>Number.isInteger(n)&&n>=0&&n<4);
  index=prior.length?Math.max(...prior):0;
 }
 const label=closed?(current==='Withdrawn'?'Withdrawn':'Reject'):normalizeSubmissionDisplay(current);
 const visited=new Set(events.map(e=>submissionMilestoneIndex(e.status)).filter(Number.isInteger));
 if(!events.length&&index>=0)visited.add(index);
 if(index>=0)visited.add(index);
 if(closed)visited.delete(4);
 return {index,label,closed,nodeCount:events.length,visited:[...visited].filter(i=>i>=0&&i<5)};
}
function stageTrack({title,label,labels,index,closed=false,hint='',visited=null}){
 const hasVisited=Array.isArray(visited);
 return `<div class="submission-stage smart-stage v131-stage" role="group" aria-label="${escape(title)}：${escape(label)}"><div class="submission-stage-head"><span>${escape(title)}</span><strong>${escape(label)}</strong></div><div class="submission-stage-steps" style="grid-template-columns:repeat(${labels.length},minmax(0,1fr))" role="list" tabindex="0" aria-label="进度阶段，窄屏时可横向滚动查看">${labels.map((name,i)=>`<span role="listitem" class="stage-segment ${(hasVisited?visited.includes(i):i<=index)?'passed':''} ${closed?'ended':''} ${i===index?'current':''}" aria-current="${i===index?'step':'false'}" title="${escape(name)}">${escape(name)}</span>`).join('')}</div>${hint?`<small class="stage-hint">${escape(hint)}</small>`:''}</div>`;
}
function submissionProgressBar(p){const state=submissionStage(p);return stageTrack({title:'投稿节点进度',label:state.label,labels:SUBMISSION_MILESTONES,index:state.index,closed:state.closed,visited:state.visited,hint:state.nodeCount?`已关联 ${state.nodeCount} 条节点 · ${submissionDurationSummary(p)}`:'尚无节点，暂按记录状态显示 · 添加节点后自动同步'});}
// Store English stage names for new events; read historical Chinese nodes without migration.
const WRITING_STAGES=['Draft','Revision','Complete'];
const writingStageName=stage=>({'初稿':'Draft','修改':'Revision','完成':'Complete'}[stage]||stage);
function writingStage(p){
 const events=sortedTimeline(p.writingHistory),current=events.at(-1);
 if(current){const stage=writingStageName(current.stage);const normalized=WRITING_STAGES.includes(stage)?stage:'Draft';return {index:WRITING_STAGES.indexOf(normalized),label:normalized+(current.progressStatus==='已完成'?' · 已完成':' · '+(current.progressStatus||'进行中')),nodes:events.length};}
 const state=p.status||'准备中',index=state==='已完成'?2:state==='待修改'?1:state==='写作中'?0:-1;
 return {index,label:index<0?'尚未开始':WRITING_STAGES[index]+' · '+(state==='已完成'?'已完成':'进行中'),nodes:0};
}
// UI-only duration display: derives from existing writingHistory, never writes back.
function writingDisplayDurations(p,today=iso()){
 const events=sortedTimeline(Array.isArray(p?.writingHistory)?p.writingHistory:[]);
 return events.map((event,i)=>{
  const next=events[i+1];
  const active=!next&&event.progressStatus!=='已完成';
  const ending=next?.date||(active?today:null);
  return {...event,uiDurationDays:ending?timelineDayDiff(event.date,ending):null,uiDurationActive:active};
 });
}
function writingDurationHint(p){
 const events=writingDisplayDurations(p);
 if(!events.length)return '尚无撰写节点 · 登记后可按日期查看持续时间';
 const first=events[0],last=events.at(-1);
 if(last.uiDurationActive){const d=timelineDayDiff(first.date,iso());return d===null?'节点日期待核实':`已登记 ${events.length} 条节点 · 累计历时 ${d} 天 · 当前阶段已持续 ${last.uiDurationDays ?? '—'} 天`}
 if(events.length>1){const d=timelineDayDiff(first.date,last.date);return d===null?'节点日期待核实':`已登记 ${events.length} 条节点 · 首末节点相隔 ${d} 天 · 当前阶段已完成`}
 return '已登记 1 条完成节点 · 暂无足够日期计算阶段持续时间';
}
function writingProgressBar(p){const w=writingStage(p);return stageTrack({title:'稿件撰写进度',label:w.label,labels:WRITING_STAGES,index:w.index,hint:writingDurationHint(p)});}


// Duration is the difference between calendar dates (not milliseconds between local midnights).
// The current stage ends at today; completed stages end at the next node's date.
function timelineDayDiff(begin,end){
 const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
 if(!valid(begin)||!valid(end))return null;
 const b=new Date(begin+'T12:00:00Z'),e=new Date(end+'T12:00:00Z');
 if(!Number.isFinite(b.getTime())||!Number.isFinite(e.getTime())||b.toISOString().slice(0,10)!==begin||e.toISOString().slice(0,10)!==end)return null;
 return Math.max(0,Math.round((e.getTime()-b.getTime())/86400000));
}
function submissionDurations(events,today=iso()){
 const sorted=sortedTimeline(events);
 return sorted.map((entry,i)=>{
  const next=sorted[i+1];
  const terminal=['Accept','Reject','Withdrawn','已接收','已拒稿','已发表'].includes(entry.status);
  const active=!next&&!terminal;
  const days=next?timelineDayDiff(entry.date,next.date):active?timelineDayDiff(entry.date,today):0;
  return {...entry,durationDays:days,durationActive:active,durationTerminal:!next&&terminal};
 });
}
function submissionDurationSummary(p){
 const events=submissionDurations(p.submissionHistory);
 if(!events.length)return '';
 const valid=events.filter(e=>e.durationDays!==null);
 const elapsed=valid.reduce((sum,e)=>sum+e.durationDays,0);
 const current=valid.at(-1);
 return `累计 ${elapsed} 天 · ${current?.durationActive?'当前 '+normalizeSubmissionDisplay(current.status)+' 已持续 '+current.durationDays+' 天':'最新状态 '+normalizeSubmissionDisplay(current?.status||'—')}`;
}
function researchHistoryHtml(p){
 const submission=p.category==='投稿记录';
 const events=submission?(p.submissionHistory||[]):(p.advisorReviews||[]);
 const label=submission?'投稿进度时间线':'论文修改历程';
 const writingNodes=!submission?sortedTimeline(p.writingHistory):[];
 const writingHtml=!submission?`<section class="research-history writing-history"><div class="research-history-head"><strong>稿件撰写节点</strong><button class="btn btn-outline btn-sm" data-writing-add="${escape(p.id)}">＋ 添加撰写节点</button></div>${writingProgressBar(p)}${writingNodes.length?`<ol class="research-timeline">${writingDisplayDurations(p).slice().reverse().map(e=>`<li><time>${escape(e.date)}<span class="timeline-duration ${e.uiDurationActive?'is-active':''}">${e.uiDurationDays===null?'阶段日期待核实':(e.uiDurationActive?'已持续 ':'历时 ')+e.uiDurationDays+' 天'}</span></time><div><b>${escape(writingStageName(e.stage||'Draft'))} · ${escape(e.progressStatus||'进行中')}</b><p>${escape(e.note||'')}</p>${e.fileName?`<p>稿件：${escape(e.fileName)}</p>`:''}<button class="links" data-writing-edit="${escape(p.id)}" data-node="${escape(e.id)}">编辑节点</button> · <button class="links" data-writing-delete="${escape(p.id)}" data-node="${escape(e.id)}">删除节点</button></div></li>`).join('')}</ol>`:'<p class="mini">尚无撰写节点。Draft、Revision、Complete 将随登记的撰写节点自动更新。</p>'}</section>`:'';
 return `${writingHtml}<section class="research-history"><div class="research-history-head"><strong>${label}</strong><button class="btn btn-outline btn-sm" data-history-add="${escape(p.id)}">＋ ${submission?'添加投稿节点':'记录修改轮次'}</button></div>${submission?submissionProgressBar(p):''}${events.length?`<ol class="research-timeline">${(submission?submissionDurations(events):sortedTimeline(events)).reverse().map((e,i)=>`<li><time>${escape(e.date)}${submission?`<span class="timeline-duration ${e.durationActive?'is-active':''}">${e.durationDays===null?'日期待核实':e.durationTerminal?'流程已结束':(e.durationActive?'已持续 ':'历时 ')+e.durationDays+' 天'}</span>`:''}</time><div><b>${escape(submission?normalizeSubmissionDisplay(e.status||'记录'):(e.round||'记录'))}</b>${e.journal?`<span> · ${escape(e.journal)}</span>`:''}${submission&&e.status?`<span class="submission-step-badge">${escape(submissionStateHint(e.status))}</span>`:''}${e.fileName?`<p><strong>修改版本文件名：</strong>${escape(e.fileName)}</p>`:''}${e.filePath?`<p><strong>文件路径：</strong>${pathAction(e.filePath)}</p>`:''}<p>${escape(e.note||'')}</p><button class="links" data-history-edit="${escape(p.id)}" data-history-id="${escape(e.id)}">编辑节点</button> · <button class="links" data-history-delete="${escape(p.id)}" data-history-id="${escape(e.id)}">删除此节点</button></div></li>`).join('')}</ol>`:'<p class="mini">还没有记录，点击上方按钮添加第一条。</p>'}</section>`;
}
function historyEditorHtml(){
 if(!historyEditing)return '';
 const p=data.papers.find(x=>x.id===historyEditing);if(!p)return '';
 const submission=p.category==='投稿记录';
 if(historyMode==='writing'){const event=(p.writingHistory||[]).find(x=>x.id===historyNodeEditing)||{};return `<div class="dialog-backdrop"><div class="dialog" role="dialog" aria-modal="true" aria-label="撰写节点"><div class="dialog-head"><h3>${historyNodeEditing?'编辑':'新增'}撰写节点</h3><button class="round" data-action="history-close" aria-label="关闭">✕</button></div><form id="writingNodeForm"><div class="dialog-body"><div class="fields"><div class="field"><label>日期 *</label><input class="input" type="date" name="date" required value="${escape(event.date||iso())}"></div><div class="field"><label>阶段 *</label><select class="select" name="stage">${WRITING_STAGES.map(x=>`<option ${writingStageName(event.stage)===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>节点状态</label><select class="select" name="progressStatus">${['进行中','已完成'].map(x=>`<option ${event.progressStatus===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>稿件版本文件名</label><input class="input" name="fileName" value="${escape(event.fileName||'')}" placeholder="例如：paper_draft_v2.docx"></div><div class="field wide"><label>完成内容与下一步</label><textarea class="textarea" name="note">${escape(event.note||'')}</textarea></div></div></div><div class="dialog-foot"><button type="button" class="btn btn-outline" data-action="history-close">取消</button><button type="submit" class="btn">保存撰写节点</button></div></form></div></div>`;}
 const event=(p[submission?'submissionHistory':'advisorReviews']||[]).find(x=>x.id===historyNodeEditing)||{};
 return `<div class="dialog-backdrop" data-history-backdrop="1"><div class="dialog" role="dialog" aria-modal="true" aria-label="${submission?'投稿节点':'记录修改'}"><div class="dialog-head"><h3>${submission?'新增投稿状态节点':'记录修改'}</h3><button class="round" data-action="history-close" aria-label="关闭">✕</button></div><form id="historyForm"><div class="dialog-body"><div class="fields"><div class="field"><label for="historyDate">日期 *</label><input id="historyDate" class="input" type="date" name="date" required value="${escape(event.date||iso())}"></div>${submission?`<div class="field"><label for="historyStatus">投稿状态 *</label><select id="historyStatus" class="select" name="status">${submissionStates.map(x=>`<option ${normalizeSubmissionDisplay(event.status)===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field wide"><label>本次投稿期刊</label><input class="input" name="journal" value="${escape(event.journal||p.journal||'')}"></div>`:`<div class="field"><label for="historyRound">修改轮次</label><input id="historyRound" class="input" name="round" placeholder="例如：第 2 轮修改" value="${escape(event.round||'')}"></div><div class="field"><label for="historyFileName">修改版本文件名</label><input id="historyFileName" class="input" name="fileName" placeholder="例如：manuscript_v2.docx" value="${escape(event.fileName||'')}"></div><div class="field wide"><label for="historyFilePath">文件路径</label><input id="historyFilePath" class="input" name="filePath" placeholder="例如：D:\\Research\\Paper\\manuscript_v2.docx" value="${escape(event.filePath||'')}"></div>`}<div class="field wide"><label for="historyNote">${submission?'处理结果 / 审稿意见 / 下一步行动':'修改内容'}</label><textarea id="historyNote" class="textarea" name="note" placeholder="记录具体的修改内容和更新说明">${escape(event.note||'')}</textarea></div></div></div><div class="dialog-foot"><button class="btn btn-outline" type="button" data-action="history-close">取消</button><button class="btn" type="submit">保存节点</button></div></form></div></div>`;
}
let historyEditing=null;let historyNodeEditing=null;let historyMode='review';let notePreviewId=null;let recordPreview=null;
function paperAreaHtml(){
 // A published article belongs exclusively to 成果统计, never to 论文跟踪.
 const activePapers=data.papers.filter(p=>p.status!=='已发表');
 const cats=['全部','在写论文','投稿记录',...new Set(activePapers.map(x=>x.category).filter(x=>x&&!['写作计划','在写论文','投稿记录'].includes(x)))];
 const rows=archiveFilter('papers',activePapers).filter(x=>(paperCategory==='全部'||(x.category==='写作计划'?'在写论文':x.category)===paperCategory)&&[x.title,x.journal,x.notes,x.outline].join(' ').toLowerCase().includes(search.toLowerCase())).map(x=>x.category==='写作计划'?{...x,category:'在写论文'}:x);
 const grouped=x=>activePapers.filter(y=>(y.category==='写作计划'?'在写论文':y.category)===x).length;
 const createButton=paperCategory==='投稿记录'?'＋ 新增投稿记录':'＋ 新建论文';
 const createAction=paperCategory==='投稿记录'?'add-submission-paper':'add:papers';
 return workflowTitle('论文跟踪','只管理未发表论文：写作计划、在写论文和投稿记录；已发表论文统一在成果统计管理。',''+createButton,createAction)+
 `<div class="workspace-stats sf-paper-stats">${[['在写论文',grouped('在写论文')+grouped('写作计划')],['投稿记录',grouped('投稿记录')],['未发表总数',activePapers.length]].map(([name,count])=>`<div class="stat-mini"><span>${name}</span><strong>${count}</strong></div>`).join('')}</div>`+
 researchToolbar({type:'papers',placeholder:'搜索论文标题、期刊…',cats,current:paperCategory,attr:'data-paper-cat',source:archiveFilter('papers',activePapers),visible:rows.length,unit:'篇论文'})+
 (activePapers.length&&!rows.length?`<div class="filter-recovery card"><b>已保存 ${activePapers.length} 篇论文，当前筛选显示 0 篇</b><span>论文可能归档或被分类筛选隐藏，不代表数据已删除。</span><button type="button" class="btn btn-outline btn-sm" data-action="show-module-all" data-type="papers">查看所有已保存论文</button></div>`:(viewIsBoard('papers')?boardHtml('papers',rows):rows.length?`<div class="paper-list">${rows.slice(0,boardLimit).map(p=>`<article class="card card-pad paper-card"><div class="record-flex">${tag(p.category||'在写论文')} ${statusChip(p.category==='投稿记录'?normalizeSubmissionDisplay(latestSubmissionEvent(p)?.status||p.status):p.status)} <span class="mini">${escape(p.journal||'未填写期刊')}</span></div><div class="paper-title"><h3><button class="record-title-link" data-record-open="papers:${escape(p.id)}">${escape(p.title)}</button></h3><button class="btn btn-outline btn-sm" data-record-open="papers:${escape(p.id)}">查看详情</button></div>${p.category==='投稿记录'?`<div class="paper-meta paper-meta-minimal"><span>投稿期刊：${escape(p.journal||'未填写')}</span><span>投稿日期：${escape(p.submissionDate||'未填写')}</span></div>${submissionProgressBar(p)}`:`<div class="paper-meta"><span>当前章节：${escape(p.currentSection||'未设置')}</span><span>初稿计划完成：${escape(p.deadline||'未设置')}</span></div>${writingProgressBar(p)}${p.researchFocus?`<div class="paper-description"><b>研究主线</b>${textBlock(p.researchFocus)}</div>`:''}${p.outline?`<div class="paper-description"><b>章节大纲</b>${textBlock(p.outline)}</div>`:''}${p.sectionProgress?`<div class="paper-description"><b>章节进度</b>${textBlock(p.sectionProgress)}</div>`:''}${p.notes?`<div class="paper-description"><b>导师反馈</b>${textBlock(p.notes)}</div>`:''}${p.nextSteps?`<div class="paper-description"><b>下一步计划</b>${textBlock(p.nextSteps)}</div>`:''}`}</article>`).join('')}</div>`:entityEmpty('暂无未发表论文','论文标记为已发表后将自动移至成果统计；也可从这里新建写作或投稿记录。',createAction,'论文')));
}
function advisorAreaHtml(){
 const cats=availableFilterCategories('advisor');
 const rows=archiveFilter('advisor',data.advisor).filter(x=>(advisorCategory==='全部'||(x.category||'未分类')===advisorCategory)&&[x.title,x.description].join(' ').toLowerCase().includes(search.toLowerCase()));
 return workflowTitle('老师事务','老师安排的项目、论文与其他任务；支持一键转入统一待办','＋ 新建老师事务','add:advisor')+
 researchToolbar({type:'advisor',placeholder:'搜索老师事务…',cats,current:advisorCategory,attr:'data-advisor-cat',source:archiveFilter('advisor',data.advisor),visible:rows.length})+
 (viewIsBoard('advisor')?boardHtml('advisor',rows):rows.length?`<div class="paper-list">${rows.slice(0,boardLimit).map(r=>{const exists=data.tasks.find(x=>x.advisorId===r.id);return `<article class="card card-pad advisor-card"><div class="record-flex">${tag(r.category)} ${statusChip(r.status)} <span class="mini">优先级 ${escape(r.priority||'中')}</span></div><div class="paper-title"><h3><button class="record-title-link" data-record-open="advisor:${escape(r.id)}">${escape(r.title)}</button></h3><button class="btn btn-outline btn-sm" data-record-open="advisor:${escape(r.id)}">查看详情</button></div><p class="pre-line muted">${escape(r.description||'没有补充说明')}</p><div class="advisor-bottom"><span>安排：${escape(r.date||'—')} · 截止：${escape(r.deadline||'—')}</span><button data-action="advisor-to-task" data-id="${escape(r.id)}" class="btn btn-outline btn-sm" ${exists?'disabled title="已转为待办任务"':''}>${exists?'✓ 已转入待办':'＋ 转入待办事项'}</button></div></article>`}).join('')}</div>`:entityEmpty('暂无老师事务','为老师安排的工作建立记录，并同步到统一待办事项。','add:advisor','老师事务'));
}
function filesAreaHtml(){
 const all=data.files||[],query=search.trim().toLowerCase();
 const results=all.filter(r=>[r.title,r.category,r.path,r.version,r.description].join(' ').toLowerCase().includes(query));
 return workflowTitle('核心文件','重要文档路径索引与研究资料位置管理','＋ 添加文件记录','add:files')+
 `<section class="card card-pad file-manager-card" aria-labelledby="file-index-heading">
   <div class="file-manager-heading">
    <div class="file-manager-intro"><div class="file-manager-eyebrow">科研资料 · 本地位置索引</div>
     <h3 id="file-index-heading">文件位置索引 <span class="badge-count">${all.length}</span></h3>
     <p class="mini">仅保存文件名、路径、版本和说明，不上传文件内容；修改记录不会改变磁盘原件。</p>
    </div>
    <div class="file-manager-tools">
     <label class="file-manager-search"><span class="file-manager-search-icon" aria-hidden="true">⌕</span><span class="sr-only">搜索核心文件</span><input class="input" id="moduleSearch" type="search" placeholder="搜索文件名、位置、用途…" aria-label="搜索核心文件" autocomplete="off" value="${escape(search)}"></label>
     <button class="btn btn-outline file-manager-categories" type="button" data-action="manage-categories" data-type="files" aria-label="自定义核心文件分类">⚙ 自定义分类</button>
    </div>
   </div>
   <div class="file-manager-subhead"><span>科研文件列表</span><span class="mini" role="status" aria-live="polite">${query?`匹配 ${results.length} / ${all.length} 条`:`共 ${all.length} 条记录`}</span></div>
   ${all.length?`<div class="file-manager-grid">${results.slice(0,boardLimit).map(f=>`<article class="file-item"><div class="file-item-header"><span class="file-symbol" aria-hidden="true">▣</span><div class="file-item-name"><b>${escape(f.title)}</b><span class="mini">${escape(f.category||'其他')}${f.version?' · '+escape(f.version):''}${f.date?' · '+escape(f.date):''}</span></div></div><p class="mini">${escape(f.description||'尚未填写说明')}</p>${pathAction(f.path)}<div class="file-item-footer"><button class="btn btn-outline btn-sm" data-edit="files:${escape(f.id)}">编辑</button><button class="btn btn-danger btn-sm" data-del="files:${escape(f.id)}">删除记录</button></div></article>`).join('')||`<div class="file-empty">没有匹配的文件；可修改搜索词。</div>`}</div>`:entityEmpty('尚未登记核心文件','建立文件名和存放路径索引，便于以后查找，不移动真实文件。','add:files','文件记录')}
 </section>`;
}
function publishedPapers(){
 // Published outcomes are explicitly distinct from drafts, submitted papers and accepted manuscripts.
 return data.papers.filter(p=>p.status==='已发表').slice().sort((a,b)=>
  String(b.publicationDate||b.submissionDate||b.updatedAt||'').localeCompare(String(a.publicationDate||a.submissionDate||a.updatedAt||'')));
}
function publicationRowsHtml(){
 const published=publishedPapers();
 if(!published.length)return `<div class="paper-published-empty">${emptyHtml('暂无已发表论文','仅显示状态为“已发表”的论文。写作中、在投和已接收论文保留在“论文跟踪”中。')}<button class="btn btn-sm" data-action="add-published-paper">＋ 登记已发表论文</button></div>`;
 return `<div class="tablewrap published-table"><table class="table"><thead><tr><th>论文名称</th><th>发表期刊</th><th>发表日期</th><th>状态</th><th>操作</th></tr></thead><tbody>${published.map(p=>`<tr><td><div class="published-name">${escape(p.title||'未命名论文')}</div>${p.doi?`<small class="published-doi">DOI：${escape(p.doi)}</small>`:''}</td><td>${escape(p.journal||'未填写')}</td><td>${escape(p.publicationDate||'未填写')}</td><td>${statusChip('已发表')}</td><td><div class="action-row"><button class="btn btn-ghost btn-sm" data-edit="papers:${escape(p.id)}">编辑</button><button class="btn btn-danger btn-sm" data-del="papers:${escape(p.id)}">删除</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function outcomesHtml(){
 const types=[
  ['▤','论文','papers',publishedPapers(),'期刊','journal'],
  ['⚑','专利','patents',data.patents,'专利类型','category'],
  ['♧','学术会议','conferences',data.conferences,'会议日期','date'],
  ['★','获奖','awards',data.awards,'颁发单位','organization']
 ];
 return workflowTitle('成果统计','四类科研成果分别展示档案，支持查看、新增、编辑与删除')+
 `<div class="outcome-four outcome-list-grid">${types.map(([icon,name,type,rows,subtitle,field])=>`<section class="card outcome-list-column"><div class="outcome-list-header"><span class="outcome-type-icon">${icon}</span><div><h3>${name}</h3><small>共 ${rows.length} 条成果</small></div></div><div class="outcome-list-items">${rows.length?rows.map(r=>`<button class="outcome-list-item outcome-open-card" type="button" data-record-open="${type}:${escape(r.id)}"><strong title="${escape(r.title||'未命名')}">${escape(r.title||'未命名')}</strong><small>${escape(subtitle)}：${escape(r[field]||'未填写')}</small><span class="record-open-hint">查看详情及管理 →</span></button>`).join(''):`<div class="outcome-list-empty">暂无${name}记录，点击下方新增</div>`}</div><div class="outcome-list-actions"><button class="btn btn-sm" data-action="${type==='papers'?'add-published-paper':'add:'+type}">＋ 新增${name}</button><button class="btn btn-outline btn-sm" data-action="manage-outcome:${type}">管理${name}</button></div></section>`).join('')}</div>`;
}
function outcomeManagerHtml(){
 const type=outcomeManager,conf=config[type];if(!conf)return '';
 const rows=type==='papers'?publishedPapers():(data[type]||[]);
 const fieldName=type==='papers'?'已发表论文档案':type==='patents'?'专利档案':type==='conferences'?'学术会议档案':'获奖档案';
 const createAction=type==='papers'?'add-published-paper':'add:'+type;
 return `<div class="dialog-backdrop" data-outcome-dismiss="1"><div class="dialog outcome-manager-dialog" role="dialog" aria-modal="true" aria-label="${fieldName}"><div class="dialog-head"><h3>${fieldName} <span class="badge-count">${rows.length} 条</span></h3><button class="round" data-action="close-outcome-manager" aria-label="关闭成果档案">✕</button></div><div class="dialog-body"><div class="outcome-manager-head"><p>${type==='papers'?'仅展示已发表论文，未发表的请到“论文跟踪”管理。':'此处按需查看和维护档案，不在成果统计首页展示明细。'}</p><button class="btn btn-sm" data-action="${createAction}">＋ 新增${type==='papers'?'已发表论文':conf.singular}</button></div>${rows.length?`<div class="outcome-manager-list">${rows.map(r=>`<div class="outcome-manager-item"><div><strong>${escape(r.title)}</strong><small>${escape(type==='papers'?[r.journal,r.quartile,r.authorRole].filter(Boolean).join(' · ')||'已发表':r.status||r.category||r.date||'已保存记录')}</small></div><div class="action-row"><button class="btn btn-ghost btn-sm" ${type==='papers'?`data-action="edit-published-paper" data-id="${escape(r.id)}"`:`data-edit="${type}:${escape(r.id)}"`}>编辑</button><button class="btn btn-danger btn-sm" data-del="${type}:${escape(r.id)}">删除</button></div></div>`).join('')}</div>`:emptyHtml('暂无'+fieldName,'可以通过上方按钮新增记录。')}</div><div class="dialog-foot"><button class="btn btn-outline" data-action="close-outcome-manager">关闭</button></div></div></div>`;
}
// Categories are controlled centrally, without showing five oversized textareas in Settings.
function categoryOptionsKey(type){return type==='tasks'?'taskOrigins':type}
function categoryEntries(type){const original=config[type]?.fields.find(f=>f[0]===(type==='tasks'?'origin':'category'))?.[4]||[];const saved=data.settings.categoryOptions[categoryOptionsKey(type)];return Array.isArray(saved)&&saved.length?saved:original}
function categoryManagerHtml(){
 const type=customizedCategories.some(([t])=>t===categoryManager)?categoryManager:'literature';
 const entries=categoryEntries(type);
 const label=customizedCategories.find(([t])=>t===type)?.[1]||'分类管理';
 const editor=categoryEditingIndex!==-2;
 const value=categoryEditingIndex>=0?entries[categoryEditingIndex]||'':'';
 return `<div class="dialog-backdrop" data-category-dismiss="1"><div class="dialog category-manager-dialog" role="dialog" aria-modal="true" aria-label="科研分类管理"><div class="dialog-head"><div><h3>${escape(label)}管理</h3><p class="mini">此处仅修改当前模块</p></div><button class="round" data-action="close-category-manager" aria-label="关闭分类管理">✕</button></div>
 <div class="category-manager-body"><div class="category-scope-note">仅管理当前模块：「${escape(label)}」。这里无法修改其他模块的分类。</div>
 <div class="category-manager-content"><div class="category-manager-toolbar"><div><h4>${escape(label)} <span class="badge-count">${entries.length} 项</span></h4><p>用 ↑ ↓ 调整显示顺序，筛选标签与看板列将同步；重命名会更新旧记录，删除分类不会删除数据。</p></div><button class="btn btn-sm" data-action="category-add">＋ 新增分类</button></div>
 <div class="category-manager-list">${entries.map((name,i)=>`<div class="category-manager-item"><span class="category-index">${String(i+1).padStart(2,'0')}</span><strong>${escape(name)}</strong><span class="category-used">${(data[type]||[]).filter(r=>(type==='tasks'?r.origin:r.category)===name).length} 条记录</span><div class="category-order" role="group" aria-label="调整${escape(name)}的显示顺序"><button type="button" class="btn btn-outline btn-sm" data-action="category-move" data-index="${i}" data-direction="-1" ${i===0?'disabled':''} title="上移一位" aria-label="${escape(name)}上移">↑</button><button type="button" class="btn btn-outline btn-sm" data-action="category-move" data-index="${i}" data-direction="1" ${i===entries.length-1?'disabled':''} title="下移一位" aria-label="${escape(name)}下移">↓</button></div><button class="btn btn-ghost btn-sm" data-action="category-edit" data-index="${i}">编辑</button><button class="btn btn-ghost btn-sm category-remove" data-action="category-delete" data-index="${i}">删除</button></div>`).join('')}</div>
 ${editor?`<form id="categoryItemForm" class="category-item-form"><label for="categoryItemName">${categoryEditingIndex>=0?'修改分类名称':'新增分类名称'}</label><div class="category-item-input-row"><input class="input" id="categoryItemName" name="name" value="${escape(value)}" placeholder="例如：研究方法" required maxlength="80" autocomplete="off"><button class="btn btn-sm" type="submit">${categoryEditingIndex>=0?'保存修改':'添加分类'}</button><button type="button" class="btn btn-outline btn-sm" data-action="category-cancel">取消</button></div></form>`:''}
 </div></div><div class="dialog-foot"><span class="mini">分类设置保存到当前浏览器，并包含在 JSON 备份里。</span><button class="btn btn-outline" data-action="close-category-manager">完成</button></div></div></div>`;
}
function listingHtml(type){if(!config[type])return '';const c=config[type],rows=data[type]||[],keys=type==='tasks'?['title','origin','priority','status','deadline']:type==='projects'?['title','stage','status','progress','deadline']:type==='literature'?['title','category','authors','year','readStatus']:type==='notes'?['title','category','tags']:type==='simulations'?['title','category','status','codePath']:type==='experiments'?['title','category','groups','status','date']:type==='papers'?['title','category','journal','status','deadline']:['title','category','priority','status','deadline'];const needle=search.trim().toLowerCase();let filtered=rows.filter(r=>(!needle||Object.entries(r).some(([k,v])=>!['wallpaperImage','avatar','pdfData'].includes(k)&&v!=null&&typeof v!=='object'&&String(v).toLowerCase().includes(needle)))&&(!filter||Object.values(r).some(x=>String(x)===filter)));const cats=[...new Set(rows.map(r=>r.category||r.status).filter(Boolean))];return `<p class="page-desc">${escape(modules.find(x=>x[0]===type)?.[3])} · 可新增、修改、查询、删除，数据自动保存至浏览器。</p><div class="kpis"><div class="card kpi"><span class="caption">${c.singular}总数</span><b>${rows.length}</b><span class="mini">已保存记录</span></div><div class="card kpi"><span class="caption">记录分类</span><b>${new Set(rows.map(x=>x.category).filter(Boolean)).size}</b><span class="mini">已使用类别</span></div><div class="card kpi"><span class="caption">最近更新</span><b style="font-size:17px">${rows.length?escape((rows.slice().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))[0].updatedAt||'').slice(0,10)):'—'}</b><span class="mini">日期</span></div><div class="card kpi"><span class="caption">数据存储</span><b style="font-size:17px">本地</b><span class="mini">无需登录即可使用</span></div></div><section class="card card-pad"><div class="data-toolbar"><div class="filters"><span class="badge-count">共 ${filtered.length} 条</span><select class="select" id="recordFilter"><option value="">全部分类/状态</option>${cats.map(cat=>`<option ${cat===filter?'selected':''} value="${escape(cat)}">${escape(cat)}</option>`).join('')}</select></div>${actionBtn('＋ 新增'+c.singular,'add:'+type)}</div>${filtered.length?`<div class="tablewrap"><table class="table"><thead><tr>${keys.map(k=>`<th>${escape(c.fields.find(f=>f[0]===k)?.[1]||k)}</th>`).join('')}<th>操作</th></tr></thead><tbody>${filtered.slice(0,genericLimit).map(r=>`<tr>${keys.map(k=>`<td>${cellValue(r,k)}</td>`).join('')}<td><div class="action-row"><button class="btn btn-ghost btn-sm" data-edit="${escape(type)}:${escape(r.id)}">编辑</button><button class="btn btn-danger btn-sm" data-del="${escape(type)}:${escape(r.id)}">删除</button></div></td></tr>`).join('')}</tbody></table></div>${filtered.length>genericLimit?`<div class="v2-load-more"><span>显示前 ${genericLimit} / ${filtered.length} 条</span><button class="btn btn-outline" data-action="v2-more-generic">继续加载 80 条</button></div>`:''}`:emptyHtml(search||filter?'无匹配记录':'暂时没有'+c.singular,'点击右上角“新增”开始录入科研资料')}</section>`;}
function cellValue(r,k){if(k==='projectId')return escape(projectName(r[k]));if(k==='status'||k==='readStatus'||k==='priority')return statusChip(r[k]);if(k==='progress')return `<div style="min-width:95px"><div class="row"><span>${escape(r[k]||0)}%</span></div><div class="progress"><i style="width:${Math.max(0,Math.min(100,+r[k]||0))}%"></i></div></div>`;let v=String(r[k]??'—');return `<span title="${escape(v)}">${escape(v.length>44?v.slice(0,44)+'…':v)}</span>`;}
function smallTable(type,keys){const rs=data[type]||[];if(!rs.length)return emptyHtml('暂无记录','点击新增按钮开始');return `<div class="tablewrap"><table class="table"><thead><tr>${keys.map(k=>`<th>${escape(config[type].fields.find(f=>f[0]===k)?.[1]||k)}</th>`).join('')}<th>操作</th></tr></thead><tbody>${rs.map(r=>`<tr>${keys.map(k=>`<td>${cellValue(r,k)}</td>`).join('')}<td><button class="btn btn-ghost btn-sm" data-edit="${escape(type)}:${escape(r.id)}">编辑</button> <button class="btn btn-danger btn-sm" data-del="${escape(type)}:${escape(r.id)}">删除</button></td></tr>`).join('')}</tbody></table></div>`;}
const customizedCategories=[
 ['tasks','任务来源'],['literature','文献分类'],['simulations','程序调试分类'],['experiments','实验类型'],['notes','记录想法分类'],['papers','论文环节'],['advisor','老师事务分类'],['files','核心文件分类'],['timeLogs','科研时间分类'],['patents','专利类型'],['conferences','学术会议类型'],['awards','获奖类别']
];
function fieldOptions(type,key,defaults,current){
 if(key!=='category'&&key!=='origin')return current && defaults && !defaults.includes(current)?[current,...defaults]:(defaults||[]);
 if(type==='tasks'&&key==='origin') {const custom=data.settings.categoryOptions.taskOrigins;const arr=Array.isArray(custom)&&custom.length?custom:(defaults||[]);return current&&!arr.includes(current)?[current,...arr]:arr;}
 const custom=data.settings.categoryOptions[categoryOptionsKey(type)];
 const choices=Array.isArray(custom)&&custom.length?custom:defaults||[];
 return current&&!choices.includes(current)?[current,...choices]:choices;
}
function applyTheme(){
 const color=data.settings.layoutScheme==='night'?'#a9cffd':data.settings.theme==='auto'?(presetAccents[data.settings.stylePreset]||presetAccents.ocean):(themePalette[data.settings.theme]||themePalette.blue);
 document.documentElement.style.setProperty('--sf-accent',color);
 document.documentElement.style.setProperty('--sf-accent-rgb',color.slice(1).match(/../g).map(x=>parseInt(x,16)).join(','));
 document.documentElement.dataset.sfMode=data.settings.colorMode==='eye'?'eye':'standard';
 document.documentElement.dataset.sfLayout=['balanced','dense','reading','night'].includes(data.settings.layoutScheme)?data.settings.layoutScheme:'balanced';
 document.documentElement.dataset.sfPreset=['ocean','sage','paper','graphite','glacier','lavender'].includes(data.settings.stylePreset)?data.settings.stylePreset:'ocean';
 document.documentElement.dataset.sfWallpaper=data.settings.wallpaper||'none';
 const wall=data.settings.wallpaper==='custom'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data.settings.wallpaperImage||'')?data.settings.wallpaperImage:'';
 if(wall)document.documentElement.style.setProperty('--sf-wallpaper-image',`url("${wall}")`);else document.documentElement.style.removeProperty('--sf-wallpaper-image');
}
function profilePreviewHtml(){
 return `<div class="preview-banner"><div class="preview-avatar" id="previewAvatar">${avatarFace()}</div><span class="preview-tag">科研档案预览</span></div>
 <h2 id="previewName">${escape(data.profile.name)}</h2>
 <p id="previewMeta" class="subtle">${[data.profile.degree,data.profile.major,data.profile.cohort].filter(Boolean).map(escape).join(' · ')||'等待填写个人信息'}</p>
 <div class="preview-item"><span>研究方向</span><strong id="previewDirection">${escape(data.profile.researchDirection||'未填写')}</strong></div>
 <div class="preview-item"><span>预计毕业日期</span><strong id="previewGraduation">${escape(data.profile.graduationDate||'未填写')}</strong></div>
 <p class="preview-bio" id="previewBio">${escape(data.profile.bio||'填写科研简介后会显示在这里。')}</p>
 <p class="mini">修改表单后可先在这里预览；点击保存才会应用到首页。</p>`;
}
function trashHtml(){
 const rows=(data.trash||[]).slice().sort((a,b)=>String(b.deletedAt||'').localeCompare(String(a.deletedAt||'')));
 return `<section class="card card-pad small-section trash-section"><div class="head"><div><h3>科研记录回收站 <span class="badge-count">${rows.length}</span></h3><p class="mini">删除的记录保留 7 天，期满后在下次打开或使用工作台时自动清理（关闭页面期间不能定时运行）；到期前可恢复，过期后无法恢复。请定期备份重要数据。</p></div></div>
 ${rows.length?`<div class="trash-list">${rows.map(x=>`<div class="trash-item"><div><strong>${escape(x.record?.title||'未命名记录')}</strong><p class="mini">${escape(config[x.type]?.label||x.type)} · 删除时间 ${escape(String(x.deletedAt||'').slice(0,16).replace('T',' '))} · ${trashDaysLeft(x.deletedAt)===null?'删除时间待核实（不自动清理）':`剩余 ${trashDaysLeft(x.deletedAt)} 天`}</p></div><div class="action-row"><button class="btn btn-outline btn-sm" data-action="trash-restore" data-id="${escape(x.id)}">恢复</button><button class="btn btn-danger btn-sm" data-action="trash-purge" data-id="${escape(x.id)}">永久删除</button></div></div>`).join('')}</div>`:`<div class="trash-empty">暂无已删除记录。</div>`}</section>`;
}
function settingsHtml(){
 const profile=data.profile,setting=data.settings;
 const fields=[
 ['name','姓名','text','例如：研究者',true],
 ['major','专业','text','例如：材料学'],
 ['degree','学历阶段','degree','例如：博士研究生'],
 ['cohort','年级','text','例如：示例年级'],
 ['researchDirection','研究方向','text','例如：研究主题或技术方向'],
 ['graduationDate','预计毕业日期','date','请选择预计毕业日期'],
 ['bio','个人科研简介','textarea','写下正在进行的课题或科研定位']
 ];
 return `<div class="settings-intro"><div><h2>设置</h2><p class="page-desc">完善个人科研档案、自定义工作台显示内容与业务分类。修改后可随时再次调整。</p></div><div class="sf110-settings-tools"><button type="button" class="btn btn-outline btn-sm" data-action="sf110-guide" aria-label="查看使用指引与常见问题">使用指引与常见问题 ↘</button><span class="storage-badge"><i></i> 本地存储</span></div></div>
 
 ${PUBLIC_BUILD?`<div class="notice" role="note">共享版从空白工作台启动，采用独立的本地存储空间；默认不联网上传 PDF、翻译原文或科研数据。请勿在不可信网页上保存未公开成果。</div>`:''}
 <section class="card card-pad sf-category-shortcuts" aria-label="科研分类自定义"><div class="head"><h3>自定义科研分类</h3><span class="mini">各模块分类可新增、重命名、排序和删除</span></div><div class="sf-category-shortcut-row">${customizedCategories.map(([type,label])=>`<button type="button" class="btn btn-outline btn-sm" data-action="manage-categories" data-type="${escape(type)}">${escape(label)} ⚙</button>`).join('')}</div></section>
 <div class="settings-primary settings-v131-primary">
 <section class="card card-pad"><div class="head"><h3>个人科研档案</h3><span class="mini">姓名、学历、年级、专业与研究方向均可自定义</span></div>
 <form id="profileForm" autocomplete="on"><div class="avatar-settings-row"><div class="settings-avatar" id="settingsAvatar">${avatarFace()}</div><div class="avatar-settings-controls"><strong>个人头像</strong><p class="mini">支持 JPG、PNG、WebP，最大 8 MB。自动裁剪并压缩保存到本机，随 JSON 备份导出。</p><div class="avatar-settings-actions"><button type="button" class="btn btn-outline btn-sm" data-action="avatar-upload">上传 / 更换头像</button><button type="button" class="btn btn-ghost btn-sm" data-action="avatar-remove">移除头像</button></div></div><input type="file" id="avatarFile" accept="image/png,image/jpeg,image/webp" hidden></div><div class="fields">${fields.map(([key,label,kind,placeholder,required])=>`<div class="field ${kind==='textarea'?'wide':''}"><label for="profile_${key}">${label}${required?' *':''}</label>${kind==='textarea'?`<textarea class="textarea" name="${key}" id="profile_${key}" maxlength="300" placeholder="${placeholder}">${escape(profile[key])}</textarea>`:`<input class="input" type="${kind==='date'?'date':'text'}" name="${key}" id="profile_${key}" value="${escape(profile[key])}" placeholder="${placeholder}" ${kind==='degree'?'list="degreeOptions"':''} ${required?'required minlength="1"':''} maxlength="${key==='researchDirection'?120:80}" autocomplete="${key==='name'?'name':'off'}">`}</div>`).join('')}</div>
 <datalist id="degreeOptions"><option value="本科生"></option><option value="硕士研究生"></option><option value="博士研究生"></option><option value="博士后"></option><option value="高校教师"></option><option value="科研人员"></option></datalist>
 <div class="form-actions"><button type="reset" class="btn btn-outline">撤销未保存修改</button><button type="submit" class="btn">✓ 保存个人资料</button></div></form>
 </section>
 <section class="card card-pad preview-card"><div class="head"><h3>首页档案预览</h3></div>${profilePreviewHtml()}<button class="btn btn-ghost btn-sm" type="button" data-nav="home">查看工作台首页 →</button></section>
 </div>
 <div class="settings-grid small-section settings-v131-grid">
 <section class="card card-pad settings-appearance-card"><div class="head"><h3>主题与壁纸</h3><span class="mini">修改后保存应用到全部页面</span></div><form id="appearanceForm" class="fields">
 <div class="field wide"><label for="setting_workspaceName">工作台显示名称</label><input class="input" name="workspaceName" id="setting_workspaceName" maxlength="36" required value="${escape(setting.workspaceName)}" placeholder="科研工作台" aria-describedby="workspaceNameHelp"><small class="mini" id="workspaceNameHelp">保存后同步更新侧栏、顶栏、首页与浏览器标题，保存在当前浏览器的工作台偏好中。</small></div>
 <div class="field wide"><label for="setting_greeting">首页提示语</label><textarea class="textarea" name="greeting" id="setting_greeting" maxlength="160" placeholder="例如：每天推进一点科研目标">${escape(setting.greeting)}</textarea></div>
 <div class="field wide"><label id="layoutSchemeLabel">科研排版方案（独立于颜色主题）</label>
 <div class="sf-layout-choices" role="radiogroup" aria-labelledby="layoutSchemeLabel">
 ${[['balanced','专业均衡','日常管理 · 14px 正文','以层级和留白平衡页面信息'],['dense','高密度数据','批量筛选 · 高效工作','收紧卡片间距，正文不小于 13px'],['reading','沉浸阅读','文献摘要 · 长篇笔记','17px 正文、1.8 行距及舒适行宽'],['night','夜间专注','暗色界面 · 低眩光','深色表格和输入框、明确焦点']].map(([key,title,metric,desc])=>`<label class="sf-layout-choice sf-choice-${key}"><input type="radio" name="layoutScheme" value="${key}" ${setting.layoutScheme===key?'checked':''}><span class="sf-layout-demo" aria-hidden="true"><i></i><i></i><i></i></span><strong>${title}</strong><span>${metric}</span><small>${desc}</small></label>`).join('')}
 </div><p class="mini">排版同时调整字号、行距、文字宽度和卡片密度。更改后点击“保存工作台偏好”，文献详情和其他页面同步生效。</p></div>
 <div class="field wide"><label for="setting_stylePreset">界面风格模板</label><div class="style-presets" role="group" aria-label="选择工作台界面风格">${[['ocean','科研蓝白','清晰高效'],['sage','护眼鼠尾草','柔和绿灰'],['paper','暖纸手稿','奶油米白'],['graphite','石墨灰','克制专业'],['glacier','冰川青蓝','轻盈理性'],['lavender','实验室紫','稳重柔和']].map(([key,title,desc])=>`<label class="style-preset-card preset-${key}"><input type="radio" name="stylePreset" value="${key}" ${setting.stylePreset===key?'checked':''}><span class="preset-sample"><i></i><i></i><i></i></span><strong>${title}</strong><small>${desc}</small></label>`).join('')}</div><p class="mini" id="stylePresetFeedback" role="status" aria-live="polite">预览的是各风格的实际主题色。当前选择「${escape(({'ocean':'科研蓝白','sage':'护眼鼠尾草','paper':'暖纸手稿','graphite':'石墨灰','glacier':'冰川青蓝','lavender':'实验室紫'})[setting.stylePreset]||'科研蓝白')}」；保存工作台偏好后全站生效，护眼模式仍可独立开启。</p></div><div class="field wide"><label>工作台壁纸</label><div class="wallpaper-picker" role="group" aria-label="壁纸选择">${[['none','无壁纸'],['mist','科研晨雾'],['paper-lines','浅色手稿'],['stars','星空光点'],['custom','自定义图片']].map(([key,text])=>`<label class="wallpaper-option wallpaper-${key}"><input type="radio" name="wallpaper" value="${key}" ${setting.wallpaper===key?'checked':''}><span class="wallpaper-swatch"></span><strong>${text}</strong></label>`).join('')}</div><div class="wallpaper-actions"><button type="button" class="btn btn-outline btn-sm" data-action="wallpaper-upload">上传个人壁纸</button><button type="button" class="btn btn-ghost btn-sm" data-action="wallpaper-clear">清除自定义壁纸</button><span class="mini" id="wallpaperStatus">${setting.wallpaperImage?'已保存本地壁纸':'暂无自定义壁纸'} · 仅保存在本机</span></div><input type="file" accept="image/png,image/jpeg,image/webp" id="wallpaperFile" hidden><p class="mini">支持 JPG / PNG / WebP，最大 6 MB；自动压缩后存入浏览器及 JSON 备份。仅限授权使用的图片。</p></div>
 <div class="field"><label for="setting_theme">主题强调色</label><select class="select" name="theme" id="setting_theme" style="width:100%">${[['auto','跟随界面风格'],['blue','科技蓝'],['indigo','靛蓝'],['teal','青绿'],['violet','紫色'],['orange','暖橙']].map(([key,label])=>`<option value="${key}" ${setting.theme===key?'selected':''}>${label}</option>`).join('')}</select></div>
 <div class="field"><label for="setting_colorMode">界面舒适度</label><select class="select" name="colorMode" id="setting_colorMode" style="width:100%"><option value="standard" ${setting.colorMode!=='eye'?'selected':''}>标准明亮</option><option value="eye" ${setting.colorMode==='eye'?'selected':''}>护眼柔和（低饱和米绿）</option></select><small class="mini">减少纯白背景和高亮蓝色；在页面顶栏也可以快速切换。</small></div>
 <div class="field"><label for="setting_dailyHours">每日科研目标（小时）</label><input class="input" type="number" step="0.5" min="0" max="24" name="dailyHours" id="setting_dailyHours" value="${escape(setting.dailyHours)}"></div>
 <div class="field wide"><button class="btn" type="submit">保存主题与壁纸</button></div></form></section>
 <section class="card card-pad sf-translation-card" aria-labelledby="sf-translation-title"><div class="head"><div><h3 id="sf-translation-title">文献摘要翻译</h3><p class="mini">与主题、壁纸独立设置；翻译内容只写入对应文献记录。</p></div></div><form id="translationForm" class="fields">
 <div class="field wide translation-preferences"><label for="setting_autoTranslateAbstract">文献摘要自动翻译</label><label class="lit-online-control"><input type="checkbox" name="autoTranslateAbstract" id="setting_autoTranslateAbstract" ${setting.autoTranslateAbstract?'checked':''}> 导入英文 PDF 后自动填入中文摘要</label><small class="mini">优先使用同设备的离线翻译服务，然后尝试已准备好的 Chrome 语言模型。英文原文保留，机译需核对。</small></div>
 <div class="field"><label for="setting_translationEngine">翻译方式</label><select class="select" name="translationEngine" id="setting_translationEngine"><option value="device" ${setting.translationEngine==='device'?'selected':''}>本机翻译服务 / Chrome（优先本机，不上传原文）</option><option value="remote" ${setting.translationEngine==='remote'?'selected':''}>自建 LibreTranslate 服务</option></select></div>
 <div class="field"><label>本地模型准备</label><button class="btn btn-outline" type="button" data-action="prepare-local-translator">下载/启用离线翻译模型</button><small class="mini">推荐先运行 setup-local-translation.bat 安装离线语言包，再用 start-web.bat 启动；也可尝试 Chrome 桌面端内置翻译。</small></div>
 <div class="field wide"><label for="setting_translationEndpoint">自建翻译接口（仅选择远程方式时使用）</label><input class="input" type="url" name="translationEndpoint" id="setting_translationEndpoint" value="${escape(setting.translationEndpoint||'')}" placeholder="https://your-private-server.example/translate" maxlength="200"><label class="lit-online-control" style="margin-top:9px"><input name="translationRemoteConsent" type="checkbox" ${setting.translationRemoteConsent?'checked':''}> 我明确同意将英文摘要发送到以上可信服务</label><small class="mini">不填 URL 或未勾选同意时绝不发送；不要填写第三方密钥到公开版本。内网/自建服务更适合未公开成果。</small></div>
 <div class="field wide translation-tools"><button class="btn btn-outline" type="button" data-action="check-translation">检测本地翻译服务</button><button class="btn btn-outline" type="button" data-action="retry-abstracts">重试未翻译摘要</button><span class="mini" id="translationDiagnostic" aria-live="polite">译文将保存在本地文献记录中</span></div><div class="field wide"><button class="btn" type="submit">保存文献翻译设置</button></div></form></section>
 <section class="card card-pad"><div class="head"><h3>数据备份与恢复</h3></div><p class="subtle">个人资料、页面偏好、自定义分类和科研记录统一保存在当前浏览器中。JSON 导出包含以上所有设置，便于以后迁移到新版本。</p><div class="backup-actions">${actionBtn('↓ 导出科研记录 JSON','export')}${actionBtn('↑ 导入 JSON 备份','import','btn btn-outline')}</div><input type="file" id="importFile" accept="application/json,.json" hidden><hr class="subtle-divider"><div class="row"><div><b>清空科研记录 JSON</b><p class="mini">仅清空本地 JSON 记录及设置，不会自动删除 IndexedDB 中的 PDF 附件；操作不可撤销</p></div>${actionBtn('清空数据','reset','btn btn-danger btn-sm')}</div><div class="notice notice-small">云端同步尚未开发。JSON 备份不包含保存在 IndexedDB 中的 PDF 文件；请另行保存 PDF 原件，定期备份科研记录。</div><div class="sf-data-health"><div><strong>本地数据健康检查</strong><p class="mini">检查 JSON 可读性、各类记录数量和当前 Origin 的存储占用估计；不会上传科研内容。</p></div><button class="btn btn-outline btn-sm" type="button" data-action="sf-data-health">检查存储状态</button><output id="sf-data-health-result" role="status" aria-live="polite">尚未检查</output></div></section>
 </div>
 ${trashHtml()}
 <section class="card card-pad small-section sf110-help" aria-labelledby="sf110-help-title">
   <div class="head"><div><h3 id="sf110-help-title">使用指引与常见问题</h3><p class="mini">根据科研日常的典型操作整理；不会修改或上传现有记录。</p></div></div>
   <div class="sf110-help-grid">
     <div class="sf110-step"><b>01 · 先记任务</b><p>进入“待办事项”，填写任务名称、截止日期和优先级，保存后可在看板或日历查阅。</p><button type="button" class="btn btn-outline btn-sm" data-nav="tasks">打开待办事项 →</button></div>
     <div class="sf110-step"><b>02 · 再整理文献</b><p>进入“文献中心”，导入 PDF 或 CSV；标题、作者、期刊是辅助识别结果，请人工核对。</p><button type="button" class="btn btn-outline btn-sm" data-nav="literature">打开文献中心 →</button></div>
     <div class="sf110-step"><b>03 · 记录实验过程</b><p>进入“实验记录”，按组填写工况和重复试验，给每次试验保留样品编号与原始数据位置。</p><button type="button" class="btn btn-outline btn-sm" data-nav="experiments">打开实验记录 →</button></div>
   </div>
   <div class="sf110-faq">
    <details><summary>我换了电脑，为什么记录没有同步？</summary><p>本版没有云端同步。科研记录主要保存在当前网站来源下的浏览器本地存储中；换电脑、浏览器或访问地址时不会自动出现。请先导出 JSON，再到新环境手动导入。</p></details>
    <details><summary>JSON 备份是否包含 PDF 和实验原件？</summary><p>不包含。JSON 备份保存科研记录及设置；文献 PDF 通常保存在当前浏览器的 IndexedDB 中，实验原始文件仍在你记录的文件位置。请分别备份原件。</p></details>
    <details><summary>为什么 PDF 识别的作者或期刊可能有误？</summary><p>PDF 内嵌元数据、中文字体和复杂版式可能使提取失败。自动识别仅用于预填，不代表期刊收录、JCR 分区或影响因子已核实；建议对照论文首页及出版方信息人工校对。</p></details>
    <details><summary>能否让多人同时管理同一批数据？</summary><p>当前版本不是共享数据库应用，没有多人账户、服务器端权限管理或跨设备实时合并。不要把本地存储视为团队协作或长期归档服务。</p></details>
    <details><summary>如果误删或保存失败怎么办？</summary><p>记录可在“设置 → 回收站”限期恢复；写入失败时会提示并尽量恢复最近一次成功保存的状态。长期安全仍需定期导出 JSON，并独立备份 PDF 和实验文件。</p></details>
   </div>
   <p class="sf110-help-note" role="note">建议开始正式科研记录前先完成一次 JSON 导出，并在浏览器下载目录确认文件存在。浏览器本地存储并非永久不丢失的备份。</p>
 </section>
 <section class="card card-pad small-section copyright-card aria-label="软件说明"><div class="head"><h3>软件使用说明</h3></div><strong>ScholarFlow · 科研工作台</strong><p class="mini">本版本不附带个人身份资料或实际科研记录。使用者可以在设置中填写自己的科研档案。第三方开源组件遵循各自许可协议。</p></section>
 <section class="card card-pad small-section"><div class="head"><h3>能力状态</h3></div><div class="row" style="flex-wrap:wrap;gap:10px"><span class="tag">✓ 个人档案和首页联动</span><span class="tag">✓ 可自定义显示名称与分类</span><span class="tag">✓ 当前浏览器本地保存（请备份）</span><span class="tag">✓ JSON 导入导出</span><span class="tag">○ 云端同步：未实现</span><span class="tag">✓ 文献 PDF 本地存储与预览（不包含在 JSON 备份中）</span><span class="tag">○ AI 助手：未实现</span></div></section>`;
}
function updateProfilePreview(form){
 if(!form)return;
 const fd=new FormData(form), val=k=>String(fd.get(k)||'').trim();
 const display=(selector,value)=>{const node=$(selector);if(node)node.textContent=value};
 display('#previewName',val('name')||'我的科研空间');
 if(avatarDraft===null&&!avatarSource()){const a=$('#previewAvatar'),b=$('#settingsAvatar');if(a)a.textContent=(val('name')||'研').slice(0,1);if(b)b.textContent=(val('name')||'研').slice(0,1)}
 display('#previewMeta',[val('degree'),val('major'),val('cohort')].filter(Boolean).join(' · ')||'等待填写个人信息');
 display('#previewDirection',val('researchDirection')||'未填写');
 display('#previewGraduation',val('graduationDate')||'未填写');
 display('#previewBio',val('bio')||'填写科研简介后会显示在这里。');
}

function recordPreviewHtml(){
 if(!recordPreview)return '';
 const {type,id:recordId}=recordPreview,r=data[type]?.find(row=>row.id===recordId),def=config[type];
 if(!r||!def)return '';
 const fields=type==='papers'&&r.status==='已发表'?publishedPaperFields:type==='papers'&&r.category==='投稿记录'?submissionPaperFields:type==='papers'?writingPaperFields:def.fields;
 const infos=fields.filter(f=>f[0]!=='title'&&r[f[0]]!==undefined&&r[f[0]]!==null&&String(r[f[0]]).trim());
 return `<div class="dialog-backdrop"><div class="dialog record-detail-dialog" role="dialog" aria-modal="true" aria-label="${escape(def.singular)}详情"><div class="dialog-head"><div><span class="eyebrow">${escape(def.label)} / 记录详情</span><h3>${escape(r.title)}</h3></div><button class="round" data-action="record-preview-close" aria-label="关闭详情">✕</button></div><div class="dialog-body"><div class="record-detail-fields">${infos.map(([k,label])=>`<div class="record-detail-field ${String(r[k]).length>80||/path|location/i.test(k)?'is-wide':''}"><label>${escape(label)}</label><div class="pre-line">${/^(path|filePath|fileLocation|codePath|dataPath)$/i.test(k)?pathAction(r[k]):escape(String(type==='papers'&&r.category==='投稿记录'&&k==='status'?(latestSubmissionEvent(r)?.status||normalizeSubmissionDisplay(r.status)):r[k]))}</div></div>`).join('')||'<p class="mini">这条记录尚未填写详细内容。</p>'}</div>${type==='papers'?researchHistoryHtml(r):''}</div><div class="dialog-foot"><button class="btn btn-danger btn-sm" data-del="${escape(type)}:${escape(r.id)}">删除记录</button><span class="dialog-foot-spacer"></span><button class="btn btn-outline" data-action="record-preview-close">关闭</button><button class="btn" data-action="record-preview-edit" data-id="${escape(r.id)}" data-type="${escape(type)}">编辑记录</button></div></div></div>`;
}
// Explicit draft recovery: separate from JSON backup and the primary record store.
// Drafts are limited to experiments and projects; a separate key prevents accidental
// mutation of a saved record. No automatic overwrite of the official record.
const draftTypeEnabled=type=>['experiments','projects'].includes(type);
const draftKey=()=>modal&&draftTypeEnabled(modal.type)?DBKEY+':draft:'+modal.type+':'+(modal.record?.id||'new'):'';
function readRecordDraft(){const key=draftKey();if(!key)return null;try{const raw=localStorage.getItem(key);if(!raw||raw.length>120000)return null;const parsed=JSON.parse(raw);if(Date.now()-parsed.savedAt>14*86400000)return null;return parsed.fields&&typeof parsed.fields==='object'?parsed:null}catch{return null}}
function writeRecordDraft(){const form=document.getElementById('recordForm'),key=draftKey();if(!form||!key||!document.querySelector('.dialog-backdrop'))return false;try{
 expSyncGroupDraft();const fields=Object.fromEntries([...new FormData(form).entries()].map(([k,v])=>[k,String(v)]));
 const raw=JSON.stringify({fields,savedAt:Date.now()});if(raw.length>110000)return false;
 localStorage.setItem(key,raw);const status=document.getElementById('sf-draft-status');if(status)status.textContent='草稿已暂存 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});return true;
 }catch{return false}}
function clearRecordDraft(){const key=draftKey();if(!key)return;try{localStorage.removeItem(key)}catch{}}
function restoreRecordDraft(){const draft=readRecordDraft(),form=document.getElementById('recordForm');if(!draft||!form)return false;
 if(modal?.type==='experiments'&&draft.fields.experimentGroupRecords){try{const groups=JSON.parse(draft.fields.experimentGroupRecords);if(!Array.isArray(groups)||groups.length>100||groups.some(g=>Array.isArray(g?.attempts)&&g.attempts.length>100)){toast('草稿分组超过可编辑上限或格式无效；已阻止不完整恢复。');return false}}catch{toast('实验分组草稿格式错误，已取消恢复');return false}}
 for(const el of form.elements){if(!el.name||!Object.hasOwn(draft.fields,el.name))continue;if(el.tagName==='SELECT'&&!Array.from(el.options).some(o=>o.value===draft.fields[el.name]))continue;el.value=draft.fields[el.name]}
 if(modal?.type==='experiments'&&draft.fields.experimentGroupRecords){const groups=JSON.parse(draft.fields.experimentGroupRecords);const list=document.getElementById('expGroupList');if(list)list.innerHTML=groups.map(expGroupMarkup).join('')}
 if(modal?.type==='experiments')expSyncGroupDraft();const status=document.getElementById('sf-draft-status');if(status)status.textContent='已恢复上次草稿，请检查后保存';return true}
// 历史模块 structured experiment groups: one experiment -> conditions -> repeat trials.
const expSafeGroups=r=>Array.isArray(r?.experimentGroupRecords)?r.experimentGroupRecords.filter(g=>g&&typeof g==='object').slice(0,100):[];
const expGroupCount=r=>Array.isArray(r?.experimentGroupRecords)?expSafeGroups(r).length:experimentGroups(r.groups);
const expEditOverLimit=r=>Array.isArray(r?.experimentGroupRecords)&& (r.experimentGroupRecords.length>100 || r.experimentGroupRecords.some(g=>Array.isArray(g?.attempts)&&g.attempts.length>100));
// 历史模块: preserve historical metadata, but capture samples and file locations per trial.
// The in-browser comparison is derived from the same single source of truth as the editor.
const expTrialRecord=v=>typeof v==='string'?{sample:'',result:v,dataPath:''}:v&&typeof v==='object'?{sample:String(v.sample??''),result:String(v.result??''),dataPath:String(v.dataPath??'')}: {sample:'',result:'',dataPath:''};
function expTrialMarkup(v={},j=0){const a=expTrialRecord(v);return `<div class="exp-trial" role="group" aria-label="第 ${j+1} 次重复试验"><span class="exp-trial-index">第 ${j+1} 次</span><label><span class="sr-only">样品编号</span><input class="input" data-exp-trial-sample="1" value="${escape(a.sample)}" placeholder="样品编号" maxlength="140" aria-label="第 ${j+1} 次样品编号"></label><label><span class="sr-only">试验结果（含单位）</span><input class="input" data-exp-trial="1" value="${escape(a.result)}" placeholder="结果（含单位）" maxlength="300" aria-label="第 ${j+1} 次结果"></label><label><span class="sr-only">数据位置</span><input class="input" data-exp-trial-path="1" value="${escape(a.dataPath)}" placeholder="数据文件位置 / 路径" maxlength="1000" aria-label="第 ${j+1} 次数据位置"></label><button type="button" class="btn btn-outline btn-sm" data-action="exp-remove-trial" aria-label="删除第 ${j+1} 次试验">×</button></div>`;}
function expGroupMarkup(g={},i=0){
 const priorStatus=String(g.status||'计划中');
 const legacyStatusOption=!['计划中','进行中','完成'].includes(priorStatus)?`<option value="${escape(priorStatus)}" selected>${escape(priorStatus)}（原状态）</option>`:'';
 const attempts=Array.isArray(g.attempts)&&g.attempts.length?g.attempts:[''];
 return `<section class="exp-group-editor" data-exp-group="${i}" data-group-id="${escape(g.id||id())}" data-legacy-sample="${escape(g.sample||'')}" data-legacy-equipment="${escape(g.equipment||'')}"><div class="exp-group-heading"><div class="exp-group-heading-left"><strong>第 ${i+1} 组</strong><span class="mini" data-exp-group-brief></span></div><div class="exp-group-actions"><button type="button" class="btn btn-outline btn-sm" data-action="exp-toggle-group" aria-expanded="true">收起</button><button type="button" class="btn btn-outline btn-sm" data-action="exp-remove-group">删除组</button></div></div><div class="exp-group-fields"><label>组名 / 工况标识<input class="input" data-exp-field="name" value="${escape(g.name||'第'+(i+1)+'组')}" maxlength="90"></label><label>工况状态<select class="select" data-exp-field="status">${legacyStatusOption}<option ${g.status==='计划中'?'selected':''}>计划中</option><option ${g.status==='进行中'?'selected':''}>进行中</option><option ${g.status==='完成'?'selected':''}>完成</option></select></label><label class="exp-wide">实验工况（温度、载荷、速度、环境等，注明单位）<textarea class="textarea" data-exp-field="conditions">${escape(g.conditions||'')}</textarea></label></div><div class="exp-trial-head"><b>重复试验与独立数据</b><button type="button" class="btn btn-outline btn-sm" data-action="exp-add-trial">＋ 增加次数</button></div><div class="exp-trial-table-head" aria-hidden="true"><span>次数</span><span>样品编号</span><span>试验结果</span><span>数据位置</span><span>操作</span></div><div class="exp-trials">${attempts.slice(0,100).map(expTrialMarkup).join('')}</div><label class="exp-wide">本组分析 / 异常备注（可选）<textarea class="textarea" data-exp-field="result">${escape(g.result||'')}</textarea></label></section>`;
}
function expGroupEditor(r){const rows=expSafeGroups(r);return `<section class="exp-groups-wrap"><div class="exp-group-heading"><div><h3>02 · 分组工况与重复试验</h3><p class="mini">每组设置工况，每次试验独立填写样品编号、结果和数据位置。</p><span class="exp-group-total" id="expGroupTotal" aria-live="polite"></span></div><button type="button" class="btn btn-outline btn-sm" data-action="exp-add-group">＋ 新增一组</button></div><div id="expGroupList">${rows.map(expGroupMarkup).join('')}</div><input type="hidden" name="experimentGroupRecords" id="expGroupData" value=""></section>`}
function expCollectGroups(){const list=document.getElementById('expGroupList');if(!list)return [];return [...list.querySelectorAll('[data-exp-group]')].map((node,i)=>({id:node.dataset.groupId||id(),name:node.querySelector('[data-exp-field="name"]')?.value.trim()||`第${i+1}组`,sample:node.dataset.legacySample||'',conditions:node.querySelector('[data-exp-field="conditions"]')?.value.trim()||'',equipment:node.dataset.legacyEquipment||'',status:node.querySelector('[data-exp-field="status"]')?.value||'计划中',attempts:[...node.querySelectorAll('.exp-trial')].map(x=>({sample:x.querySelector('[data-exp-trial-sample]')?.value.trim()||'',result:x.querySelector('[data-exp-trial]')?.value.trim()||'',dataPath:x.querySelector('[data-exp-trial-path]')?.value.trim()||''})),result:node.querySelector('[data-exp-field="result"]')?.value.trim()||''}));}
function expResultRows(groups,{full=false}={}){return (full?groups:groups.slice(0,100)).filter(g=>g&&typeof g==='object').flatMap((g,i)=>{const attempts=Array.isArray(g.attempts)?(full?g.attempts:g.attempts.slice(0,100)):[];return (attempts.length?attempts:[null]).map((a,j)=>({name:String(g.name||`第${i+1}组`),conditions:String(g.conditions||''),trial:a===null?'—':String(j+1),...expTrialRecord(a)}));});}
function expComparisonTable(groups,{preview=false}={}){const allRows=expResultRows(groups),rows=allRows.slice(0,300);return `<div class="exp-comparison-scroll"><table class="exp-comparison-table" aria-label="实验结果对比"><caption>结果按实验组与重复次数对应展示，数据路径仅作索引，不包含原件。</caption><thead><tr><th scope="col">实验组</th><th scope="col">实验工况</th><th scope="col">次数</th><th scope="col">样品编号</th><th scope="col">试验结果</th><th scope="col">数据位置</th></tr></thead><tbody>${rows.map(x=>`<tr><th scope="row">${escape(x.name)}</th><td>${escape(x.conditions||'—')}</td><td>${escape(x.trial)}</td><td>${escape(x.sample||'—')}</td><td>${escape(x.result||'—')}</td><td class="exp-path-cell">${preview?escape(x.dataPath||'—'):(x.dataPath?pathAction(x.dataPath):'—')}</td></tr>`).join('')||'<tr><td colspan="6" class="exp-empty-comparison">请先添加实验组，再录入重复试验结果。</td></tr>'}</tbody></table></div>${allRows.length>rows.length?`<p class="exp-comparison-limit" role="status">共 ${allRows.length} 行，仅显示前 300 行以保持流畅；导出 CSV 可获取全部结果。</p>`:''}`;}
function expComparisonCsv(record){const columns=['实验组','实验工况','次数','样品编号','试验结果','数据位置'];const rows=expResultRows(Array.isArray(record?.experimentGroupRecords)?record.experimentGroupRecords:[],{full:true});return '\ufeff'+[columns.map(csvEscape).join(','),...rows.map(r=>[r.name,r.conditions,r.trial,r.sample,r.result,r.dataPath].map(csvEscape).join(','))].join('\r\n')}
let expComparisonTimer=null;
function expSyncGroupDraft(){const groups=expCollectGroups(),hidden=document.getElementById('expGroupData');if(hidden)hidden.value=JSON.stringify(groups);const groupNodes=document.querySelectorAll('#expGroupList [data-exp-group]');const total=document.getElementById('expGroupTotal');if(total)total.textContent=`当前 ${groups.length} 组 · ${groups.reduce((n,g)=>n+g.attempts.length,0)} 次（含待填写项）`;groupNodes.forEach((g,i)=>{const brief=g.querySelector('[data-exp-group-brief]');if(brief)brief.textContent=`${groups[i].name} · ${groups[i].attempts.length} 次`});const comparison=document.getElementById('expResultComparison');clearTimeout(expComparisonTimer);if(comparison){const draw=()=>{const target=document.getElementById('expResultComparison');if(target)target.innerHTML=expComparisonTable(expCollectGroups(),{preview:true})};if(groups.reduce((n,g)=>n+g.attempts.length,0)>20)expComparisonTimer=setTimeout(draw,140);else comparison.innerHTML=expComparisonTable(groups,{preview:true});}}
function expRefreshGroupNumbers(){document.querySelectorAll('#expGroupList [data-exp-group]').forEach((node,i)=>{node.dataset.expGroup=i;const h=node.querySelector('.exp-group-heading strong');if(h)h.textContent=`第 ${i+1} 组`;node.querySelectorAll('.exp-trial').forEach((row,j)=>{const label=row.querySelector('.exp-trial-index');if(label)label.textContent=`第 ${j+1} 次`;row.setAttribute('aria-label',`第 ${j+1} 次重复试验`);for(const [attr,suffix] of [['data-exp-trial-sample','样品编号'],['data-exp-trial','结果'],['data-exp-trial-path','数据位置']])row.querySelector('['+attr+']')?.setAttribute('aria-label',`第 ${j+1} 次${suffix}`);row.querySelector('[data-action="exp-remove-trial"]')?.setAttribute('aria-label',`删除第 ${j+1} 次试验`);});});expSyncGroupDraft();}
function expGroupDetails(r){const groups=expSafeGroups(r);if(!groups.length)return `<p class="mini">尚未建立结构化分组。可编辑实验并逐组填写工况。</p>`;return groups.map((g,i)=>`<article class="exp-group-summary"><header><strong>${escape(g.name||`第${i+1}组`)}</strong><span class="mini">${escape(g.status||'')}</span></header><p><b>工况：</b>${textBlock(g.conditions)}</p>${g.result?`<p><b>本组分析：</b>${textBlock(g.result)}</p>`:''}</article>`).join('');}
function modalHtml(){
 if(recordPreview)return recordPreviewHtml();
 if(notePreviewId){const r=data.notes.find(n=>n.id===notePreviewId);return r?`<div class="dialog-backdrop"><div class="dialog" role="dialog" aria-modal="true"><div class="dialog-head"><h3>${escape(r.title)}</h3><button class="round" data-action="note-close">✕</button></div><div class="dialog-body"><p>${escape(r.category||'记录想法')}</p><div class="note-preview-content">${textBlock(r.content||'暂无内容')}</div><p class="mini">标签：${escape(r.tags||'无')}</p></div><div class="dialog-foot"><button class="btn btn-outline" data-action="note-close">关闭</button><button class="btn" data-action="note-edit" data-id="${escape(r.id)}">编辑笔记</button></div></div></div>`:'';}
 if(historyEditing)return historyEditorHtml();
 const {type,record}=modal,c=config[type];if(!c)return '';
 const mode=type==='papers'?(modal.mode||'writing'):'';
 const fields=(mode==='published'?publishedPaperFields:mode==='submission'?submissionPaperFields:mode==='writing'?writingPaperFields:c.fields).filter(f=>type!=='literature'||!['correspondingAuthor','metricSource','metricYear','issn','abstract'].includes(f[0]));
 const name=mode==='published'?'已发表论文':mode==='submission'?'投稿记录':mode==='writing'?'论文写作记录':c.singular;
 const renderRecordFields=fieldRows=>fieldRows.map(([key,label,kind,required,opts])=>{let value=record?.[key]??modal.prefill?.[key]??'';if(type==='papers'&&mode==='submission'&&key==='status'&&record){value=latestSubmissionEvent(record)?.status||({'已投稿':'With Editor','审稿中':'Under Review','返修中':'Revise','已接收':'Accept','已拒稿':'Reject','准备中':'Submitted'}[value]||value)}if(type==='literature'&&key==='abstractZh'&&!value&&!hasEnglishAbstract(record?.abstract||''))value=record?.abstract||'';let attr=`name="${key}" id="field_${key}" ${required?'required':''} ${type==='literature'&&key==='articleType'?'aria-describedby="sf-article-type-hint"':''}`;let control=kind==='select'?`<select class="select" style="width:100%" ${attr}>${fieldOptions(type,key,opts,value).map(v=>`<option value="${escape(v)}" ${value===v?'selected':''}>${escape(v)}</option>`).join('')}</select>`:kind==='simulation'?`<select class="select" style="width:100%" ${attr}><option value="">选择仿真案例</option>${data.simulations.map(x=>`<option value="${escape(x.id)}" ${value===x.id?'selected':''}>${escape(x.title)}</option>`).join('')}</select>`:kind==='experiment'?`<select class="select" style="width:100%" ${attr}><option value="">选择实验</option>${data.experiments.map(x=>`<option value="${escape(x.id)}" ${value===x.id?'selected':''}>${escape(x.title)}</option>`).join('')}</select>`:kind==='project'?`<select class="select" style="width:100%" ${attr}><option value="">不关联</option>${data.projects.map(p=>`<option value="${escape(p.id)}" ${value===p.id?'selected':''}>${escape(p.title)}</option>`).join('')}</select>`:kind==='textarea'?`<textarea class="textarea" ${attr}>${escape(value)}</textarea>`:`<input class="input" ${attr} type="${kind||'text'}" value="${escape(value)}" ${kind==='number'?'min="0" step="any"':''}>`;return `<div class="field ${kind==='textarea'?'wide':''}"><div class="field-label-row"><label for="field_${key}">${escape(label)}${required?' *':''}</label>${type==='literature'&&key==='journal'?`<button class="journal-inline-action" type="button" data-action="journal-lookup-form" title="联网匹配标题，自动补全期刊名">✧ 智能识别期刊</button>`:''}</div>${control}${type==='literature'&&key==='articleType'?`<div class="field-hint" id="sf-article-type-hint"><span>按题名语言给出初始分类，您可以手动调整。</span><small>“SCI”只是工作台的分类建议，并非数据库收录认证；请以权威来源为准。</small></div>`:''}</div>`}).join('');
 const notice=type==='literature'?'PDF 识别仅用于预填题名、作者、期刊等信息；请人工核对。摘要翻译保留原文，不会默认上传 PDF 原件。':mode==='published'?'这份档案将自动计入“成果统计”中的论文成果；分区与影响因子请根据对应年度自行核实。':mode==='submission'?'只记录论文标题、投稿期刊、状态和投稿日期；写作计划不在这里重复填写。':mode==='writing'?'这里填写计划投稿时间及稿件文件位置；导师的每轮意见请在论文详情的修改时间线中逐条记录。':'';
 return `<div class="dialog-backdrop" data-dismiss="1"><div class="dialog" role="dialog" aria-modal="true" aria-label="${record?'编辑':'新增'}${name}"><div class="dialog-head"><h3>${record?'编辑':'新增'}${name}</h3><button class="round" data-action="close" aria-label="关闭">✕</button></div><form id="recordForm"><div class="dialog-body">${draftTypeEnabled(type)?`<div class="sf-draft-control"><span id="sf-draft-status" role="status">每 30 秒自动暂存当前表单草稿</span>${readRecordDraft()?'<button type="button" class="btn btn-outline btn-sm" data-action="restore-record-draft">恢复上次草稿</button>':''}</div>`:''}${notice?`<p class="paper-form-note">${escape(notice)}</p>`:''}${type==='experiments'?'<section class="exp-basic-section"><h3>01 · 实验基本信息</h3><p class="mini">只填写全实验通用的信息。工况与单次结果均在对应分组下记录。</p>':''}<div class="fields">${renderRecordFields(type==='experiments'?fields.filter(f=>!['dataPath','conclusion'].includes(f[0])):fields)}</div>${type==='experiments'?'</section>':''}${type==='experiments'&&expEditOverLimit(record)?'<p class="exp-edit-limit-warning" role="alert">此历史记录的分组或重复次数超过编辑器的 100 条显示上限。为防止遗漏数据，本次禁止保存；请先在设置中导出完整 JSON 备份并整理记录。</p>':''}${type==='experiments'?expGroupEditor(record):''}${type==='experiments'?`<section class="exp-overall-section"><h3>03 · 结果对比</h3><p class="mini">自动汇总各组工况、每次样品编号、结果与数据位置；无需重复填写。</p><div id="expResultComparison">${expComparisonTable(expSafeGroups(record||{}),{preview:true})}</div></section>`:''}</div><div class="dialog-foot"><button class="btn btn-ghost" type="button" data-action="close">取消</button><button class="btn" type="submit">保存记录</button></div></form></div></div>`;
}
function openModal(type,recId,preset,mode){
 if(!config[type])return;
 const record=recId?data[type].find(r=>r.id===recId):null;
 let resolvedMode=mode||'';
 if(type==='papers'&&!resolvedMode&&record?.status==='已发表')resolvedMode='published';
 if(type==='papers'&&!resolvedMode)resolvedMode=record?.category==='投稿记录'||(!record&&paperCategory==='投稿记录'&&page==='papers')?'submission':'writing';
 const filled={...(preset||{})};
 if(type==='papers'&&resolvedMode==='writing'&&!record){filled.category='在写论文';filled.status='写作中'}
 outcomeManager=null;categoryManager=null;modal={type,record,prefill:filled,mode:resolvedMode};render();if(type==='literature'&&record)void autoFillAbstract(record);
}
function fmtTime(n){const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=Math.floor(n%60);return[h,m,s].map(x=>String(x).padStart(2,'0')).join(':')}
function navigate(p){joyJourneyOpen=false;const fromNav=document.activeElement?.hasAttribute?.('data-nav')===true;if(modal)writeRecordDraft();clearTimeout(searchDebounce);genericLimit=80;boardLimit=90;literatureLimit=110;recordPreview=null;if(p!=='settings')avatarDraft=null;page=p;search='';filter='';modal=null;outcomeManager=null;categoryManager=null;categoryEditingIndex=-2;menu=false;projectDetail=null;simulationDetail=null;experimentDetail=null;taskDayFilter='';location.hash=p;render();if(fromNav)document.querySelector('.nav.active')?.focus({preventScroll:true});window.scrollTo(0,0)}
function syncLinkedAdvisor(sourceType,record){
 if(sourceType==='tasks'&&record.advisorId){const r=data.advisor.find(x=>x.id===record.advisorId);if(r){r.status=record.status;r.deadline=record.deadline;r.updatedAt=new Date().toISOString()}}
 if(sourceType==='advisor'){const t=data.tasks.find(x=>x.advisorId===record.id);if(t){t.title=record.title;t.status=record.status;t.deadline=record.deadline;t.priority=record.priority;t.description=record.description;t.updatedAt=new Date().toISOString();t.completedAt=t.status==='已完成'?t.updatedAt:''}}
}
function historyAdd(paperId,nodeId=null,mode='review'){if(!data.papers.find(p=>p.id===paperId))return;recordPreview=null;historyEditing=paperId;historyNodeEditing=nodeId;historyMode=mode;modal={type:'papers',record:null};render()}
async function onClick(e){
const v2action=e.target.closest('[data-action]')?.dataset.action;
if(v2action==='sf110-guide'){const target=document.getElementById('sf110-help-title');target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target?.setAttribute('tabindex','-1');target?.focus({preventScroll:true});return}
const moodButton=e.target.closest('[data-joy-mood]');
if(moodButton&&joyJourneyOpen){const choice=moodButton.dataset.joyMood;if(joyCompanionModes.some(x=>x.id===choice)){joyCompanionMode=choice;joyCompanionIndex=0;joyCompanionRefresh()}return}
if(v2action==='sf-bear-note'){if(joyEnabled){if(page==='home')joyFlip();joyToast('科研熊说：'+joyContextMessage())}else toast('小惊喜已关闭，可从侧栏底部开启。');return}
if(v2action==='sf-joy-journey'){joyJourneyShow();return}
if(v2action==='sf-journey-close'){if(e.target.closest('.sf-journey-overlay')===e.target||e.target.closest('.sf-journey-close'))joyJourneyClose();return}
if(v2action==='sf-companion-next'){joyCompanionIndex++;joyCompanionRefresh();return}
if(v2action==='sf-companion-go'){const target=joyCompanionCard().module;joyJourneyClose();if(target!=='home'||page!=='home')navigate(target);return}
if(v2action==='sf-journey-refresh'){joyQuestIndex=(joyQuestIndex+1)%joyQuests.length;const quest=joyQuests[joyQuestIndex];const label=document.querySelector('#sf-journey-quest-text');if(label)label.textContent=quest.label;const go=document.querySelector('[data-action="sf-journey-go"]');if(go)go.textContent=quest.action+' →';return}
if(v2action==='sf-journey-go'){const next=joyQuests[joyQuestIndex%joyQuests.length].module;joyJourneyClose();navigate(next);return}
if(v2action==='sf-joy-next'){joyFlip();return}
if(v2action==='sf-joy-quiet'){joyToggle();return}
if(v2action==='sf-joy-toggle'){joyToggle();return}

if(v2action==='restore-record-draft'){if(!restoreRecordDraft())toast('草稿无法恢复或已过期');return}
if(v2action==='v2-more-generic'){genericLimit+=80;render();return}
if(v2action==='v2-more-board'){boardLimit+=90;render();return}
if(v2action==='v2-more-literature'){literatureLimit+=110;render();return}
if(v2action==='v2-reload'){location.reload();return}
if(e.target.closest('.research-kanban-card')&&!e.target.closest('button,input,select,textarea,a')&&e.detail){const card=e.target.closest('.research-kanban-card');if(card){if(card.dataset.boardCard==='simulations'){simulationDetail=card.dataset.id;simulationTab='codes';render();return}if(card.dataset.boardCard==='experiments'){experimentDetail=card.dataset.id;render();return}if(data[card.dataset.boardCard]?.some(r=>r.id===card.dataset.id)){recordPreview={type:card.dataset.boardCard,id:card.dataset.id};modal=null;render();return}}}const previewBtn=e.target.closest('[data-record-open]');if(previewBtn){const rawRecordKey=previewBtn.dataset.recordOpen,sep=rawRecordKey.indexOf(':'),type=rawRecordKey.slice(0,sep),recordId=rawRecordKey.slice(sep+1);if(!config[type]||!data[type]?.some(x=>x.id===recordId))return;recordPreview={type,id:recordId};modal=null;render();return}const nb=e.target.closest('[data-note-open]');if(nb){recordPreview={type:'notes',id:nb.dataset.noteOpen};render();return}const wn=e.target.closest('[data-writing-add],[data-writing-edit],[data-writing-delete]');if(wn){const pid=wn.dataset.writingAdd||wn.dataset.writingEdit||wn.dataset.writingDelete;const p=data.papers.find(x=>x.id===pid);if(!p)return;if(wn.dataset.writingDelete){if(confirm('删除此撰写节点？')){const old=p.writingHistory;p.writingHistory=(p.writingHistory||[]).filter(x=>x.id!==wn.dataset.node);p.updatedAt=new Date().toISOString();if(!save())p.writingHistory=old;render()}return}historyAdd(pid,wn.dataset.node||null,'writing');return}const h=e.target.closest('[data-history-add],[data-history-edit],[data-history-delete]');if(h){if(h.dataset.historyAdd){historyAdd(h.dataset.historyAdd);return}if(h.dataset.historyEdit){historyAdd(h.dataset.historyEdit,h.dataset.historyId);return}const p=data.papers.find(x=>x.id===h.dataset.historyDelete);if(p&&confirm('删除这个时间节点？')){const k=p.category==='投稿记录'?'submissionHistory':'advisorReviews';p[k]=(p[k]||[]).filter(x=>x.id!==h.dataset.historyId);if(k==='submissionHistory')syncSubmissionFromHistory(p);p.updatedAt=new Date().toISOString();if(!save()){render();return}render()}return}const t=e.target.closest('[data-nav],[data-action],[data-edit],[data-del],[data-cal],[data-date],[data-dismiss],[data-outcome-dismiss],[data-category-dismiss],[data-task-tab],[data-task-view],[data-home-filter],[data-litcat],[data-proj],[data-projtab],[data-pdf],[data-sim],[data-simtab],[data-exp],[data-note-cat],[data-simcat],[data-experiment-cat],[data-paper-cat],[data-advisor-cat],[data-board-all],[data-board-new],[data-litselect],[data-littype],[data-littag],[data-view-switch],[data-board-move],[data-archive-view]');if(!t)return;if((t.dataset.dismiss||t.dataset.outcomeDismiss||t.dataset.categoryDismiss)&&e.target!==t)return;if(t.dataset.outcomeDismiss){outcomeManager=null;render();return}if(t.dataset.categoryDismiss){categoryManager=null;categoryEditingIndex=-2;render();return}
if(t.dataset.archiveView){const [type,mode]=t.dataset.archiveView.split(':');if(ARCHIVE_MODULES[type]&&['active','archive','all'].includes(mode)){const old=archiveView[type];archiveView[type]=mode;data.settings.archiveModes={...(data.settings.archiveModes||{}),[type]:mode};if(!save()){archiveView[type]=old;render();return}if(type==='tasks'&&mode==='archive'&&taskStatusFilter&&taskStatusFilter!=='已完成')taskStatusFilter='';if(type==='tasks'&&mode==='active'&&taskStatusFilter==='已完成')taskStatusFilter='';render()}return}
if(t.dataset.viewSwitch){const [type,mode]=t.dataset.viewSwitch.split(':');if(!BOARD_MODULES[type]||!['list','board'].includes(mode)){toast('无效视图，已保持原设置');return}data.settings.viewModes={...(data.settings.viewModes||{}),[type]:mode};if(!save()){render();return}render();return}
if(t.dataset.boardMove){moveBoardRecord(t.dataset.boardMove,t.dataset.id,t.dataset.group);return}
if(t.dataset.noteCat){noteCategory=t.dataset.noteCat;render();return}
if(t.dataset.simcat){simulationCategory=t.dataset.simcat;render();return}
if(t.dataset.experimentCat){experimentCategory=t.dataset.experimentCat;render();return}
if(t.dataset.boardAll){const key=t.dataset.boardAll;if(key==='notes')noteCategory='全部';else if(key==='simulations')simulationCategory='全部';else if(key==='experiments')experimentCategory='全部';else if(key==='advisor')advisorCategory='全部';else if(key==='papers')paperCategory='全部';else return;render();return}
if(t.dataset.boardNew){const type=t.dataset.boardNew,category=t.dataset.group; if(!BOARD_MODULES[type])return; if(type==='papers')paperCategory=category;openModal(type,null,{category},type==='papers'?(category==='投稿记录'?'submission':'writing'):undefined);return}
if(t.dataset.paperCat){paperCategory=t.dataset.paperCat;render();return}
if(t.dataset.advisorCat){advisorCategory=t.dataset.advisorCat;render();return}
if(t.dataset.sim){simulationDetail=t.dataset.sim;simulationTab='codes';render();return}
if(t.dataset.simtab){simulationTab=t.dataset.simtab;render();return}
if(t.dataset.exp){experimentDetail=t.dataset.exp;render();return}
if(t.dataset.homeFilter){homeTaskFilter=t.dataset.homeFilter;render();return}
if(t.dataset.taskTab){taskScope=t.dataset.taskTab;taskDayFilter='';render();return}
if(t.dataset.taskView){if(!['list','board','calendar'].includes(t.dataset.taskView)){toast('无效的待办视图');return}const oldView=taskView;taskView=t.dataset.taskView;taskDayFilter='';data.settings.viewModes={...(data.settings.viewModes||{}),tasks:taskView};if(!save())taskView=oldView;render();return}
if(t.dataset.litcat){litCategory=t.dataset.litcat;litSelectedId=null;render();return}
if(t.hasAttribute('data-litselect')){litSelectedId=t.dataset.litselect;render();return}
if(t.hasAttribute('data-littype')){litTypeFilter=t.dataset.littype;litSelectedId=null;render();return}
if(t.hasAttribute('data-littag')){litTagFilter=litTagFilter===t.dataset.littag?'':t.dataset.littag;litSelectedId=null;render();return}
if(t.dataset.proj){projectDetail=t.dataset.proj;projectTab='overview';search='';render();return}
if(t.dataset.projtab){projectTab=t.dataset.projtab;render();return}
if(t.dataset.pdf){return pdfAction(t.dataset.pdf,t.dataset.pdfId)}
if(t.dataset.nav)return navigate(t.dataset.nav);
if(t.dataset.date){selectedDate=t.dataset.date;dateCursor=new Date(selectedDate+'T12:00:00');if(page==='tasks'){taskDayFilter=selectedDate};return render()}
if(t.dataset.cal){if(t.dataset.cal==='today'){dateCursor=new Date();selectedDate=iso();if(page==='tasks')taskDayFilter=selectedDate}else {dateCursor=new Date(dateCursor.getFullYear(),dateCursor.getMonth()+(t.dataset.cal==='next'?1:-1),1);selectedDate=dayISO(dateCursor);if(page==='tasks')taskDayFilter=''}return render()}
if(t.dataset.edit){let [type,...rest]=t.dataset.edit.split(':'),rec=rest.join(':');recordPreview=null;return openModal(type,rec)}
if(t.dataset.del){let [type,...parts]=t.dataset.del.split(':'),rec=parts.join(':');if(type==='projects'&&['projectStages','projectMilestones'].some(k=>data[k]?.some(r=>r.projectId===rec))){toast('请先删除此项目的研究阶段和里程碑');return}if(type==='simulations'&&['simulationCodes','simulationChecks','simulationRuns','simulationPaths'].some(k=>data[k]?.some(x=>x.simulationId===rec))){toast('请先删除仿真案例下的代码、验证、记录及文件路径');return}if(type==='experiments'&&data.experimentDatasets.some(x=>x.experimentId===rec)){toast('请先删除实验下的数据记录');return}if(!data[type]||!config[type])return;const r=data[type].find(x=>x.id===rec);if(!r)return;if(!confirm(`将“${r.title||'未命名记录'}”移入回收站？可在 7 天内从设置中恢复。`))return;data.trash.unshift({id:id(),type,record:structuredClone(r),deletedAt:new Date().toISOString()});data[type]=data[type].filter(x=>x.id!==rec);log('移入回收站 · '+config[type].singular+'：'+(r?.title||''));if(type==='projects'&&projectDetail===rec)projectDetail=null;if(type==='simulations'&&simulationDetail===rec)simulationDetail=null;if(type==='experiments'&&experimentDetail===rec)experimentDetail=null;if(type==='literature'){if(litSelectedId===rec)litSelectedId=null;/* keep IndexedDB PDF until permanent deletion */};if(type==='advisor')data.tasks.filter(x=>x.advisorId===rec).forEach(x=>{x.advisorId='';x.updatedAt=new Date().toISOString()});if(!save()){render();return}recordPreview=null;render();toast('已移入回收站，可在设置中恢复');return}
const action=t.dataset.action;
if(action==='skip-main'){document.getElementById('sf-main-content')?.focus();return}
if(action==='record-preview-close'){recordPreview=null;render();return}
if(action==='record-preview-edit'){const type=t.dataset.type,id=t.dataset.id;recordPreview=null;return openModal(type,id)}
if(action==='trash-restore'){
 const i=(data.trash||[]).findIndex(x=>x.id===t.dataset.id);if(i<0)return;
 const item=data.trash[i];if(!Array.isArray(data[item.type]))return;
 if(data[item.type].some(x=>x.id===item.record.id)){toast('原始 ID 已存在，无法重复恢复');return}
 data[item.type].unshift(item.record);data.trash.splice(i,1);data.pdfDeletionQueue=(data.pdfDeletionQueue||[]).filter(id=>id!==item.record?.id);log('从回收站恢复：'+(item.record.title||''));
 if(!save()){data[item.type].shift();data.trash.splice(i,0,item);data.activities.shift();return}
 render();toast('科研记录已恢复');return;
}
if(action==='trash-purge'){
 const i=(data.trash||[]).findIndex(x=>x.id===t.dataset.id);if(i<0)return;
 const item=data.trash[i];if(!confirm(`永久删除“${item.record.title||'未命名记录'}”？此操作无法恢复。`))return;
 data.trash.splice(i,1);if(item.type==='literature'&&item.record?.id)data.pdfDeletionQueue=[...new Set([...(data.pdfDeletionQueue||[]),item.record.id])];if(!save()){data.trash.splice(i,0,item);if(item.type==='literature')data.pdfDeletionQueue=data.pdfDeletionQueue.filter(id=>id!==item.record?.id);return}
 void cleanupPendingPDFs();
 render();toast('已永久删除');return;
}
if(action==='manage-categories'){if(!t.dataset.type||!customizedCategories.some(([type])=>type===t.dataset.type)){toast('请进入相应模块后管理该模块分类');return}categoryManager=t.dataset.type;categoryEditingIndex=-2;render();return}
if(action==='close-category-manager'){categoryManager=null;categoryEditingIndex=-2;render();return}
if(action==='switch-category-type'){toast('请前往对应模块管理其分类');return}
if(action==='category-add'){categoryEditingIndex=-1;render();document.querySelector('#categoryItemName')?.focus();return}
if(action==='category-edit'){categoryEditingIndex=Number(t.dataset.index);render();document.querySelector('#categoryItemName')?.focus();return}
if(action==='category-cancel'){categoryEditingIndex=-2;render();return}
if(action==='category-move'){
 const type=categoryManager,entries=categoryEntries(type).slice(),from=Number(t.dataset.index),to=from+Number(t.dataset.direction);
 if(!entries[from]||to<0||to>=entries.length)return;
 [entries[from],entries[to]]=[entries[to],entries[from]];
 const key=categoryOptionsKey(type),prev=data.settings.categoryOptions[key];
 data.settings.categoryOptions[key]=entries;
 if(!save()){if(prev===undefined)delete data.settings.categoryOptions[key];else data.settings.categoryOptions[key]=prev;return}
 categoryEditingIndex=-2;render();toast('分类显示顺序已更新');return;
}
if(action==='category-delete'){
 const type=categoryManager,entries=categoryEntries(type).slice(),i=Number(t.dataset.index),target=entries[i];
 if(!target)return;
 if(entries.length<=1){toast('每组分类至少保留一项');return}
 const used=(data[type]||[]).filter(r=>(type==='tasks'?r.origin:r.category)===target).length;
 if(!confirm(`确定移除分类“${target}”？${used?'该分类下已有 '+used+' 条记录，会保留原类别名称和记录。':'这不会删除科研记录。'}`))return;
 entries.splice(i,1);if(type==='notes'&&noteCategory===target)noteCategory='全部';if(type==='simulations'&&simulationCategory===target)simulationCategory='全部';if(type==='experiments'&&experimentCategory===target)experimentCategory='全部';if(type==='advisor'&&advisorCategory===target)advisorCategory='全部';const before=data.settings.categoryOptions[categoryOptionsKey(type)];data.settings.categoryOptions[categoryOptionsKey(type)]=entries;
 log('移除科研分类：'+target);if(!save()){if(before===undefined)delete data.settings.categoryOptions[categoryOptionsKey(type)];else data.settings.categoryOptions[categoryOptionsKey(type)]=before;data.activities.shift();return}
 categoryEditingIndex=-2;render();toast('分类选项已删除，原有记录保持不变');return;
}
if(action?.startsWith('manage-outcome:')){outcomeManager=action.slice('manage-outcome:'.length);render();return}if(action==='close-outcome-manager'){outcomeManager=null;render();return}if(action?.startsWith('nav:'))return navigate(action.slice(4));if(action?.startsWith('add:'))return openModal(action.split(':')[1]);
if(action==='add-sim-child'){const types={codes:'simulationCodes',checks:'simulationChecks',runs:'simulationRuns',paths:'simulationPaths'};return openModal(types[simulationTab],null,{simulationId:simulationDetail})}
if(action==='exp-add-group'){const list=document.getElementById('expGroupList');if(!list)return;if(list.children.length>=100){toast('单个实验最多 100 组');return}list.insertAdjacentHTML('beforeend',expGroupMarkup({},list.children.length));expRefreshGroupNumbers();list.lastElementChild?.querySelector('[data-exp-field="name"]')?.focus();return}
if(action==='exp-toggle-group'){const node=t.closest('[data-exp-group]');if(!node)return;const collapsed=node.classList.toggle('is-collapsed');t.setAttribute('aria-expanded',String(!collapsed));t.textContent=collapsed?'展开':'收起';return}if(action==='exp-remove-group'){const node=t.closest('[data-exp-group]');if(node){node.remove();expRefreshGroupNumbers()}return}
if(action==='exp-add-trial'){const node=t.closest('[data-exp-group]'),list=node?.querySelector('.exp-trials');if(!list)return;if(list.children.length>=100){toast('每组最多 100 次');return}const n=list.children.length+1;list.insertAdjacentHTML('beforeend',expTrialMarkup({},n-1));expRefreshGroupNumbers();list.lastElementChild?.querySelector('[data-exp-trial-sample]')?.focus();return}
if(action==='exp-remove-trial'){const row=t.closest('.exp-trial');if(row){row.remove();expRefreshGroupNumbers()}return}
if(action==='add-experiment-data')return openModal('experimentDatasets',null,{experimentId:experimentDetail});
if(action==='advisor-to-task'){const record=data.advisor.find(x=>x.id===t.dataset.id);if(!record)return;const existing=data.tasks.find(x=>x.advisorId===record.id);if(existing){toast('该老师事务已经转入待办');return}const now=new Date().toISOString();data.tasks.unshift({id:id(),title:record.title,origin:teacherTaskOrigin(),advisorId:record.id,priority:record.priority||'中',status:record.status||'待开始',deadline:record.deadline||'',description:record.description||'',createdAt:now,updatedAt:now});log('老师事务转为待办：'+record.title);if(!save()){render();return}render();toast('已加入待办事项');return}
if(action==='open-local-path'){await revealLocalPath(t.dataset.path);return}
if(action==='show-module-all'){const type=t.dataset.type;if(ARCHIVE_MODULES[type]){archiveView[type]='all';data.settings.archiveModes={...data.settings.archiveModes,[type]:'all'};save()}search='';if(type==='simulations')simulationCategory='全部';if(type==='papers')paperCategory='全部';if(type==='experiments')experimentCategory='全部';if(type==='advisor')advisorCategory='全部';render();return}
if(action==='copy-path'){const path=t.dataset.path||'';if(navigator.clipboard?.writeText){navigator.clipboard.writeText(path).then(()=>toast('路径已复制')).catch(()=>toast('复制失败，请手动选择路径'))}else{window.prompt('复制此路径',path)}return}
if(action==='add-project-task')return openModal('tasks',null,{origin:'自己'});
if(action==='add-stage')return openModal('projectStages',null,{projectId:projectDetail,status:'待开始',weight:1});
if(action==='add-milestone')return openModal('projectMilestones',null,{projectId:projectDetail,status:'未完成'});
if(action==='toggle-eye'){data.settings.colorMode=data.settings.colorMode==='eye'?'standard':'eye';if(save()){render();toast(data.settings.colorMode==='eye'?'已启用护眼模式':'已切换到标准模式')}return}
if(action==='note-close'){notePreviewId=null;modal=null;render();return}if(action==='note-edit'){const nid=t.dataset.id;notePreviewId=null;return openModal('notes',nid)}if(action==='history-close'){historyEditing=null;historyNodeEditing=null;modal=null;render();return}
if(action==='sim-list'){simulationDetail=null;render();return}
if(action==='exp-export-comparison'){const row=data.experiments.find(x=>x.id===experimentDetail);if(!row)return;downloadFile('ScholarFlow-experiment-results-'+iso()+'.csv',expComparisonCsv(row),'text/csv;charset=utf-8');return}
if(action==='exp-list'){experimentDetail=null;render();return}
if(action==='project-list'){projectDetail=null;render();return}
if(action==='literature-import'){document.getElementById('literatureImport')?.click();return}
if(action==='literature-export'){downloadFile('ScholarFlow-literature-'+iso()+'.csv',literatureCsv(),'text/csv;charset=utf-8');return}
if(action==='lit-manage'){categoryManager='literature';categoryEditingIndex=-2;render();return}
if(action==='clear-filters'){taskScope='全部';taskStatusFilter='';taskPriorityFilter='';taskDayFilter='';search='';render();return}
if(action==='clear-literature'){litCategory='全部';litStatusFilter='';litPriorityFilter='';litTypeFilter='';litTagFilter='';litSelectedId=null;search='';render();return}

if(action==='journal-lookup'){return recognizeJournal(t.dataset.id)}
if(action==='journal-lookup-form'){
 const form=document.getElementById('recordForm');if(!form||modal?.type!=='literature')return;
 const title=form.querySelector('[name="title"]')?.value?.trim();
 if(!title||title.length<12){toast('请先填写完整的论文标题');return}
 if(!confirm('将论文标题发送至 Crossref 查询期刊名（不会上传 PDF），继续吗？'))return;
 toast('正在查询期刊名…');
 try{
  const match=await findCrossrefJournal(title);
  if(!match){toast('未找到足够可靠的匹配，可手动填写期刊名');return}
  if(!confirm(`匹配度 ${Math.round(match.score*100)}%\n论文：${match.matchedTitle}\n期刊：${match.journal}\n是否填入表单？`))return;
  // Do not write to storage before user presses Save; manual journal edits remain possible.
  const journalInput=form.querySelector('[name="journal"]'),yearInput=form.querySelector('[name="year"]');
  if(journalInput)journalInput.value=match.journal;
  if(yearInput&&!yearInput.value&&match.year)yearInput.value=String(match.year);
  toast('已填入期刊名，核对无误后点击保存');
 }catch(err){toast('查询失败：'+(err.name==='AbortError'?'网络超时':err.message))}
 return;
}
if(action==='prepare-local-translator'){void prepareLocalTranslator();return}
if(action==='check-translation'){
 const msg=document.getElementById('translationDiagnostic');if(msg)msg.textContent='正在检查本机服务…';
 try{const status=await translationStatusCheck();if(msg)msg.textContent=status.ready?'本地离线翻译可用 · '+(status.engine||'Argos'):'服务已启动，但缺少英语→中文语言包；运行 setup-local-translation.bat';toast(status.ready?'本机翻译服务已就绪':'请安装本地英中语言包')}
 catch(err){if(msg)msg.textContent='未检测到本地翻译服务，请使用 start-web.bat 启动';toast('未检测到本地翻译服务')};return
}
if(action==='retry-abstracts'){
 const rows=data.literature.filter(x=>!x.abstractZh?.trim()&&hasEnglishAbstract(x.abstract));if(!rows.length){toast('没有待翻译的英文摘要');return}
 toast('正在重试 '+rows.length+' 篇摘要…');let done=0;for(const item of rows){if(await autoFillAbstract(item))done++}
 toast('成功生成 '+done+' / '+rows.length+' 篇中文摘要');render();return;
}
if(action==='pdf-import-direct'){
 let f=document.getElementById('pdfDirectInput');
 if(!f){f=document.createElement('input');f.id='pdfDirectInput';f.type='file';f.accept='application/pdf';f.hidden=true;document.body.appendChild(f);f.addEventListener('change',async()=>{
  const file=f.files?.[0];f.value='';if(!file)return;
  try{await validatePDFFile(file)}catch(err){toast(err.message);return;}
  toast('正在尝试识别 PDF 文献信息…');
  let meta;try{meta=await completePdfMetadata(await extractPdfBibliography(file));}catch(err){pdfBusy(null);toast('PDF识别受限，仍可按文件名建立文献：'+err.message);meta={source:'文件名'};}
  const now=new Date().toISOString();
  const rec={id:id(),title:meta.title||file.name.replace(/\.pdf$/i,''),doi:meta.doi||'',authors:meta.authors||'',correspondingAuthor:meta.correspondingAuthor||'',journal:meta.journal||'',year:meta.year||'',abstract:meta.abstract||'',abstractZh:meta.abstract&&!hasEnglishAbstract(meta.abstract)&&/[\u3400-\u9fff]/.test(meta.abstract)?meta.abstract:'',abstractLanguage:meta.abstractLanguage||'',category:'其他',readStatus:'未读',articleType:meta.articleType||'未分类',createdAt:now,updatedAt:now,metadataSource:meta.source||'文件名',metadataVerified:false};
  data.literature.unshift(rec);
  if(!save()){data.literature.shift();return;}
  const stored=await uploadPDF(rec.id,file,true);
  if(!stored){
   const before=data.literature;data.literature=data.literature.filter(r=>r.id!==rec.id);
   if(!save())data.literature=before;
   toast('PDF 导入未完成：附件保存失败，已尝试回滚新建的文献索引');return;
  }
  litSelectedId=rec.id;
  openModal('literature',rec.id);
  void autoFillAbstract(rec);
  toast(!meta.title||meta.source.includes('文件名')?'未能可靠识别论文标题：请手动核对；PDF生成软件名称已排除':!meta.journal||!meta.year?'已导入文献，期刊/年份待补全；英文建议 SCI（不是收录证明），请核对':'已预填标题、类型、期刊和年份；请核对识别结果');
 });}f.click();return;}
if(action==='pdf-upload'){pdfFor=t.dataset.id;$('#pdfUpload')?.click();return}
if(action==='pdf-open'){return viewPDF(t.dataset.id)};
if(action==='pdf-reanalyze'){return reanalyzePDF(t.dataset.id)};
if(action==='pdf-remove'){return removePDF(t.dataset.id)};
if(action==='wallpaper-upload')return $('#wallpaperFile')?.click();
 if(action==='wallpaper-clear'){const previous=data.settings.wallpaperImage;data.settings.wallpaperImage='';data.settings.wallpaper='none';if(!save()){data.settings.wallpaperImage=previous;return}render();toast('自定义壁纸已清除');return}
 if(action==='avatar-upload')return $('#avatarFile')?.click();
if(action==='avatar-remove'){
 avatarDraft='';renderAvatarPreview();const node=$('#settingsAvatar');if(node)node.textContent=($('#profile_name')?.value||'研').trim().slice(0,1);
 toast('头像已从预览移除，请点击“保存个人资料”后生效');return;
}
if(action==='add-published-paper')return openModal('papers',null,{status:'已发表',category:'投稿记录'},'published');
if(action==='edit-published-paper')return openModal('papers',t.dataset.id,{},'published');
if(action==='add-submission-paper')return openModal('papers',null,{status:'已投稿',category:'投稿记录'},'submission');
if(action==='add')return openModal(page);if(action==='projects')return navigate('projects');if(action==='close'||t.dataset.dismiss){writeRecordDraft();modal=null;render();return}if(action==='menu'){menu=!menu;render();return}
if(action==='timer'){if(timerStart){timerElapsed+=Math.floor((Date.now()-timerStart)/1000);timerStart=null;clearInterval(timerInterval)}else{timerStart=Date.now();timerInterval=setInterval(()=>{const clock=$('#clock');if(clock)clock.textContent=fmtTime(timerElapsed+Math.floor((Date.now()-timerStart)/1000))},1000)}render();return}
if(action==='sf-data-health'){
 const report=document.getElementById('sf-data-health-result');if(!report)return;
 try{
  const raw=localStorage.getItem(DBKEY);
  if(raw===null){report.textContent='当前工作台尚未保存任何数据';return}
  const obj=JSON.parse(raw);validateImportedData(obj);
  const total=Object.keys(blank()).filter(k=>Array.isArray(blank()[k])).reduce((n,k)=>n+(Array.isArray(obj[k])?obj[k].length:0),0);
  const ownBytes=new Blob([raw]).size;
  let quotaText='';
  try{const estimate=await navigator.storage?.estimate?.();if(estimate?.quota)quotaText='；当前来源总占用约 '+(Number(estimate.usage||0)/1048576).toFixed(1)+' / '+(estimate.quota/1048576).toFixed(1)+' MiB（含其他本地存储）'}catch{}
  report.textContent='结构校验通过 · '+total+' 条索引/记录 · 主 JSON '+(ownBytes/1048576).toFixed(2)+' MiB'+quotaText+'；建议定期导出 JSON 与 PDF 原件。';
 }catch(error){report.textContent='检测到异常：'+String(error.message||error).slice(0,120)+'。请先备份，不要覆盖现有数据。'}
 return;
}
if(action==='sf-raw-backup'){
 if(initialStoredRaw===null){toast('无法读取浏览器中的原始内容，请勿清理浏览器数据');return}
 downloadFile('ScholarFlow-raw-recovery-'+iso()+'.txt',initialStoredRaw,'text/plain;charset=utf-8');return;
}
if(action==='sf-recovery-import'){navigate('settings');document.getElementById('importFile')?.click();return}
if(action==='sf-recovery-reset'){
 if(!confirm('已检测到原始科研数据损坏。请先下载原始数据。本操作将覆盖原始内容，确定要继续吗？'))return;
 if(!confirm('第二次确认：将不可逆地丢弃当前损坏内容。是否清空并开始新工作台？'))return;
 const old=data;data=blank();if(!save({permitCorruptOverwrite:true})){data=old;return}
 navigate('home');toast('已建立空工作台；请妥善保留此前下载的原始数据');return;
}
if(action==='export'&&storageFault){toast('本地原始数据损坏，禁止导出空白备份。请点击页面顶部“下载原始数据”。');return}
if(action==='export'){
 // A file backup must describe the last successfully persisted state, rather
 // than any in-memory edits whose localStorage transaction may have failed.
 try{
  const raw=localStorage.getItem(DBKEY);
  if(raw!==lastStoredRaw||externalChangePending)throw Error('其他标签页可能已修改科研记录。请先重新载入并核对数据，再导出备份');
  const snapshot=raw===null?data:JSON.parse(raw);
  validateImportedData(snapshot);
  downloadFile('ScholarFlow-backup-'+iso()+'.json',JSON.stringify(snapshot,null,2),'application/json;charset=utf-8');
 }catch(error){toast('备份未开始：'+String(error.message||error).slice(0,110))}
 return;
}
if(action==='import')return $('#importFile')?.click();
if(action==='reset'&&confirm('将清空此浏览器中的科研记录 JSON（不会删除另存的 PDF 附件）。确定吗？')&&confirm('请再次确认：已导出 JSON 并单独备份 PDF 原件，是否继续？')){const original=data;data=blank();if(!save({permitCorruptOverwrite:!!storageFault})){data=original;return}navigate('home');toast('本地数据已清空')}
}

function parseJournalMetricCSV(csv){
 const rows=String(csv||'').replace(/^\ufeff/,'').split(/\r?\n/).filter(x=>x.trim());if(!rows.length)return [];
 const head=rows.shift().split(',').map(x=>x.trim());const wanted=['journal','issn','year','quartile','impactFactor','source'];
 if(!head.includes('journal')&&!head.includes('issn'))throw Error('至少需要 journal 或 issn 列');
 const entries=[];for(const line of rows){const parts=line.split(',').map(x=>x.trim());const obj={};head.forEach((h,i)=>{if(wanted.includes(h))obj[h]=parts[i]||''});
 if(!obj.journal&&!obj.issn)continue;if(obj.year&&!/^20\d{2}$/.test(obj.year))throw Error('无效年度');
 if(obj.impactFactor&&(!Number.isFinite(Number(obj.impactFactor))||Number(obj.impactFactor)<0))throw Error('无效影响因子');
 entries.push(obj)
 }return entries
}
// v1.27 journal data: public lookup is identification only; licensed metrics come from a user-supplied annual table.
const journalMetricKey=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,'');
async function journalMetricLookup(row){
 if(!row.journal&&!row.issn){toast('先填写期刊名称或 ISSN');return}
 if(!confirm('将期刊名称或 ISSN 发送给 OpenAlex 核对期刊身份？不会上传 PDF。'))return;
 try {const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  let url='https://api.openalex.org/sources?per-page=5&search='+encodeURIComponent(row.issn||row.journal);
  const response=await fetch(url,{signal:controller.signal});clearTimeout(timer);if(!response.ok)throw Error('HTTP '+response.status);
  const payload=await response.json();const matches=payload.results||[];
  const candidate=matches.find(x=>(row.issn&&(x.issn_l===row.issn||x.issn?.includes(row.issn)))||journalMetricKey(x.display_name)===journalMetricKey(row.journal));
  if(!candidate){toast('未找到足够可靠的期刊匹配，请核对 ISSN');return}
  const identifiers=(candidate.issn||[]).join(', ');
  if(!confirm(`核对期刊：${candidate.display_name}\nISSN：${identifiers}\n\n确认更新期刊名和 ISSN？中科院分区及 JIF 不会从此接口推测。`))return;
  row.journal=candidate.display_name;row.issn=candidate.issn_l||candidate.issn?.[0]||row.issn||'';
  const metrics=(data.settings.journalMetricRows||[]).find(x=>(row.issn&&x.issn===row.issn)||journalMetricKey(x.journal)===journalMetricKey(row.journal));
  if(metrics&&confirm(`找到你导入的 ${metrics.year} 年指标：${metrics.quartile||'无分区'} / JIF ${metrics.impactFactor||'缺失'}。填入吗？`))Object.assign(row,{quartile:metrics.quartile||'未填写',impactFactor:metrics.impactFactor||'',metricYear:metrics.year,metricSource:metrics.source||'用户导入的年度指标表'});
  row.updatedAt=new Date().toISOString();if(!save()){render();return}render();toast('期刊身份已核对；正式年度指标请导入授权数据');
 }catch(err){toast('期刊查询失败：'+err.message)}
}
// Translation does not run through an unapproved external service. Built-in Chrome
// models run locally; a remote endpoint needs explicit per-installation consent.
const hasEnglishAbstract=value=>{
 const t=String(value||'').trim();
 if(t.length<45)return false;
 const en=(t.match(/[A-Za-z]/g)||[]).length;
 const han=(t.match(/[\u3400-\u9fff]/g)||[]).length;
 return en>=35&&en>han*2;
};
let localTranslator=null;
const translationInProgress=new Set();
function statusTranslation(record,message){
 record.abstractTranslationStatus=message;
 const current=modal?.type==='literature'&&modal?.record?.id===record.id;
 if(current){const label=document.getElementById('abstractAutoStatus');if(label)label.textContent=message;}
}
async function requestLocalTranslation(text){
 // Same-origin private Python server: text never leaves this computer.
 const address=location.protocol==='http:'||location.protocol==='https:'?'/api/translate':'http://127.0.0.1:8765/api/translate';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),40000);
 try{const r=await fetch(address,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:text,source:'en',target:'zh'}),signal:controller.signal});
  if(!r.ok){let message='本机翻译服务 HTTP '+r.status;try{message=(await r.json()).error||message}catch{}throw Error(message)}
  const result=await r.json();if(!result.translatedText||!/[^\x00-\x7f]/.test(result.translatedText))throw Error('本地服务没有返回有效中文译文');return result.translatedText;
 }finally{clearTimeout(timeout)}
}
async function translationStatusCheck(){
 const address=location.protocol==='http:'||location.protocol==='https:'?'/api/translation-health':'http://127.0.0.1:8765/api/translation-health';
 const response=await fetch(address,{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('HTTP '+response.status);return response.json();
}
async function localTranslation(text,prepare=false){
 if(!prepare){try{return await requestLocalTranslation(text)}catch(error){console.warn('Local Argos unavailable:',error.message)}}
 const TranslatorAPI=globalThis.Translator;
 if(!TranslatorAPI?.create||!TranslatorAPI?.availability)throw Error('本浏览器不支持设备端译文；建议使用 Chrome 桌面版，或在设置中启用私有翻译服务');
 const options={sourceLanguage:'en',targetLanguage:'zh'};
 if(!localTranslator){
  if(!prepare){const status=await TranslatorAPI.availability(options);if(status!=='available')throw Error(status==='unavailable'?'本机语言包未安装且浏览器不支持翻译；请运行 setup-local-translation.bat':'本机语言包未安装，Chrome 语言模型未准备；请运行 setup-local-translation.bat');}
  localTranslator=await TranslatorAPI.create(options);
 }
 // Translate paragraphs separately so page-length abstracts don't overwhelm the model.
 const blocks=String(text).split(/\n\s*\n/).filter(Boolean);
 const output=[];
 for(const block of blocks){for(let i=0;i<block.length;i+=2400)output.push(await localTranslator.translate(block.slice(i,i+2400)));}
 return output.join('\n\n');
}
async function remoteTranslation(text){
 const cfg=data.settings;
 if(cfg.translationEngine!=='remote'||!cfg.translationRemoteConsent||!cfg.translationEndpoint)throw Error('未授权发送英文原文，已阻止联网翻译');
 const url=new URL(cfg.translationEndpoint);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('远程翻译仅允许 HTTPS 或本机 HTTP');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try {
  const r=await fetch(url.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:text,source:'en',target:'zh',format:'text'}),signal:controller.signal});
  if(!r.ok)throw Error('翻译服务 HTTP '+r.status);
  const result=await r.json();
  if(typeof result.translatedText!=='string'||!result.translatedText.trim())throw Error('翻译服务未返回有效中文');
  // Some misconfigured endpoints echo English or return a generic status string.
  // Never mark such a response as a successful Chinese translation.
  if(!/[\u3400-\u9fff]/u.test(result.translatedText))throw Error('翻译服务返回内容不包含中文，请检查语言方向与接口配置');
  return result.translatedText.trim();
 }finally{clearTimeout(timer)}
}
async function autoFillAbstract(record){
 if(!record||!data.settings.autoTranslateAbstract||record.abstractZh?.trim()||!hasEnglishAbstract(record.abstract))return false;
 if(translationInProgress.has(record.id))return false;
 translationInProgress.add(record.id);
 const original=record.abstract;
 statusTranslation(record,'英文摘要已提取，正在翻译为中文…');
 try {
  const translated=(data.settings.translationEngine==='remote'?await remoteTranslation(original):await localTranslation(original)).trim();
  // Ignore stale async results after the user edits, deletes or imports a new record.
  const current=data.literature.find(x=>x.id===record.id);
  if(!current||current.abstract!==original||current.abstractZh?.trim())return false;
  if(!/[\u3400-\u9fff]/.test(translated))throw Error('译文缺少中文字符，请检查翻译服务');
  current.abstractZh=translated;
  current.abstractTranslationStatus='已自动翻译（机译内容请人工校对）';
  current.updatedAt=new Date().toISOString();
  if(!save()){if(page==='literature'&&!modal)render();return false}
  const field=modal?.type==='literature'&&modal?.record?.id===record.id&&document.getElementById('field_abstractZh');
  if(field){if(!field.value.trim()){field.value=translated;}statusTranslation(current,current.abstractTranslationStatus);}
  else if(page==='literature'&&!modal)render();
  return true;
 }catch(error){
  statusTranslation(record,'译文未完成：'+String(error.message||'服务不可用').slice(0,110));save();
  return false;
 }finally{translationInProgress.delete(record.id)}
}
async function prepareLocalTranslator(){
 const cfg={sourceLanguage:'en',targetLanguage:'zh'};
 if(!globalThis.Translator?.create){toast('当前浏览器不支持本地英中翻译；可使用 Chrome 桌面版或私有翻译服务');return}
 toast('正在准备本机翻译模型（首次可能需要下载），请稍候…');
 try{
  // Call create directly during the button gesture so Chrome can download a model.
  localTranslator=await globalThis.Translator.create(cfg);
  data.settings.translationEngine='device';data.settings.autoTranslateAbstract=true;
  if(!save()){render();return}toast('本地翻译已就绪，正在处理尚未翻译的文献摘要…');
  for(const item of data.literature.filter(x=>!x.abstractZh&&hasEnglishAbstract(x.abstract)).slice(0,25))await autoFillAbstract(item);
  if(page==='settings')render();
 }catch(err){toast('无法准备翻译模型：'+String(err.message||err).slice(0,90))}
}
function applyAuthorizedMetrics(obj){
 const all=data.settings.journalMetricRows||[];
 if(!Array.isArray(all)||!all.length||!obj.journal&&!obj.issn)return;
 const key=v=>String(v||'').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,'');
 const relevant=all.filter(m=>obj.issn&&m.issn===obj.issn||key(m.journal)&&key(m.journal)===key(obj.journal));
 if(!relevant.length)return;
 const match=relevant.filter(m=>String(m.year)===String(obj.year)).sort((a,b)=>Number(b.year)-Number(a.year))[0]
  ||relevant.sort((a,b)=>Number(b.year)-Number(a.year))[0];
 if(obj.quartile&&obj.quartile!=='未填写'||String(obj.impactFactor||'').trim())return;
 obj.quartile=match.quartile||'未填写';obj.impactFactor=match.impactFactor||'';
 obj.metricYear=match.year||'';obj.metricSource=match.source||'用户授权指标表';
}

function onChange(e){if(e.target.name==='stylePreset'){const themeInput=document.getElementById('setting_theme');if(themeInput)themeInput.value='auto';const feedback=document.getElementById('stylePresetFeedback');const labels={ocean:'科研蓝白',sage:'护眼鼠尾草',paper:'暖纸手稿',graphite:'石墨灰',glacier:'冰川青蓝',lavender:'实验室紫'};if(feedback&&labels[e.target.value])feedback.textContent='已选「'+labels[e.target.value]+'」。点击“保存工作台偏好”后应用到所有模块；当前未保存的选择不会改动已有主题。';return}if(e.target.id==='field_articleType'&&modal?.type==='literature'){e.target.dataset.manuallyChosen='1';return}if(e.target.dataset.check){const t=data.tasks.find(x=>x.id===e.target.dataset.check);if(!t)return;t.status=e.target.checked?'已完成':'待开始';t.completedAt=e.target.checked?new Date().toISOString():'';t.updatedAt=new Date().toISOString();syncLinkedAdvisor('tasks',t);log((e.target.checked?'完成':'重新开启')+'任务：'+t.title);if(!save()){render();return}const justCompleted=e.target.checked;render();if(justCompleted)joyToast('完成一项科研任务，认真积累的你值得一颗小星星。');return}if(e.target.id==='recordFilter'){filter=e.target.value;render();return}
if(['taskStatusFilter','taskPriorityFilter','taskSort','litStatusFilter','litPriorityFilter','litSort'].includes(e.target.id)){
 const val=e.target.value;
 if(e.target.id==='taskStatusFilter'){const oldArchive=archiveView.tasks;taskStatusFilter=val;if(val==='已完成')archiveView.tasks='archive';else if(val==='未完成'||val==='待开始'||val==='进行中'||val==='已逾期')archiveView.tasks='active';if(oldArchive!==archiveView.tasks){data.settings.archiveModes={...(data.settings.archiveModes||{}),tasks:archiveView.tasks};if(!save())archiveView.tasks=oldArchive;}}
 if(e.target.id==='taskPriorityFilter')taskPriorityFilter=val;
 if(e.target.id==='taskSort')taskSort=val;
 if(e.target.id==='litStatusFilter'){litStatusFilter=val;litSelectedId=null;}
 if(e.target.id==='litPriorityFilter'){litPriorityFilter=val;litSelectedId=null;}
 if(e.target.id==='litSort'){litSort=val;litSelectedId=null;}
 render();return;
}
if(e.target.dataset.quickStatus){if(!TASK_BOARD_STATUSES.has(e.target.value)){toast('无效任务状态，未保存');render();return}const t=data.tasks.find(x=>x.id===e.target.dataset.quickStatus);if(t){const wasCompleted=t.status==='已完成';t.status=e.target.value;t.updatedAt=new Date().toISOString();t.completedAt=t.status==='已完成'?t.updatedAt:'';syncLinkedAdvisor('tasks',t);log('更新任务状态：'+t.title);if(!save()){render();return}const justCompleted=t.status==='已完成'&&!wasCompleted;render();if(justCompleted)joyToast('今天又推进了一小步，做得好！')};return}
if(e.target.id==='wallpaperFile'&&e.target.files?.[0]){return compressWallpaper(e.target.files[0]).then(img=>{const old={wallpaper:data.settings.wallpaper,wallpaperImage:data.settings.wallpaperImage};data.settings.wallpaperImage=img;data.settings.wallpaper='custom';if(!save()){Object.assign(data.settings,old);return}render();toast('壁纸已压缩并保存到本机，可继续调整主题');}).catch(err=>toast('壁纸上传失败：'+err.message));}
if(e.target.id==='avatarFile'&&e.target.files?.[0]){
 const file=e.target.files[0];return shrinkAvatar(file).then(uri=>{
  if(page!=='settings')return;
  avatarDraft=uri;renderAvatarPreview();const node=$('#settingsAvatar');if(node)node.innerHTML=avatarFace(uri);
  toast('头像已预览，请点击“保存个人资料”后生效');
 }).catch(err=>toast('头像处理失败：'+err.message));
}
if(e.target.id==='literatureImport'&&e.target.files?.[0]){return importLiterature(e.target.files[0])}
 if(e.target.id==='networkMetadata'){data.settings.networkMetadata=e.target.checked;if(!save()){render();return}toast(e.target.checked?'已开启在线元数据补全；仅上传标题或 DOI':'已关闭联网元数据补全');return}
 if(e.target.id==='pdfUpload'&&e.target.files?.[0]){const f=e.target.files[0],pid=pdfFor;pdfFor=null;return uploadPDF(pid,f)}
if(e.target.id==='importFile'&&e.target.files?.[0]){if(e.target.files[0].size>18*1024*1024){toast('JSON 备份超过 18MB，本地浏览器无法安全一次性导入');return}const reader=new FileReader();reader.onload=()=>{try{const v=JSON.parse(reader.result);if(!v||!Array.isArray(v.tasks)||!Array.isArray(v.projects)||!Array.isArray(v.literature))throw Error('数据格式不匹配');validateImportedData(v);if(!confirm('导入将替换当前全部科研数据，确定继续？'))return;const original=data;data=normalizeData(v);if(!save({permitCorruptOverwrite:!!storageFault})){data=original;return}navigate('home');toast('数据已恢复，个人资料与偏好设置已同步导入')}catch(err){alert('导入失败：'+err.message)}};reader.readAsText(e.target.files[0])}}
function onSubmit(e){if(e.target.id==='categoryItemForm'){
 e.preventDefault();const type=categoryManager,entries=categoryEntries(type).slice();
 const name=String(new FormData(e.target).get('name')||'').trim();
 if(!name){toast('分类名称不能为空');return}if(name.length>80){toast('分类名称不能超过80字符');return}
 if(categoryEditingIndex>=0 && !entries[categoryEditingIndex]){toast('待修改分类不存在');return}
 if(entries.some((v,i)=>v===name&&i!==categoryEditingIndex)){toast('同名分类已存在');return}
 if(categoryEditingIndex<0&&entries.length>=40){toast('每组分类最多40个');return}
 const old=categoryEditingIndex>=0?entries[categoryEditingIndex]:null;
 if(categoryEditingIndex>=0)entries[categoryEditingIndex]=name;else entries.push(name);
 const oldOptions=data.settings.categoryOptions[categoryOptionsKey(type)];const changes=[];
 data.settings.categoryOptions[categoryOptionsKey(type)]=entries;
 if(old&&old!==name){if(type==='tasks'&&old===teacherTaskOrigin())data.settings.taskTeacherOrigin=name;for(const row of data[type]||[]){if((type==='tasks'?row.origin:row.category)===old){changes.push(row);if(type==='tasks')row.origin=name;else row.category=name}}if(type==='tasks'&&taskScope===old)taskScope=name;if(type==='experiments'&&filter===old)filter=name;if(type==='literature'&&litCategory===old)litCategory=name;if(type==='simulations'&&simulationCategory===old)simulationCategory=name;if(type==='experiments'&&experimentCategory===old)experimentCategory=name;if(type==='notes'&&noteCategory===old)noteCategory=name;if(type==='papers'&&paperCategory===old)paperCategory=name;if(type==='advisor'&&advisorCategory===old)advisorCategory=name}
 log((old?'重命名':'新增')+'科研分类：'+name);if(!save()){if(oldOptions===undefined)delete data.settings.categoryOptions[categoryOptionsKey(type)];else data.settings.categoryOptions[categoryOptionsKey(type)]=oldOptions;changes.forEach(row=>{if(type==='tasks')row.origin=old;else row.category=old});data.activities.shift();return}
 categoryEditingIndex=-2;render();toast(old?'分类及对应记录已更新':'已添加分类');return;
}
if(e.target.id==='writingNodeForm'){e.preventDefault();const p=data.papers.find(x=>x.id===historyEditing);if(!p)return;const f=new FormData(e.target);const stage=String(f.get('stage')||'');if(!WRITING_STAGES.includes(stage)){toast('撰写阶段无效');return}const event={id:historyNodeEditing||id(),date:String(f.get('date')||iso()),stage,progressStatus:String(f.get('progressStatus'))==='已完成'?'已完成':'进行中',fileName:String(f.get('fileName')||'').slice(0,200),note:String(f.get('note')||'')};const prior=p.writingHistory||[];const next=prior.slice();const index=next.findIndex(x=>x.id===historyNodeEditing);if(index>=0)next[index]=event;else next.push(event);p.writingHistory=next;p.updatedAt=new Date().toISOString();if(!save()){p.writingHistory=prior;return}historyEditing=null;historyNodeEditing=null;historyMode='review';modal=null;recordPreview={type:'papers',id:p.id};render();toast('撰写节点已保存，进度已更新');return}
if(e.target.id==='historyForm'){e.preventDefault();const p=data.papers.find(x=>x.id===historyEditing);if(!p)return;const f=new FormData(e.target),submission=p.category==='投稿记录',k=submission?'submissionHistory':'advisorReviews';p[k]=p[k]||[];const event={id:historyNodeEditing||id(),date:String(f.get('date')||iso()),status:submission?String(f.get('status')):'',round:submission?'':String(f.get('round')||''),journal:submission?String(f.get('journal')||''):'',fileName:submission?'':String(f.get('fileName')||'').trim(),filePath:submission?'':String(f.get('filePath')||'').trim(),note:String(f.get('note')||'')};const index=p[k].findIndex(x=>x.id===historyNodeEditing);if(index>=0)p[k][index]=event;else p[k].push(event);
 if(submission){const latest=p[k].slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];syncSubmissionFromHistory(p);if(!p.submissionDate)p.submissionDate=event.date;}
 p.updatedAt=new Date().toISOString();if(!save())return;historyNodeEditing=null;historyEditing=null;modal=null;recordPreview={type:'papers',id:p.id};render();toast('时间节点已保存');return;}
if(e.target.id==='recordForm'){
 e.preventDefault();
 const {type,record,mode}=modal,c=config[type],form=new FormData(e.target);
 const fields=type==='papers'&&mode==='published'?publishedPaperFields:type==='papers'&&mode==='submission'?submissionPaperFields:type==='papers'&&mode==='writing'?writingPaperFields:c.fields;
 const obj=record?{...record}:{id:id(),createdAt:new Date().toISOString()};
 for(const [key,,kind] of fields){if((type==='literature'||type==='experiments')&&!form.has(key))continue;const v=String(form.get(key)||'').trim();if(kind==='number'&&v&&!Number.isFinite(Number(v))){toast('数值字段包含无效或超出范围的数据：'+key);return}if(kind==='number'&&key==='groups'&&v&&!Number.isSafeInteger(Number(v))){toast('实验组数必须是非负整数');return}if(kind==='number'&&key==='groups'&&v&&(Number(v)<0||Number(v)>1000000)){toast('实验组数应在 0–1000000 范围内');return}obj[key]=kind==='number'?Number(v||0):v}
 if(type==='experiments'){if(expEditOverLimit(record)){toast('此实验有超过 100 组或单组超过 100 次，编辑器未加载全部内容；为防止截断，本次保存已阻止，请先导出 JSON 备份。');return}const groups=expCollectGroups();if(groups.length>100||groups.some(g=>g.attempts.length>100)){toast('最多 100 组，每组最多 100 次');return;}if(record&&!Array.isArray(record.experimentGroupRecords)&&!groups.length){/* Old records remain legacy until a group is explicitly created. */}else{if(record&&!Array.isArray(record.experimentGroupRecords)&&record.groups!==undefined)obj.legacyGroupCount=record.groups;obj.experimentGroupRecords=groups;obj.groups=groups.length;}}
 if(!obj.title?.trim()){alert('请填写名称');return}
 if(type==='papers'&&mode==='published'){
  obj.category='投稿记录';obj.status='已发表';
  if(!String(form.get('impactFactor')||'').trim())obj.impactFactor='';
 }
 if(type==='papers'&&mode==='writing'){
  if(obj.category==='投稿记录'){alert('写作记录不能选择投稿记录，请到“投稿记录”登记');return}
 }
 if(type==='papers'&&mode==='submission'){
  obj.category='投稿记录';
  if(!submissionPaperFields[2][4].includes(obj.status)){alert('论文状态无效');return}
  const asState=obj.status==='已发表'?'Accept':obj.status;
  const previousNodeStatus=record?latestSubmissionEvent(record)?.status||({'已投稿':'With Editor','审稿中':'Under Review','返修中':'Revise','已接收':'Accept','已拒稿':'Reject','准备中':'Submitted'}[record.status]||record.status):'';
  if(!record&&obj.submissionDate&&asState){
    obj.submissionHistory=[{id:id(),date:obj.submissionDate,status:asState,journal:obj.journal,note:'首次录入时自动建立的投稿状态节点，可编辑或删除。'}];
  }else if(record&&previousNodeStatus!==asState&&asState){
    obj.submissionHistory=[...(record.submissionHistory||[]),{id:id(),date:[iso(),latestSubmissionEvent(record)?.date||''].sort().at(-1),status:asState,journal:obj.journal,note:'在投稿记录中更改状态时自动记录，可在时间线中补充编辑部通知。'}];
  }
  obj.status=asState==='Accept'&&obj.status==='已发表'?'已发表':submissionStatusToPaper(asState);
  if(obj.submissionHistory?.length)syncSubmissionFromHistory(obj);
 }
 if(['projects','papers'].includes(type))obj.progress=Math.min(100,Math.max(0,+obj.progress||0));
 obj.updatedAt=new Date().toISOString();
 if(type==='literature'){applyAuthorizedMetrics(obj);if((!obj.articleType||obj.articleType==='未分类')&&window.ScholarPDF)obj.articleType=window.ScholarPDF.inferArticleType(obj.title);if(obj.impactFactor===0&&!String(form.get('impactFactor')||'').trim())obj.impactFactor='';if(obj.metricYear===0&&!String(form.get('metricYear')||'').trim())obj.metricYear='';litSelectedId=obj.id;}
 if(type==='projectStages'&&(obj.weight===undefined||obj.weight===''))obj.weight=1;
 if(type==='tasks'&&obj.status==='已完成'&&!obj.completedAt)obj.completedAt=new Date().toISOString();
 if(type==='tasks'&&obj.status!=='已完成')obj.completedAt='';
 if(record){const index=data[type].findIndex(x=>x.id===record.id);data[type][index]=obj}else data[type].unshift(obj);
 syncLinkedAdvisor(type,obj);log((record?'更新':'新增')+c.singular+'：'+obj.title);
 if(!save())return;
 clearRecordDraft();modal=null;render();toast(type==='papers'&&obj.status==='已发表'?'论文已保存到成果统计':'记录已保存');return;
}
if(e.target.id==='profileForm'){
 e.preventDefault();const fd=new FormData(e.target),next={...data.profile};
 for(const key of Object.keys(defaultProfile()))if(key!=='avatar')next[key]=String(fd.get(key)||'').trim();
 if(!next.name){toast('请填写姓名');return}
 if(next.graduationDate && !/^\d{4}-\d{2}-\d{2}$/.test(next.graduationDate)){toast('毕业日期格式不正确');return}
 if(avatarDraft!==null)next.avatar=avatarDraft;
 const previous=data.profile;data.profile=next;
 log('更新个人科研档案');if(!save()){data.profile=previous;return}
 avatarDraft=null;render();toast('个人资料与头像已保存，首页同步更新');return;
}
if(e.target.id==='translationForm'){
 e.preventDefault();const fd=new FormData(e.target);
 const next={
  autoTranslateAbstract:fd.has('autoTranslateAbstract'),
  translationEngine:fd.get('translationEngine')==='remote'?'remote':'device',
  translationEndpoint:String(fd.get('translationEndpoint')||'').trim().slice(0,200),
  translationRemoteConsent:fd.has('translationRemoteConsent')
 };
 if(next.translationEngine==='remote'&&next.translationRemoteConsent&&next.translationEndpoint){
  try{const endpoint=new URL(next.translationEndpoint);if(endpoint.protocol!=='https:'&&!(endpoint.protocol==='http:'&&['localhost','127.0.0.1'].includes(endpoint.hostname)))throw Error();}
  catch{toast('翻译接口须为 HTTPS 或本机 HTTP');return}
 }
 Object.assign(data.settings,next);
 log('更新文献摘要翻译设置');
 if(!save()){render();return}
 render();toast('文献摘要翻译设置已保存');return;
}
if(e.target.id==='appearanceForm'){
 e.preventDefault();const fd=new FormData(e.target);
 const workspaceName=String(fd.get('workspaceName')||'').trim();
 if(!workspaceName){toast('请填写工作台名称');return}
 data.settings.workspaceName=workspaceName.slice(0,36);
 data.settings.greeting=String(fd.get('greeting')||'').trim().slice(0,160);
 data.settings.theme=String(fd.get('theme'))==='auto'?'auto':themePalette[String(fd.get('theme'))]?String(fd.get('theme')):'blue';
 data.settings.stylePreset=['ocean','sage','paper','graphite','glacier','lavender'].includes(String(fd.get('stylePreset')))?String(fd.get('stylePreset')):'ocean';
 data.settings.layoutScheme=['balanced','dense','reading','night'].includes(String(fd.get('layoutScheme')))?String(fd.get('layoutScheme')):'balanced';
 data.settings.wallpaper=['none','mist','paper-lines','stars','custom'].includes(String(fd.get('wallpaper')))?String(fd.get('wallpaper')):'none';
 if(data.settings.wallpaper==='custom'&&!data.settings.wallpaperImage){data.settings.wallpaper='none';toast('请先上传自定义壁纸');}
 data.settings.colorMode=String(fd.get('colorMode'))==='eye'?'eye':'standard';
 data.settings.dailyHours=Math.max(0,Math.min(24,Number(fd.get('dailyHours'))||0));
 log('更新工作台显示偏好');if(!save()){render();return}render();toast('工作台偏好已保存');return;
}
if(e.target.id==='categoriesForm'){
 e.preventDefault();const fd=new FormData(e.target),options={...data.settings.categoryOptions};
 for(const [type] of customizedCategories){
  const values=String(fd.get('category_'+type)||'').split(/\r?\n/g).map(s=>s.trim()).filter(Boolean);
  const unique=[...new Set(values)];
  if(!unique.length){toast('每组分类至少保留一项');return}
  if(unique.length>40){toast('每组分类最多 40 项');return}
  options[type]=unique.map(x=>x.slice(0,80));
 }
 data.settings.categoryOptions=options;
 log('更新科研分类设置');if(!save())return;render();toast('分类已更新，可在新增记录时选择');return;
}}
document.addEventListener('dragstart',e=>{const card=e.target.closest('[data-drag-task]');if(card&&e.dataTransfer){e.dataTransfer.setData('text/plain',card.dataset.dragTask);e.dataTransfer.effectAllowed='move'}});
document.addEventListener('dragover',e=>{if(e.target.closest('[data-drop-status]'))e.preventDefault()});
// Validate both the dragged record and destination state before any linked updates.
// A crafted/invalid data-drop-status must never persist arbitrary task statuses.
const TASK_BOARD_STATUSES=new Set(['待开始','进行中','已完成']);
document.addEventListener('drop',e=>{
 const zone=e.target.closest('[data-drop-status]');if(!zone||!e.dataTransfer)return;
 e.preventDefault();
 const target=zone.dataset.dropStatus;
 if(!TASK_BOARD_STATUSES.has(target)){toast('不支持的任务状态，拖放已取消');return}
 const t=data.tasks.find(x=>x.id===e.dataTransfer.getData('text/plain'));
 if(!t||t.status===target)return;
 t.status=target;
 t.updatedAt=new Date().toISOString();
 t.completedAt=target==='已完成'?t.updatedAt:'';
 syncLinkedAdvisor('tasks',t);
 log('移动任务至'+target+'：'+t.title);
 if(!save()){render();return}
 render();
});
document.addEventListener('dragstart',event=>{const card=event.target.closest?.('[data-board-card]');if(!card)return;event.dataTransfer?.setData('text/plain',JSON.stringify({type:card.dataset.boardCard,id:card.dataset.id}));event.dataTransfer.effectAllowed='move';card.classList.add('dragging')});
document.addEventListener('dragend',event=>event.target.closest?.('[data-board-card]')?.classList.remove('dragging'));
document.addEventListener('dragover',event=>{const target=event.target.closest?.('[data-board-drop]');if(!target)return;event.preventDefault();event.dataTransfer.dropEffect='move'});
document.addEventListener('drop',event=>{const column=event.target.closest?.('[data-board-drop]');if(!column)return;event.preventDefault();try{const d=JSON.parse(event.dataTransfer.getData('text/plain'));if(d.type===column.dataset.boardDrop)moveBoardRecord(d.type,d.id,column.dataset.group)}catch(_){}});
document.addEventListener('keydown',event=>{const node=event.target;const typing=node&&(['INPUT','TEXTAREA','SELECT'].includes(node.tagName)||node.isContentEditable);if(joyJourneyOpen){if(event.key==='Escape'){event.preventDefault();joyJourneyClose();return}if(event.key==='Tab'){const panel=document.querySelector('.sf-journey-card');const controls=[...panel?.querySelectorAll('button:not([disabled])')||[]];if(controls.length){const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();return}if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();return}}}if(event.key==='/'||(event.key.toLowerCase()==='k'&&(event.ctrlKey||event.metaKey))){event.preventDefault();return}}if((event.key==='/'&&!typing)||(event.key.toLowerCase()==='k'&&(event.ctrlKey||event.metaKey))){if(!modal&&!categoryManager&&!outcomeManager){event.preventDefault();document.querySelector('#globalSearch')?.focus();}}else if(event.key==='Escape'){if(recordPreview){recordPreview=null;render()}else if(modal){writeRecordDraft();modal=null;historyEditing=null;historyNodeEditing=null;render()}else if(categoryManager){categoryManager=null;categoryEditingIndex=-2;render()}else if(outcomeManager){outcomeManager=null;render()}else if(menu){menu=false;render()}}});
document.addEventListener('click',onClick);document.addEventListener('change',onChange);document.addEventListener('submit',onSubmit);document.addEventListener('reset',e=>{if(e.target.id==='profileForm'){avatarDraft=null;setTimeout(()=>{updateProfilePreview(e.target);renderAvatarPreview();const av=$('#settingsAvatar');if(av)av.innerHTML=avatarFace()},0)}});document.addEventListener('input',e=>{if(e.target.closest('#expGroupList'))expSyncGroupDraft();if(e.target.id==='field_title'&&modal?.type==='literature'&&window.ScholarPDF){const select=document.getElementById('field_articleType');if(select&&!select.dataset.manuallyChosen){const guess=window.ScholarPDF.inferArticleType(e.target.value);if(guess!=='未分类')select.value=guess;}}if(e.target.closest('#profileForm'))updateProfilePreview(e.target.closest('#profileForm'));if(e.target.id==='globalSearch'||e.target.id==='moduleSearch'){const field='#'+e.target.id;const inputValue=e.target.value;const sel=e.target.selectionStart;const keep=page;search=inputValue;genericLimit=80;boardLimit=90;literatureLimit=110;clearTimeout(searchDebounce);searchDebounce=setTimeout(()=>{if(page!==keep)return;render();const inp=$(field);if(inp){inp.focus();if(sel!==null&&inp.setSelectionRange)inp.setSelectionRange(sel,sel)}},140)}});window.addEventListener('storage',event=>{if(event.key===DBKEY&&event.newValue!==event.oldValue)showExternalConflict()});window.addEventListener('hashchange',()=>{const p=location.hash.slice(1);if(p!==page)navigate(p)});window.addEventListener('focus',()=>{refreshGraduationClock();if(purgeExpiredTrash()&&page==='settings')render()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshGraduationClock();if(!document.hidden&&purgeExpiredTrash()&&page==='settings')render()});setInterval(()=>{if(purgeExpiredTrash()&&page==='settings')render()},60*60*1000);setInterval(refreshGraduationClock,60*1000);setInterval(writeRecordDraft,30*1000);window.addEventListener('pagehide',writeRecordDraft);purgeExpiredTrash();render();
})();

/* ScholarFlow 历史模块 Chinese bibliography and hero alignment patch 2026-10-20: extra category modules and file module management enabled. */
