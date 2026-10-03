import type { Metadata } from 'next';
import Link from 'next/link';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';

interface Category { _id:string; name:string; slug:string; description?:string; image?:{publicUrl:string;altText?:string}|null; }
const base=()=>process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/,'')||'';
const businessSlug=()=>process.env.NEXT_PUBLIC_BUSINESS_SLUG||'';
async function getBusiness(){const b=base(),s=businessSlug();if(!b||!s)return null;const r=await fetch(b+'/api/admin/business/public/'+encodeURIComponent(s),{cache:'no-store'});return r.ok?(await r.json()).business:null;}
async function getCategories(businessId:string):Promise<Category[]>{const r=await fetch(base()+'/api/categories?businessId='+encodeURIComponent(businessId)+'&limit=100',{cache:'no-store'});return r.ok?(await r.json()).categories||[]:[];}
export async function generateMetadata(): Promise<Metadata> {
  const b = await business();
  if (!b) return {};

  const title = b.seo?.metaTitle
    ? `Categories | ${b.seo.metaTitle}`
    : `Categories | ${b.businessName || 'Catalogue'}`;
  const description = b.seo?.metaDescription || b.content?.description || 'Browse products by category.';

  return {
    title,
    description,
    alternates: { canonical: '/categories' },
    openGraph: {
      type: 'website',
      title,
      description,
      ...(b.seo?.ogImage?.publicUrl
        ? { images: [{ url: b.seo.ogImage.publicUrl, alt: b.seo.ogImage.altText || title }] }
        : {}),
    },
    robots: { index: true, follow: true },
  };
}
 async function CategoriesPage(){const b=await getBusiness();if(!b)return null;const categories=await getCategories(b._id);return <><PublicHeader/><main className="container-page py-10 sm:py-14"><header className="max-w-3xl"><p className="eyebrow">Catalogue</p><h1 className="section-title mt-2">Categories</h1><p className="mt-3 text-sm leading-relaxed text-slate-600">Browse products by category.</p></header>{categories.length===0?<div className="card mt-10 py-16 text-center text-gray-500">No published categories yet.</div>:<div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{categories.map(c=><Link key={c._id} href={'/categories/'+c.slug} className="card-hover overflow-hidden p-0"><div className="aspect-[4/3] bg-slate-100">{c.image?<img src={c.image.publicUrl} alt={c.image.altText||c.name} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center font-display text-5xl text-slate-200">{c.name[0]}</div>}</div><div className="p-5"><h2 className="text-lg font-semibold">{c.name}</h2>{c.description&&<p className="mt-2 line-clamp-3 text-sm text-slate-500">{c.description}</p>}</div></Link>)}</div>}</main><PublicFooter/></>}