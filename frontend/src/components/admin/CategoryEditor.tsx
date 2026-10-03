'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import MediaUpload from '@/components/admin/MediaUpload';

interface CategoryData {
  _id?:string; name:string; slug:string; description:string; image?:string|null; order:number;
  status:'draft'|'published'|'archived';
  customFields:{key:string;label:string;type:'text'|'number'|'date'|'select';required:boolean;options:string[]}[];
  seo:{title:string;description:string;keywords:string[]};
  aeo:{summary:string;keyFacts:string[]};
  geo:{intent:string;localNotes:string};
}
const blank:CategoryData={name:'',slug:'',description:'',image:null,order:0,status:'draft',customFields:[],seo:{title:'',description:'',keywords:[]},aeo:{summary:'',keyFacts:[]},geo:{intent:'',localNotes:''}};

export default function CategoryEditor({categoryId}:{categoryId?:string}){
 const router=useRouter(); const [form,setForm]=useState<CategoryData>(blank); const [loading,setLoading]=useState(Boolean(categoryId)); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
 useEffect(()=>{if(!categoryId){setLoading(false);return;} api.get<{success:boolean;category:CategoryData}>(`/api/categories/${categoryId}`).then(r=>setForm({...blank,...r.category,image:typeof r.category.image==='object'?(r.category.image as any)._id:r.category.image||null,seo:{...blank.seo,...r.category.seo},aeo:{...blank.aeo,...r.category.aeo},geo:{...blank.geo,...r.category.geo}})).catch(e=>setError(e instanceof Error?e.message:'Failed to load')).finally(()=>setLoading(false));},[categoryId]);
 const set=(patch:Partial<CategoryData>)=>setForm(v=>({...v,...patch}));
 const submit=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{const p={...form,slug:form.slug.trim()||undefined,image:form.image||null,order:Number(form.order),seo:{...form.seo},aeo:{...form.aeo}};if(categoryId)await api.put(`/api/categories/${categoryId}`,p);else await api.post('/api/categories',p);router.push('/admin/categories');}catch(e:unknown){setError(e instanceof Error?e.message:'Failed to save category');}finally{setSaving(false);}};
 if(loading)return <p className="text-sm text-gray-500">Loading category…</p>;
 return <form onSubmit={submit} className="space-y-6">
  {error&&<div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
  <section className="card space-y-4"><h2 className="font-semibold">Category identity</h2>
   <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Name *<input className="input mt-1" required value={form.name} onChange={e=>set({name:e.target.value})}/></label><label className="text-sm font-medium">Slug<input className="input mt-1" value={form.slug} onChange={e=>set({slug:e.target.value})}/></label></div>
   <label className="text-sm font-medium">Description<textarea className="input mt-1" maxLength={2000} value={form.description} onChange={e=>set({description:e.target.value})}/></label>
   <MediaUpload purpose="category" value={form.image?[form.image]:[]} onChange={v=>set({image:v[0]||null})} label={form.image?'Replace category image':'Upload category image'}/>
   <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Sort order<input className="input mt-1" type="number" min="0" value={form.order} onChange={e=>set({order:Number(e.target.value)})}/></label><label className="text-sm font-medium">Status<select className="input mt-1" value={form.status} onChange={e=>set({status:e.target.value as CategoryData['status']})}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div>
  </section>
  <section className="card space-y-4"><h2 className="font-semibold">Typed product fields</h2>
   {(form.customFields||[]).map((f,i)=><div key={i} className="rounded-lg border p-3 space-y-3"><div className="grid gap-3 sm:grid-cols-2"><input className="input" placeholder="Key e.g. screen-size" value={f.key} onChange={e=>set({customFields:form.customFields.map((x,j)=>j===i?{...x,key:e.target.value}:x)})}/><input className="input" placeholder="Label e.g. Screen size" value={f.label} onChange={e=>set({customFields:form.customFields.map((x,j)=>j===i?{...x,label:e.target.value}:x)})}/><select className="input" value={f.type} onChange={e=>set({customFields:form.customFields.map((x,j)=>j===i?{...x,type:e.target.value as any}:x)})}><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Select</option></select><input className="input" placeholder="Select options, comma separated" disabled={f.type!=='select'} value={f.options.join(', ')} onChange={e=>set({customFields:form.customFields.map((x,j)=>j===i?{...x,options:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)}:x)})}/></div><div className="flex justify-between"><label className="text-sm"><input type="checkbox" checked={f.required} onChange={e=>set({customFields:form.customFields.map((x,j)=>j===i?{...x,required:e.target.checked}:x)})}/> Required</label><button type="button" className="text-xs text-red-600" onClick={()=>set({customFields:form.customFields.filter((_,j)=>j!==i)})}>Remove</button></div></div>)}
   <button type="button" className="btn-secondary text-sm" onClick={()=>set({customFields:[...form.customFields,{key:'',label:'',type:'text',required:false,options:[]}]})} disabled={form.customFields.length>=30}>+ Add field</button>
  </section>
  <section className="card space-y-4"><h2 className="font-semibold">SEO / AEO</h2><input className="input" placeholder="SEO title" maxLength={70} value={form.seo.title} onChange={e=>set({seo:{...form.seo,title:e.target.value}})}/><textarea className="input" placeholder="SEO description" maxLength={170} value={form.seo.description} onChange={e=>set({seo:{...form.seo,description:e.target.value}})}/><textarea className="input" placeholder="AEO summary" maxLength={1000} value={form.aeo.summary} onChange={e=>set({aeo:{...form.aeo,summary:e.target.value}})}/><textarea className="input" placeholder="AEO key facts, one per line" value={form.aeo.keyFacts.join('\n')} onChange={e=>set({aeo:{...form.aeo,keyFacts:e.target.value.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,20)}}}/></section>
  <section className="card flex gap-3"><button className="btn-primary" disabled={saving}>{saving?'Saving…':categoryId?'Save category':'Create category'}</button><button type="button" className="btn-secondary" onClick={()=>router.push('/admin/categories')}>Cancel</button></section>
 </form>;
}
