// Opt-in reporting only; this event contains no request body or error message.
export async function buddyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const note=(code:'http_error'|'network',status?:number)=>{
    if(typeof window!=='undefined'&&document.getElementById('beta-buddy-root'))window.dispatchEvent(new CustomEvent('beta-buddy-diagnostic',{detail:{code,status}}));
  };
  try {const response=await fetch(input,init);if(!response.ok)note('http_error',response.status);return response;}
  catch(error){note('network');throw error;}
}
