'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import MediaUpload from '@/components/admin/MediaUpload';

interface Category { _id:string; name:string; slug:string; customFields?: { key:string; label:string; type:string; required:boolean; options:string[] }[]; }
interface ProductData {
  _id?:string; name:string; slug:string; sku?:string|null; brand?:string|null; shortDescription?:string; description?:string;
  cashPrice:number; discountPrice?:number|null; inventory:number; featured:boolean; status:'draft'|'published'|'scheduled'|'archived';
  scheduledAt?:string|null; categoryId?:{_id:string}|string|null; media?:{_id:string;publicUrl:string;altText?:string}[];
  installment?:{advanceAmount:number;financedAmount:number;markupAmount:number;totalPayable:number;tenureMonths:number;installmentAmount:number;frequency:'weekly'|'biweekly'|'monthly'};
  seo?:{title:string;description:string;keywords:string[]}; aeo?:{summary:string;keyFacts:string[];buyingIntent:string};
  faqs?:{question:string;answer:string}[]; customFieldValues?:{key:string;value:string}[];
}

const blank: ProductData = {
  name:'', slug:'', sku:'', brand:'', shortDescription:'', description:'', cashPrice:0, discountPrice:null, inventory:0,
  featured:false,status:'draft',scheduledAt:null,media:[],categoryId:null,
  installment:{advanceAmount:0,financedAmount:0,markupAmount:0,totalPayable:0,tenureMonths:12,installmentAmount:0,frequency:'monthly'},
  seo:{title:'',description:'',keywords:[]},aeo:{summary:'',keyFacts:[],buyingIntent:''},faqs:[],customFieldValues:[]
};

