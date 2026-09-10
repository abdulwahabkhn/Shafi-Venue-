import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { bookingPool } from './postgres-bookings.js';
import { header, sessionValid, requestUrl, type RuntimeRequest } from './auth.js';
import { userInput, type Actor, type StaffUser, type AccountantPermissionKey } from '../shared/staff.js';

const scrypt = (password:string,salt:string,length:number,options:import('node:crypto').ScryptOptions) => new Promise<Buffer>((resolve,reject)=>scryptCallback(password,salt,length,options,(error,key)=>error?reject(error):resolve(key)));
export const staffSchema = `
CREATE TABLE IF NOT EXISTS shafi_users(id uuid PRIMARY KEY,username text UNIQUE NOT NULL,name text NOT NULL,role text NOT NULL,hall text,active boolean NOT NULL DEFAULT true,password_hash text NOT NULL,permissions jsonb NOT NULL DEFAULT '{}'::jsonb);
ALTER TABLE shafi_users ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS shafi_sessions(token_hash text PRIMARY KEY,user_id uuid REFERENCES shafi_users(id) NOT NULL,expires timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS shafi_sessions_user ON shafi_sessions(user_id);
CREATE TABLE IF NOT EXISTS shafi_login_attempts(key text PRIMARY KEY,count integer NOT NULL,expires timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS shafi_staff_audit(id uuid PRIMARY KEY,entity text NOT NULL,action text NOT NULL,actor text NOT NULL,snapshot jsonb NOT NULL,created timestamptz NOT NULL DEFAULT now());
`;
export class AccessError extends Error { status = 403; }
export const owner:Actor={id:'owner',name:'Director (owner access)',role:'Director',hall:null};
export function requireRole(actor:Actor,allowed:Actor['role'][]){if(!allowed.includes(actor.role))throw new AccessError('Your role cannot perform this action.');}
export function hallAccess(actor:Actor,hall:string|null){return actor.role!=='Hall manager'||actor.hall===hall;}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function token(request:RuntimeRequest){return header(request,'cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('shafi_staff='))?.slice(12);}
export async function actorFor(request:RuntimeRequest):Promise<Actor|null>{
 const value=token(request);
 if(value){if(!/^[a-f0-9]{64}$/.test(value))return null;const r=await bookingPool().query('SELECT u.id,u.name,u.role,u.hall,u.permissions FROM shafi_sessions s JOIN shafi_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires>now() AND u.active=true',[hash(value)]);return r.rows[0]?.role==='Hall manager'?null:r.rows[0]||null;}
 return sessionValid(request)?owner:null;
}
export async function passwordHash(password:string){const salt=randomBytes(16).toString('hex');const derived=await scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024} as never) as Buffer;return salt+':'+derived.toString('hex');}
async function matches(password:string,encoded:string){const [salt,expected]=encoded.split(':');const derived=await scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024} as never) as Buffer;const bytes=Buffer.from(expected,'hex');return bytes.length===derived.length&&timingSafeEqual(bytes,derived);}
export async function staffLogin(request:RuntimeRequest,raw:unknown){
 const input=z.object({username:z.string().trim().toLowerCase().min(3).max(60),password:z.string().min(1).max(128)}).parse(raw);
 const ip=header(request,'x-vercel-forwarded-for')||header(request,'x-forwarded-for')||'local';
 for(const [key,limit] of [[hash('user:'+input.username),12],[hash('ip:'+ip),80]] as const){
  const r=await bookingPool().query("INSERT INTO shafi_login_attempts(key,count,expires) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN shafi_login_attempts.expires<now() THEN 1 ELSE shafi_login_attempts.count+1 END,expires=CASE WHEN shafi_login_attempts.expires<now() THEN now()+interval '15 minutes' ELSE shafi_login_attempts.expires END RETURNING count",[key]);
  if(r.rows[0].count>limit)throw new AccessError('Too many sign-in attempts. Try again in 15 minutes.');
 }
 const r=await bookingPool().query('SELECT * FROM shafi_users WHERE username=$1',[input.username]);const u=r.rows[0];
 const fallback='00000000000000000000000000000000:'+ '00'.repeat(64);
 const valid=await matches(input.password,u?.password_hash||fallback);
 if(!u?.active||u.role==='Hall manager'||!valid)throw new AccessError('Username or password is incorrect.');
 const value=randomBytes(32).toString('hex');await bookingPool().query("INSERT INTO shafi_sessions(token_hash,user_id,expires) VALUES($1,$2,now()+interval '8 hours')",[hash(value),u.id]);
 return {actor:{id:u.id,name:u.name,role:u.role,hall:u.hall} as Actor,cookie:staffCookie(request,value)};
}
export function staffCookie(request:RuntimeRequest,value=''){return `shafi_staff=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${value?28800:0}${requestUrl(request).protocol==='https:'?'; Secure':''}`;}
export async function staffLogout(request:RuntimeRequest){const value=token(request);if(value)await bookingPool().query('DELETE FROM shafi_sessions WHERE token_hash=$1',[hash(value)]);return staffCookie(request);}
export async function users(actor:Actor):Promise<StaffUser[]>{requireRole(actor,['Director','GM','Accountant']);return (await bookingPool().query('SELECT id,name,username,role,hall,active,permissions FROM shafi_users ORDER BY name')).rows;}
export async function saveUser(actor:Actor,id:string,raw:unknown){
 requireRole(actor,['GM']);const input=userInput.parse(raw);
 if(input.role==='Hall manager')throw new AccessError('Hall Manager portals are no longer supported.');
 if(id===actor.id&&!input.active)throw new AccessError('You cannot disable your current account.');
 if(id===actor.id&&input.role!=='GM')throw new AccessError('You cannot remove your own GM role.');
 const password=input.password?await passwordHash(input.password):null;
 const c=await bookingPool().connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(7352421)');const existing=(await c.query('SELECT id,password_hash FROM shafi_users WHERE id=$1',[id])).rows[0];if(!existing&&!password)throw new Error('Set a password for the new account.');

 await c.query('INSERT INTO shafi_users(id,username,name,role,hall,active,password_hash,permissions) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET username=$2,name=$3,role=$4,hall=$5,active=$6,password_hash=COALESCE($7,shafi_users.password_hash),permissions=$8',[id,input.username,input.name,input.role,null,input.active,password||existing?.password_hash,JSON.stringify(input.role==='Accountant'?input.permissions:{})]);
 await c.query('DELETE FROM shafi_sessions WHERE user_id=$1',[id]);
 await c.query('INSERT INTO shafi_staff_audit(id,entity,action,actor,snapshot) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,existing?'Account updated; sessions revoked':'Account created',actor.name,JSON.stringify({name:input.name,role:input.role,hall:input.hall,active:input.active})]);await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 return {id,name:input.name,username:input.username,role:input.role,hall:input.hall,active:input.active,permissions:input.permissions};
}

export function hasPermission(actor:Actor,key:AccountantPermissionKey){if(actor.role!=='Accountant')return true;const p=actor.permissions||{};if(key in p)return !!p[key];return ['expenseView','expenseAdd','expenseRemove','inventoryView','inventoryAdd','inventoryRemove','inventoryDamage','inventoryReplace','attendanceView','attendanceEdit','employeeView'].includes(key);}
