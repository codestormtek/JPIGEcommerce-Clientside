'use client';

import { useState, useEffect, useMemo } from "react";
import Modal from "react-bootstrap/Modal";
import { useCart } from "@/components/header/CartContext";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from "next/link";

interface ProductMedia {
  isPrimary: boolean;
  sortOrder: number;
  mediaAsset: { url: string; altText?: string | null };
}

interface ModalProps {
  show: boolean;
  handleClose: () => void;
  productImage: string;
  productTitle: string;
  productPrice: string;
  productDescription?: string;
  productSku?: string;
  productCategories?: string;
  productBrand?: string;
  productSlug?: string;
  productMedia?: ProductMedia[];
  productInStock?: boolean;
}

const ProductDetails: React.FC<ModalProps> = ({
  show,
  handleClose,
  productImage,
  productTitle,
  productPrice,
  productDescription,
  productSku,
  productCategories,
  productBrand,
  productSlug,
  productMedia,
  productInStock = true,
}) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  const thumbnails = useMemo(() => {
    const sorted = [...(productMedia ?? [])]
      .sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.sortOrder - b.sortOrder;
      })
      .map((m, i) => ({
        id: `thumb-${i}`,
        src: m.mediaAsset.url,
        alt: m.mediaAsset.altText || productTitle,
      }));

    if (sorted.length === 0) {
      sorted.push({ id: 'thumb-default', src: productImage, alt: productTitle });
    }
    return sorted;
  }, [productMedia, productImage, productTitle]);

  const [activeImage, setActiveImage] = useState(productImage);

  useEffect(() => {
    if (show) {
      setActiveImage(thumbnails[0]?.src || productImage);
      setQuantity(1);
    }
  }, [show, thumbnails, productImage]);

  const increaseQuantity = () => setQuantity((prev) => prev + 1);
  const decreaseQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const priceNumber = parseFloat(productPrice) || 0;
  const totalPrice = (priceNumber * quantity).toFixed(2);

  const handleAdd = () => {
    addToCart({
      id: Date.now(),
      image: productImage,
      title: productTitle,
      price: priceNumber,
      quantity: quantity,
      active: true,
    });
    toast.success('Successfully Added To Cart!');
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      backdrop="static"
      keyboard={false}
      dialogClassName="modal-compare"
    >
      <div className="product-details-popup-wrapper popup">
        <div className="rts-product-details-section rts-product-details-section2 product-details-popup-section">
          <div className="product-details-popup">
            <button className="product-details-close-btn" onClick={handleClose}>
              <i className="fal fa-times" />
            </button>
            <div className="details-product-area">
              <div className="product-thumb-area">
                <div className="cursor" />
                <div className="thumb-wrapper one filterd-items figure">
                  <div className="product-thumb zoom">
                    <img src={activeImage} alt={productTitle} />
                  </div>
                </div>
                {thumbnails.length > 1 && (
                  <div className="product-thumb-filter-group">
                    {thumbnails.map((thumb) => (
                      <div
                        key={thumb.id}
                        onClick={() => setActiveImage(thumb.src)}
                        className={`thumb-filter filter-btn ${activeImage === thumb.src ? 'active' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src={thumb.src} alt={thumb.alt} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="contents">
                <div className="product-status">
                  {productCategories && (
                    <span className="product-catagory">{productCategories.split(',')[0]?.trim()}</span>
                  )}
                </div>

                <h2 className="product-title">
                  {productTitle}{' '}
                  <span className="stock" style={{ color: productInStock ? '#27AE60' : '#E74C3C' }}>
                    {productInStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </h2>

                <span className="product-price">${totalPrice}</span>

                {productDescription && <p>{productDescription}</p>}

                <div className="product-bottom-action">
                  <div className="cart-edit">
                    <div className="quantity-edit action-item">
                      <button className="button" onClick={decreaseQuantity}>
                        <i className="fal fa-minus minus" />
                      </button>
                      <input type="text" className="input" value={quantity} readOnly />
                      <button className="button plus" onClick={increaseQuantity}>
                        <i className="fal fa-plus plus" />
                      </button>
                    </div>
                  </div>

                  <Link
                    href="#"
                    className="rts-btn btn-primary radious-sm with-icon"
                    onClick={(e) => {
                      e.preventDefault();
                      handleAdd();
                    }}
                  >
                    <div className="btn-text">Add To Cart</div>
                    <div className="arrow-icon">
                      <i className="fa-regular fa-cart-shopping" />
                    </div>
                    <div className="arrow-icon">
                      <i className="fa-regular fa-cart-shopping" />
                    </div>
                  </Link>

                  <Link href="javascript:void(0);" className="rts-btn btn-primary ml--20">
                    <i className="fa-light fa-heart" />
                  </Link>
                </div>

                <div className="product-uniques">
                  {productSku && (
                    <span className="sku product-unipue">
                      <span>SKU: </span> {productSku}
                    </span>
                  )}
                  {productCategories && (
                    <span className="catagorys product-unipue">
                      <span>Categories: </span> {productCategories}
                    </span>
                  )}
                  {productBrand && (
                    <span className="tags product-unipue">
                      <span>Brand: </span> {productBrand}
                    </span>
                  )}
                </div>

                {productSlug && (
                  <div className="mt--10">
                    <Link href={`/shop/${productSlug}`} className="rts-btn btn-primary radious-sm">
                      View Full Details
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ProductDetails;
