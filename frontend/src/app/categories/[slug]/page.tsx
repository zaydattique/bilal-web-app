import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import ProductCard, { ProductCardData } from '@/components/public/ProductCard';

const base=()=>process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/,'')||'';
const slug=()=>process.env.NEXT_PUBLIC_BUSINESS_SLUG||'';
async function business(){const b=base(),s=slug();if(!b||!s)return null;const r=await fetch(`${b}/api/admin/business/public/${encodeURIComponent(s)}`,{cache:'no-store'});return r.ok?(await r.json()).business:null;}
async function category(value:string,businessId:string){const r=await fetch(`${base()}/api/categories/${encodeURIComponent(value)}?businessId=${encodeURIComponent(businessId)}`,{cache:'no-store'});return r.ok?(await r.json()).category:null;}
async function products(categoryId:string,businessId:string){const r=await fetch(`${base()}/api/products?businessId=${encodeURIComponent(businessId)}&categoryId=${encodeURIComponent(categoryId)}&limit=50`,{cache:'no-store'});return r.ok?(await r.json()).products||[]:[];}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await params;
  const b = await business();
  if (!b) return {};

  const c = await category(p.slug, b._id);
  if (!c) return {};

  const title = c.seo?.title || c.name;
  const description = c.seo?.description || c.description || b.seo?.metaDescription || b.content?.description || '';
  return {
    title,
    description,
    alternates: { canonical: `/categories/${c.slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      ...(c.image?.publicUrl
        ? { images: [{ url: c.image.publicUrl, alt: c.image.altText || c.name }] }
        : b.seo?.ogImage?.publicUrl
          ? { images: [{ url: b.seo.ogImage.publicUrl, alt: b.seo.ogImage.altText || title }] }
          : {}),
    },
    robots: { index: true, follow: true },
  };
}
export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){const p=await params;const b=await business();if(!b)notFound();const c=await category(p.slug,b._id);if(!c)notFound();const items=await products(c._id,b._id);return <><PublicHeader/><main className="container-page py-10 sm:py-14"><nav className="mb-6 text-sm text-slate-500"><Link href="/products">Products</Link><span className="mx-2">/</span><span className="text-slate-800">{c.name}</span></nav><header className="max-w-3xl"><p className="eyebrow">Category</p><h1 className="section-title mt-2">{c.name}</h1>{c.description&&<p className="mt-3 text-sm leading-relaxed text-slate-600">{c.description}</p>}</header>{items.length===0?<div className="card mt-10 py-16 text-center text-gray-500">No published products in this category yet.</div>:<div className="mt-10 grid grid-cols-1 gap-5 xs:grid-cols-2 lg:grid-cols-3">{items.map((p:ProductCardData)=><ProductCard key={p._id} product={p}/>)}</div>}{c.faqs?.length>0&&<section className="card mt-12"><h2 className="text-xl font-semibold">Frequently asked questions</h2><div className="mt-4 space-y-4">{c.faqs.map((faq:{question:string;answer:string},i:number)=><details key={i} className="border-b pb-3"><summary className="cursor-pointer font-medium">{faq.question}</summary><p className="mt-2 text-sm text-slate-600">{faq.answer}</p></details>)}</div></section>}</main><PublicFooter/></>;}
