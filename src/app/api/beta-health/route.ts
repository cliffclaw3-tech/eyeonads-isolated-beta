import {buddyEnabled} from '@/lib/beta-buddy';
import {betaReadyLabel} from '@/components/BetaReadyLabel';
export const dynamic='force-dynamic';
export async function GET() {
  if(!buddyEnabled())return Response.json({error:'Not found'},{status:404});
  const ready=betaReadyLabel(true)==='Ready';
  return Response.json({environment:'beta',isolated:true,ready,label:betaReadyLabel(true),commit:process.env.VERCEL_GIT_COMMIT_SHA||'local'},
    {status:ready?200:503,headers:{'Cache-Control':'no-store'}});
}
