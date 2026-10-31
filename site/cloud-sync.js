/* ScholarFlow Cloud 2026.11.2: optional, user-consented WorkBuddy 云 snapshot sync.
 * WorkBuddy browser SDK owns transport and authentication. The publishable key is public; server RLS is authoritative.
 * A cloud snapshot covers research JSON, NOT IndexedDB PDFs or external files.
 */
(() => {
  'use strict';
  const KEY='scholarflow_v1_data';
  const AUTO_KEY='sf_cloud_auto_v1_';
  const ACK_KEY='sf_cloud_ack_v2_';
  const LAST_ACCOUNT_KEY='sf_cloud_last_account_v1';
  const SWITCH_GUARD_KEY='sf_cloud_account_review_v1'; // Non-secret safety flag; never stores credentials or sessions.
  const MAX_BYTES=4*1024*1024;
  const rawConfig=window.SCHOLARFLOW_CLOUD_CONFIG||{};
  const endpoint=String(rawConfig.endpoint||'').trim().replace(/\/+$/,'');
  const apiKey=String(rawConfig.publishableKey||'').trim();
  const oauthRelayBaseUrl=String(rawConfig.oauthRelayBaseUrl||'').trim();
  const safeKey=apiKey && !/^(?:sb_secret_|service_role)/i.test(apiKey);
  let cloud=null,configured=false;
  function initCloud(){
    // Exactly one WorkBuddy SDK client. Never fake a session or manually set HTTP auth headers.
    if(cloud)return cloud;
    const factory=window.WorkBuddyCloud?.createWorkBuddyCloud;
    if(typeof factory!=='function'||!endpoint||!safeKey||!oauthRelayBaseUrl)return null;
    try{
      if(new URL(endpoint).protocol!=='https:'||new URL(oauthRelayBaseUrl).protocol!=='https:')return null;
      cloud=factory({endpoint,oauthRelayBaseUrl,publishableKey:apiKey});
    }catch(_){cloud=null;return null}
    if(!cloud?.auth?.getSession||!cloud?.auth?.signInWithPassword||!cloud?.auth?.signInWithOtp||
       !cloud?.auth?.onAuthStateChange||!cloud?.database?.from||!cloud?.storage?.userPath||
       !cloud?.storage?.upload||!cloud?.storage?.download){cloud=null;return null}
    configured=true;return cloud;
  }
  function unwrap(response){
    // Database envelopes have {data,error,status,success}. Auth envelopes have {data,error}.
    const failure=response?.error||(response?.success===false?{message:'WorkBuddy 云请求未成功'}:null);
    if(failure){
      const err=new Error(String(failure.message||failure.msg||failure.code||'WorkBuddy 云服务请求失败'));
      const http=Number(response?.status??failure.status??failure.statusCode);
      if(Number.isInteger(http)&&http>=100)err.status=http;
      if(failure.code!=null)err.code=String(failure.code);
      throw err;
    }
    return response&&typeof response==='object'&&'data' in response?response.data:response;
  }
  function asRow(data){return Array.isArray(data)?data[0]||null:data||null}
  const state={session:null,user:null,remote:null,revision:null,active:false,conflict:false,busy:false,open:false,message:'',level:'',timer:null,queue:false,uploading:false,online:navigator.onLine!==false,filesBusy:false,pending:false,retryDelay:3000,accountGuard:false,networkIssue:false};
  try{state.accountGuard=localStorage.getItem(SWITCH_GUARD_KEY)==='review'}catch(_){}
  // Auth views are client-side presentation state only. SDK owns all sessions and identity.
  let authView='login', loginMethod='password';
  const authDraft={email:'',password:'',code:'',newPassword:'',confirmPassword:''};
  const challenges={signup:null,login:null,reset:null};
  const challengeEmails={signup:'',login:'',reset:''};
  const cooldowns={signup:0,login:0,reset:0};
  // A late initial getSession() or SIGNED_OUT event must not erase an active OTP challenge.
  const otpUnconfirmed={signup:false,login:false,reset:false};
  let authFlowVersion=0;
  let codeTimer=null;
  function emailValid(email){return /^\S+@\S+\.\S+$/.test(String(email||''))}
  function clearSecrets(){authDraft.password='';authDraft.code='';authDraft.newPassword='';authDraft.confirmPassword=''}
  function requireAccountReview(){
    state.accountGuard=true;state.active=false;clearTimeout(state.timer);
    try{localStorage.setItem(SWITCH_GUARD_KEY,'review')}catch(_){}
  }
  function clearAccountReview(){
    state.accountGuard=false;
    try{localStorage.removeItem(SWITCH_GUARD_KEY)}catch(_){}
  }
  function isNetworkTransportFailure(e){
    // A transport failure has no trustworthy HTTP response. Do not classify 401/403 or bad OTP as a network outage.
    const status=Number(e?.status);
    if(Number.isInteger(status)&&status>=400)return false;
    const message=String(e?.message||e||'');
    return /failed to fetch|fetch failed|request failed before a response|network(?:request| error|error)|load failed|cors|err_name_not_resolved|err_connection|err_failed|timeout|timed out/i.test(message);
  }
  function authFriendlyError(e){
    const message=String(e?.message||e||'未知错误');
    if(isNetworkTransportFailure(e))return '云端请求没有收到有效响应。可能是服务域名不可达、认证服务未发布、CORS/预检未通过或网络限制。请展开下方「网络排查信息」核对；验证码未确认发送，本机数据不受影响。';
    if(/user password not set|password not set/i.test(message))return '该账号尚未设置密码。请切换到「验证码登录」；如云服务支持，也可以使用「忘记密码」设置新密码。';
    if(/invalid login credentials|invalid password|wrong password/i.test(message))return '邮箱或密码不正确。可以改用验证码登录，或者找回密码。';
    return message;
  }
  function networkDebugInfo(){
    // No addresses, access keys, email, passwords or tokens appear in these diagnostics.
    let apiHost='未知';
    try{apiHost=new URL(endpoint).host}catch(_){}
    const currentOrigin=location.origin;
    const crossOrigin=(()=>{try{return new URL(endpoint).origin!==currentOrigin}catch{return true}})();
    return {webOrigin:currentOrigin,apiHost,crossOrigin,online:navigator.onLine!==false,
      sdk:typeof window.WorkBuddyCloud?.createWorkBuddyCloud==='function',configured};
  }
  function diagnosticText(){
    const d=networkDebugInfo();
    return ['ScholarFlow 云端连接诊断（不含账号或凭据）',
      '网页来源: '+d.webOrigin,'云服务主机: '+d.apiHost,
      '跨源访问: '+(d.crossOrigin?'是（需由云端允许网页来源）':'否'),
      '浏览器网络标记: '+(d.online?'在线（不代表云端可达）':'离线'),
      'SDK 加载: '+(d.sdk?'已加载':'未加载'),
      'SDK 配置: '+(d.configured?'已初始化':'未初始化'),
      '提示: 请在浏览器开发者工具 Network/Console 检查失败请求和 OPTIONS 预检；核实 WorkBuddy 应用已发布并开启邮箱验证码登录。'].join('\n');
  }
  function diagnosticsPanel(){
    const d=networkDebugInfo();
    return `<details class="sf-cloud-diagnostics"><summary>网络排查信息（不含账号和密钥）</summary>
       <dl><dt>当前网页来源</dt><dd>${escapeHtml(d.webOrigin)}</dd>
           <dt>云服务主机</dt><dd>${escapeHtml(d.apiHost)}</dd>
           <dt>跨源访问</dt><dd>${d.crossOrigin?'是，需要云服务端允许此来源':'否'}</dd>
           <dt>浏览器网络状态</dt><dd>${d.online?'显示联网；不代表云接口可达':'离线'}</dd>
           <dt>WorkBuddy SDK</dt><dd>${d.sdk?'已加载':'未加载'} · ${d.configured?'已初始化':'未初始化'}</dd></dl>
       <p>请确认 WorkBuddy 应用已经发布、邮箱验证码登录已启用。若浏览器控制台报 CORS 或 OPTIONS 预检失败，需要在云服务端允许当前网站来源；不能通过关闭浏览器安全策略解决。</p>
       <button type="button" data-cloud="copy-diagnostics">复制诊断（不含邮箱与凭据）</button>
    </details>`;
  }
  function captureAuthDraft(){
    const form=panel?.querySelector('#sf-cloud-login');
    if(!form)return;
    for(const el of form.querySelectorAll('input[name]')){
      if(Object.prototype.hasOwnProperty.call(authDraft,el.name))authDraft[el.name]=el.value;
    }
  }
  function remainingSeconds(mode){return Math.max(0,Math.ceil((cooldowns[mode]-Date.now())/1000))}
  function updateCodeButtons(){
    for(const [mode,action] of [['signup','send-code'],['login','send-login-code'],['reset','send-reset-code']]){
      const button=panel?.querySelector('[data-cloud="'+action+'"]');
      const status=panel?.querySelector('[data-otp-status="'+mode+'"]');
      const n=remainingSeconds(mode);
      if(button){
        button.disabled=!!n||state.busy;
        button.textContent=n?`重新发送（${n} 秒）`:'发送验证码';
        button.setAttribute('aria-describedby','sf-otp-status-'+mode);
      }
      if(status){
        status.dataset.state=n?'waiting':challenges[mode]?'ready':otpUnconfirmed[mode]?'unconfirmed':'idle';
        status.textContent=n?`验证码已发送（云端已返回验证会话），${n} 秒后可重新发送`:
          challenges[mode]?'可以重新发送验证码；之前收到的验证码仍可尝试验证':
          otpUnconfirmed[mode]?'本次请求未建立可验证的会话；即使已收到邮件也不能直接提交旧验证码。请重新发送并等待倒计时出现。':
          '发送成功后将显示 60 秒重发倒计时';
      }
    }
    // Compute the remaining time from wall-clock time, not the number of timer ticks:
    // mobile browsers may throttle timers when the tab is in the background.
    if(Object.values(cooldowns).every(t=>Date.now()>=t) && codeTimer){clearInterval(codeTimer);codeTimer=null}
  }
  function tickCodeButtons(){if(!codeTimer)codeTimer=setInterval(updateCodeButtons,1000);updateCodeButtons()}
  function otpSendControl(mode,action){
    return `<div class="sf-cloud-code-control"><button type="button" data-cloud="${action}" aria-describedby="sf-otp-status-${mode}">发送验证码</button>
      <p id="sf-otp-status-${mode}" class="sf-cloud-code-status" data-otp-status="${mode}" role="status" aria-live="off">发送成功后将显示 60 秒重发倒计时</p></div>`;
  }
  function switchAuth(view,method){
    if(state.busy)return;
    captureAuthDraft();authView=view;if(method)loginMethod=method;
    authDraft.code='';render();
    panel?.querySelector('input[name="email"]')?.focus();
  }
  let trigger,panel,backdrop;
  const getLocal=()=>{try{return localStorage.getItem(KEY)||''}catch{return ''}};
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getAutoKey=()=>AUTO_KEY+(state.user?.id||'');
  const getAckKey=()=>ACK_KEY+(state.user?.id||'');
  // PostgreSQL JSONB may reorder object keys. Compare canonical JSON, never insertion order.
  function canonicalJson(value){return JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((o,k)=>{Object.defineProperty(o,k,{value:v[k],enumerable:true,configurable:true,writable:true});return o},Object.create(null)):v)}
  // This checksum is only a local change marker; the SQL revision CAS is the actual concurrency barrier.
  function fingerprint(value){const raw=typeof value==='string'?canonicalJson(JSON.parse(value)):canonicalJson(value);let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return raw.length+':'+(h>>>0).toString(16)}
  function lastAck(){try{const x=JSON.parse(localStorage.getItem(getAckKey())||'null');return x&&Number.isInteger(x.revision)&&typeof x.hash==='string'?x:null}catch{return null}}
  function rememberAck(revision,payload){try{localStorage.setItem(getAckKey(),JSON.stringify({revision,hash:fingerprint(payload),at:new Date().toISOString()}))}catch(_){}}
  const localChanged=()=>!!state.remote&&!!getLocal()&&!snapshotMatches();
  function updatePending(){state.pending=!!state.user&&!!getLocal()&&(localChanged()||!state.remote)}

  const setMessage=(message,level='')=>{state.message=String(message||'');state.level=level;render()};
  function resetRemote({preserveAuth=false}={}){
    state.session=null;state.user=null;state.remote=null;state.revision=null;state.active=false;
    state.conflict=false;state.pending=false;state.queue=false;clearTimeout(state.timer);
    // An initial unauthenticated SDK callback is not a user-initiated logout. Keep the
    // in-progress email challenge, form draft and resend timer in that situation.
    if(!preserveAuth){
      clearSecrets();authView='login';loginMethod='password';
      for(const mode of ['login','signup','reset']){
        challenges[mode]=null;challengeEmails[mode]='';cooldowns[mode]=0;otpUnconfirmed[mode]=false;
      }
      if(codeTimer){clearInterval(codeTimer);codeTimer=null}
    }
  }
  async function loadRemote(){
    if(!state.user)throw Error('请先登录');
    const sessionOwner=state.user.id;
    const value=unwrap(await cloud.database.from('scholarflow_snapshots').select('revision,payload,updated_at').maybeSingle());
    if(state.user?.id!==sessionOwner)throw Error('账号已切换，已取消过期的云端请求');
    const row=asRow(value);
    state.remote=row;state.revision=row?Number(row.revision):null;return row;
  }
  const snapshotMatches=()=>{
    if(!state.remote)return false;
    const raw=getLocal();
    if(!raw)return false;
    try{return canonicalJson(JSON.parse(raw))===canonicalJson(state.remote.payload)}catch{return false}
  };
  const isAutoPreferred=()=>{try{return localStorage.getItem(getAutoKey())==='on'}catch{return false}};
  function setPreferred(enabled){try{if(enabled)localStorage.setItem(getAutoKey(),'on');else localStorage.removeItem(getAutoKey())}catch(_){}}
  function alignAuto(){
    state.active=false;
    if(!state.user||state.conflict||state.accountGuard||!isAutoPreferred())return;
    if(snapshotMatches()){rememberAck(state.revision,state.remote.payload);state.active=true;return}
    // Recover an explicit opt-in after an offline edit and page refresh, but ONLY if
    // the cloud's exact revision + content still matches the last acknowledged write.
    const ack=lastAck();
    if(ack&&state.remote&&ack.revision===state.revision&&ack.hash===fingerprint(state.remote.payload)){
      state.active=true;updatePending();if(state.pending&&state.online)enqueue();return;
    }
    state.conflict=true;setPreferred(false);
  }
  async function startUser(session){
    if(!cloud)return;
    const flowAtStart=authFlowVersion;
    const fromSdk=!session;
    const value=session||unwrap(await cloud.auth.getSession());
    const current=value?.session||value;
    const user=current?.user;
    if(!user?.id){
      // Ignore a delayed pre-login getSession() response if an OTP/password flow
      // has started since it was requested. A null session is not a logout.
      if(fromSdk&&flowAtStart!==authFlowVersion)return;
      resetRemote({preserveAuth:!state.user});render();return;
    }
    // Detect an account changed in another tab or between page loads.
    // The identifier is non-secret and is NEVER used to impersonate a cloud session.
    try{
      const lastId=localStorage.getItem(LAST_ACCOUNT_KEY);
      if(lastId&&lastId!==String(user.id))requireAccountReview();
      localStorage.setItem(LAST_ACCOUNT_KEY,String(user.id));
    }catch(_){}
    if(state.user&&state.user.id!==String(user.id)){requireAccountReview();resetRemote();}
    state.session=current;
    state.user={id:String(user.id),email:String(user.email||'')};
    await loadRemote();state.conflict=false;alignAuto();updatePending();
    setMessage(state.accountGuard?'已进入其他账号。本机记录没有被删除或上传；请先核对本机和云端数据，再决定手动上传或恢复。自动同步已暂停。':state.conflict?'云端修订版本与上次同步状态不一致，自动同步已暂停。请检查后选择保留的版本。':state.active&&state.pending?'发现离线期间的本机更改，已排队等待安全同步。':state.remote?(snapshotMatches()?'本机与云端版本一致。':'本机与云端内容不同。选择下载或明确确认覆盖后才会同步。'):'云端尚无记录，可在本机录入并主动首次上传。');
  }
  async function signin(email,password){
    if(state.busy)return;authFlowVersion++;state.busy=true;render();
    try{
      if(!configured)throw Error('WorkBuddy 云尚未配置或浏览器 SDK 未正确加载');
      if(!emailValid(email))throw Error('请填写有效的邮箱地址');
      if(password.length<6)throw Error('密码至少为 6 位');
      const result=unwrap(await cloud.auth.signInWithPassword({email,password}));
      await startUser(result?.session||result);
      if(!state.user)throw Error('尚未收到有效的登录会话');
      clearSecrets();
    }catch(e){state.networkIssue=isNetworkTransportFailure(e);setMessage('登录失败：'+authFriendlyError(e),'error')}
    finally{state.busy=false;render()}
  }
  async function sendAuthCode(email,mode){
    if(state.busy)return;
    authFlowVersion++;otpUnconfirmed[mode]=false;
    captureAuthDraft();state.busy=true;render();
    try{
      if(!configured)throw Error('WorkBuddy 云尚未配置或 SDK 未加载');
      if(!emailValid(email))throw Error('请填写有效的邮箱地址');
      if(remainingSeconds(mode))throw Error('请在倒计时结束后重新发送');
      if(navigator.onLine===false)throw Error('当前设备未联网，请联网后再发送验证码');
      let result;
      if(mode==='reset'){
        // Password recovery is used only when the loaded SDK actually exposes it.
        // No simulated verification or local password fallback is ever used.
        if(typeof cloud.auth.resetPasswordForEmail!=='function')
          throw Error('当前 WorkBuddy SDK 未开放邮箱密码重置接口。您仍可使用「验证码登录」访问原有云端数据；请联系 WorkBuddy 云管理员开通密码重置。');
        result=unwrap(await cloud.auth.resetPasswordForEmail(email));
        if(typeof result?.updateUser!=='function')throw Error('密码重置接口未返回 updateUser 验证方法，无法安全继续');
      }else{
        result=unwrap(await cloud.auth.signInWithOtp({email}));
        result=result?.challenge||result;
        if(typeof result?.verify!=='function')throw Error('SDK 未返回可验证的邮箱 challenge');
        // Do not silently register a new account while in login mode.
        if(mode==='login'&&result.isExistingUser===false)throw Error('此邮箱尚未注册，请切换到「注册」页面。');
      }
      state.networkIssue=false;otpUnconfirmed[mode]=false;
      challenges[mode]=result;challengeEmails[mode]=email;
      cooldowns[mode]=Date.now()+60000;
      tickCodeButtons();
      setMessage(mode==='reset'?'已发送密码重置验证码，请输入验证码和新密码。':'验证码已发送，请查收邮箱。','success');
    }catch(e){
      state.networkIssue=isNetworkTransportFailure(e);
      otpUnconfirmed[mode]=true;
      // A backend may send an email even when the browser never receives the
      // challenge object. Never pretend that we can verify an orphaned code.
      setMessage('发送验证码失败：请求尚未建立有效验证会话。'+authFriendlyError(e)+' 如果已收到邮件，请不要直接提交该验证码；需要重新发送并等待显示倒计时。','error');
    }finally{state.busy=false;render();updateCodeButtons()}
  }
  async function verifyAuthCode(email,code,password,mode){
    if(state.busy)return;
    authFlowVersion++;captureAuthDraft();state.busy=true;render();
    try{
      if(!configured)throw Error('WorkBuddy 云尚未配置');
      if(email!==challengeEmails[mode]||!challenges[mode]){
        if(otpUnconfirmed[mode])throw Error('邮箱可能收到验证码，但浏览器没有建立有效的验证会话。请重新发送并确认出现倒计时，再输入新验证码。');
        throw Error('请先为当前邮箱发送验证码；如已发送，请检查是否切换了邮箱、标签页或刷新了页面。');
      }
      if(!/^\d{6}$/.test(code))throw Error('请输入 6 位数字验证码');
      if(mode!=='login'&&password.length<8)throw Error('新密码至少需要 8 位');
      let response;
      if(mode==='reset'){
        response=unwrap(await challenges.reset.updateUser({nonce:code,password}));
      }else if(mode==='signup'){
        // SDK verifies and registers in one step; never call signUp separately.
        response=unwrap(await challenges.signup.verify({token:code,password}));
      }else{
        response=unwrap(await challenges.login.verify({token:code}));
      }
      const session=response?.session||response;
      if(!session?.user?.id)throw Error('云服务没有返回有效登录会话');
      challenges[mode]=null;challengeEmails[mode]='';cooldowns[mode]=0;otpUnconfirmed[mode]=false;
      clearSecrets();await startUser(session);
      if(!state.user)throw Error('登录会话尚未建立');
      setMessage(mode==='reset'?'密码已通过云服务重置，并已登录。科研记录仍保留在本机。':mode==='signup'?'注册成功并已登录。科研资料需由您确认后才会首次上传。':'验证码登录成功。科研资料仍以本机为优先。','success');
    }catch(e){state.networkIssue=isNetworkTransportFailure(e);setMessage((mode==='reset'?'重置失败：':mode==='signup'?'注册失败：':'验证码登录失败：')+authFriendlyError(e),'error')}
    finally{state.busy=false;render()}
  }
  async function logout({switchAccount=false}={}){
    if(state.busy||state.uploading||state.filesBusy||!state.user)return;
    const unsynced=!!getLocal()&&(!snapshotMatches()||state.pending||state.conflict);
    const warning=unsynced
      ?'当前本机记录可能尚未同步到云端。退出不会删除本机数据，也不会自动上传；建议先导出本机 JSON 备份。'
      :'退出只会结束当前 WorkBuddy 云端会话，不会清除本机科研记录。';
    if(!confirm((switchAccount?'切换到其他账号？':'确认退出云端账号？')+'\n\n'+warning+'\n\n切换账户后必须先核对数据，禁止自动跨账户上传。'))return;
    // Persist a non-auth account boundary before the SDK fires SIGNED_OUT.
    // This prevents old account's browser-local data being auto-uploaded to a different account.
    requireAccountReview();state.busy=true;render();
    try{
      unwrap(await cloud.auth.signOut());resetRemote();
      setMessage(switchAccount?'已退出原账号。现在可登录另一个账号；本机科研记录保留，但自动同步会保持暂停，直到您主动核对数据。':'已退出 WorkBuddy 云端账户。本机数据保留，重新登录时会先暂停自动同步。','success');
      if(switchAccount)panel?.querySelector('input[name="email"]')?.focus();
    }catch(e){setMessage('退出云端账号失败：'+e.message,'error')}
    finally{state.busy=false;render()}
  }
  function validateLocal(){
    const raw=getLocal();if(!raw)throw Error('本机尚未保存科研数据。请先创建一条记录，或从云端下载。');
    if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('科研 JSON 超过云端单条记录的安全上限（4 MiB），请先备份并减少大型内嵌图片。');
    let data;try{data=JSON.parse(raw)}catch{throw Error('本机 JSON 已损坏，禁止同步覆盖')}
    if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.tasks)||!Array.isArray(data.literature)||!data.settings)throw Error('本机科研 JSON 结构异常，禁止上传');
    return {raw,data};
  }
  async function upload({force=false,manual=false}={}){
    if(state.uploading){state.queue=true;return}
    if(state.busy||!state.user)return;
    if(!state.online){updatePending();setMessage('当前离线：本机数据已保留，云端上传未执行。','error');return}
    const previousActive=state.active;
    if(state.conflict&&!force){setMessage('发现云端版本冲突。请先重新检查云端，再手动选择版本。','error');return}
    if(state.remote&&!force&&!snapshotMatches()&&!previousActive){setMessage('本机与云端版本不同。必须先明确选择上传覆盖或下载云端。','error');return}
    let local;try{local=validateLocal()}catch(e){setMessage(e.message,'error');return}
    state.uploading=true;render();
    try{
      let result;
      if(state.remote){
        result=unwrap(await cloud.database.from('scholarflow_snapshots')
          .update({revision:state.revision+1,payload:local.data})
          .eq('revision',state.revision).select());
        if(!Array.isArray(result)||result.length!==1){
          state.conflict=true;state.active=false;setPreferred(false);
          throw Error('云端已被另一设备更新，本次上传已取消；本机数据未丢失。请检查云端版本。');
        }
      }else{
        // owner_id is assigned by the authenticated server / RLS, never by the browser.
        result=unwrap(await cloud.database.from('scholarflow_snapshots')
          .insert({revision:1,payload:local.data}).select());
        if(!Array.isArray(result)||result.length!==1)throw Error('云端没有确认创建结果，请检查权限设置');
      }
      state.remote=result[0];state.revision=Number(result[0].revision);
      rememberAck(state.revision,local.data);state.conflict=false;state.retryDelay=3000;updatePending();
      // A deliberate manual upload is an explicit account-data decision, but does not re-enable auto-sync.
      if(state.accountGuard&&manual){setPreferred(false);clearAccountReview();}
      state.active=isAutoPreferred()&&!state.conflict&&(previousActive||snapshotMatches());
      setMessage('云端保存成功（版本 '+state.revision+'）。PDF 原件仅在点击私有备份后上传。','success');
    }catch(e){
      if(e.status===409 || e.status===412 || e.code==='PGRST116'){state.conflict=true;state.active=false;setPreferred(false)}
      setMessage('同步失败：'+e.message,'error');
      if(previousActive&&!state.conflict&&state.user&&state.online&&isTransientNetworkError(e)){
        // Bounded retry. Every retry still uses the same SQL CAS precondition.
        clearTimeout(state.timer);
        state.timer=setTimeout(()=>{state.timer=null;if(state.active&&!state.uploading)upload()},state.retryDelay);
        state.retryDelay=Math.min(60000,state.retryDelay*2);
      }
    }finally{
      state.uploading=false;render();
      if(state.queue){state.queue=false;if(state.active && getLocal()!==local?.raw)enqueue()}
      else if(state.active&&local&&getLocal()!==local.raw)enqueue();
    }
  }
  function isTransientNetworkError(error){
    // 4xx validation/RLS/auth errors require operator action, not unbounded retries.
    return error?.code!=='PGRST116'&&(error?.status===0||!Number.isInteger(error?.status)||[408,425,429].includes(error.status)||error.status>=500);
  }
  function enqueue(){
    if(!state.active||!state.user||state.conflict)return;
    updatePending();clearTimeout(state.timer);
    if(!state.online)return; // local changes survive refresh via the ack marker
    state.timer=setTimeout(()=>{state.timer=null;upload()},1100);
  }
  async function checkChanges(){
    if(!state.user||state.busy||state.uploading)return;
    state.busy=true;render();
    try{
      const before=state.revision;
      await loadRemote();
      if(before!==state.revision && before!==null){
        state.active=false;state.conflict=true;setPreferred(false);
        setMessage('发现其他设备写入的新版本（版本 '+state.revision+'）。请确认使用哪个版本。','error');
      }else{
        if(snapshotMatches()){state.conflict=false;alignAuto();updatePending();setMessage('云端与本机内容一致。')}
        else {alignAuto();updatePending();setMessage(state.active?'本机更改已排队等待同步。':'检查完成：本机与云端内容不同，请手动选择版本。');}
      }
    }catch(e){setMessage('检查失败：'+e.message,'error')}
    finally{state.busy=false;render()}
  }
  function backupLocal(){
    const raw=getLocal();if(!raw){setMessage('当前浏览器尚无已保存的科研记录。');return}
    const blob=new Blob([raw],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download='ScholarFlow-local-backup-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    setMessage('已发起本机 JSON 备份下载。PDF 文件还需单独导出。');
  }
  async function restoreRemote(){
    if(!state.user||!state.remote||state.busy||state.uploading)return;
    // The original download action used a potentially stale in-memory remote
    // snapshot. Reload under the current user before asking for destructive consent.
    const seenRevision=state.revision;
    const originalLocal=getLocal();
    state.busy=true;render();
    try{
      const latest=await loadRemote();
      if(!latest||state.revision!==seenRevision){
        state.active=false;state.conflict=true;setPreferred(false);
        setMessage('云端已发生更新，已阻止恢复旧版本。请重新检查云端并确认使用哪个版本。','error');return;
      }
      if(originalLocal!==getLocal()){
        setMessage('检查期间本机科研数据发生修改，已取消恢复。请先导出备份再重试。','error');return;
      }
      const payload=latest.payload;
      if(!payload||typeof payload!=='object'||Array.isArray(payload)||!Array.isArray(payload.tasks)||!Array.isArray(payload.literature)||!payload.settings){
        setMessage('云端数据结构不符合 ScholarFlow 格式，已拒绝覆盖。','error');return;
      }
      let serial;
      try{serial=JSON.stringify(payload);if(new TextEncoder().encode(serial).length>MAX_BYTES)throw Error('数据过大')}
      catch(e){setMessage('云端数据无效：'+e.message,'error');return}
      if(!confirm('确认将最新云端科研 JSON（版本 '+seenRevision+'）覆盖当前浏览器的科研数据？请先点击“导出本机 JSON”备份。PDF 原件不会被下载。'))return;
      if(!confirm('这是覆盖操作。是否已经备份本机 JSON，并同意继续？'))return;
      // Verify again after confirmations: another device may have written meanwhile.
      const atCommit=await loadRemote();
      if(!atCommit||state.revision!==seenRevision||canonicalJson(atCommit.payload)!==canonicalJson(payload)){
        state.active=false;state.conflict=true;setPreferred(false);
        setMessage('确认期间云端记录发生变化，已取消恢复。本机数据保持不变。','error');return;
      }
      // A user may change local records while asynchronous checks are running.
      if(getLocal()!==originalLocal){setMessage('恢复期间本机记录已变化，已取消覆盖。','error');return}
      try{
        localStorage.setItem(KEY,serial);
        if(state.accountGuard){setPreferred(false);clearAccountReview();}
        state.conflict=false;
        setMessage('已恢复云端 JSON，正在重新载入工作台。','success');
        location.reload();
      }catch(e){setMessage('本机空间不足，云端恢复未完成：'+e.message,'error')}
    }catch(e){setMessage('恢复前检查云端失败，未修改本机数据：'+e.message,'error')}
    finally{state.busy=false;render()}
  }

  // PDF bytes stay out of the JSON snapshot. These actions are deliberately opt-in.
  const validRecordId=id=>/^[A-Za-z0-9_-]{1,120}$/.test(String(id||''));
  async function pdfStore(op,key,blob){
    const database=await new Promise((resolve,reject)=>{
      const r=indexedDB.open('ScholarFlow-PDF-v12',1);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files')};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
    return new Promise((resolve,reject)=>{
      let answer,settled=false;
      const done=e=>{if(settled)return;settled=true;database.close();e?reject(e):resolve(answer)};
      try{
        const tx=database.transaction('files',op==='get'?'readonly':'readwrite');
        const req=op==='get'?tx.objectStore('files').get(key):tx.objectStore('files').put(blob,key);
        req.onsuccess=()=>{answer=req.result};tx.oncomplete=()=>done();tx.onabort=()=>done(tx.error||Error('本机 PDF 保存失败'));
      }catch(e){done(e)}
    });
  }
  function pdfPath(id){
    if(!state.user||!validRecordId(id))throw Error('非法文献标识');
    // SDK enforces per-user private paths; never construct a public URL.
    return cloud.storage.userPath(state.user.id,'pdfs/'+id+'.pdf');
  }
  async function pdfUpload(id,file){
    return unwrap(await cloud.storage.upload(pdfPath(id),file,{contentType:'application/pdf',upsert:false}));
  }
  async function pdfDownload(id){
    const result=unwrap(await cloud.storage.download(pdfPath(id)));
    const blob=result?.blob||result;
    if(!(blob instanceof Blob))throw Error('SDK 未返回 PDF Blob');
    return blob;
  }
  async function syncPdfFiles(mode){
    if(!state.user||state.filesBusy||!state.online)return setMessage('请先联网并登录云端。','error');
    if(mode==='upload'&&!confirm('将当前浏览器的 PDF 原件上传到该账户的 WorkBuddy 云私有存储空间。文件可能包含敏感科研材料；确认已获上传许可？'))return;
    if(mode==='download'&&!confirm('从云端下载缺失的 PDF 到当前浏览器，已有本机 PDF 保持不变。继续？'))return;
    state.filesBusy=true;render();let uploaded=0,skipped=0,failed=0,firstFailure='';
    try{
      const local=validateLocal().data;
      // Only PDFs attached to real, active literature IDs may be transferred.
      const records=(local.literature||[]).filter(x=>validRecordId(x.id)&&typeof x.pdfName==='string'&&x.pdfName.toLowerCase().endsWith('.pdf'));
      if(records.length>500)throw Error('一次最多备份 500 篇文献，请按批次处理');
      for(const row of records){
        try{
          const existing=await pdfStore('get',row.id);
          if(mode==='upload'){
            if(!existing){skipped++;continue}
            const file=existing instanceof Blob?existing:new Blob([existing],{type:'application/pdf'});
            if(file.size<8||file.size>30*1024*1024)throw Error('PDF 大小超出限制');
            const header=new TextDecoder('latin1').decode(await file.slice(0,1024).arrayBuffer());
            if(!/%PDF-\d\.\d/.test(header))throw Error('PDF 文件签名无效');
            try{await pdfUpload(row.id,file)}
            catch(e){if(e.status===409||e.code==='409'||/already exists|duplicate|resource already exists/i.test(e.message)){skipped++;continue}throw e}
          }else{
            if(existing){skipped++;continue}
            const file=await pdfDownload(row.id);
            if(file.size<8||file.size>30*1024*1024||!/%PDF-\d\.\d/.test(new TextDecoder('latin1').decode(await file.slice(0,1024).arrayBuffer())))throw Error('云端 PDF 内容无效');
            await pdfStore('put',row.id,file);
          }
          uploaded++;
        }catch(e){if(mode==='download'&&e.status===404){skipped++;continue}failed++;if(!firstFailure)firstFailure=String(e.message||'未知错误').slice(0,140)}
      }
      setMessage((mode==='upload'?'PDF 云端备份':'PDF 本机恢复')+'完成：成功 '+uploaded+'，已跳过 '+skipped+'，失败 '+failed+'。'+(failed?' 原因：'+firstFailure+'。请检查存储桶策略及网络日志。':''),failed?'error':'success');
    }catch(e){setMessage('PDF 操作未完成：'+e.message,'error')}
    finally{state.filesBusy=false;render()}
  }
  function safePanel(){
    if(!configured)return '<p class="sf-cloud-warning">WorkBuddy 云 SDK 或公共配置尚未就绪。本机科研记录仍可离线使用。请检查 <code>endpoint</code>、<code>oauthRelayBaseUrl</code>、<code>publishableKey</code> 和浏览器 SDK 的加载状态；不会自动上传数据。</p>';
    if(!state.user){
      const btn=(action,label)=>`<button type="button" data-cloud="${action}" class="${(authView==='login'&&action==='tab-login'||authView==='signup'&&action==='tab-signup')?'is-selected':''}" aria-pressed="${(authView==='login'&&action==='tab-login'||authView==='signup'&&action==='tab-signup')?'true':'false'}">${label}</button>`;
      const modeTabs=`<nav class="sf-cloud-auth-tabs" aria-label="账号入口">${btn('tab-login','登录')}${btn('tab-signup','注册')}</nav>`;
      const baseEmail='<label>邮箱<input required name="email" autocomplete="username" type="email" placeholder="请输入邮箱地址"></label>';
      let content='';
      if(authView==='login'){
        content=`${modeTabs}<div class="sf-cloud-methods" role="group" aria-label="登录方式"><button type="button" data-cloud="method-password" aria-pressed="${loginMethod==='password'}" class="${loginMethod==='password'?'is-selected':''}">密码登录</button><button type="button" data-cloud="method-code" aria-pressed="${loginMethod==='code'}" class="${loginMethod==='code'?'is-selected':''}">验证码登录</button></div>
          <form id="sf-cloud-login" class="sf-cloud-login" data-auth-form="login" novalidate>${baseEmail}
          ${loginMethod==='password'?`<label>密码<input required name="password" type="password" autocomplete="current-password" placeholder="输入登录密码" minlength="6"></label><button type="submit" data-mode="login" class="sf-cloud-primary sf-cloud-submit">登录</button><button type="button" data-cloud="forgot" class="sf-cloud-link">忘记密码？</button>`:
          `<label>邮箱验证码<input name="code" required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="输入 6 位验证码"></label>${otpSendControl('login','send-login-code')}<button type="submit" data-mode="login-code" class="sf-cloud-primary sf-cloud-submit">验证码登录</button>`}
          </form>`;
      }else if(authView==='signup'){
        content=`${modeTabs}<p class="sf-cloud-hint">新用户先发送邮箱验证码，再设置密码完成注册。已有账号请点击「登录」。</p>
          <form id="sf-cloud-login" class="sf-cloud-login" data-auth-form="signup" novalidate>${baseEmail}
          <label>设置密码（至少 8 位）<input required name="password" type="password" autocomplete="new-password" minlength="8" placeholder="创建新密码"></label>
          <label>六位注册验证码<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="请输入邮件验证码" required></label>
          ${otpSendControl('signup','send-code')}<button type="submit" data-mode="signup" class="sf-cloud-primary sf-cloud-submit">验证并注册</button>
          </form>`;
      }else{
        content=`<div class="sf-cloud-auth-back"><button type="button" data-cloud="tab-login">← 返回登录</button><strong>忘记密码</strong></div>
          <p class="sf-cloud-hint">验证邮箱后设置新密码，验证前不会更改原有密码。</p>
          <form id="sf-cloud-login" class="sf-cloud-login" data-auth-form="reset" novalidate>${baseEmail}
          <label>六位重置验证码<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="输入邮件验证码" required></label>
          ${otpSendControl('reset','send-reset-code')}
          <label>新密码（至少 8 位）<input name="newPassword" autocomplete="new-password" type="password" minlength="8" placeholder="设置新密码" required></label>
          <label>再次输入新密码<input name="confirmPassword" autocomplete="new-password" type="password" minlength="8" placeholder="确认新密码" required></label>
          <button type="submit" data-mode="reset" class="sf-cloud-primary sf-cloud-submit">确认重置密码</button></form>`;
      }
      return `<p class="sf-cloud-hint">WorkBuddy 云账户与本机科研数据相互独立。登录前数据仅保存在本机，登录后也不会自动上传。</p>${state.accountGuard?'<div class="sf-cloud-account-warning" role="status"><strong>账号切换保护已开启</strong><span>本机记录保持不变。登录后请先核对云端版本；不会自动把前一账号的数据上传到新账号。</span></div>':''}${content}<div class="sf-cloud-actions sf-cloud-probe"><button type="button" data-cloud="probe">检查 SDK 会话</button></div>${state.networkIssue?diagnosticsPanel():''}`;
    }
    const equal=snapshotMatches();
    const account=escapeHtml(state.user.email);
    return `
      <section class="sf-cloud-identity" aria-label="当前云端账号">
        <span class="sf-cloud-avatar" aria-hidden="true">${escapeHtml((state.user.email||'U').slice(0,1).toUpperCase())}</span>
        <div class="sf-cloud-identity-text"><span class="sf-cloud-identity-label">当前 WorkBuddy 账号</span><strong>${account}</strong><small>云端修订版本：${state.revision??'未创建'}</small></div>
        <span class="sf-cloud-signed-in">已登录</span>
      </section>
      <div class="sf-cloud-account-actions" aria-label="账号管理">
        <button type="button" data-cloud="switch-account">切换账号</button>
        <button type="button" data-cloud="logout">退出登录</button>
      </div>
      ${state.accountGuard?'<div class="sf-cloud-account-warning" role="status"><strong>账号切换保护中 · 自动同步已暂停</strong><span>此浏览器的数据不按账号自动分开。请核对本机和云端记录；如二者一致，可以点击下方“确认使用本机记录”解除保护。否则请先导出备份，再主动选择上传或恢复。</span><button type="button" data-cloud="review-local" '+(!equal?'disabled title="本机与云端尚不一致"':'')+'>确认使用本机记录</button></div>':''}
      <p class="sf-cloud-connectivity" role="status">${state.online?'● 浏览器报告已联网':'○ 当前离线'} · ${state.conflict?'存在冲突':state.uploading?'正在保存':state.pending?'本机更改待同步':state.active?'自动同步已启用':'手动同步模式'}</p>
      <p class="sf-cloud-compare">${state.remote?(equal?'本机与云端一致':'本机和云端不同，禁止静默覆盖'):'尚无云端记录'}</p>
      <div class="sf-cloud-actions">
        <button type="button" data-cloud="backup">导出本机 JSON</button>
        <button type="button" data-cloud="check">检查云端更新</button>
        ${state.remote?'<button type="button" data-cloud="download">从云端恢复到本机</button>':''}
        <button type="button" class="sf-cloud-primary" data-cloud="upload">${state.remote?'上传本机覆盖云端':'首次上传本机数据'}</button>
      </div>
      <div class="sf-cloud-files"><strong>私有 PDF 备份（可选）</strong><p>仅保存文献中心已经导入到浏览器的 PDF，按登录账户隔离。每份不超过 30 MB；不会自动上传。</p><div class="sf-cloud-actions"><button type="button" data-cloud="pdf-upload">备份本机 PDF</button><button type="button" data-cloud="pdf-download">恢复缺失的 PDF</button></div></div>
      <label class="sf-cloud-checkbox"><input id="sf-cloud-auto" type="checkbox" ${state.active?'checked':''} ${(!equal||state.conflict||state.accountGuard)?'disabled':''}> 两端版本一致时自动同步后续更改</label>
      <p class="sf-cloud-hint">自动同步对象：任务、文献元数据、实验记录、笔记、论文及设置等 JSON。<strong>PDF 原件只能通过上方按钮手动备份/恢复，实验文件与本地路径不上传。</strong>远端数据库管理员有技术访问能力；请勿上传未经授权的敏感资料。</p>`;
  }
  function render(){
    if(!trigger||!panel)return;
    captureAuthDraft();
    trigger.textContent=!configured?'云端未就绪':!state.user?'连接 WorkBuddy 云':state.conflict?'云端冲突':!state.online?'离线 · 本机已保留':state.uploading?'正在上传':state.pending?'待同步':state.active?'自动同步已启用':state.remote?'云端已登录':'云端待首次上传';
    trigger.setAttribute('aria-expanded',String(state.open));
    panel.setAttribute('aria-modal',String(state.open));
    if(backdrop)backdrop.hidden=!state.open;
    document.body.classList.toggle('sf-cloud-dialog-open',state.open);
    panel.hidden=!state.open;
    if(!state.open)return;
    panel.innerHTML=`<div class="sf-cloud-header"><strong>科研数据云端同步</strong><button type="button" data-cloud="close" aria-label="关闭云端面板">×</button></div>
      <div class="sf-cloud-body">${safePanel()}<p class="sf-cloud-message ${state.level==='error'?'sf-cloud-error':''}" role="status" aria-live="polite">${escapeHtml(state.message)}</p></div>`;
    const form=panel.querySelector('#sf-cloud-login');
    if(form)for(const [name,value] of Object.entries(authDraft)){
      const el=form.elements.namedItem(name);
      if(el instanceof HTMLInputElement)el.value=value;
    }
    updateCodeButtons();
    for(const el of panel.querySelectorAll('button,input'))el.disabled=!!state.busy||!!state.uploading||!!state.filesBusy||el.disabled;
  }
  function setOpen(value){state.open=!!value;render();if(value){(panel.querySelector('input:not([disabled])')||panel.querySelector('button:not([disabled])'))?.focus()}else trigger.focus()}
  async function onPanelClick(e){
    const btn=e.target.closest('button[data-cloud]');if(!btn)return;
    const action=btn.dataset.cloud;
    if(action==='close'){setOpen(false);return}
    if(action==='copy-diagnostics'){
      try{
        if(!navigator.clipboard?.writeText)throw Error('此浏览器未提供剪贴板权限');
        await navigator.clipboard.writeText(diagnosticText());
        setMessage('已复制无凭据的诊断摘要，可以发给网站管理员排查。','success');
      }catch(_){setMessage('当前浏览器禁止写入剪贴板；可以展开上方排查信息，手动复制域名和网络状态。','error')}
      return;
    }
    if(action==='probe'){
      if(!configured)return setMessage('WorkBuddy 云 SDK 或项目配置未就绪。','error');
      if(!state.online)return setMessage('设备当前处于离线状态，请先联网。','error');
      state.busy=true;render();
      try{unwrap(await cloud.auth.getSession());setMessage('SDK 会话读取完成，但此操作不一定访问邮件服务器，不能证明验证码接口畅通。','success')}
      catch(e){state.networkIssue=isNetworkTransportFailure(e);setMessage('SDK 会话读取失败：'+authFriendlyError(e),'error')}
      finally{state.busy=false;render()}
      return;
    }
    if(action==='tab-login'){switchAuth('login');return}
    if(action==='tab-signup'){switchAuth('signup');return}
    if(action==='method-password'){switchAuth('login','password');return}
    if(action==='method-code'){switchAuth('login','code');return}
    if(action==='forgot'){switchAuth('reset');return}
    if(action==='send-code'||action==='send-login-code'||action==='send-reset-code'){
      captureAuthDraft();
      await sendAuthCode(String(authDraft.email||'').trim(),action==='send-code'?'signup':action==='send-login-code'?'login':'reset');return;
    }
    if(action==='backup'){backupLocal();return}
    if(action==='pdf-upload'){await syncPdfFiles('upload');return}
    if(action==='pdf-download'){await syncPdfFiles('download');return}
    if(action==='logout'){await logout();return}
    if(action==='switch-account'){await logout({switchAccount:true});return}
    if(action==='review-local'){
      if(!state.user||!state.accountGuard)return;
      if(!snapshotMatches())return setMessage('本机和云端还不一致，请先手动核对两份数据。','error');
      if(!confirm('本机与当前账号的云端 JSON 已确认一致。解除切换保护后仍保持手动同步；是否确认？'))return;
      setPreferred(false);clearAccountReview();state.active=false;updatePending();
      setMessage('已确认当前账号与本机记录一致。自动同步仍处于关闭状态，可按需重新开启。','success');return;
    }
    if(action==='check'){await checkChanges();return}
    if(action==='download'){await restoreRemote();return}
    if(action==='upload'){
      if(state.remote){
        if(!confirm('此操作将以当前浏览器的科研 JSON 覆盖云端版本。请先在其他设备导出云端备份。确定吗？'))return;
      }else if(!confirm('确认首次上传当前浏览器的全部科研 JSON 到云端数据库？其中可能包含本地路径、笔记内容和个人资料。PDF 文件不会上传。'))return;
      await upload({force:true,manual:true});return;
    }
  }
  function start(){
    const wrap=document.createElement('div');wrap.className='sf-cloud-dock';
    wrap.innerHTML='<button type="button" class="sf-cloud-trigger" aria-expanded="false" aria-controls="sf-cloud-panel">连接云端</button><section id="sf-cloud-panel" class="sf-cloud-panel" role="dialog" aria-label="科研数据云端同步" hidden></section>';
    backdrop=document.createElement('div');
    backdrop.className='sf-cloud-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');
    document.body.append(backdrop,wrap);
    trigger=wrap.querySelector('.sf-cloud-trigger');panel=wrap.querySelector('.sf-cloud-panel');
    backdrop.addEventListener('click',()=>setOpen(false));
    trigger.addEventListener('click',()=>setOpen(!state.open));
    panel.addEventListener('click',onPanelClick);
    panel.addEventListener('submit',async e=>{
      if(e.target.id!=='sf-cloud-login')return;
      e.preventDefault();captureAuthDraft();
      const button=e.submitter;
      const email=String(authDraft.email||'').trim();const pass=String(authDraft.password||'');
      const code=String(authDraft.code||'').trim();
      const mode=button?.dataset.mode;
      if(!emailValid(email)){setMessage('请输入正确的邮箱地址。','error');return}
      if(mode==='signup')await verifyAuthCode(email,code,pass,'signup');
      else if(mode==='login-code')await verifyAuthCode(email,code,'','login');
      else if(mode==='reset'){
        if(authDraft.newPassword!==authDraft.confirmPassword){setMessage('两次输入的新密码不一致。','error');return}
        await verifyAuthCode(email,code,String(authDraft.newPassword||''),'reset');
      }else if(mode==='login')await signin(email,pass);
    });
    panel.addEventListener('change',e=>{
      if(e.target.id!=='sf-cloud-auto')return;
      if(state.accountGuard){setMessage('账号刚发生切换，必须先确认使用当前本机记录，才可开启自动同步。','error');return}
      if(e.target.checked&&!snapshotMatches()){setMessage('版本不一致，不能直接开启自动同步。','error');return}
      setPreferred(e.target.checked);state.active=e.target.checked&&snapshotMatches();setMessage(state.active?'已启用自动同步（检测到跨设备冲突时暂停）。':'已关闭自动同步。');
    });
    document.addEventListener('keydown',e=>{
      if(!state.open)return;
      if(e.key==='Escape'){e.preventDefault();setOpen(false);return}
      if(e.key!=='Tab')return;
      const candidates=Array.from(panel.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]'))
        .filter(el=>el.getClientRects().length>0);
      if(!candidates.length){e.preventDefault();panel.focus();return}
      const first=candidates[0],last=candidates[candidates.length-1],active=document.activeElement;
      if(e.shiftKey&&(active===first||!panel.contains(active))){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&(active===last||!panel.contains(active))){e.preventDefault();first.focus()}
    });
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCodeButtons()});
    window.addEventListener('scholarflow:saved',enqueue);
    window.addEventListener('offline',()=>{state.online=false;clearTimeout(state.timer);updatePending();setMessage('网络已断开。本机编辑照常保存；恢复网络后，将先核对云端修订版本再上传。')});
    window.addEventListener('online',async()=>{
      state.online=true;render();if(!configured){bootSdk();return}
      try{
        if(!state.user){await startUser();return}
        await checkChanges();if(state.active&&state.pending)enqueue();
      }catch(e){setMessage('联网后检查云端失败：'+e.message,'error')}
    });
    window.addEventListener('storage',e=>{if(e.key===KEY&&state.active){state.active=false;state.conflict=true;setPreferred(false);setMessage('检测到其他标签页修改本机记录，已暂停云端自动同步。','error')}});
    render();
    let booted=false;
    const bootSdk=()=>{
      if(booted)return;
      initCloud();render();
      if(!configured)return;
      booted=true;
      // SDK alone owns access/refresh tokens and session persistence.
      const onAuth=(event,session)=>{
        const type=typeof event==='string'?event:event?.event||event?.type;
        const payload=session||event?.session||event?.data?.session||event?.data;
        if(type==='SIGNED_OUT'){
          // SDKs may report an unauthenticated state during startup or email OTP
          // request. Only a previously authenticated user has a session to clear.
          if(state.user){requireAccountReview();resetRemote()}
          render();return;
        }
        if(type==='SIGNED_IN'||type==='TOKEN_REFRESHED'||type==='USER_UPDATED'){
          startUser(payload).catch(e=>setMessage('会话更新失败：'+e.message,'error'));
        }
      };
      try{cloud.auth.onAuthStateChange(onAuth)}catch(e){setMessage('云端会话监听不可用：'+e.message,'error')}
      startUser().catch(e=>setMessage('暂时无法检查 WorkBuddy 云会话：'+e.message+'；本机数据未改变。','error'));
      window.setInterval(()=>{if(state.user && state.active && state.online && document.visibilityState==='visible' && !state.uploading)checkChanges()},120000);
    };
    window.addEventListener('scholarflow:workbuddy-sdk-ready',bootSdk);
    bootSdk();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  // Expose only non-secret read-only UI state, useful for acceptance testing.
  window.ScholarCloudStatus=()=>({configured,signedIn:!!state.user,revision:state.revision,autoSync:state.active,conflict:state.conflict,online:state.online,pending:state.pending});
})();
