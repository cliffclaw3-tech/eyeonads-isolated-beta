type DraftAgent = {name:string;email:string;social_url:string;office?:string};
type Suggestion = {name:string;office:string;profile_url?:string};
const key=(name:string)=>name.replaceAll(',', ' ').trim().replace(/\s+/g,' ').toLowerCase();
export function mergePublicRoster<T extends DraftAgent>(current:T[],suggestions:Suggestion[]) {
 const names=new Set<string>();
 for(const candidate of suggestions){
  const name=key(candidate.name);
  if(names.has(name))throw Error(`More than one public profile is named ${candidate.name}. Review these people separately using your company roster before adding them.`);
  names.add(name);
 }
 const merged=[...current];let added=0,existing=0;
 for(const candidate of suggestions){
  const matches=merged.filter(agent=>key(agent.name)===key(candidate.name));
  if(matches.length){existing++;continue;}
  merged.push({name:candidate.name,email:'',social_url:'',office:candidate.office} as T);added++;
 }
 return {agents:merged,added,existing};
}
