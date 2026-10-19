"use client";
import {useState} from 'react';
import {MLS_DIRECTORY,type MlsSelection} from '@/lib/mls-selection';
const aliases:Record<string,string>={tvrmls:'M00000580','tn/va':'M00000580',kaar:'M00000582',kaarmls:'M00000582',laar:'M00000584',laamls:'M00000584'};
export function MlsPicker({selected,onChange,disabled}:{selected:MlsSelection[];onChange:(value:MlsSelection[])=>void;disabled:boolean}) {
 const [query,setQuery]=useState(''),[error,setError]=useState('');
 function add(){
  setError('');const text=query.trim();if(!text)return;
  const row=MLS_DIRECTORY.organizations.find(row=>`${row.name} — ${row.city}, ${row.state}`===text||row.name.toLowerCase()===text.toLowerCase()||row.id===aliases[text.toLowerCase()]);
  const next={id:row?.id||'other',name:row?.name||text};
  if(text.length>120&&!row){setError('Use a shorter MLS name.');return;}
  if(selected.some(item=>item.id===next.id&&(next.id!=='other'||item.name.toLowerCase()===next.name.toLowerCase()))){setError('That MLS is already selected.');return;}
  if(selected.filter(item=>item.id!=='unsure').length>=10){setError('Choose up to ten MLS organizations.');return;}
  onChange([...selected.filter(item=>item.id!=='unsure'),next]);setQuery('');
 }
 return <section aria-labelledby="mls-picker-heading" className="space-y-3 rounded-lg border border-white/20 p-4">
  <h3 id="mls-picker-heading" className="font-semibold">Which MLS does your brokerage use?</h3>
  <p className="text-sm text-white/75">Optional. Search by MLS name, city or state. Add more than one if your offices use different MLSs. You do not need an API key to get started.</p>
  <label className="block">Find your MLS<input list="mls-directory" value={query} disabled={disabled} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}} className="mt-1 min-h-11 w-full rounded-lg bg-slate-900 p-3" placeholder="For example, TVRMLS or Knoxville" autoComplete="off"/></label>
  <datalist id="mls-directory">{MLS_DIRECTORY.organizations.map(row=><option key={row.id} value={`${row.name} — ${row.city}, ${row.state}`}/>)}</datalist>
  <div className="flex flex-wrap gap-4"><button type="button" disabled={disabled||!query.trim()} onClick={add} className="min-h-11 rounded-lg border border-blue-400 px-4">Add MLS</button><button type="button" disabled={disabled} onClick={()=>{onChange([{id:'unsure',name:'Not sure yet'}]);setError('');}} className="min-h-11 underline">I'm not sure</button></div>
  {selected.length>0&&<ul className="space-y-2 text-sm">{selected.map(item=><li key={`${item.id}|${item.name}`} className="flex items-center justify-between gap-3"><span>{item.name} — {item.id==='unsure'?'we can help identify it':'selected, not connected'}</span><button type="button" disabled={disabled} onClick={()=>onChange(selected.filter(row=>row!==item))} aria-label={`Remove ${item.name}`} className="min-h-11 underline">Remove</button></li>)}</ul>}
  <p className="text-sm text-white/65">Not listed? Type its full name and choose Add MLS. Selecting an MLS does not activate a connection. If a roster is incomplete, we will show the gap and help you use a roster export or supported MLS connection.</p>
  <p className="text-xs text-white/55">Names from <a href={MLS_DIRECTORY.source} target="_blank" rel="noopener noreferrer" className="underline">RESO's U.S. MLS directory</a>, checked {MLS_DIRECTORY.checked}. Organizations and access arrangements can change.</p>
  {error&&<p role="alert" className="text-amber-200">{error}</p>}
 </section>;
}
