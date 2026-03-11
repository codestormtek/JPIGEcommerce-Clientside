"use client"
import React, { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import WeeklyBestSellingMain from "@/components/product-main/WeeklyBestSellingMain";
import ProductDetails from "@/components/modal/ProductDetails";
import { apiGet } from '@/lib/api';
import { Product, PaginatedResponse, getProductImage, getProductSlug, formatPrice } from '@/types/api';

interface QuickViewProduct {
  image: string;
  title: string;
  price: string;
  description?: string;
  sku?: string;
  categories?: string;
  brand?: string;
  slug: string;
  media?: Product['media'];
  inStock: boolean;
}

function productToQuickView(product: Product): QuickViewProduct {
  return {
    image: getProductImage(product),
    title: product.name,
    price: formatPrice(product.price),
    description: product.description || undefined,
    sku: product.items?.[0]?.sku || undefined,
    categories: product.categoryMaps?.map(cm => cm.category.name).join(', ') || undefined,
    brand: product.brand?.name || undefined,
    slug: getProductSlug(product),
    media: product.media,
    inStock: (product.items?.[0]?.qtyInStock ?? product.quantity) > 0,
  };
}

function FeatureProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quickView, setQuickView] = useState<QuickViewProduct | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet<PaginatedResponse<Product>>('/products?limit=12&page=1')
      .then(res => setProducts(res.data || []))
      .catch(() => {});
  }, []);

  // Native DOM event delegation — catches clicks on CLONED Swiper slides
  // (cloned slides have no React fiber so synthetic onClick never fires on them)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeClick = (e: MouseEvent) => {
      const btn = (e.target as Element).closest('.product-details-popup-btn');
      if (!btn) return;
      const slide = btn.closest('[data-product-id]');
      if (!slide) return;
      const productId = slide.getAttribute('data-product-id');
      const product = products.find(p => p.id === productId);
      if (product) setQuickView(productToQuickView(product));
    };

    container.addEventListener('click', handleNativeClick);
    return () => container.removeEventListener('click', handleNativeClick);
  }, [products]);

  return (
    <div>
      <div className="rts-grocery-feature-area rts-section-gapBottom">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="title-area-between">
                <h2 className="title-left">Featured Grocery</h2>
                <div className="next-prev-swiper-wrapper">
                  <div className="swiper-button-prev">
                    <i className="fa-regular fa-chevron-left" />
                  </div>
                  <div className="swiper-button-next">
                    <i className="fa-regular fa-chevron-right" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="category-area-main-wrapper-one" ref={containerRef}>
                <Swiper
                  modules={[Navigation, Autoplay]}
                  scrollbar={{ hide: true }}
                  autoplay={{ delay: 3000, disableOnInteraction: false }}
                  loop={true}
                  navigation={{
                    nextEl: ".swiper-button-next",
                    prevEl: ".swiper-button-prev",
                  }}
                  className="mySwiper-category-1"
                  breakpoints={{
                    0: { slidesPerView: 1, spaceBetween: 30 },
                    320: { slidesPerView: 2, spaceBetween: 30 },
                    480: { slidesPerView: 3, spaceBetween: 30 },
                    640: { slidesPerView: 3, spaceBetween: 30 },
                    840: { slidesPerView: 4, spaceBetween: 30 },
                    1140: { slidesPerView: 6, spaceBetween: 30 },
                  }}
                >
                  {products.map((product, index) => (
                    <SwiperSlide key={product.id || index}>
                      {/* data-product-id is cloned alongside the slide so the
                          native listener can identify which product was clicked */}
                      <div
                        className="single-shopping-card-one"
                        data-product-id={product.id}
                      >
                        <WeeklyBestSellingMain
                          Slug={getProductSlug(product)}
                          ProductImage={getProductImage(product)}
                          ProductTitle={product.name}
                          Price={formatPrice(product.price)}
                          productDescription={product.description || undefined}
                          productSku={product.items?.[0]?.sku || undefined}
                          productCategories={product.categoryMaps?.map(cm => cm.category.name).join(', ') || undefined}
                          productBrand={product.brand?.name || undefined}
                          productMedia={product.media}
                          productInStock={(product.items?.[0]?.qtyInStock ?? product.quantity) > 0}
                          onQuickView={() => setQuickView(productToQuickView(product))}
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Single shared quick-view modal — rendered outside the Swiper */}
      {quickView && (
        <ProductDetails
          show={true}
          handleClose={() => setQuickView(null)}
          productImage={quickView.image}
          productTitle={quickView.title}
          productPrice={quickView.price}
          productDescription={quickView.description}
          productSku={quickView.sku}
          productCategories={quickView.categories}
          productBrand={quickView.brand}
          productSlug={quickView.slug}
          productMedia={quickView.media}
          productInStock={quickView.inStock}
        />
      )}
    </div>
  );
}

export default FeatureProduct;
