"use client"
import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import WeeklyBestSellingMain from "@/components/product-main/WeeklyBestSellingMain";
import { apiGet } from '@/lib/api';
import { Product, PaginatedResponse, getProductImage, getProductSlug, formatPrice } from '@/types/api';

function FeatureProduct() {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        apiGet<PaginatedResponse<Product>>('/products?limit=12&page=1')
            .then(res => setProducts(res.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const handleQuantityClick = (e: Event) => {
            const button = e.currentTarget as HTMLElement;
            const parent = button.closest('.quantity-edit') as HTMLElement | null;
            if (!parent) return;

            const input = parent.querySelector('.input') as HTMLInputElement | null;
            const addToCart = parent.querySelector('a.add-to-cart') as HTMLElement | null;
            if (!input) return;

            let oldValue = parseInt(input.value || '1', 10);
            let newVal = oldValue;

            if (button.classList.contains('plus')) {
                newVal = oldValue + 1;
            } else if (button.classList.contains('minus')) {
                newVal = oldValue > 1 ? oldValue - 1 : 1;
            }

            input.value = newVal.toString();
            if (addToCart) {
                addToCart.setAttribute('data-quantity', newVal.toString());
            }
        };

        const buttons = document.querySelectorAll('.quantity-edit .button');

        buttons.forEach(button => {
            button.removeEventListener('click', handleQuantityClick);
            button.addEventListener('click', handleQuantityClick);
        });

        return () => {
            buttons.forEach(button => {
                button.removeEventListener('click', handleQuantityClick);
            });
        };
    }, [products]);

    return (
        <div>
            <>
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
                                <div className="category-area-main-wrapper-one">
                                    <Swiper
                                        modules={[Navigation, Autoplay]}
                                        scrollbar={{
                                            hide: true,
                                        }}
                                        autoplay={{
                                            delay: 3000,
                                            disableOnInteraction: false,
                                        }}
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
                                                <div className="single-shopping-card-one">
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
            </>
        </div>
    )
}

export default FeatureProduct
