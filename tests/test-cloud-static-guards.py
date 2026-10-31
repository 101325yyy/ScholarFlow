"""No production secrets, private bucket + RLS and PWA route allowlist sanity checks."""
from pathlib import Path
import ast, json, re
root=Path(__file__).resolve().parents[1]
config=(root/'site/cloud-config.js').read_text()
assert 'oauthRelayBaseUrl' in config and 'publishableKey' in config and 'endpoint' in config
assert not any(key in config.lower() for key in ('service_role','sb_secret_','projectid'))
assert 'https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js' in (root/'site/index.html').read_text()
sync=(root/'site/cloud-sync.js').read_text()
assert 'WorkBuddyCloud?.createWorkBuddyCloud' in sync
assert 'challenges.signup.verify({token:code,password})' in sync
assert 'verificationToken=' not in sync
assert ".eq('revision',state.revision)" in sync
assert 'cloud.storage.userPath(state.user.id' in sync
assert 'sf-cloud-backdrop' in sync and "panel.setAttribute('aria-modal',String(state.open))" in sync
sql=(root/'cloud/schema.sql').read_text()
assert 'alter table public.scholarflow_snapshots enable row level security' in sql
assert "bucket_id='scholarflow-pdfs'" in sql
assert 'for select to authenticated' in sql
assert 'for insert to authenticated' in sql
assert 'sf_pdf_select_own' in sql and 'sf_pdf_insert_own' in sql
assert 'file_size_limit=31457280' in sql
assert "public=false" in sql
sw=(root/'site/sw.js').read_text()
assert "req.method!=='GET'" in sw
assert "const rel=u.pathname.slice(scopePath.length)" in sw
assert "if(!allowed.has(rel))return" in sw
assert "u.origin!==self.location.origin" in sw
assert "netFirst=req.mode==='navigate'||u.pathname.endsWith('/cloud-config.js')" in sw
files=['site/index.html','site/app.js','site/research-suite.js','site/pdf-intelligence.js','site/styles.css','site/cloud-sync.js','site/cloud-config.js','site/sw.js','site/manifest.webmanifest','site/cloud.css','site/online.css','site/assets/icon-192.png','site/assets/icon-512.png']
for f in files:assert (root/f).is_file(),f
manifest=json.loads((root/'site/manifest.webmanifest').read_text())
assert manifest.get('display')=='standalone'
for p in (root/'tests').glob('*.py'):ast.parse(p.read_text())
print('PASS 19 static cloud/privacy/PWA guards and all Python test files parse')
