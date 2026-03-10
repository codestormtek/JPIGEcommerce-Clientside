"use client";

import { useState } from "react";
import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import RelatedProduct from "@/components/product/RelatedProduct";
import FooterOne from "@/components/footer/FooterOne";
import { Product, getProductImage, formatPrice } from "@/types/api";
import { useCart } from "@/components/header/CartContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Props {
  product: Product | null;
  error: string | null;
}

export default function ProductDetailClient({ product, error }: Props) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("tab1");
  const [activeImage, setActiveImage] = useState<string>(
    product ? getProductImage(product) : ""
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    product?.items?.[0]?.id ?? null
  );

  if (error || !product) {
    return (
      <div>
        <HeaderOne />
        <div
          className="rts-section-gap bg_light-1 d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <div className="text-center">
            <h3>Product not found</h3>
            <p>{error || "The product you are looking for does not exist."}</p>
            <a href="/shop-grid-top-filter" className="rts-btn btn-primary">
              Back to Shop
            </a>
          </div>
        </div>
        <FooterOne />
      </div>
    );
  }

  const thumbnails =
    product.media
      ?.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.sortOrder - b.sortOrder;
      })
      .map((m, i) => ({
        id: `thumb-${i}`,
        src: m.mediaAsset.url,
        alt: m.mediaAsset.altText || product.name,
      })) || [];

  if (thumbnails.length === 0) {
    thumbnails.push({
      id: "thumb-default",
      src: "/assets/images/grocery/15.jpg",
      alt: product.name,
    });
  }

  const categories =
    product.categoryMaps?.map((cm) => cm.category.name).join(", ") || "";
  const brandName = product.brand?.name || "";

  const selectedItem = product.items?.find(
    (item) => item.id === selectedItemId
  );
  const displayPrice = selectedItem ? selectedItem.price : product.price;
  const displaySku = selectedItem?.sku || "";

  const variationGroups: Record<
    string,
    {
      variationName: string;
      options: { id: string; value: string; itemId: string }[];
    }
  > = {};
  if (product.items && product.items.length > 0) {
    product.items.forEach((item) => {
      item.options?.forEach((opt) => {
        const varName = opt.variationOption.variation.name;
        if (!variationGroups[varName]) {
          variationGroups[varName] = { variationName: varName, options: [] };
        }
        const existing = variationGroups[varName].options.find(
          (o) => o.id === opt.variationOption.id
        );
        if (!existing) {
          variationGroups[varName].options.push({
            id: opt.variationOption.id,
            value: opt.variationOption.value,
            itemId: item.id,
          });
        }
      });
    });
  }

  const handleAdd = () => {
    addToCart({
      id: Date.now(),
      image: activeImage,
      title: product.name,
      price: displayPrice,
      quantity: 1,
      active: true,
    });
    setAdded(true);
    toast("Successfully Added To Cart!");
    setTimeout(() => setAdded(false), 5000);
  };

  const handleVariantSelect = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  return (
    <div>
      <HeaderOne />
      <div className="rts-navigation-area-breadcrumb bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="navigator-breadcrumb-wrapper">
                <a href="/">Home</a>
                <i className="fa-regular fa-chevron-right" />
                <a href="/shop-grid-top-filter">Shop</a>
                <i className="fa-regular fa-chevron-right" />
                <a className="current" href="#">
                  {product.name}
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

      <div className="rts-chop-details-area rts-section-gap bg_light-1">
        <div className="container">
          <div className="shopdetails-style-1-wrapper">
            <div className="row g-5">
              <div className="col-xl-8 col-lg-8 col-md-12">
                <div className="product-details-popup-wrapper in-shopdetails">
                  <div className="rts-product-details-section rts-product-details-section2 product-details-popup-section">
                    <div className="product-details-popup">
                      <div className="details-product-area">
                        <div className="product-thumb-area">
                          <div className="cursor" />
                          <div className="thumb-wrapper one filterd-items figure">
                            <div className="product-thumb">
                              <img src={activeImage} alt={product.name} />
                            </div>
                          </div>
                          {thumbnails.length > 1 && (
                            <div className="product-thumb-filter-group">
                              {thumbnails.map((thumb) => (
                                <div
                                  key={thumb.id}
                                  className={`thumb-filter filter-btn ${activeImage === thumb.src ? "active" : ""}`}
                                  onClick={() => setActiveImage(thumb.src)}
                                  style={{ cursor: "pointer" }}
                                >
                                  <img src={thumb.src} alt={thumb.alt} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="contents">
                          <div className="product-status">
                            {categories && (
                              <span className="product-catagory">
                                {categories}
                              </span>
                            )}
                          </div>
                          <h2 className="product-title">{product.name}</h2>
                          {product.description && (
                            <p className="mt--20 mb--20">
                              {product.description}
                            </p>
                          )}
                          <span
                            className="product-price mb--15 d-block"
                            style={{ color: "#DC2626", fontWeight: 600 }}
                          >
                            ${formatPrice(displayPrice)}
                          </span>

                          {Object.keys(variationGroups).length > 0 && (
                            <div className="product-variants mb--15">
                              {Object.entries(variationGroups).map(
                                ([varName, group]) => (
                                  <div
                                    key={varName}
                                    className="variant-group mb--10"
                                  >
                                    <strong>{group.variationName}:</strong>{" "}
                                    {group.options.map((opt) => (
                                      <button
                                        key={opt.id}
                                        className={`btn btn-sm me-1 ${selectedItemId === opt.itemId ? "btn-primary" : "btn-outline-primary"}`}
                                        onClick={() =>
                                          handleVariantSelect(opt.itemId)
                                        }
                                      >
                                        {opt.value}
                                      </button>
                                    ))}
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          <div className="product-bottom-action">
                            <a
                              href="#"
                              className="rts-btn btn-primary radious-sm with-icon"
                              onClick={(e) => {
                                e.preventDefault();
                                handleAdd();
                              }}
                            >
                              <div className="btn-text">Add to Cart</div>
                              <div className="arrow-icon">
                                <i className="fa-regular fa-cart-shopping" />
                              </div>
                              <div className="arrow-icon">
                                <i className="fa-regular fa-cart-shopping" />
                              </div>
                            </a>
                          </div>

                          <div className="product-uniques">
                            {displaySku && (
                              <span className="sku product-unipue mb--10">
                                <strong>SKU:</strong> {displaySku}
                              </span>
                            )}
                            {categories && (
                              <span className="catagorys product-unipue mb--10">
                                <strong>Categories:</strong> {categories}
                              </span>
                            )}
                            {brandName && (
                              <span className="tags product-unipue mb--10">
                                <strong>Brand:</strong> {brandName}
                              </span>
                            )}
                          </div>

                          <div className="share-option-shop-details">
                            <div className="single-share-option">
                              <div className="icon">
                                <i className="fa-regular fa-heart" />
                              </div>
                              <span>Add To Wishlist</span>
                            </div>
                            <div className="single-share-option">
                              <div className="icon">
                                <i className="fa-solid fa-share" />
                              </div>
                              <span>Share On social</span>
                            </div>
                            <div className="single-share-option">
                              <div className="icon">
                                <i className="fa-light fa-code-compare" />
                              </div>
                              <span>Compare</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="product-discription-tab-shop mt--50">
                  <ul className="nav nav-tabs" id="myTab" role="tablist">
                    <li className="nav-item" role="presentation">
                      <button
                        onClick={() => setActiveTab("tab1")}
                        className={`nav-link ${activeTab === "tab1" ? "active" : ""}`}
                      >
                        Product Details
                      </button>
                    </li>
                    {product.attributes && product.attributes.length > 0 && (
                      <li className="nav-item" role="presentation">
                        <button
                          onClick={() => setActiveTab("tab2")}
                          className={`nav-link ${activeTab === "tab2" ? "active" : ""}`}
                        >
                          Additional Information
                        </button>
                      </li>
                    )}
                    <li className="nav-item" role="presentation">
                      <button
                        onClick={() => setActiveTab("tab3")}
                        className={`nav-link ${activeTab === "tab3" ? "active" : ""}`}
                      >
                        Customer Reviews
                      </button>
                    </li>
                  </ul>
                  <div className="tab-content" id="myTabContent">
                    {activeTab === "tab1" && (
                      <div>
                        <div className="single-tab-content-shop-details">
                          {product.description ? (
                            <p className="disc">{product.description}</p>
                          ) : (
                            <p className="disc">
                              No detailed description available for this
                              product.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "tab2" &&
                      product.attributes &&
                      product.attributes.length > 0 && (
                        <div>
                          <div className="single-tab-content-shop-details">
                            <div className="table-responsive table-shop-details-pd">
                              <table className="table">
                                <tbody>
                                  {product.attributes.map((attr) => (
                                    <tr key={attr.id}>
                                      <td>
                                        <strong>{attr.name}</strong>
                                      </td>
                                      <td>
                                        {attr.values
                                          .map((v) => v.value)
                                          .join(", ")}
                                      </td>
                                    </tr>
                                  ))}
                                  {brandName && (
                                    <tr>
                                      <td>
                                        <strong>Brand</strong>
                                      </td>
                                      <td>{brandName}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                    {activeTab === "tab3" && (
                      <div>
                        <div className="single-tab-content-shop-details">
                          <div className="submit-review-area">
                            <form action="#" className="submit-review-area">
                              <h5 className="title">Submit Your Review</h5>
                              <div className="your-rating">
                                <span>Your Rating Of This Product :</span>
                                <div className="stars">
                                  <i className="fa-solid fa-star" />
                                  <i className="fa-solid fa-star" />
                                  <i className="fa-solid fa-star" />
                                  <i className="fa-solid fa-star" />
                                  <i className="fa-solid fa-star" />
                                </div>
                              </div>
                              <div className="half-input-wrapper">
                                <div className="half-input">
                                  <input
                                    type="text"
                                    placeholder="Your Name*"
                                  />
                                </div>
                                <div className="half-input">
                                  <input
                                    type="text"
                                    placeholder="Your Email *"
                                  />
                                </div>
                              </div>
                              <textarea
                                placeholder="Write Your Review"
                                defaultValue={""}
                              />
                              <button className="rts-btn btn-primary">
                                SUBMIT REVIEW
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-xl-3 col-lg-4 col-md-12 offset-xl-1  rts-sticky-column-item">
                <div className="theiaStickySidebar">
                  <div className="shop-sight-sticky-sidevbar mb--20">
                    <h6 className="title">Available offers</h6>
                    <div className="single-offer-area">
                      <div className="icon">
                        <img src="/assets/images/shop/01.svg" alt="icon" />
                      </div>
                      <div className="details">
                        <p>
                          Get 5% instant discount for the 1st Flipkart Order
                          using Ekomart UPI
                        </p>
                      </div>
                    </div>
                    <div className="single-offer-area">
                      <div className="icon">
                        <img src="/assets/images/shop/02.svg" alt="icon" />
                      </div>
                      <div className="details">
                        <p>
                          Flat $250 off on Citi Credit Card EMI Transactions
                          over $30
                        </p>
                      </div>
                    </div>
                    <div className="single-offer-area">
                      <div className="icon">
                        <img src="/assets/images/shop/03.svg" alt="icon" />
                      </div>
                      <div className="details">
                        <p>
                          Free Worldwide Shipping on all orders over $100
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="our-payment-method">
                    <h5 className="title">Guaranteed Safe Checkout</h5>
                    <img src="/assets/images/shop/03.png" alt="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RelatedProduct />
      <ShortService />
      <FooterOne />
      <ToastContainer />
    </div>
  );
}
