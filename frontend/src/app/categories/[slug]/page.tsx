import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import ProductCard, { ProductCardData } from '@/components/public/ProductCard';
import JsonLd from '@/components/public/JsonLd';

const base = () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const businessSlug = () => process.env.NEXT_PUBLIC_BUSINESS_SLUG || '';

async function business() {
  const b = base();
  const s = businessSlug();
  if (!b || !s) return null;
  const r = await fetch(
    `${b}/api/admin/business/public/${encodeURIComponent(s)}`,
    { cache: 'no-store' }
  );
  return r.ok ? (await r.json()).business : null;
}

async function category(
  value: string,
  businessId: string
): Promise<{ category?: any; redirect?: string }> {
  const r = await fetch(
    `${base()}/api/categories/${encodeURIComponent(value)}?businessId=${encodeURIComponent(businessId)}`,
    { cache: 'no-store', redirect: 'manual' }
  );
  if (r.status === 301) return { redirect: r.headers.get('location') || undefined };
  if (!r.ok) return {};
  return { category: (await r.json()).category };
}

async function products(categoryId: string, businessId: string) {
  const r = await fetch(
    `${base()}/api/products?businessId=${encodeURIComponent(businessId)}&categoryId=${encodeURIComponent(categoryId)}&limit=50`,
    { cache: 'no-store' }
  );
  return r.ok ? (await r.json()).products || [] : [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await params;
  const b = await business();
  if (!b) return {};

  const result = await category(p.slug, b._id);
  if (!result?.category) return {};

  const c = result.category;
  const title = c.seo?.title || c.name;
  const description =
    c.seo?.description ||
    c.description ||
    b.seo?.metaDescription ||
    b.content?.description ||
    '';

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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await params;
  const b = await business();
  if (!b) notFound();

  const result = await category(p.slug, b._id);
  if (result.redirect) redirect(result.redirect);

  const c = result.category;
  if (!c) notFound();

  const items = await products(c._id, b._id);

  return (
    <>
      <JsonLd
        business={b}
        pagePath={`/categories/${c.slug}`}
        pageName={c.name}
        pageDescription={c.seo?.description || c.description}
        crumbs={[
          { name: 'Products', url: '/products' },
          { name: c.name, url: `/categories/${c.slug}` },
        ]}
        category={c}
      />
      <PublicHeader />
      <main className="container-page py-8 sm:py-12">
        <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/products" className="hover:text-slate-900">Products</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">{c.name}</span>
        </nav>

        <header className="overflow-hidden rounded-[1.75rem] border bg-white shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
          <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
            <div className="aspect-[4/3] bg-slate-100 lg:aspect-auto lg:min-h-[300px]">
              {c.image?.publicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image.publicUrl} alt={c.image.altText || c.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center bg-slate-100 font-display text-7xl text-slate-200">
                  {c.name[0]}
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <p className="eyebrow">Category</p>
              <h1 className="section-title mt-2">{c.name}</h1>
              {c.description && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{c.description}</p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a href="#products" className="btn-primary">Browse {items.length} {items.length === 1 ? 'product' : 'products'}</a>
                <Link href="/inquiry" className="btn-secondary">Need an installment plan?</Link>
              </div>
            </div>
          </div>
        </header>

        {(c.aeo?.summary || c.aeo?.keyFacts?.length) && (
          <section aria-labelledby="category-answer" className="card mt-8">
            <h2 id="category-answer" className="text-xl font-semibold">Quick answer</h2>
            {c.aeo?.summary && <p className="mt-3 text-sm leading-relaxed text-slate-600">{c.aeo.summary}</p>}
            {c.aeo?.keyFacts?.length && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {c.aeo.keyFacts.map((fact: string) => <li key={fact} className="text-sm text-slate-700">• {fact}</li>)}
              </ul>
            )}
          </section>
        )}

        {(c.geo?.intent || c.geo?.localNotes) && (
          <section aria-labelledby="category-local" className="card mt-8">
            <h2 id="category-local" className="text-xl font-semibold">Local information</h2>
            {c.geo?.intent && <p className="mt-3 text-sm leading-relaxed text-slate-600">{c.geo.intent}</p>}
            {c.geo?.localNotes && <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.geo.localNotes}</p>}
          </section>
        )}

        <section id="products" aria-labelledby="category-products" className="mt-10 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Catalogue</p>
              <h2 id="category-products" className="section-title mt-2 text-3xl sm:text-4xl">Products in {c.name}</h2>
            </div>
            <Link href="/products" className="btn-secondary text-sm">All products</Link>
          </div>
          {items.length === 0 ? (
            <div className="card mt-6 py-16 text-center">
              <p className="font-display text-2xl text-slate-800">No products available yet</p>
              <p className="mt-2 text-sm text-slate-500">Ask the team about available installment options.</p>
              <Link href="/inquiry" className="btn-primary mt-6">Ask about installments</Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 xs:grid-cols-2 lg:grid-cols-3">
              {items.map((p: ProductCardData) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </section>

        {c.faqs?.length > 0 && (
          <section className="card mt-12">
            <h2 className="text-xl font-semibold">Frequently asked questions</h2>
            <div className="mt-4 space-y-4">
              {c.faqs.map((faq: { question: string; answer: string }, i: number) => (
                <details key={i} className="border-b pb-3 last:border-b-0">
                  <summary className="cursor-pointer py-1 font-medium">{faq.question}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
