export async function bookingApi(body?:unknown,id?:string){
 const response=await fetch(`/api/bookings${id?`?id=${encodeURIComponent(id)}`:''}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
 if(!(response.headers.get('content-type')??'').includes('application/json'))throw new Error('The booking service is unavailable. Please retry.');
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to load bookings.');return result;
}
