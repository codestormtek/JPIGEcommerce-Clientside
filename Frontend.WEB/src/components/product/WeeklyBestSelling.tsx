"use client"
import { useState, useEffect } from 'react';
import WeeklyBestSellingMain from "@/components/product-main/WeeklyBestSellingMain";
import { apiGet } from '@/lib/api';
import { Product, PaginatedResponse, getProductImage, getProductSlug, formatPrice } from '@/types/api';

const WeeklyBestSelling: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [activeTab, setActiveTab] = useState<string>('all');

    useEffect(() => {
        apiGet<PaginatedResponse<Product>>('/products?limit=24&page=1')
            .then(res => {
                const items = res.data || [];
                setProducts(items);
                const cats: { id: string; name: string }[] = [];
                const seen = new Set<string>();
                items.forEach(p => {
                    p.categoryMaps?.forEach(cm => {
                        if (!seen.has(cm.category.id)) {
                            seen.add(cm.category.id);
                            cats.push(cm.category);
                        }
                    });
                });
                setCategories(cats.slice(0, 4));
            })
            .catch(() => {});
    }, []);

    const filteredProducts = activeTab === 'all'
        ? products
        : products.filter(p =>
            p.categoryMaps?.some(cm => cm.category.id === activeTab)
          );

    const displayProducts = filteredProducts.slice(0, 12);

    return (
        <div>
            <>
                <div className="weekly-best-selling-area rts-section-gap bg_light-1">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-12">
                                <div className="title-area-between">
                                    <h2 className="title-left">Weekly Best Selling Groceries</h2>
                                    <ul
                                        className="nav nav-tabs best-selling-grocery"
                                        id="myTab"
                                        role="tablist"
                                    >
                                        <li className="nav-item" role="presentation">
                                            <button
                                                onClick={() => setActiveTab('all')}
                                                className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                                            >
                                                All
                                            </button>
                                        </li>
                                        {categories.map(cat => (
                                            <li key={cat.id} className="nav-item" role="presentation">
                                                <button
                                                    onClick={() => setActiveTab(cat.id)}
                                                    className={`nav-link ${activeTab === cat.id ? 'active' : ''}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-lg-12">
                                <div className="row g-4">
                                    {displayProducts.map((product, index) => (
                                        <div
                                            key={product.id || index}
                                            className="col-xxl-2 col-xl-3 col-lg-4 col-md-4 col-sm-6 col-12"
                                        >
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        </div>
    )
}

export default WeeklyBestSelling
