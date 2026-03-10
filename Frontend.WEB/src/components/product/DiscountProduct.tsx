"use client"
import React, { useEffect, useState } from 'react';
import DiscountProductMain from "@/components/product-main/DiscountProductMain";
import { apiGet } from '@/lib/api';
import { Product, PaginatedResponse, getProductImage, getProductSlug, formatPrice } from '@/types/api';
import { useSiteSettings } from '@/context/SiteSettingsContext';

interface PromoBanner {
    title: string;
    subtitle: string;
    price_label: string;
    link: string;
    image_url: string;
}

const defaultBanner1: PromoBanner = {
    title: "Alpro Organic Flavored",
    subtitle: "Fresh Juice",
    price_label: "Only",
    link: "/shop",
    image_url: "",
};

const defaultBanner2: PromoBanner = {
    title: "Alpro Organic Flavored",
    subtitle: "Fresh Juice",
    price_label: "Only",
    link: "/shop",
    image_url: "",
};

function parsePromoBanner(json: string | undefined, fallback: PromoBanner): PromoBanner {
    if (!json) return fallback;
    try {
        return { ...fallback, ...JSON.parse(json) };
    } catch {
        return fallback;
    }
}

function DiscountProduct() {
    const [products, setProducts] = useState<Product[]>([]);
    const { settings } = useSiteSettings();

    useEffect(() => {
        apiGet<PaginatedResponse<Product>>('/products?limit=4&page=1')
            .then(res => setProducts(res.data || []))
            .catch(() => {});
    }, []);

    const banner1 = parsePromoBanner(settings.discount_banner_1, defaultBanner1);
    const banner2 = parsePromoBanner(settings.discount_banner_2, defaultBanner2);

    const b1Title = banner1.title || products[0]?.name || defaultBanner1.title;
    const b1Price = products[0] ? formatPrice(products[0].price) : '15.00';
    const b2Title = banner2.title || products[1]?.name || defaultBanner2.title;
    const b2Price = products[1] ? formatPrice(products[1].price) : '15.00';

    return (
        <div>
            <div className="rts-grocery-feature-area rts-section-gapBottom">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="title-area-between">
                                <h2 className="title-left">{settings.discount_section_title || "Products With Discounts"}</h2>
                                <div className="countdown">
                                    <div className="countDown">{settings.discount_countdown || "12/05/2025 10:20:00"}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="product-with-discount">
                                <div className="row g-5">
                                    <div className="col-xl-4 col-lg-12">
                                        <a href={banner1.link} className="single-discount-with-bg" style={banner1.image_url ? { backgroundImage: `url(${banner1.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
                                            <div className="inner-content">
                                                <h4 className="title">
                                                    {b1Title} <br />
                                                    {banner1.subtitle}
                                                </h4>
                                                <div className="price-area">
                                                    <span>{banner1.price_label}</span>
                                                    <h4 className="title">${b1Price}</h4>
                                                </div>
                                            </div>
                                        </a>
                                        <a
                                            href={banner2.link}
                                            className="single-discount-with-bg bg-2"
                                            style={banner2.image_url ? { backgroundImage: `url(${banner2.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                                        >
                                            <div className="inner-content">
                                                <h4 className="title">
                                                    {b2Title} <br />
                                                    {banner2.subtitle}
                                                </h4>
                                                <div className="price-area">
                                                    <span>{banner2.price_label}</span>
                                                    <h4 className="title">${b2Price}</h4>
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                    <div className="col-xl-8 col-lg-12">
                                        <div className="row g-4">
                                            {products.slice(0, 4).map((product, index) => (
                                                <div
                                                    key={product.id || index}
                                                    className="col-lg-6"
                                                >
                                                    <div className="single-shopping-card-one discount-offer">
                                                        <DiscountProductMain
                                                            Slug={getProductSlug(product)}
                                                            ProductImage={getProductImage(product)}
                                                            ProductTitle={product.name}
                                                            Price={formatPrice(product.price)}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DiscountProduct