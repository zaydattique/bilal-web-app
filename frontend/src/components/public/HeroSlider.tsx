'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

export default function HeroSlider() {
  const { business } = useTheme();
  const slides = business?.content?.heroSlides?.length
    ? business.content.heroSlides
    : [{
        title: business?.content?.tagline || business?.businessName || 'Installment Store',
        subtitle: business?.content?.description || '',
        cta: 'Browse products',
        href: '/products',
      }];
  const [i, setI] = useState(0);
  const slide = slides[i % slides.length];

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

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

      <div className="container-page relative flex min-h-[min(72vh,560px)] flex-col justify-center py-16 sm:py-20">
        <p className="eyebrow text-white/80">{business?.businessName}</p>
        <h1
          key={slide.title}
          className="font-display mt-4 max-w-2xl text-4xl leading-[1.15] text-white sm:text-5xl lg:text-6xl"
        >
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {slide.subtitle}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={slide.href} className="btn-primary min-h-[44px] px-6 text-base">
            {slide.cta}
          </Link>
          <Link
            href="/products"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/25 bg-white/12 px-6 text-[15px] font-semibold text-white backdrop-blur-xl transition hover:bg-white/18 active:scale-[0.97]"
          >
            Browse products
          </Link>
        </div>

        {slides.length > 1 && (
          <div className="mt-12 flex gap-2">
            {slides.map((_, idx) => (
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
        )}
      </div>
    </section>
  );
}
