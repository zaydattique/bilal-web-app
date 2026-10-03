import type { Metadata } from 'next';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import InquiryForm from '@/components/public/InquiryForm';

const apiBase = () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const businessSlug = () => process.env.NEXT_PUBLIC_BUSINESS_SLUG || '';

async function getBusiness() {
  const base = apiBase();
  const slug = businessSlug();
  if (!base || !slug) return null;
  const response = await fetch(
    `${base}/api/admin/business/public/${encodeURIComponent(slug)}`,
    { cache: 'no-store' }
  );
  if (!response.ok) return null;
  return (await response.json()).business || null;
}

export async function generateMetadata(): Promise<Metadata> {
  const business = await getBusiness();
  if (!business) return {};
  const title = 'Get an installment plan';
  const description =
    business.content?.description ||
    `Request an installment plan from ${business.businessName}.`;
  return {
    title,
    description,
    alternates: { canonical: '/inquiry' },
    robots: { index: true, follow: true },
  };
}

export default async function InquiryPage() {
  const business = await getBusiness();

  return (
    <>
      <PublicHeader />
      <main className="container-page py-10 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <section className="pt-2 lg:sticky lg:top-24">
            <p className="eyebrow">Installments</p>
            <h1 className="section-title mt-2">Get an installment plan</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Tell us what you are looking for and our team will contact you to discuss the available plan.
            </p>
            {business?.content?.hours && (
              <div className="card mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hours</p>
                <p className="mt-1 text-sm text-slate-700">{business.content.hours}</p>
              </div>
            )}
            {business?.contact?.phone && (
              <a
                href={`tel:${business.contact.phone.replace(/\s/g, '')}`}
                className="btn-secondary mt-4 w-full sm:w-auto"
              >
                Call {business.contact.phone}
              </a>
            )}
          </section>
          <InquiryForm />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
