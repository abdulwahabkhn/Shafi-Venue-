import { z } from 'zod';
import { header, sameOrigin, type RuntimeRequest } from './auth.js';
export function json(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function body(request:RuntimeRequest,limit=32000){
 if(!sameOrigin(request))throw Object.assign(new Error('Request must come from this website.'),{status:403});
 if(Number(header(request,'content-length')||0)>limit)throw Object.assign(new Error('Request too large.'),{status:413});
 let content:string;
 if(typeof request.text==='function')content=await request.text();
 else if(request.body!==undefined)content=Buffer.isBuffer(request.body)?request.body.toString():typeof request.body==='string'?request.body:JSON.stringify(request.body);
 else{const chunks:Buffer[]=[];let size=0;for await(const chunk of request as unknown as AsyncIterable<Buffer>){size+=chunk.length;if(size>limit)throw Object.assign(new Error('Request too large.'),{status:413});chunks.push(chunk);}content=Buffer.concat(chunks).toString();}
 if(Buffer.byteLength(content)>limit)throw Object.assign(new Error('Request too large.'),{status:413});return JSON.parse(content);
}
export function failure(error:unknown){
 if(error instanceof z.ZodError)return json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},400);
 if(error instanceof SyntaxError)return json({error:'Invalid request.'},400);
 const e=error as Error&{status?:number;code?:string};
 if(e.code==='23505')return json({error:'This record already exists. Reload before trying again.'},409);
 if(e.code){console.error('Private storage failure',e.code);return json({error:'Storage is temporarily unavailable. Your form is still here; retry shortly.'},503);}
 return json({error:e.message||'Unable to complete request.'},e.status||409);
}
export type NodeResponse={statusCode:number;setHeader:(key:string,value:string)=>void;end:(body:Uint8Array)=>void};
export async function deliver(response:Response,res:NodeResponse){res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(new Uint8Array(await response.arrayBuffer()));}
