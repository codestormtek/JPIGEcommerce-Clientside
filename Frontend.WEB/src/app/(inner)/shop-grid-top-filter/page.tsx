"use client"
import HeaderOne from "@/components/header/HeaderOne";
import { useState, useEffect, useCallback } from 'react';
import ShopMain from "./ShopMain";
import ShopMainList from "./ShopMainList";
import FooterOne from "@/components/footer/FooterOne";
import Link from "next/link";
import { apiGet, buildQS } from "@/lib/api";
import { Product, Brand, Category, getProductImage, getProductSlug, formatPrice } from "@/types/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('tab1');

  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 15;

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  useEffect(() => {
    apiGet<{ data: Category[] }>('/products/categories')
      .then(res => setAllCategories(Array.isArray(res) ? res : res.data || []))
      .catch(() => setAllCategories([]));

    apiGet<{ data: Brand[] }>('/products/brands')
      .then(res => setAllBrands(Array.isArray(res) ? res : res.data || []))
      .catch(() => setAllBrands([]));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit,
        orderBy: 'createdAt',
        order: 'desc',
      };
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedBrand) params.brandId = selectedBrand;

      const qs = buildQS(params);
      const res: any = await apiGet(`/products${qs}`);
      const items = res.data || [];
      const meta = res.meta || {};
      setProducts(items);
      setTotalProducts(meta.total || items.length);
      setTotalPages(meta.totalPages || 1);
      setError(null);
    } catch (err) {
      setError('Unable to load products. Please try again later.');
      setProducts([]);
      setTotalProducts(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, selectedBrand]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedBrand]);

  const handleFilter = () => {
    setPage(1);
  };

  const handleReset = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setPage(1);
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalProducts);

  return (
    <div>
      <HeaderOne />

      <div className="rts-navigation-area-breadcrumb bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="navigator-breadcrumb-wrapper">
                <Link href="/">Home</Link>
                <i className="fa-regular fa-chevron-right" />
                <a className="current" href="#">
                  Shop
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="section-seperator bg_light-1">
        <div className="container">
          <hr className="section-seperator" />
        </div>
      </div>

      <div className="shop-grid-sidebar-area rts-section-gap">
        <div className="container">
          <div className="row g-0">
            <div className="col-xl-12 col-lg-12">
              <div className="filter-select-area">
                <div className="top-filter">
                  <span>
                    {loading
                      ? 'Loading...'
                      : totalProducts > 0
                        ? `Showing ${startItem}–${endItem} of ${totalProducts} results`
                        : 'No results found'}
                  </span>
                  <div className="right-end">
                    <span>Sort: Short By Latest</span>
                    <div className="button-tab-area">
                      <ul className="nav nav-tabs" id="myTab" role="tablist">
                        <li className="nav-item" role="presentation">
                          <button
                            onClick={() => setActiveTab('tab1')}
                            className={`nav-link single-button ${activeTab === 'tab1' ? 'active' : ''}`}
                          >
                            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="0.5" y="0.5" width={6} height={6} rx="1.5" stroke="#2C3B28" />
                              <rect x="0.5" y="9.5" width={6} height={6} rx="1.5" stroke="#2C3B28" />
                              <rect x="9.5" y="0.5" width={6} height={6} rx="1.5" stroke="#2C3B28" />
                              <rect x="9.5" y="9.5" width={6} height={6} rx="1.5" stroke="#2C3B28" />
                            </svg>
                          </button>
                        </li>
                        <li className="nav-item" role="presentation">
                          <button
                            onClick={() => setActiveTab('tab2')}
                            className={`nav-link single-button ${activeTab === 'tab2' ? 'active' : ''}`}>
                            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="0.5" y="0.5" width={6} height={6} rx="1.5" stroke="#2C3C28" />
                              <rect x="0.5" y="9.5" width={6} height={6} rx="1.5" stroke="#2C3C28" />
                              <rect x={9} y={3} width={7} height={1} fill="#2C3C28" />
                              <rect x={9} y={12} width={7} height={1} fill="#2C3C28" />
                            </svg>
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="nice-select-area-wrapper-and-button">
                  <div className="nice-select-wrapper-1">
                    <div className="single-select">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">All Categories</option>
                        {allCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="single-select">
                      <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                      >
                        <option value="">All Brands</option>
                        {allBrands.map((brand) => (
                          <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="button-area">
                    <button className="rts-btn" onClick={handleFilter}>Filter</button>
                    <button className="rts-btn" onClick={handleReset}>Reset Filter</button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading products...</p>
                </div>
              ) : error ? (
                <div className="text-center py-5">
                  <p className="text-danger">{error}</p>
                  <button className="rts-btn btn-primary mt-3" onClick={() => { setError(null); fetchProducts(); }}>
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <div className="tab-content" id="myTabContent">
                    <div className="product-area-wrapper-shopgrid-list mt--20 tab-pane fade show active">
                      {activeTab === 'tab1' && (
                        <div className="row g-4">
                          {products.length > 0 ? (
                            products.map((product) => (
                              <div
                                key={product.id}
                                className="col-lg-20 col-lg-4 col-md-6 col-sm-6 col-12"
                              >
                                <div className="single-shopping-card-one">
                                  <ShopMain
                                    Slug={getProductSlug(product)}
                                    ProductImage={getProductImage(product)}
                                    ProductTitle={product.name}
                                    Price={formatPrice(product.price)}
                                    isApiImage={true}
                                    productDescription={product.description || undefined}
                                    productSku={product.items?.[0]?.sku || undefined}
                                    productCategories={product.categoryMaps?.map(cm => cm.category.name).join(', ') || undefined}
                                    productBrand={product.brand?.name || undefined}
                                    productMedia={product.media}
                                    productInStock={(product.items?.[0]?.qtyInStock ?? product.quantity) > 0}
                                    ProductItemId={product.items?.[0]?.id}
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-12 text-center py-5">
                              <h2>No Products Found</h2>
                              <p className="text-muted">Try adjusting your filters.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="product-area-wrapper-shopgrid-list with-list mt--20">
                      {activeTab === 'tab2' && (
                        <div className="row">
                          {products.length > 0 ? (
                            products.map((product) => (
                              <div
                                key={product.id}
                                className="col-lg-6"
                              >
                                <div className="single-shopping-card-one discount-offer">
                                  <ShopMainList
                                    Slug={getProductSlug(product)}
                                    ProductImage={getProductImage(product)}
                                    ProductTitle={product.name}
                                    Price={formatPrice(product.price)}
                                    isApiImage={true}
                                    productDescription={product.description || undefined}
                                    productSku={product.items?.[0]?.sku || undefined}
                                    productCategories={product.categoryMaps?.map(cm => cm.category.name).join(', ') || undefined}
                                    productBrand={product.brand?.name || undefined}
                                    ProductItemId={product.items?.[0]?.id}
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-12 text-center py-5">
                              <h2>No Products Found</h2>
                              <p className="text-muted">Try adjusting your filters.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination-area mt--30">
                      <nav>
                        <ul className="pagination justify-content-center">
                          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>
                              <i className="fa-regular fa-chevron-left" />
                            </button>
                          </li>
                          {pageNumbers.map(num => (
                            <li key={num} className={`page-item ${num === page ? 'active' : ''}`}>
                              <button className="page-link" onClick={() => setPage(num)}>
                                {num}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                              <i className="fa-regular fa-chevron-right" />
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <FooterOne />
    </div>
  );
}
