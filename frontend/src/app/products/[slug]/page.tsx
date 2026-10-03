import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import ProductDetailClient, { PublicProduct } from '@/components/public/ProductDetailClient';

interface Business { _id:string; businessName:string; businessSlug:string; settings?:{currencySymbol?:string}; seo?:{metaTitle?:string}; }
const apiBase=()=>process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/,'')||'';
const businessSlug=()=>process.env.NEXT_PUBLIC_BUSINESS_SLUG||'';

async function getBusiness():Promise<Business|null>{
 const base=apiBase(), slug=businessSlug(); if(!base||!slug)return null;
 const r=await fetch(`${base}/api/admin/business/public/${encodeURIComponent(slug)}`,{cache:'no-store'}); if(!r.ok)return null; return (await r.json()).business||null;
}
async function getProduct(slug:string,businessId:string):Promise<{product?:PublicProduct;redirect?:string}|null>{
 const r=await fetch(`${apiBase()}/api/products/${encodeURIComponent(slug)}?businessId=${encodeURIComponent(businessId)}`,{cache:'no-store'});
 if(r.status===404)return null;
 if(!r.ok)return null;
 return r.json();
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params; const business=await getBusiness(); if(!business)return {};
 const result=await getProduct(slug,business._id); const product=result?.product;
 if(!product)return {};
 return {title:product.name,description:product.shortDescription||product.description,alternates:{canonical:`/products/${product.slug}`},openGraph:{title:product.name,description:product.shortDescription||product.description,images:product.media?.[0]?.publicUrl?[{url:product.media[0].publicUrl,alt:product.media[0].altText||product.name}]:[]}};
}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const business=await getBusiness(); if(!business)notFound();
 const result=await getProduct(slug,business._id); if(!result?.product)notFound();
 if(result.redirect)redirect(result.redirect);
 return <ProductDetailClient product={result.product} business={business}/>;
}
