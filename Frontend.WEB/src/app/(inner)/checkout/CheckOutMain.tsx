'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '@/components/header/CartContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

interface ShippingMethod {
  id: string;
  name: string;
  price: number | string;
  estimatedDays?: number | null;
}

interface CouponResult {
  code: string;
  discountAmount: number;
  discountType: string;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1F1F25',
      fontFamily: 'Arial, sans-serif',
      '::placeholder': { color: '#aab7c4' },
    },
    invalid: { color: '#e85347' },
  },
};

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('jpig_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#526484', marginBottom: 6 }}>
      {label}{required && <span style={{ color: '#e85347' }}> *</span>}
    </label>
  );
}

function CheckoutForm({ shippingMethods }: { shippingMethods: ShippingMethod[] }) {
  const stripe = useStripe();
  const elements = useElements();
  const { cartItems, clearCart, isCartLoaded } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.emailAddress || prev.email,
      }));
    }
  }, [user]);

  const [selectedShipping, setSelectedShipping] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string; grandTotal: number } | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => {
    if (shippingMethods.length > 0 && !selectedShipping) {
      setSelectedShipping(shippingMethods[0].id);
    }
  }, [shippingMethods, selectedShipping]);

  const cartItemsForOrder = cartItems.filter(i => i.active);
  const subtotal = cartItemsForOrder.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = Number(shippingMethods.find(m => m.id === selectedShipping)?.price ?? 0);
  const discount = couponResult?.discountAmount ?? 0;
  const total = Math.max(0, subtotal + shippingCost - discount);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponResult(null);
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await apiFetch<{ data: CouponResult }>('/promotions/validate-coupon', {
        method: 'POST',
        body: { code: couponCode.trim(), subtotal },
      });
      setCouponResult({ ...res.data, code: couponCode.trim() });
    } catch (err: unknown) {
      setCouponError((err as Error)?.message ?? 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!isAuthenticated) { setOrderError('Please sign in to place an order.'); return; }
    if (cartItemsForOrder.length === 0) { setOrderError('Your cart is empty.'); return; }
    if (!agreeTerms) { setOrderError('Please agree to the terms and conditions.'); return; }

    const itemsMissingId = cartItemsForOrder.filter(i => !i.productItemId);
    if (itemsMissingId.length > 0) {
      setOrderError('Some cart items are missing product info. Please remove them and re-add from the shop page.');
      return;
    }

    setSubmitting(true);
    setOrderError('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not available. Please refresh and try again.');

      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          phone: form.phone || undefined,
          address: {
            line1: form.address1,
            line2: form.address2 || undefined,
            city: form.city,
            state: form.state,
            postal_code: form.zip,
            country: form.country,
          },
        },
      });

      if (pmError) throw new Error(pmError.message ?? 'Card error — please check your details.');
      if (!paymentMethod) throw new Error('Failed to process card. Please try again.');

      const { card } = paymentMethod;
      const tokenRes = await apiFetch<{ data: { id: string } }>('/users/me/payment-methods', {
        method: 'POST',
        headers: getAuthHeader(),
        body: {
          provider: 'stripe',
          token: paymentMethod.id,
          brand: card?.brand ?? undefined,
          last4: card?.last4 ?? undefined,
          expMonth: card?.exp_month ?? undefined,
          expYear: card?.exp_year ?? undefined,
          isDefault: false,
        },
      });

      const paymentMethodTokenId = tokenRes.data.id;

      const orderRes = await apiFetch<{ data: { id: string; grandTotal: string | number } }>('/orders', {
        method: 'POST',
        headers: getAuthHeader(),
        body: {
          lines: cartItemsForOrder.map(i => ({ productItemId: i.productItemId, qty: i.quantity })),
          addresses: [
            {
              addressType: 'shipping',
              fullName: `${form.firstName} ${form.lastName}`.trim(),
              phone: form.phone || undefined,
              addressLine1: form.address1,
              addressLine2: form.address2 || undefined,
              city: form.city,
              region: form.state,
              postalCode: form.zip,
              countryName: 'United States',
              countryIso2: form.country,
            },
            {
              addressType: 'billing',
              fullName: `${form.firstName} ${form.lastName}`.trim(),
              addressLine1: form.address1,
              addressLine2: form.address2 || undefined,
              city: form.city,
              region: form.state,
              postalCode: form.zip,
              countryName: 'United States',
              countryIso2: form.country,
            },
          ],
          shippingMethodId: selectedShipping || undefined,
          couponCode: couponResult?.code ?? undefined,
          specialInstructions: form.notes || undefined,
          paymentMethodTokenId,
          currency: 'USD',
          orderType: 'retail',
        },
      });

      const orderId = orderRes.data.id;
      const orderNum = `ORD-${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
      clearCart();
      setOrderSuccess({ orderNumber: orderNum, grandTotal: Number(orderRes.data.grandTotal) });

    } catch (err: unknown) {
      setOrderError((err as Error)?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, maxWidth: 520, margin: '0 auto', padding: '48px 32px' }}>
          <div style={{ width: 72, height: 72, background: '#629D23', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: 32 }} />
          </div>
          <h2 style={{ color: '#1F1F25', marginBottom: 8, fontSize: 26 }}>Order Confirmed!</h2>
          <p style={{ color: '#526484', marginBottom: 4, fontSize: 15 }}>Order <strong>{orderSuccess.orderNumber}</strong></p>
          <p style={{ color: '#526484', marginBottom: 24, fontSize: 15 }}>Grand Total: <strong>${orderSuccess.grandTotal.toFixed(2)}</strong></p>
          <p style={{ color: '#8094ae', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
            A confirmation email is on its way to you. Your order is being reviewed and your card will be charged shortly.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/account" className="rts-btn btn-primary">View My Orders</Link>
            <Link href="/shop" style={{ display: 'inline-block', padding: '10px 24px', border: '2px solid #ff8c00', borderRadius: 6, color: '#ff8c00', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, maxWidth: 480, margin: '0 auto', padding: '48px 32px' }}>
          <i className="fa-solid fa-lock" style={{ fontSize: 48, color: '#ff8c00', marginBottom: 20, display: 'block' }} />
          <h3 style={{ color: '#1F1F25', marginBottom: 12 }}>Sign In to Checkout</h3>
          <p style={{ color: '#8094ae', marginBottom: 28, lineHeight: 1.6, fontSize: 15 }}>
            Create an account or sign in to securely complete your purchase.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login?redirect=/checkout" className="rts-btn btn-primary">Sign In</Link>
            <Link href="/register?redirect=/checkout" style={{ display: 'inline-block', padding: '10px 24px', border: '2px solid #ff8c00', borderRadius: 6, color: '#ff8c00', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isCartLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: '#8094ae', fontSize: 16 }}>
        Loading your cart…
      </div>
    );
  }

  if (cartItemsForOrder.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <i className="fa-solid fa-cart-shopping" style={{ fontSize: 48, color: '#ddd', marginBottom: 20, display: 'block' }} />
        <h3 style={{ color: '#1F1F25', marginBottom: 12 }}>Your Cart is Empty</h3>
        <Link href="/shop" className="rts-btn btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-5">

        {/* ── LEFT COLUMN: Details + Payment ─────────────────────────────── */}
        <div className="col-lg-7 order-2 order-lg-1">

          {/* Coupon */}
          <div className="coupon-input-area-1" style={{ marginBottom: 24 }}>
            <div className="coupon-area">
              <div className="coupon-ask cupon-wrapper-1">
                <button type="button" className="coupon-click" onClick={() => setShowCoupon(v => !v)}>
                  Have a coupon? Click here to enter your code
                </button>
              </div>
              {showCoupon && (
                <div className="coupon-input-area cupon1 show">
                  <div className="inner">
                    <p>If you have a coupon code, please apply it below.</p>
                    <div className="form-area">
                      <input
                        type="text"
                        placeholder="Enter Coupon Code..."
                        value={couponCode}
                        onChange={e => { setCouponCode(e.target.value); setCouponError(''); setCouponResult(null); }}
                      />
                      <button type="button" className="btn-primary rts-btn" onClick={handleCoupon} disabled={couponLoading}>
                        {couponLoading ? 'Checking...' : 'Apply Coupon'}
                      </button>
                    </div>
                    {couponResult && <p style={{ color: '#629D23', marginTop: 8, fontWeight: 600 }}>Coupon applied — saving ${couponResult.discountAmount.toFixed(2)}!</p>}
                    {couponError && <p style={{ color: '#e85347', marginTop: 8 }}>{couponError}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Details */}
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '24px', marginBottom: 24 }}>
            <h5 style={{ fontSize: 17, fontWeight: 700, color: '#1F1F25', marginBottom: 20 }}>Shipping Details</h5>
            <div className="row g-3">
              <div className="col-sm-6">
                <FieldLabel label="First Name" required />
                <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} name="firstName" value={form.firstName} onChange={handleInput} required />
              </div>
              <div className="col-sm-6">
                <FieldLabel label="Last Name" required />
                <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} name="lastName" value={form.lastName} onChange={handleInput} required />
              </div>
              <div className="col-12">
                <FieldLabel label="Email Address" required />
                <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} name="email" type="email" value={form.email} onChange={handleInput} required />
              </div>
              <div className="col-12">
                <FieldLabel label="Phone Number" />
                <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} name="phone" type="tel" value={form.phone} onChange={handleInput} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="col-12">
                <FieldLabel label="Street Address" required />
                <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} name="address1" value={form.address1} onChange={handleInput} placeholder="123 Main Street" required />
              </div>
              <div className="col-12">
                <FieldLabel label="Apt, Suite, Unit (optional)" />
                <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} name="address2" value={form.address2} onChange={handleInput} placeholder="Apt 4B" />
              </div>
              <div className="col-sm-5">
                <FieldLabel label="City" required />
                <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} name="city" value={form.city} onChange={handleInput} required />
              </div>
              <div className="col-sm-3">
                <FieldLabel label="State" required />
                <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} name="state" value={form.state} onChange={handleInput} placeholder="MD" maxLength={2} required />
              </div>
              <div className="col-sm-4">
                <FieldLabel label="ZIP Code" required />
                <input style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15 }} name="zip" value={form.zip} onChange={handleInput} placeholder="20001" required />
              </div>
              <div className="col-12">
                <FieldLabel label="Order Notes (optional)" />
                <textarea
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 15, minHeight: 80, resize: 'vertical' }}
                  name="notes"
                  value={form.notes}
                  onChange={handleInput}
                  placeholder="Special delivery instructions or requests..."
                />
              </div>
            </div>
          </div>

          {/* Shipping Method */}
          {shippingMethods.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '24px', marginBottom: 24 }}>
              <h5 style={{ fontSize: 17, fontWeight: 700, color: '#1F1F25', marginBottom: 16 }}>Shipping Method</h5>
              {shippingMethods.map(method => (
                <label key={method.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={method.id}
                    checked={selectedShipping === method.id}
                    onChange={() => setSelectedShipping(method.id)}
                  />
                  <span style={{ flex: 1, fontWeight: 500, color: '#1F1F25', fontSize: 15 }}>{method.name}</span>
                  {method.estimatedDays != null && (
                    <span style={{ fontSize: 13, color: '#8094ae' }}>{method.estimatedDays} day{method.estimatedDays !== 1 ? 's' : ''}</span>
                  )}
                  <span style={{ fontWeight: 700, color: Number(method.price) === 0 ? '#629D23' : '#1F1F25', fontSize: 15 }}>
                    {Number(method.price) === 0 ? 'FREE' : `$${Number(method.price).toFixed(2)}`}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Payment — Credit Card Only */}
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '24px', marginBottom: 24 }}>
            <h5 style={{ fontSize: 17, fontWeight: 700, color: '#1F1F25', marginBottom: 6 }}>Payment</h5>
            <p style={{ color: '#8094ae', fontSize: 13, marginBottom: 20 }}>All transactions are secure and encrypted.</p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['Visa', 'Mastercard', 'Amex', 'Discover'].map(brand => (
                <span key={brand} style={{ background: '#f5f6fa', border: '1px solid #e0e0e0', borderRadius: 4, padding: '4px 12px', fontSize: 11, color: '#526484', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {brand}
                </span>
              ))}
            </div>

            {!stripe ? (
              <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: '14px 16px', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 10, color: '#8094ae', fontSize: 14 }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ color: '#ff8c00' }} />
                Initializing secure payment...
              </div>
            ) : (
              <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: '14px 16px', background: '#fafafa' }}>
                <CardElement options={CARD_ELEMENT_OPTIONS} />
              </div>
            )}
            <p style={{ fontSize: 12, color: '#aab7c4', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-shield-halved" style={{ color: '#629D23' }} />
              Secured by Stripe. Your card details are never stored on our servers.
            </p>
          </div>

          {/* Terms */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14, color: '#526484', lineHeight: 1.5 }}>
              <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
              <span>I have read and agree to the <Link href="/terms-condition" style={{ color: '#ff8c00' }}>Terms and Conditions</Link> *</span>
            </label>
          </div>

          {/* Error */}
          {orderError && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 6, padding: '12px 16px', marginBottom: 16, color: '#e85347', fontSize: 14, lineHeight: 1.5 }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }} />{orderError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="rts-btn btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700, borderRadius: 8, cursor: (submitting || !stripe) ? 'not-allowed' : 'pointer', opacity: (submitting || !stripe) ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            disabled={submitting || !stripe}
          >
            {submitting ? (
              <><i className="fa-solid fa-spinner fa-spin" />Processing Payment...</>
            ) : !stripe ? (
              <><i className="fa-solid fa-spinner fa-spin" />Initializing Payment...</>
            ) : (
              <><i className="fa-solid fa-lock" />Place Order — ${total.toFixed(2)}</>
            )}
          </button>
        </div>

        {/* ── RIGHT COLUMN: Order Summary ─────────────────────────────────── */}
        <div className="col-lg-5 order-1 order-lg-2">
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '24px', position: 'sticky', top: 20 }}>
            <h5 style={{ fontSize: 17, fontWeight: 700, color: '#1F1F25', marginBottom: 20 }}>Order Summary</h5>

            {cartItemsForOrder.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: 14, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #eee', position: 'relative' }}>
                  <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', top: -6, right: -6, background: '#526484', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{item.quantity}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1F1F25', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                  {!item.productItemId && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#e85347' }}>Re-add from shop to checkout</p>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1F1F25', flexShrink: 0 }}>
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}

            <div style={{ borderTop: '1px solid #eee', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: '#526484' }}>
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              {selectedShipping && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: shippingCost === 0 ? '#629D23' : '#526484' }}>
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
                </div>
              )}
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: '#629D23' }}>
                  <span>Coupon ({couponResult?.code})</span><span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <p style={{ fontSize: 12, color: '#aab7c4', margin: '4px 0 14px', lineHeight: 1.5 }}>
                Sales tax calculated at checkout based on your shipping address.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 20, color: '#1F1F25', borderTop: '2px solid #1c2b46', paddingTop: 14 }}>
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}

export default function CheckOutMain() {
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);

  useEffect(() => {
    apiFetch<{ data: ShippingMethod[] }>('/orders/shipping-methods')
      .then(res => setShippingMethods(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingMethods(false));
  }, []);

  return (
    <div className="checkout-area rts-section-gap">
      <div className="container">
        {loadingMethods ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#ff8c00' }} />
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ appearance: { theme: 'stripe' } }}>
            <CheckoutForm shippingMethods={shippingMethods} />
          </Elements>
        )}
      </div>
    </div>
  );
}
