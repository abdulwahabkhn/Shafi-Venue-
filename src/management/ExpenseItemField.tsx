import { useState } from 'react';

export default function ExpenseItemField({items}:{items:readonly string[]}) {
 const [selection,setSelection]=useState('');
 const [customName,setCustomName]=useState('');
 const name=selection==='new'?customName:items[Number(selection.slice(6))]||'';
 return <>
  <label>Expense item
   <select required value={selection} onChange={e=>setSelection(e.currentTarget.value)}>
    <option value="" disabled>Select an expense item</option>
    {items.map((item,index)=><option key={item} value={`saved:${index}`}>{item}</option>)}
    <option value="new">+ Add new item</option>
   </select>
  </label>
  {selection==='new'&&<label>New expense name
   <input required minLength={2} maxLength={160} value={customName} onChange={e=>setCustomName(e.currentTarget.value)} aria-describedby="new-expense-name-help"/>
   <span id="new-expense-name-help">Saving this expense adds its name to the list for future use.</span>
  </label>}
  <input type="hidden" name="name" value={selection?name:''}/>
 </>;
}
