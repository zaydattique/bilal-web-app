'use client';

import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { formatPKR } from '@/lib/installmentLogic';
import Link from 'next/link';

export default function CartDrawer() {
  const { items, removeItem, updateQty, totalAmount, totalItems, isOpen, setOpen, clear } =
    useCart();
  const { business } = useTheme();
  const symbol = business?.settings?.currencySymbol || 'PKR';

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-full sm:max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Cart ({totalItems})</h2>
          <button
            type="button"
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            onClick={() => setOpen(false)}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-gray-500">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xl font-bold text-gray-300">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt=""
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      item.name[0]
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.slug}`}
                      className="line-clamp-2 text-sm font-medium hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-gray-600">
                      {formatPKR(item.price, symbol)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        className="h-7 w-7 rounded border text-sm"
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        className="h-7 w-7 rounded border text-sm"
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-auto text-xs text-red-600 hover:underline"
                        onClick={() => removeItem(item.productId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between font-semibold">
              <span>Subtotal</span>
              <span>{formatPKR(totalAmount, symbol)}</span>
            </div>
            <p className="text-xs text-gray-500">
              This cart is for reference only. Use the inquiry form on a product page to
              request an installment plan — no online checkout.
            </p>
            <button type="button" className="btn-secondary w-full" onClick={clear}>
              Clear cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
