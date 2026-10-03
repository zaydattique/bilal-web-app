'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import MediaUpload from '@/components/admin/MediaUpload';

export default function SettingsPage() {
  const { admin } = useAuth();
  const { business, refresh } = useTheme();
  const [form, setForm] = useState({
    businessName: '',
    primaryColor: '#e74c3c',
    secondaryColor: '#3498db',
    accentColor: '#2ecc71',
    phone: '',
    email: '',
    address: '',
    city: '',
    currencySymbol: 'PKR',
    maxInstallments: 12,
    minDownPayment: 10,
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
    setForm({
      businessName: business.businessName || '',
      primaryColor: business.branding?.primaryColor || '#e74c3c',
      secondaryColor: business.branding?.secondaryColor || '#3498db',
      accentColor: business.branding?.accentColor || '#2ecc71',
      phone: business.contact?.phone || '',
      email: business.contact?.email || '',
      address: business.contact?.address || '',
      city: business.contact?.city || '',
      currencySymbol: business.settings?.currencySymbol || 'PKR',
      maxInstallments: business.settings?.maxInstallments || 12,
      minDownPayment: business.settings?.minDownPayment || 10,
      logoPrimary: business.logo?.primary?._id ? [business.logo.primary._id] : [],
      logoLight: business.logo?.light?._id ? [business.logo.light._id] : [],
      logoDark: business.logo?.dark?._id ? [business.logo.dark._id] : [],
      logoIcon: business.logo?.icon?._id ? [business.logo.icon._id] : [],
      favicon: business.favicon?._id ? [business.favicon._id] : [],
      ogImage: business.seo?.ogImage?._id ? [business.seo.ogImage._id] : [],
      heroBanners: business.heroBanners?.map((item) => item._id) || [],
    });
  }, [business]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setSaving(true);
    setMessage('');

    try {
      await api.put('/api/admin/business', {
        businessName: form.businessName,
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
        },
        contact: {
          phone: form.phone,
          email: form.email,
          address: form.address,
          city: form.city,
        },
        settings: {
          currencySymbol: form.currencySymbol,
          maxInstallments: form.maxInstallments,
          minDownPayment: form.minDownPayment,
        },
        seo: {
          ogImage: form.ogImage[0] || null,
        },
      });
      await refresh();
      setMessage('Settings saved successfully');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Settings</h1>
        <p className="text-sm text-gray-500">Branding, media, contact & installment defaults</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {message && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Business Name</label>
          <input
            className="input"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />
        </div>

        <div>
          <h2 className="text-base font-semibold">Brand media</h2>
          <p className="mt-1 text-xs text-gray-500">
            Upload assets here. Files are stored in durable object storage and survive redeploys.
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <MediaField label="Primary logo" purpose="logo" value={form.logoPrimary} onChange={(logoPrimary) => setForm({ ...form, logoPrimary })} />
            <MediaField label="Light logo" purpose="logo_light" value={form.logoLight} onChange={(logoLight) => setForm({ ...form, logoLight })} />
            <MediaField label="Dark logo" purpose="logo_dark" value={form.logoDark} onChange={(logoDark) => setForm({ ...form, logoDark })} />
            <MediaField label="Icon logo" purpose="logo_icon" value={form.logoIcon} onChange={(logoIcon) => setForm({ ...form, logoIcon })} />
            <MediaField label="Favicon" purpose="favicon" value={form.favicon} onChange={(favicon) => setForm({ ...form, favicon })} />
            <MediaField label="Open Graph image" purpose="og_image" value={form.ogImage} onChange={(ogImage) => setForm({ ...form, ogImage })} />
          </div>
          <div className="mt-5">
            <MediaField
              label="Hero banners"
              purpose="banner"
              multiple
              value={form.heroBanners}
              onChange={(heroBanners) => setForm({ ...form, heroBanners })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map((key) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium capitalize">
                {key.replace('Color', ' Color')}
              </label>
              <input
                type="color"
                className="h-10 w-full cursor-pointer rounded border"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">City</label>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Currency</label>
            <input className="input" value={form.currencySymbol} onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Max Installments</label>
            <input className="input" type="number" min={1} value={form.maxInstallments} onChange={(e) => setForm({ ...form, maxInstallments: Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Min Down Payment %</label>
            <input className="input" type="number" min={0} value={form.minDownPayment} onChange={(e) => setForm({ ...form, minDownPayment: Number(e.target.value) })} />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

function MediaField({
  label,
  purpose,
  value,
  onChange,
  multiple = false,
}: {
  label: string;
  purpose: string;
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="mb-2 text-sm font-medium">{label}</p>
      <MediaUpload purpose={purpose} value={value} onChange={onChange} multiple={multiple} label={value.length ? 'Upload replacement' : 'Upload image'} />
    </div>
  );
}
