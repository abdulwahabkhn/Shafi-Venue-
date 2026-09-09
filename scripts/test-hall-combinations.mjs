import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({configFile:false,server:{middlewareMode:true}});
try {
  const {bookingInput,overlap} = await vite.ssrLoadModule('/shared/bookings.ts');
  const {bookingHallOptions} = await vite.ssrLoadModule('/shared/halls.ts');
  const base={customer:'Test customer',phone:'03001234567',event:'Walima',date:'2027-10-20',start:'18:00',end:'22:00',guests:100,total:10000,manager:'',notes:'',status:'Confirmed'};
  const members=[[1],[2],[3],[1,2],[1,3],[2,3],[1,2,3]];
  for(let i=0;i<7;i++) for(let j=0;j<7;j++) {
    const a=bookingInput.parse({...base,hall:bookingHallOptions[i]});
    const b=bookingInput.parse({...base,hall:bookingHallOptions[j]});
    assert.equal(overlap(a,b),members[i].some(h=>members[j].includes(h)));
    assert.equal(overlap(a,{...b,start:'22:00',end:'23:00'}),false);
    assert.equal(overlap({...a,start:'23:00',end:'02:00',endDate:'2027-10-21'},{...b,date:'2027-10-21',start:'01:00',end:'03:00'}),members[i].some(h=>members[j].includes(h)));
  }
  assert.equal(bookingInput.safeParse({...base,hall:'Hall 4'}).success,false);
  console.log('Passed: all 49 hall combinations, adjacent times, overnight overlaps and invalid hall rejection.');
} finally { await vite.close(); }
