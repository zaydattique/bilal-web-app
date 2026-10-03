'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatPKR } from '@/lib/installmentLogic';
import InstallmentCalculator from '@/components/public/InstallmentCalculator';
import InquiryForm from '@/components/public/InquiryForm';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import CartDrawer from '@/components/public/Cart';

export interface PublicProduct {
  _id:string; name:string; slug:string; brand?:string|null; shortDescription?:string; description?:string;
  cashPrice:number; discountPrice?:number|null; media?:{_id:string;publicUrl:string;altText?:string}[];
  categoryId?:{name?:string;slug?:string}; installment?:{advanceAmount:number;financedAmount:number;markupAmount:number;totalPayable:number;tenureMonths:number;installmentAmount:number;frequency:string};
  specs?:{weight?:number|null;dimensions?:{length?:number|null;width?:number|null;height?:number|null}};
  customFieldValues?:{key:string;value:string}[]; faqs?:{question:string;answer:string}[];
}

export default function ProductDetailClient({product,business}:{product:PublicProduct;business:any}) {
 const {addItem}=useCart(); const [prefDown,setPrefDown]=useState(product.installment?.advanceAmount||0); const [prefMonths,setPrefMonths]=useState(product.installment?.tenureMonths||12);
 const symbol=business?.settings?.currencySymbol||'PKR';
 const price=product.discountPrice!=null&&product.discountPrice<product.cashPrice?product.discountPrice:product.cashPrice;
 return <><PublicHeader/><CartDrawer/><main className="container-page py-8 sm:py-10">
  <nav className="mb-6 text-sm text-slate-500"><Link href="/products">Products</Link><span className="mx-2">/</span>{product.categoryId?.slug&&<><Link href={`/categories/${product.categoryId.slug}`}>{product.categoryId.name}</Link><span className="mx-2">/</span></>}<span className="text-slate-800">{product.name}</span></nav>
  <div className="grid gap-8 lg:grid-cols-2">
   <div className="aspect-[4/3] overflow-hidden rounded-2xl border bg-slate-50" style={{borderColor:'var(--color-border')}}>{product.media?.[0]?<img src={product.media[0].publicUrl} alt={product.media[0].altText||product.name} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center font-display text-6xl text-slate-200">{product.name[0]}</div>}</div>
   <div>{product.brand&&<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{product.brand}</p>}<h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
    <div className="mt-3 flex items-baseline gap-2"><span className="text-2xl font-bold" style={{color:'var(--color-primary)'}}>{formatPKR(price,symbol)}</span>{product.discountPrice!=null&&product.discountPrice<product.cashPrice&&<span className="text-sm text-slate-400 line-through">{formatPKR(product.cashPrice,symbol)}</span>}</div>
    {product.shortDescription&&<p className="mt-3 text-sm font-medium text-slate-700">{product.shortDescription}</p>}
    {product.description&&<p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{product.description}</p>}
    <button type="button" className="btn-primary mt-6" onClick={()=>addItem({productId:product._id,name:product.name,slug:product.slug,price,image:product.media?.[0]?.publicUrl})}>Add to cart</button>
   </div>
  </div>
  {(product.customFieldValues?.length||product.specs)&&<section className="mt-12 card"><h2 className="text-xl font-semibold">Product details</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{(product.customFieldValues||[]).map(v=><div key={v.key} className="flex justify-between gap-4 border-b py-2 text-sm"><span className="text-slate-500">{v.key}</span><span className="font-medium">{v.value}</span></div>)}{product.specs?.weight!=null&&<div className="flex justify-between border-b py-2 text-sm"><span className="text-slate-500">Weight</span><span>{product.specs.weight}</span></div>}</div></section>}
  <div className="mt-12 grid gap-8 lg:grid-cols-2"><InstallmentCalculator price={price} productName={product.name} onInquiry={(down,months)=>{setPrefDown(down);setPrefMonths(months)}}/><InquiryForm productId={product._id} productName={product.name} preferredDownPayment={prefDown} preferredMonths={prefMonths}/></div>
  {(product.faqs||[]).length>0&&<section className="mt-12 card"><h2 className="text-xl font-semibold">Frequently asked questions</h2><div className="mt-4 space-y-4">{product.faqs!.map((faq,i)=><details key={i} className="border-b pb-3"><summary className="cursor-pointer font-medium">{faq.question}</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p></details>)}</div></section>}
 </main><PublicFooter/></>;
}
