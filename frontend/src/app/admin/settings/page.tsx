'use client';

import { useEffect, useState, FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import MediaUpload from '@/components/admin/MediaUpload';

const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

export default function SettingsPage() {
  const { admin } = useAuth();
  const { business, refresh } = useTheme();
  const [form, setForm] = useState({
    businessName: '',
    businessSlug: '',
    primaryColor: '#c41e3a',
    secondaryColor: '#1a2332',
    accentColor: '#0d9488',
    textDark: '#0f172a',
    textLight: '#f8fafc',
    backgroundColor: '#fafbfc',
    borderColor: '#e2e8f0',
    fontFamily: 'Inter, sans-serif',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Pakistan',
    facebook: '',
    instagram: '',
    twitter: '',
    whatsapp: '',
    termsUrl: '',
    privacyUrl: '',
    returnPolicy: '',
    warrantyClaim: '',
    tagline: '',
    description: '',
    serviceArea: '',
    hours: '',
    footerText: '',
    requirements: '',
    trustPoints: '',
    howItWorks: '',
    heroSlides: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    currencySymbol: 'PKR',
    currencyCode: 'PKR',
    timezone: 'Asia/Karachi',
    dateFormat: 'DD-MM-YYYY',
    maxInstallments: 12,
    minDownPayment: 10,
    showCustomerPortalLink: true,
    logoPrimary: [] as string[],
    logoLight: [] as string[],
    logoDark: [] as string[],
    logoIcon: [] as string[],
    favicon: [] as string[],
    ogImage: [] as string[],
    heroBanners: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!business) return;
    const c = business.content || {};
    const social = business.socialMedia || {};
    const policies = business.policies || {};
    setForm({
      businessName: business.businessName || '',
      businessSlug: business.businessSlug || '',
      primaryColor: business.branding?.primaryColor || '#c41e3a',
      secondaryColor: business.branding?.secondaryColor || '#1a2332',
      accentColor: business.branding?.accentColor || '#0d9488',
      textDark: business.branding?.textDark || '#0f172a',
      textLight: business.branding?.textLight || '#f8fafc',
      backgroundColor: business.branding?.backgroundColor || '#fafbfc',
      borderColor: business.branding?.borderColor || '#e2e8f0',
      fontFamily: business.typography?.fontFamily || 'Inter, sans-serif',
      phone: business.contact?.phone || '',
      email: business.contact?.email || '',
      address: business.contact?.address || '',
      city: business.contact?.city || '',
      country: business.contact?.country || 'Pakistan',
      facebook: social.facebook || '',
      instagram: social.instagram || '',
      twitter: social.twitter || '',
      whatsapp: social.whatsapp || '',
      termsUrl: policies.termsUrl || '',
      privacyUrl: policies.privacyUrl || '',
      returnPolicy: policies.returnPolicy || '',
      warrantyClaim: policies.warrantyClaim || '',
      tagline: c.tagline || '',
      description: c.description || '',
      serviceArea: c.serviceArea || '',
      hours: c.hours || '',
      footerText: c.footerText || '',
      requirements: (c.requirements || []).join('\n'),
      trustPoints: (c.trustPoints || []).join('\n'),
      howItWorks: JSON.stringify(c.howItWorks || [], null, 2),
      heroSlides: JSON.stringify(c.heroSlides || [], null, 2),
      metaTitle: business.seo?.metaTitle || '',
      metaDescription: business.seo?.metaDescription || '',
      metaKeywords: (business.seo?.metaKeywords || []).join('\n'),
      currencySymbol: business.settings?.currencySymbol || 'PKR',
      currencyCode: business.settings?.currencyCode || 'PKR',
      timezone: business.settings?.timezone || 'Asia/Karachi',
      dateFormat: business.settings?.dateFormat || 'DD-MM-YYYY',
      maxInstallments: business.settings?.maxInstallments || 12,
      minDownPayment: business.settings?.minDownPayment ?? 10,
      showCustomerPortalLink: business.settings?.showCustomerPortalLink ?? true,
      logoPrimary: business.logo?.primary?._id ? [business.logo.primary._id] : [],
      logoLight: business.logo?.light?._id ? [business.logo.light._id] : [],
      logoDark: business.logo?.dark?._id ? [business.logo.dark._id] : [],
      logoIcon: business.logo?.icon?._id ? [business.logo.icon._id] : [],
      favicon: business.favicon?._id ? [business.favicon._id] : [],
      ogImage: business.seo?.ogImage?._id ? [business.seo.ogImage._id] : [],
      heroBanners: business.heroBanners?.map((item) => item._id) || [],
    });
  }, [business]);

  const parseJsonArray = (value: string, field: string) => {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
      throw new Error(`${field} must be valid JSON containing an array`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setSaving(true);
    setMessage('');

    try {
      const heroSlides = parseJsonArray(form.heroSlides, 'Hero slides');
      const howItWorks = parseJsonArray(form.howItWorks, 'How it works');

      await api.put('/api/admin/business', {
        businessName: form.businessName,
        businessSlug: form.businessSlug,
        logo: {
          primary: form.logoPrimary[0] || null,
          light: form.logoLight[0] || null,
          dark: form.logoDark[0] || null,
          icon: form.logoIcon[0] || null,
        },
        favicon: form.favicon[0] || null,
        heroBanners: form.heroBanners,
        branding: {
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          textDark: form.textDark,
          textLight: form.textLight,
          backgroundColor: form.backgroundColor,
          borderColor: form.borderColor,
        },
        typography: { fontFamily: form.fontFamily },
        contact: {
          phone: form.phone,
          email: form.email,
          address: form.address,
          city: form.city,
          country: form.country,
        },
        socialMedia: {
          facebook: form.facebook,
          instagram: form.instagram,
          twitter: form.twitter,
          whatsapp: form.whatsapp,
        },
        policies: {
          termsUrl: form.termsUrl,
          privacyUrl: form.privacyUrl,
          returnPolicy: form.returnPolicy,
          warrantyClaim: form.warrantyClaim,
        },
        content: {
          tagline: form.tagline,
          description: form.description,
          serviceArea: form.serviceArea,
          hours: form.hours,
          footerText: form.footerText,
          requirements: splitLines(form.requirements),
          trustPoints: splitLines(form.trustPoints),
          howItWorks,
          heroSlides,
        },
        settings: {
          currencySymbol: form.currencySymbol,
          currencyCode: form.currencyCode,
          timezone: form.timezone,
          dateFormat: form.dateFormat,
          maxInstallments: Number(form.maxInstallments),
          minDownPayment: Number(form.minDownPayment),
          showCustomerPortalLink: form.showCustomerPortalLink,
        },
        seo: {
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
          metaKeywords: splitLines(form.metaKeywords),
          ogImage: form.ogImage[0] || null,
        },
      });
      await refresh();
      setMessage('Business CMS saved successfully');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business CMS</h1>
        <p className="text-sm text-gray-500">One source of truth for branding, contact, policies, public claims, content and SEO.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {message && <div className="card bg-green-50 text-sm text-green-700">{message}</div>}

        <Section title="Business identity">
          <Field label="Business name"><input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></Field>
          <Field label="Business slug"><input className="input" value={form.businessSlug} onChange={(e) => setForm({ ...form, businessSlug: e.target.value })} /></Field>
          <Field label="Tagline"><input className="input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
          <Field label="Business description"><textarea className="input min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </Section>

        <Section title="Branding">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(['primaryColor','secondaryColor','accentColor','textDark','textLight','backgroundColor','borderColor'] as const).map((key) => (
              <Field key={key} label={key.replace(/([A-Z])/g, ' $1').trim()}>
                <input type="color" className="h-10 w-full cursor-pointer rounded border" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </Field>
            ))}
          </div>
          <Field label="Font family"><input className="input" value={form.fontFamily} onChange={(e) => setForm({ ...form, fontFamily: e.target.value })} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <MediaField label="Primary logo" purpose="logo" value={form.logoPrimary} onChange={(v) => setForm({ ...form, logoPrimary: v })} />
            <MediaField label="Light logo" purpose="logo_light" value={form.logoLight} onChange={(v) => setForm({ ...form, logoLight: v })} />
            <MediaField label="Dark logo" purpose="logo_dark" value={form.logoDark} onChange={(v) => setForm({ ...form, logoDark: v })} />
            <MediaField label="Icon logo" purpose="logo_icon" value={form.logoIcon} onChange={(v) => setForm({ ...form, logoIcon: v })} />
            <MediaField label="Favicon" purpose="favicon" value={form.favicon} onChange={(v) => setForm({ ...form, favicon: v })} />
            <MediaField label="OG image" purpose="og_image" value={form.ogImage} onChange={(v) => setForm({ ...form, ogImage: v })} />
          </div>
          <MediaField label="Hero banners" purpose="banner" multiple value={form.heroBanners} onChange={(v) => setForm({ ...form, heroBanners: v })} />
        </Section>

        <Section title="Contact & social">
          <div className="grid gap-4 sm:grid-cols-2">
            {(['phone','email','address','city','country','facebook','instagram','twitter','whatsapp'] as const).map((key) => (
              <Field key={key} label={key}>
                <input className="input" type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </Field>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service area"><input className="input" value={form.serviceArea} onChange={(e) => setForm({ ...form, serviceArea: e.target.value })} /></Field>
            <Field label="Business hours"><input className="input" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></Field>
          </div>
        </Section>

        <Section title="Public content — claims must be true">
          <Field label="Requirements — one item per line"><textarea className="input min-h-32" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} /></Field>
          <Field label="Trust points — one item per line"><textarea className="input min-h-32" value={form.trustPoints} onChange={(e) => setForm({ ...form, trustPoints: e.target.value })} /></Field>
          <Field label="How it works — JSON array">
            <textarea className="input min-h-44 font-mono text-xs" value={form.howItWorks} onChange={(e) => setForm({ ...form, howItWorks: e.target.value })} />
          </Field>
          <Field label="Hero slides — JSON array">
            <textarea className="input min-h-44 font-mono text-xs" value={form.heroSlides} onChange={(e) => setForm({ ...form, heroSlides: e.target.value })} />
          </Field>
          <Field label="Footer text"><textarea className="input min-h-24" value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} /></Field>
        </Section>

        <Section title="Policies">
          <Field label="Terms URL"><input className="input" value={form.termsUrl} onChange={(e) => setForm({ ...form, termsUrl: e.target.value })} /></Field>
          <Field label="Privacy URL"><input className="input" value={form.privacyUrl} onChange={(e) => setForm({ ...form, privacyUrl: e.target.value })} /></Field>
          <Field label="Return policy"><textarea className="input min-h-28" value={form.returnPolicy} onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })} /></Field>
          <Field label="Warranty / claims policy"><textarea className="input min-h-28" value={form.warrantyClaim} onChange={(e) => setForm({ ...form, warrantyClaim: e.target.value })} /></Field>
        </Section>

        <Section title="SEO">
          <Field label="Meta title"><input className="input" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} /></Field>
          <Field label="Meta description"><textarea className="input min-h-24" value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} /></Field>
          <Field label="Meta keywords — one per line"><textarea className="input min-h-24" value={form.metaKeywords} onChange={(e) => setForm({ ...form, metaKeywords: e.target.value })} /></Field>
        </Section>

        <Section title="Installment defaults">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Currency symbol"><input className="input" value={form.currencySymbol} onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })} /></Field>
            <Field label="Currency code"><input className="input" maxLength={3} value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} /></Field>
            <Field label="Timezone"><input className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></Field>
            <Field label="Date format"><input className="input" value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} /></Field>
            <Field label="Max installments"><input className="input" type="number" min={1} max={60} value={form.maxInstallments} onChange={(e) => setForm({ ...form, maxInstallments: Number(e.target.value) })} /></Field>
            <Field label="Min down payment %"><input className="input" type="number" min={0} max={100} value={form.minDownPayment} onChange={(e) => setForm({ ...form, minDownPayment: Number(e.target.value) })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.showCustomerPortalLink} onChange={(e) => setForm({ ...form, showCustomerPortalLink: e.target.checked })} />
            Show customer portal link
          </label>
        </Section>

        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save all business settings'}</button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card space-y-4"><h2 className="text-lg font-semibold">{title}</h2><div className="space-y-4">{children}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}<div className="mt-1">{children}</div></label>;
}

function MediaField({ label, purpose, value, onChange, multiple = false }: {
  label: string; purpose: string; value: string[]; onChange: (value: string[]) => void; multiple?: boolean;
}) {
  return <div className="rounded-xl border border-gray-200 p-4"><p className="mb-2 text-sm font-medium">{label}</p><MediaUpload purpose={purpose} value={value} onChange={onChange} multiple={multiple} label={value.length ? 'Upload replacement' : 'Upload image'} /></div>;
}
