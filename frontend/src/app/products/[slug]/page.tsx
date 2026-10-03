'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import api from '@/lib/api';
import { formatPKR } from '@/lib/installmentLogic';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import CartDrawer from '@/components/public/Cart';
import InstallmentCalculator from '@/components/public/InstallmentCalculator';
import InquiryForm from '@/components/public/InquiryForm';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number;
  images?: { _id: string; publicUrl: string; altText?: string }[];
  featured?: boolean;
  categoryId?: { name?: string; slug?: string };
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { business, loading: themeLoading } = useTheme();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefDown, setPrefDown] = useState(20);
  const [prefMonths, setPrefMonths] = useState(12);

  useEffect(() => {
    if (!business?._id || !slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<{ success: boolean; product: Product }>(
        `/api/products/${slug}?businessId=${business._id}`
      )
      .then((res) => setProduct(res.product))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id, slug]);

  const symbol = business?.settings?.currencySymbol || 'PKR';
  const price =
    product && product.discountPrice != null && product.discountPrice < product.price
      ? product.discountPrice
      : product?.price || 0;

  if (themeLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!product) {
    return (
      <>
        <PublicHeader />
        <main className="container-page py-20 text-center">
          <h1 className="text-2xl font-semibold">Product not found</h1>
          <Link href="/products" className="btn-primary mt-6 inline-flex">
            Back to products
          </Link>
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <CartDrawer />
      <main className="container-page py-8 sm:py-10">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/products" className="hover:text-slate-800">
            Products
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          <div
            className="aspect-[4/3] overflow-hidden rounded-2xl border bg-slate-50"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0].publicUrl} alt={product.images[0].altText || product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-6xl text-slate-200">
                {product.name[0]}
              </div>
            )}
          </div>

          <div>
            {product.categoryId?.name && (
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {product.categoryId.name}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {formatPKR(price, symbol)}
              </span>
              {product.discountPrice != null && product.discountPrice < product.price && (
                <span className="text-sm text-slate-400 line-through">
                  {formatPKR(product.price, symbol)}
                </span>
              )}
            </div>
            {product.description && (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{product.description}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  addItem({
                    productId: product._id,
                    name: product.name,
                    slug: product.slug,
                    price,
                    image: product.images?.[0]?.publicUrl,
                  })
                }
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <InstallmentCalculator
            price={price}
            productName={product.name}
            onInquiry={(down, months) => {
              setPrefDown(down);
              setPrefMonths(months);
              // The inquiry form is visible below; keep the selected calculator values in sync.
            }}
          />
          <InquiryForm
            productId={product._id}
            productName={product.name}
            preferredDownPayment={prefDown}
            preferredMonths={prefMonths}
          />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