export default function ProductEditor({ productId }: { productId?: string }) {
  const router=useRouter();
  const [form,setForm]=useState<ProductData>(blank);
  const [categories,setCategories]=useState<Category[]>([]);
  const [loading,setLoading]=useState(Boolean(productId));
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{ Promise.all([
    api.get<{success:boolean;categories:Category[]}>('/api/categories?active=false'),
    productId ? api.get<{success:boolean;product:ProductData}>(`/api/products/${productId}`) : Promise.resolve(null)
  ]).then(([cats,res])=>{
    setCategories(cats.categories||[]);
    if(res?.product) {
      const p=res.product;
      setForm({...blank,...p,categoryId:typeof p.categoryId==='object' ? p.categoryId?._id||null : p.categoryId||null,
        media:(p.media||[]).map((m:any)=>m._id),
        installment:{...blank.installment,...p.installment},seo:{...blank.seo,...p.seo},aeo:{...blank.aeo,...p.aeo},
      });
    }
  }).catch((e)=>setError(e instanceof Error?e.message:'Failed to load')).finally(()=>setLoading(false)); },[productId]);

  const set=(patch:Partial<ProductData>)=>setForm((v)=>({...v,...patch}));
  const setInstallment=(patch:Partial<NonNullable<ProductData['installment']>>)=>setForm(v=>({...v,installment:{...v.installment!,...patch}}));

  const submit=async(e:FormEvent)=>{
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload={...form, slug:form.slug.trim()||undefined, categoryId:form.categoryId||undefined,
        sku:form.sku||undefined,brand:form.brand||undefined,discountPrice:form.discountPrice==null||form.discountPrice===0?null:Number(form.discountPrice),
        cashPrice:Number(form.cashPrice),inventory:Number(form.inventory),media:form.media||[],
        installment:{...form.installment,advanceAmount:Number(form.installment!.advanceAmount),financedAmount:Number(form.installment!.financedAmount),
          markupAmount:Number(form.installment!.markupAmount),totalPayable:Number(form.installment!.totalPayable),tenureMonths:Number(form.installment!.tenureMonths),installmentAmount:Number(form.installment!.installmentAmount)},
        seo:{...form.seo,keywords:form.seo!.keywords||[]},aeo:{...form.aeo,keyFacts:form.aeo!.keyFacts||[]}
      };
      if(productId) await api.put(`/api/products/${productId}`,payload); else await api.post('/api/products',payload);
      router.push('/admin/products');
    } catch(e:unknown){setError(e instanceof Error?e.message:'Failed to save product');} finally{setSaving(false);}
  };

  if(loading) return <p className="text-sm text-gray-500">Loading product…</p>;

  return <form onSubmit={submit} className="space-y-6">
    {error&&<div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    <section className="card space-y-4">
      <h2 className="font-semibold">Product identity</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Name *<input className="input mt-1" required value={form.name} onChange={e=>set({name:e.target.value})}/></label>
        <label className="text-sm font-medium">Slug<input className="input mt-1" value={form.slug} onChange={e=>set({slug:e.target.value})} placeholder="Auto from name if empty"/></label>
        <label className="text-sm font-medium">SKU<input className="input mt-1" value={form.sku||''} onChange={e=>set({sku:e.target.value})}/></label>
        <label className="text-sm font-medium">Brand<input className="input mt-1" value={form.brand||''} onChange={e=>set({brand:e.target.value})}/></label>
        <label className="text-sm font-medium">Category<select className="input mt-1" value={(form.categoryId as string)||''} onChange={e=>set({categoryId:e.target.value||null})}><option value="">None</option>{categories.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
        <label className="text-sm font-medium">Inventory<input className="input mt-1" type="number" min="0" value={form.inventory} onChange={e=>set({inventory:Number(e.target.value)})}/></label>
      </div>
      <label className="text-sm font-medium">Short description<textarea className="input mt-1" maxLength={500} value={form.shortDescription||''} onChange={e=>set({shortDescription:e.target.value})}/></label>
      <label className="text-sm font-medium">Full description<textarea className="input mt-1 min-h-32" maxLength={5000} value={form.description||''} onChange={e=>set({description:e.target.value})}/></label>
    </section>

    <section className="card space-y-4">
      <h2 className="font-semibold">Pricing & installment facts</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">Cash price *<input className="input mt-1" type="number" min="0" value={form.cashPrice} onChange={e=>set({cashPrice:Number(e.target.value)})}/></label>
        <label className="text-sm font-medium">Discount price<input className="input mt-1" type="number" min="0" value={form.discountPrice??''} onChange={e=>set({discountPrice:e.target.value===''?null:Number(e.target.value)})}/></label>
        <label className="text-sm font-medium">Advance<input className="input mt-1" type="number" min="0" value={form.installment!.advanceAmount} onChange={e=>setInstallment({advanceAmount:Number(e.target.value)})}/></label>
        <label className="text-sm font-medium">Financed amount<input className="input mt-1" type="number" min="0" value={form.installment!.financedAmount} onChange={e=>setInstallment({financedAmount:Number(e.target.value)})}/></label>
        <label className="text-sm font-medium">Markup/service charge<input className="input mt-1" type="number" min="0" value={form.installment!.markupAmount} onChange={e=>setInstallment({markupAmount:Number(e.target.value)})}/></label>
        <label className="text-sm font-medium">Total payable<input className="input mt-1" type="number" min="0" value={form.installment!.totalPayable} onChange={e=>setInstallment({totalPayable:Number(e.target.value)})}/></label>
        <label className="text-sm font-medium">Tenure (months)<input className="input mt-1" type="number" min="1" max="120" value={form.installment!.tenureMonths} onChange={e=>setInstallment({tenureMonths:Number(e.target.value)})}/></label>
        <label className="text-sm font-medium">Installment amount<input className="input mt-1" type="number" min="0" value={form.installment!.installmentAmount} onChange={e=>setInstallment({installmentAmount:Number(e.target.value)})}/></label>
        <label className="text-sm font-medium">Frequency<select className="input mt-1" value={form.installment!.frequency} onChange={e=>setInstallment({frequency:e.target.value as any})}><option value="monthly">Monthly</option><option value="biweekly">Biweekly</option><option value="weekly">Weekly</option></select></label>
      </div>
    </section>

    <section className="card space-y-4">
      <h2 className="font-semibold">Media</h2>
      <MediaUpload purpose="product" value={(form.media||[]) as string[]} onChange={media=>set({media})} multiple label={form.media?.length?'Add more images':'Upload product images'}/>
    </section>

    <section className="card space-y-4">
      <h2 className="font-semibold">SEO / AEO</h2>
      <label className="text-sm font-medium">SEO title<input className="input mt-1" maxLength={70} value={form.seo!.title} onChange={e=>set({seo:{...form.seo!,title:e.target.value}})}/></label>
      <label className="text-sm font-medium">SEO description<textarea className="input mt-1" maxLength={170} value={form.seo!.description} onChange={e=>set({seo:{...form.seo!,description:e.target.value}})}/></label>
      <label className="text-sm font-medium">AEO answer / summary<textarea className="input mt-1" maxLength={1000} value={form.aeo!.summary} onChange={e=>set({aeo:{...form.aeo!,summary:e.target.value}})}/></label>
      <label className="text-sm font-medium">Buying intent<input className="input mt-1" maxLength={300} value={form.aeo!.buyingIntent} onChange={e=>set({aeo:{...form.aeo!,buyingIntent:e.target.value}})}/></label>
      <label className="text-sm font-medium">Key facts (one per line)<textarea className="input mt-1" value={form.aeo!.keyFacts.join('\n')} onChange={e=>set({aeo:{...form.aeo!,keyFacts:e.target.value.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,20)}})}/></label>
    </section>

    <section className="card space-y-4">
      <h2 className="font-semibold">FAQs</h2>
      {(form.faqs||[]).map((faq,i)=><div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2"><input className="input" placeholder="Question" value={faq.question} onChange={e=>set({faqs:form.faqs!.map((v,j)=>j===i?{...v,question:e.target.value}:v)})}/><input className="input" placeholder="Answer" value={faq.answer} onChange={e=>set({faqs:form.faqs!.map((v,j)=>j===i?{...v,answer:e.target.value}:v)})}/><button type="button" className="text-left text-xs text-red-600" onClick={()=>set({faqs:form.faqs!.filter((_,j)=>j!==i)})}>Remove FAQ</button></div>)}
      <button type="button" className="btn-secondary text-sm" onClick={()=>set({faqs:[...(form.faqs||[]),{question:'',answer:''}]})} disabled={(form.faqs||[]).length>=20}>+ Add FAQ</button>
    </section>

    <section className="card space-y-4">
      <h2 className="font-semibold">Publishing</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium">Status<select className="input mt-1" value={form.status} onChange={e=>set({status:e.target.value as ProductData['status']})}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option></select></label>
        <label className="text-sm font-medium">Schedule date<input className="input mt-1" type="datetime-local" value={form.scheduledAt?new Date(form.scheduledAt).toISOString().slice(0,16):''} onChange={e=>set({scheduledAt:e.target.value||null})}/></label>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={form.featured} onChange={e=>set({featured:e.target.checked})}/> Featured</label>
      </div>
      <div className="flex gap-3"><button className="btn-primary" disabled={saving}>{saving?'Saving…':productId?'Save product':'Create product'}</button><button type="button" className="btn-secondary" onClick={()=>router.push('/admin/products')}>Cancel</button></div>
    </section>
  </form>;
}
