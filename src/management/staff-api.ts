export async function staffApi<T>(resource:string,data?:unknown):Promise<T>{
 const response=await fetch(`/api/staff?resource=${encodeURIComponent(resource)}`,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined,cache:'no-store'});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to complete request.');return result;
}
