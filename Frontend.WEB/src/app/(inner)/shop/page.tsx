"use client";
import HeaderOne from "@/components/header/HeaderOne";
import { useState, useEffect, useCallback, Suspense } from 'react';
import ShopMain from "./ShopMain";
import ShopMainList from "./ShopMainList";
import FooterOne from "@/components/footer/FooterOne";
import { useSearchParams } from 'next/navigation';
import Link from "next/link";
import { apiGet, buildQS } from "@/lib/api";
import { Product, PaginatedResponse, Brand, Category, getProductImage, getProductSlug, formatPrice } from "@/types/api";

function ShopContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const urlCategoryId = searchParams.get('categoryId') || '';
  const urlBrandId = searchParams.get('brandId') || '';

  const [activeTab, setActiveTab] = useState<string>('tab1');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(urlCategoryId ? [urlCategoryId] : []);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(urlBrandId ? [urlBrandId] : []);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(500);

  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 12;

  const [error, setError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);

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
      if (searchQuery) params.search = searchQuery;
      if (selectedCategories.length === 1) params.categoryId = selectedCategories[0];
      if (selectedBrands.length === 1) params.brandId = selectedBrands[0];
      if (minPrice > 0) params.minPrice = minPrice;
      if (maxPrice < 500) params.maxPrice = maxPrice;

      const qs = buildQS(params);
      const res = await apiGet<PaginatedResponse<Product>>(`/products${qs}`);
      let fetched = res.data || [];

      if (selectedCategories.length > 1) {
        fetched = fetched.filter(p =>
          p.categoryMaps?.some(cm => selectedCategories.includes(cm.category.id))
        );
      }
      if (selectedBrands.length > 1) {
        fetched = fetched.filter(p =>
          p.brandId && selectedBrands.includes(p.brandId)
        );
      }

      setError(null);
      setProducts(fetched);
      setTotalProducts(res.total || fetched.length);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError('Unable to load products. Please try again later.');
      setProducts([]);
      setTotalProducts(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedCategories, selectedBrands, minPrice, maxPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (urlCategoryId && !selectedCategories.includes(urlCategoryId)) {
      setSelectedCategories([urlCategoryId]);
    }
  }, [urlCategoryId]);

  useEffect(() => {
    if (urlBrandId && !selectedBrands.includes(urlBrandId)) {
      setSelectedBrands([urlBrandId]);
    }
  }, [urlBrandId]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategories, selectedBrands, minPrice, maxPrice]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleBrandChange = (brandId: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(b => b !== brandId)
        : [...prev, brandId]
    );
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setMinPrice(val);
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setMaxPrice(val);
  };

  const handlePriceFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="shop-page">
      <div className="rts-navigation-area-breadcrumb bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="navigator-breadcrumb-wrapper">
                <Link href="/">Home</Link>
                <i className="fa-regular fa-chevron-right" />
                <a className="current" href="#">Shop</a>
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
            <div className="col-xl-3 col-lg-12 pr--70 pr_lg--10 pr_sm--10 pr_md--5 rts-sticky-column-item">
              <div className="sidebar-filter-main theiaStickySidebar">
                <div className="single-filter-box">
                  <h5 className="title">Widget Price Filter</h5>
                  <div className="filterbox-body">
                    <form
                      action="#"
                      className="price-input-area"
                      onSubmit={handlePriceFilterSubmit}
                    >
                      <div className="half-input-wrapper">
                        <div className="single">
                          <label htmlFor="min">Min price</label>
                          <input
                            id="min"
                            type="number"
                            value={minPrice}
                            min={0}
                            onChange={handleMinPriceChange}
                          />
                        </div>
                        <div className="single">
                          <label htmlFor="max">Max price</label>
                          <input
                            id="max"
                            type="number"
                            value={maxPrice}
                            min={0}
                            onChange={handleMaxPriceChange}
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        className="range"
                        min={0}
                        max={500}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value, 10))}
                      />
                      <div className="filter-value-min-max">
                        <span>
                          Price: ${minPrice} — ${maxPrice}
                        </span>
                        <button type="submit" className="rts-btn btn-primary">
                          Filter
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="single-filter-box">
                  <h5 className="title">Product Categories</h5>
                  <div className="filterbox-body">
                    <div className="category-wrapper ">
                      {allCategories.map((cat, i) => (
                        <div className="single-category" key={cat.id}>
                          <input
                            id={`cat${i + 1}`}
                            type="checkbox"
                            checked={selectedCategories.includes(cat.id)}
                            onChange={() => handleCategoryChange(cat.id)}
                          />
                          <label htmlFor={`cat${i + 1}`}>{cat.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="single-filter-box">
                  <h5 className="title">Select Brands</h5>
                  <div className="filterbox-body">
                    <div className="category-wrapper">
                      {allBrands.map((brand, i) => (
                        <div className="single-category" key={brand.id}>
                          <input
                            id={`brand${i + 1}`}
                            type="checkbox"
                            checked={selectedBrands.includes(brand.id)}
                            onChange={() => handleBrandChange(brand.id)}
                          />
                          <label htmlFor={`brand${i + 1}`}>{brand.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-9 col-lg-12">
              <div className="filter-select-area">
                <div className="top-filter">
                  <span>Showing {products.length} of {totalProducts} results</span>
                  <div className="right-end">
                    <span>Sort: Short By Latest</span>
                    <div className="button-tab-area">
                      <ul className="nav nav-tabs" id="myTab" role="tablist">
                        <li className="nav-item" role="presentation">
                          <button
                            onClick={() => setActiveTab('tab1')}
                            className={`nav-link single-button ${activeTab === 'tab1' ? 'active' : ''}`}
                          >
                            <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
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
                            className={`nav-link single-button ${activeTab === 'tab2' ? 'active' : ''}`}
                          >
                            <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
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
                              <div key={product.id} className="col-lg-20 col-lg-4 col-md-6 col-sm-6 col-12">
                                <div className="single-shopping-card-one">
                                  <ShopMain
                                    Slug={getProductSlug(product)}
                                    ProductImage={getProductImage(product)}
                                    ProductTitle={product.name}
                                    Price={formatPrice(product.price)}
                                    isApiImage={true}
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-12 text-center py-5">
                              <h2>No Product Found</h2>
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
                              <div key={product.id} className="col-lg-6">
                                <div className="single-shopping-card-one discount-offer">
                                  <ShopMainList
                                    Slug={getProductSlug(product)}
                                    ProductImage={getProductImage(product)}
                                    ProductTitle={product.name}
                                    Price={formatPrice(product.price)}
                                    isApiImage={true}
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-12 text-center py-5">
                              <h2>No Product Found</h2>
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
    </div>
  );
}

export default function Home() {
  return (
    <>
      <HeaderOne />
      <Suspense fallback={
        <div className="text-center py-20">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading products...</p>
        </div>
      }>
        <ShopContent />
      </Suspense>
      <FooterOne />
    </>
  );
}
