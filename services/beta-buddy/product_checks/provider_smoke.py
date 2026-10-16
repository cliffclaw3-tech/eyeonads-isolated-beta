import argparse,pathlib,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from codex_proposal import proposal
from poll_worker import apply_proposal
from beta_publisher import SOURCE
parser=argparse.ArgumentParser();parser.add_argument('--codex',required=True);args=parser.parse_args()
source=pathlib.Path(SOURCE).read_text().replace("return ready ? 'Ready' : 'Checking';","return 'Checking';")
result=proposal(args.codex,'The beta status stays Checking after it is ready. Expected Ready when ready is true and Checking when false.',{SOURCE:source},[SOURCE])
apply_proposal(source,result['patch'])
pathlib.Path(__file__).with_name('provider-proposal.patch').write_text(result['patch'])
print('PASS: real provider proposed the registered display repair; bounded patch validation passed. Hosted independent checks still required.')
