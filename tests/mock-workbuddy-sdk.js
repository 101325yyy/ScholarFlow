(() => {
const db={revision:null,payload:null,versionConflict:false,writes:0,storage:new Map(),callbacks:[],callCount:0,login:0,otp:0,verify:0,reset:0,signup:0,clientCount:0,errorStatus:null,loginFailPassword:false};
window.__db=db;window.confirm=()=>true;
const fakeStore=new Map();
Object.defineProperty(window,'localStorage',{configurable:true,value:{
getItem:key=>fakeStore.has(key)?fakeStore.get(key):null,
setItem:(key,val)=>fakeStore.set(key,String(val)),
removeItem:key=>fakeStore.delete(key)
}});
window.WorkBuddyCloud={createWorkBuddyCloud:(options)=>{
  db.clientCount++;window.__cloudOptions=options;return ({
  auth:{
    getSession:async()=>({data:{session:window.__session||null}}),
    onAuthStateChange:cb=>{db.callbacks.push(cb);return {data:{subscription:{unsubscribe(){}}}}},
    signInWithPassword:async({email})=>{db.login++;if(db.loginFailPassword)return {error:{message:'user password not set'}};window.__session={user:{id:db.nextUserId||'user-test',email}};return {data:window.__session}},
    signInWithOtp:async({email})=>{db.otp++;const existing=!email.startsWith('new');return {data:{verificationId:'v1',isExistingUser:existing,verify:async({token,password})=>{db.verify++;if(token!=='123456'||(!existing&&!password))return {error:{message:'bad code'}};window.__session={user:{id:db.nextUserId||'user-test',email}};return {data:window.__session}}}}},
    resetPasswordForEmail:async(email)=>{db.reset++;return {data:{updateUser:async({nonce,password})=>{if(nonce!=='123456'||password.length<8)return {error:{message:'bad code or password'}};window.__session={user:{id:db.nextUserId||'user-test',email}};return {data:window.__session}}}}},
    signUp:async()=>{db.signup++;throw Error('signUp must never be called')},
    signOut:async()=>{window.__session=null;db.callbacks.forEach(cb=>cb('SIGNED_OUT',null));return {data:true}}
  },
  database:{from:()=>({
    select:()=>({maybeSingle:async()=>({data:db.revision===null?null:{revision:db.revision,payload:JSON.parse(JSON.stringify(db.payload))}})}),
    insert:input=>({select:async()=>{
      if(db.revision!==null)return {error:{status:409,message:'already exists'}};
      db.revision=input.revision;db.payload=input.payload;db.writes++;
      return {data:[{revision:db.revision,payload:db.payload}]};
    }}),
    update:input=>({eq:(key,old)=>({select:async()=>{
      if(db.errorStatus===401)return {data:null,error:{code:'DATABASE_42501',message:'permission denied'},status:401,success:false};if(old!==db.revision||db.versionConflict)return {data:[],status:200,success:true};
      db.revision=input.revision;db.payload=input.payload;db.writes++;
      return {data:[{revision:db.revision,payload:db.payload}]};
    }})})
  })},
  storage:{userPath:(uid,name)=>uid+'/'+name,upload:async(path,file,opts)=>{if(db.storage.has(path))return {error:{code:'CONFLICT',message:'already exists'},status:409,success:false};db.storage.set(path,file);return {data:{path},success:true,status:200}},download:async(path)=>db.storage.has(path)?db.storage.get(path):{error:{message:'not found'},status:404,success:false}}
})}};
window.SCHOLARFLOW_CLOUD_CONFIG={endpoint:'https://example.com',publishableKey:'test_public_key',oauthRelayBaseUrl:'https://www.workbuddy.cn/v2/as/genie-baas/oauth'};
window.__setData=d=>localStorage.setItem('scholarflow_v1_data',JSON.stringify(d));
window.__getData=()=>JSON.parse(localStorage.getItem('scholarflow_v1_data'));
})();
