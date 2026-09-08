export async function staffApi<T>(resource:string,data?:unknown,params:Record<string,string>={}):Promise<T>{
 const response=await fetch(`/api/staff?${new URLSearchParams({...params,resource})}`,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined,cache:'no-store'});
 if(!(response.headers.get('content-type')??'').includes('application/json'))throw new Error('The staff service is unavailable. Please retry.');
 const result=await response.json();if(!response.ok){const error=new Error(result.error||'Unable to complete request.');Object.assign(error,{status:response.status});throw error;}return result;
}
