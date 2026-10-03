'use client';

import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { formatPKR } from '@/lib/installmentLogic';

export interface ProductCardData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number;
  images?: string[];
  featured?: boolean;
  categoryId?: { name?: string; slug?: string };
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const { business } = useTheme();
  const symbol = business?.settings?.currencySymbol || 'PKR';
  const image = product.images?.[0];
  const sale = product.discountPrice;
  const displayPrice = sale != null && sale < product.price ? sale : product.price;
  const hasDiscount = sale != null && sale < product.price;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group card-hover flex flex-col overflow-hidden p-0"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-5xl text-slate-200">{product.name[0]}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.featured && (
            <span className="badge bg-teal-600 text-white shadow-sm">Featured</span>
          )}
          {hasDiscount && (
            <span className="badge text-white shadow-sm" style={{ background: 'var(--color-primary)' }}>
              Sale
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {product.categoryId?.name && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {product.categoryId.name}
          </p>
        )}
        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-slate-900">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{product.description}</p>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-4">
          <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
            {formatPKR(displayPrice, symbol)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-slate-400 line-through">
              {formatPKR(product.price, symbol)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
