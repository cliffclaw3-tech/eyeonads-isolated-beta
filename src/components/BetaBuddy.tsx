'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
type Notice={id:string;message:string};
export function BetaBuddy() {
  const page=usePathname();
  const [open,setOpen]=useState(false),[text,setText]=useState(''),[kind,setKind]=useState('bug'),[consent,setConsent]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [diagnostics,setDiagnostics]=useState<{code:string;status?:number}[]>([]),[notices,setNotices]=useState<Notice[]>([]);
  const [canCorrect,setCanCorrect]=useState(false);
  const [signedOut,setSignedOut]=useState(false);
  useEffect(()=>{
    // Deliberately no global fetch interception or stack/message capture.
    const error=()=>setDiagnostics(old=>[...old.slice(-9),{code:'client_error'}]);
    const diagnostic=(event:Event)=>{const d=(event as CustomEvent).detail;if(d&&['http_error','network'].includes(d.code))setDiagnostics(old=>[...old.slice(-9),{code:d.code,status:d.status}]);};
    window.addEventListener('beta-buddy-diagnostic',diagnostic);
    window.addEventListener('error',error); window.addEventListener('unhandledrejection',error);
    const poll=async()=>{try{const r=await fetch('/api/beta-buddy',{cache:'no-store'});setSignedOut(r.status===404);if(r.ok){const b=await r.json();setNotices(b.notifications||[]);setCanCorrect(b.can_request_correction===true);}}catch{}};
    void poll();const timer=setInterval(poll,60000);
    return()=>{clearInterval(timer);window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',error);window.removeEventListener('beta-buddy-diagnostic',diagnostic);};
  },[]);
  async function submit(){setBusy(true);setMessage('');try{
    const r=await fetch('/api/beta-buddy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,description:text,page,diagnostics,consent})});
    const b=await r.json();if(!r.ok)throw Error(b.error||'Your report could not be saved.');
    setMessage(b.status==='feature_review'?'Suggestion saved for review. Features are never added automatically.':kind==='correction'?'Correction request saved for an authorized person to review. No data was changed.':b.status==='blocked'?'Report saved. A repair connection needs setup; this has been flagged for the operator.':b.status==='review_required'?'Report saved for operator review. Access or sensitive changes will not be made automatically.':'Report saved. We’ll show an update here when there is a verified beta fix to retry.');setText('');setConsent(false);
  }catch(e){setMessage(e instanceof Error?e.message:'Could not send. Your message is still here.');}finally{setBusy(false);}}
  return <aside id="beta-buddy-root" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-blue-300 bg-slate-950 p-4 text-white shadow-xl" aria-label="Beta Buddy">
    <button onClick={()=>setOpen(!open)} aria-expanded={open} className="font-semibold">Beta Buddy · {open?'Close':'Get help'}{notices.length?' • Update':''}</button>
    {open&&<div className="mt-3 space-y-3"><p>Hit a problem? Tell us what you expected and what happened. Keep this page open to retain your unsent message.</p>
      {signedOut&&<p><a className="underline" href="/login">Sign in</a> to send a report and receive your private repair updates.</p>}
      {notices.map(n=><p role="status" key={n.id}>{n.message}</p>)}
      <label className="block">Report type<select className="block w-full bg-slate-800 p-2" value={kind} onChange={e=>setKind(e.target.value)}><option value="bug">Something isn’t working</option><option value="feature">Suggest a feature</option>{canCorrect&&<option value="correction">Request a data correction</option>}</select></label>
      <label className="block">What happened?<textarea className="block w-full bg-slate-800 p-2" maxLength={2000} value={text} onChange={e=>setText(e.target.value)}/></label>
      <p className="text-xs">Do not include passwords, API keys, contracts, client details or financial information. Only this message, the page category, limited error codes and basic setup status are sent. No screenshots or form data are captured.</p>
      <label className="block"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Send this report and limited diagnostics to beta support</label>
      <button disabled={busy||signedOut||!consent||text.trim().length<10} onClick={submit} className="rounded bg-blue-600 p-2 disabled:opacity-50">{busy?'Sending…':'Send report'}</button><p role="status">{message}</p>
      <p className="text-xs">Repairs run only in the isolated beta. Access, privacy, payment and contract-rule changes require review.</p>
    </div>}
  </aside>;
}
