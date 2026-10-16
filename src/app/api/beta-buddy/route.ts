import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buddyEnabled, buddyRequest, sanitizeBuddyReport, readBuddyBody } from '@/lib/beta-buddy';
import { isBroker } from '@/lib/broker-access';
export const runtime = 'nodejs';
async function identity() {
  if (!buddyEnabled()) return null;
  const db=await createClient(); const {data:{user}}=await db.auth.getUser();
  return user;
}
export async function GET() {
  const user=await identity(); if(!user)return NextResponse.json({error:'Beta support is unavailable.'},{status:404});
  try { const db=await createClient();return NextResponse.json({...await buddyRequest('GET','/v1/notifications',user.id),can_request_correction:await isBroker(db,user)},{headers:{'Cache-Control':'no-store'}}); }
  catch { return NextResponse.json({error:'Beta support is temporarily unavailable.'},{status:503}); }
}
export async function POST(request:Request) {
  const user=await identity(); if(!user)return NextResponse.json({error:'Beta support is unavailable.'},{status:404});
  if(request.headers.get('origin')!==process.env.BETA_BUDDY_APP_ORIGIN)return NextResponse.json({error:'Invalid origin.'},{status:403});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Use JSON.'},{status:415});
  let raw;try{raw=await readBuddyBody(request);}catch{return NextResponse.json({error:'Report is too large.'},{status:413});}
  let report; try {report=sanitizeBuddyReport(JSON.parse(raw));} catch {return NextResponse.json({error:'Use 10–2,000 characters and allow the report to be sent.'},{status:400});}
  try {
    const db=await createClient();
    const broker=await isBroker(db,user);
    const setup=broker ? await db.from('eyeonads_brokerage_setups').select('agents').eq('owner_id',user.id).maybeSingle() : null;
    const context={broker_access:broker,pilot_access:user.app_metadata?.eyeonads_pilot===true,has_setup:!!setup?.data,roster_count:Array.isArray(setup?.data?.agents)?setup.data.agents.length:0};
    return NextResponse.json(await buddyRequest('POST','/v1/reports',user.id,{...report,context,actor_role:broker?'broker':'agent'}),{status:201,headers:{'Cache-Control':'no-store'}});
  }
  catch (error) {return NextResponse.json({error:error instanceof Error?error.message:'Report could not be saved.'},{status:503});}
}
