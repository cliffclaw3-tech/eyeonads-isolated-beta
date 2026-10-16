"""Trusted CI entrypoint. No report text, deployment token or model in CI."""
import hashlib,json,pathlib,re,subprocess,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from buddy import REQUIRED_CHECKS
from sandbox_runner import run_proposal
root=pathlib.Path.cwd();base,candidate,image=sys.argv[1:]
if any(not re.fullmatch(r'[a-f0-9]{40}',x) for x in (base,candidate)):raise ValueError('Pinned commits required')
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
if git('remote','get-url','origin').removesuffix('.git')!='https://github.com/cliffclaw3-tech/eyeonads-isolated-beta':raise ValueError('Isolated repository only')
git('fetch','--no-tags','origin',base,candidate)
patch=subprocess.check_output(['git','diff','--binary',base,candidate],text=True)
config={'environment':'beta','isolated_data':True,'test_image':image,'local_repository':str(root),'base_commit':base,
        'artifact_directory':str(root/'verified-artifacts'),'allowed_paths':['src/components/BetaReadyLabel.ts'],
        'checks':{name:['python3','/checks/check.py',name] for name in REQUIRED_CHECKS}}
result=run_proposal(config,patch)
print(json.dumps({'baseline_reproduced':result.get('baseline_reproduced',False),'checks':result.get('checks',{})}),flush=True)
if not result.get('baseline_reproduced') or not all(result.get('checks',{}).values()):raise SystemExit('Independent checks rejected candidate')
bundle=root/'verified-artifacts'/(result['commit']+'.bundle')
git('fetch',str(bundle),'HEAD')
if git('rev-parse','FETCH_HEAD^{tree}')!=git('rev-parse',candidate+'^{tree}'):raise ValueError('Verified source tree mismatch')
artifact=root/'verified-artifacts'/'candidate.bundle'
git('update-ref','refs/buddy/verified-candidate',candidate)
git('bundle','create',str(artifact),'refs/buddy/verified-candidate')
result.update(commit=candidate,artifact_digest=hashlib.sha256(artifact.read_bytes()).hexdigest(),base_commit=base)
(root/'verified-artifacts'/'attestation.json').write_text(json.dumps(result,sort_keys=True))
bundle.unlink()
print(json.dumps(result,sort_keys=True))
