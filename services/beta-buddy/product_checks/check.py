"""Operator-owned checks for one registered EyeOnAds display defect.

This contract cannot approve arbitrary UI/code changes. Unknown bugs go to review.
Runs inside the image without network, credentials or editable check definitions.
"""
import pathlib,re,subprocess,sys
name=sys.argv[1]
source=pathlib.Path('src/components/BetaReadyLabel.ts')
def node(script):
    return subprocess.run(['node','--experimental-strip-types','--input-type=module','-e',script],capture_output=True,text=True)
if name=='reported_behavior':
    result=node("import {betaReadyLabel} from './src/components/BetaReadyLabel.ts'; process.exit(betaReadyLabel(true)==='Ready'?0:23)")
    raise SystemExit(result.returncode)
if name in ('existing_behavior','regression'):
    script="import assert from 'node:assert/strict';import {betaReadyLabel} from './src/components/BetaReadyLabel.ts';assert.equal(betaReadyLabel(false),'Checking');"
    if name=='regression':script+="assert.deepEqual([false,true,false].map(betaReadyLabel),['Checking','Ready','Checking']);"
    assert node(script).returncode==0
elif name=='typecheck':subprocess.run(['node','node_modules/typescript/bin/tsc','--noEmit'],check=True)
elif name=='build':subprocess.run(['node','node_modules/next/dist/bin/next','build','--webpack'],check=True)
elif name=='tenant_isolation':subprocess.run(['node','--experimental-strip-types','--test','tests/beta-buddy.test.mjs'],check=True)
elif name=='production_denied':
    subprocess.run(['python3','-m','unittest','test_buddy.BuddyTests.test_production_configuration_denied'],cwd='/trusted/buddy',check=True)
elif name=='diff_security_review':
    text=re.sub(r'//[^\n]*','',source.read_text()).strip()
    expected="export function betaReadyLabel(ready: boolean): string { return ready ? 'Ready' : 'Checking'; }"
    assert re.sub(r'\s+',' ',text)==expected
    paths=subprocess.check_output(['git','diff','--cached','--name-only'],text=True).splitlines()
    assert paths==['src/components/BetaReadyLabel.ts']
else:raise ValueError('Unregistered check')
