'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

const SLIDES = [
  {
    title: 'Own it now. Pay monthly.',
    subtitle:
      'Transparent installment plans on mobiles, LEDs, fridges & more — for families in Lahore.',
    cta: 'Browse products',
    href: '/products',
  },
  {
    title: 'Clear monthly amounts',
    subtitle:
      'Calculate your plan online, then finalize at the shop with CNIC. No credit-card maze.',
    cta: 'See how it works',
    href: '/#how-it-works',
  },
  {
    title: 'Kot Khawaja Saeed & beyond',
    subtitle:
      'Local trust, fixed installments, and a team that answers your questions before you commit.',
    cta: 'View catalogue',
    href: '/products',
  },
];

export default function HeroSlider() {
  const { business } = useTheme();
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[i];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-950">
        {business?.heroBanners?.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.heroBanners[i % business.heroBanners.length].publicUrl}
            alt={business.heroBanners[i % business.heroBanners.length].altText || ''}
            className="h-full w-full object-cover opacity-50"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 40%, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent),
              radial-gradient(ellipse 60% 50% at 90% 20%, color-mix(in srgb, var(--color-accent) 15%, transparent), transparent),
              linear-gradient(160deg, rgba(15,23,42,0.94) 0%, rgba(30,41,59,0.84) 45%, rgba(15,23,42,0.94) 100%)
            `,
          }}
        />
      </div>
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container-page relative flex min-h-[min(72vh,560px)] flex-col justify-center py-16 sm:py-20">
        <p className="eyebrow text-white/80">
          {business?.businessName || 'Installment electronics'} · Lahore
        </p>
        <h1
          key={slide.title}
          className="font-display mt-4 max-w-2xl text-4xl leading-[1.15] text-white sm:text-5xl lg:text-6xl"
        >
          {slide.title}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          {slide.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={slide.href} className="btn-primary min-h-[44px] px-6 text-base">
            {slide.cta}
          </Link>
          <Link
            href="/products"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/25 bg-white/12 px-6 text-[15px] font-semibold text-white backdrop-blur-xl transition hover:bg-white/18 active:scale-[0.97]"
          >
            Installment calculator
          </Link>
        </div>

        <div className="mt-12 flex gap-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: idx === i ? 28 : 8,
                background: idx === i ? 'var(--color-primary)' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
