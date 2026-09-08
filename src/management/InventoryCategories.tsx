import { ChevronRight } from 'lucide-react';
import { inventoryCategories } from '../../shared/inventory';
import type { InventoryRow } from '../../shared/registers';

export default function InventoryCategories({items,disabled,onOpen}:{items:InventoryRow[];disabled:boolean;onOpen:(category:string)=>void}){
 const counts=new Map<string,number>();
 for(const item of items)if(!item.archived){const category=item.category||'Other';counts.set(category,(counts.get(category)||0)+1);}
 const categories=inventoryCategories.filter(c=>!['Furniture','Dining','Electrical'].includes(c)||counts.has(c));
 return <section className="ops-panel"><h2>Inventory categories</h2><p>Choose a category to open its items.</p>
  <ul className="inventory-categories">{categories.map(category=><li key={category}><button type="button" disabled={disabled} onClick={()=>onOpen(category)}>
   <strong>{category}</strong><span>{counts.get(category)||0} items</span><ChevronRight size={20} aria-hidden="true"/>
  </button></li>)}</ul>
  <button type="button" className="ops-button ops-button--quiet" disabled={disabled} onClick={()=>onOpen('All')}>View all items</button>
 </section>;
}
