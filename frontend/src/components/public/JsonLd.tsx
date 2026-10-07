type BusinessData = {
  businessName?: string;
  businessSlug?: string;
  businessType?: string;
  logo?: { primary?: { publicUrl?: string } | null } | null;
  contact?: { phone?: string; email?: string; address?: string; city?: string; country?: string };
  socialMedia?: { facebook?: string; instagram?: string; twitter?: string; whatsapp?: string };
  content?: { description?: string; serviceArea?: string; hours?: string };
  settings?: { currencyCode?: string; currencySymbol?: string };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: { publicUrl?: string; altText?: string } | null;
  };
};

type ProductData = {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  brand?: string | null;
  cashPrice: number;
  discountPrice?: number | null;
  media?: { publicUrl: string; altText?: string }[];
  categoryId?: { name?: string; slug?: string } | null;
};

type CategoryData = {
  name: string;
  slug: string;
  description?: string;
  image?: { publicUrl?: string; altText?: string } | null;
};

type Crumb = { name: string; url: string };

const absoluteUrl = (siteUrl: string | undefined, path: string) => {
  if (!siteUrl) return path;
  try {
    return new URL(path, siteUrl).toString();
  } catch {
    return path;
  }
};

const clean = (value: unknown) => (value == null || value === '' ? undefined : value);

const businessGraph = (business: BusinessData, siteUrl?: string): Record<string, unknown>[] => {
  const base = siteUrl ? siteUrl.replace(/\/$/, '') : undefined;
  const businessUrl = base ? `${base}/` : undefined;
  const image = business.logo?.primary?.publicUrl || business.seo?.ogImage?.publicUrl;
  const sameAs = [
    business.socialMedia?.facebook,
    business.socialMedia?.instagram,
    business.socialMedia?.twitter,
    business.socialMedia?.whatsapp,
  ].filter(Boolean);

  const entity = {
    '@type': ['Organization', 'LocalBusiness'],
    '@id': businessUrl ? `${businessUrl}#business` : undefined,
    name: business.businessName,
    url: businessUrl,
    description: clean(business.seo?.metaDescription || business.content?.description),
    telephone: clean(business.contact?.phone),
    email: clean(business.contact?.email),
    image: clean(image),
    sameAs: sameAs.length ? sameAs : undefined,
    areaServed: clean(business.content?.serviceArea),
    address:
      business.contact?.address || business.contact?.city || business.contact?.country
        ? {
            '@type': 'PostalAddress',
            streetAddress: clean(business.contact?.address),
            addressLocality: clean(business.contact?.city),
            addressCountry: clean(business.contact?.country),
          }
        : undefined,
  };

  const website = {
    '@type': 'WebSite',
    '@id': businessUrl ? `${businessUrl}#website` : undefined,
    url: businessUrl,
    name: business.businessName,
    publisher: businessUrl ? { '@id': `${businessUrl}#business` } : undefined,
  };

  return [entity, website];
};

export default function JsonLd({
  business,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
  pagePath = '/',
  pageName,
  pageDescription,
  crumbs = [],
  product,
  category,
  includePage = true,
}: {
  business: BusinessData;
  siteUrl?: string;
  pagePath?: string;
  pageName?: string;
  pageDescription?: string;
  crumbs?: Crumb[];
  product?: ProductData;
  category?: CategoryData;
  includePage?: boolean;
}) {
  let normalizedSiteUrl: string;
  try {
    const parsed = new URL(siteUrl || '');
    if (!['http:', 'https:'].includes(parsed.protocol) || !business.businessName) return null;
    normalizedSiteUrl = parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }

  const pageUrl = absoluteUrl(normalizedSiteUrl, pagePath);
  const graph = businessGraph(business, normalizedSiteUrl);
  const businessId = `${normalizedSiteUrl}#business`;

  if (includePage)
    graph.push({
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: clean(pageName),
      description: clean(pageDescription),
      isPartOf: { '@id': `${normalizedSiteUrl}/#website` },
      about: businessId ? { '@id': businessId } : undefined,
    });

  if (crumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(normalizedSiteUrl, crumb.url),
      })),
    });
  }

  if (product) {
    const productUrl = pageUrl;
    const price =
      product.discountPrice != null && product.discountPrice < product.cashPrice
        ? product.discountPrice
        : product.cashPrice;
    graph.push({
      '@type': 'Product',
      '@id': `${productUrl}#product`,
      name: product.name,
      url: productUrl,
      description: clean(product.description || product.shortDescription),
      brand: clean(product.brand) ? { '@type': 'Brand', name: product.brand } : undefined,
      image: product.media?.length
        ? product.media.map((media) => media.publicUrl).filter(Boolean)
        : undefined,
      category: clean(product.categoryId?.name),
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: business.settings?.currencyCode || 'PKR',
        price,
      },
    });
  }

  if (category) {
    graph.push({
      '@type': 'WebPage',
      '@id': `${pageUrl}#category`,
      name: category.name,
      url: pageUrl,
      description: clean(category.description),
      primaryImageOfPage: category.image?.publicUrl
        ? {
            '@type': 'ImageObject',
            url: category.image.publicUrl,
          }
        : undefined,
    });
  }

  const data = { '@context': 'https://schema.org', '@graph': graph };
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
