const {test}=require('node:test');
const assert=require('node:assert/strict');
const {trusted,PORTAL}=require('./policy.cjs');
test('Only exact HTTPS portal origin is trusted',()=>{
  assert.equal(trusted(PORTAL),true);
  assert.equal(trusted('https://shafi-venue.vercel.app/admin/login'),true);
  for(const url of ['http://shafi-venue.vercel.app','https://shafi-venue.vercel.app.evil.test','https://shafi-venue.vercel.app@evil.test','https://evil.test','file:///C:/Windows','javascript:alert(1)','data:text/html,test','https://user:pass@shafi-venue.vercel.app']) assert.equal(trusted(url),false,url);
});
