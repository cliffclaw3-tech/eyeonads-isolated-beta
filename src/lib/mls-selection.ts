import directory from './mls-directory.json' with {type:'json'};
export const MLS_DIRECTORY = directory;
export type MlsSelection = {id:string;name:string};
export function parseMlsSelections(value:unknown):MlsSelection[] {
 if(!Array.isArray(value)||value.length>10)throw Error('Choose up to ten MLS organizations.');
 const seen=new Set<string>();
 const result=value.map(item=>{
  if(!item||typeof item.id!=='string'||typeof item.name!=='string')throw Error('Choose an MLS or enter its name.');
  const known=directory.organizations.find(row=>row.id===item.id);
  const name=known?.name || item.name.trim();
  if(!known && item.id!=='other' && item.id!=='unsure')throw Error('Choose an MLS from the list or Other.');
  if(item.id==='unsure')return {id:'unsure',name:'Not sure yet'};
  if(name.length<3||name.length>120||/[\x00-\x1f\x7f]/.test(name)||/https?:|sk[-_]|password|api.?key|bearer/i.test(name))throw Error('Enter the MLS name only, not a key or URL.');
  const key=item.id==='other'?name.toLowerCase():item.id;if(seen.has(key))throw Error('This MLS is already selected.');seen.add(key);
  return {id:item.id,name};
 });
 if(result.some(item=>item.id==='unsure')&&result.length>1)throw Error('Remove Not sure when choosing an MLS.');
 return result;
}
