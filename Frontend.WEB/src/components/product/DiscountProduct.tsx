"use client"
import React, { useEffect, useState } from 'react';
import DiscountProductMain from "@/components/product-main/DiscountProductMain";
import { apiGet } from '@/lib/api';
import { Product, PaginatedResponse, getProductImage, getProductSlug, formatPrice } from '@/types/api';

function DiscountProduct() {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        apiGet<PaginatedResponse<Product>>('/products?limit=4&page=1')
            .then(res => setProducts(res.data || []))
            .catch(() => {});
    }, []);

    return (
        <div>
            <div className="rts-grocery-feature-area rts-section-gapBottom">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="title-area-between">
                                <h2 className="title-left">Products With Discounts</h2>
                                <div className="countdown">
                                    <div className="countDown">12/05/2025 10:20:00</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="product-with-discount">
                                <div className="row g-5">
                                    <div className="col-xl-4 col-lg-12">
                                        <a href="/shop" className="single-discount-with-bg">
                                            <div className="inner-content">
                                                <h4 className="title">
                                                    {products[0]?.name || 'Alpro Organic Flavored'} <br />
                                                    Fresh Juice
                                                </h4>
                                                <div className="price-area">
                                                    <span>Only</span>
                                                    <h4 className="title">${products[0] ? formatPrice(products[0].price) : '15.00'}</h4>
                                                </div>
                                            </div>
                                        </a>
                                        <a
                                            href="/shop"
                                            className="single-discount-with-bg bg-2"
                                        >
                                            <div className="inner-content">
                                                <h4 className="title">
                                                    {products[1]?.name || 'Alpro Organic Flavored'} <br />
                                                    Fresh Juice
                                                </h4>
                                                <div className="price-area">
                                                    <span>Only</span>
                                                    <h4 className="title">${products[1] ? formatPrice(products[1].price) : '15.00'}</h4>
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
