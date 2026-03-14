'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '@/components/header/CartContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, apiAuthPost } from '@/lib/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

interface ShippingMethod {
  id: string;
  name: string;
  price: number | string;
  estimatedDays?: number | null;
}

interface ShippoRate {
  rateId: string;
  provider: string;
  providerImage?: string;
  servicelevel: string;
  amount: string;
  currency: string;
  estimatedDays: number | null;
  durationTerms?: string;
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

function CheckoutForm({ fallbackMethods }: { fallbackMethods: ShippingMethod[] }) {
  const stripe = useStripe();
  const elements = useElements();
  const { cartItems, clearCart, removeFromCart, isCartLoaded } = useCart();
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

  // ── Shippo live rates ──────────────────────────────────────────────────────
  const [liveRates, setLiveRates] = useState<ShippoRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState('');
  const [selectedRateId, setSelectedRateId] = useState('');
  const [usingLiveRates, setUsingLiveRates] = useState(false);
  const ratesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fallback static selection ──────────────────────────────────────────────
  const [selectedShipping, setSelectedShipping] = useState('');
  useEffect(() => {
    if (fallbackMethods.length > 0 && !selectedShipping) {
      setSelectedShipping(fallbackMethods[0].id);
    }
  }, [fallbackMethods, selectedShipping]);

  const cartItemsForOrder = cartItems.filter(i => i.active);

  // ── Fetch live Shippo rates when address is complete ───────────────────────
  const fetchLiveRates = async () => {
    if (!form.address1 || !form.city || !form.state || !form.zip || cartItemsForOrder.length === 0) return;

    const shippableItems = cartItemsForOrder.filter(i => i.productItemId);
    if (shippableItems.length === 0) return;

    setRatesLoading(true);
    setRatesError('');
    try {
      const res = await apiAuthPost<{ data: { rates: ShippoRate[] } }>('/shipping/rates', {
        address: {
          name: `${form.firstName} ${form.lastName}`.trim() || 'Customer',
          street1: form.address1,
          street2: form.address2 || undefined,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country || 'US',
          phone: form.phone || undefined,
          email: form.email || undefined,
        },
        items: shippableItems.map(i => ({ productItemId: i.productItemId as string, qty: i.quantity })),
      });
      const rates = res.data.rates ?? [];
      setLiveRates(rates);
      setUsingLiveRates(rates.length > 0);
      if (rates.length > 0) {
        setSelectedRateId(rates[0].rateId);
      }
    } catch (err) {
      console.error('[fetchLiveRates] error:', err);
      setRatesError('Could not fetch live shipping rates. Please select a shipping option below.');
      setUsingLiveRates(false);
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (ratesDebounceRef.current) clearTimeout(ratesDebounceRef.current);
    if (form.address1 && form.city && form.state && form.zip) {
      ratesDebounceRef.current = setTimeout(() => {
        fetchLiveRates();
      }, 800);
    } else {
      setLiveRates([]);
      setUsingLiveRates(false);
      setSelectedRateId('');
    }
    return () => {
      if (ratesDebounceRef.current) clearTimeout(ratesDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.address1, form.city, form.state, form.zip, isAuthenticated, cartItems]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [itemsWithMissingId, setItemsWithMissingId] = useState<number[]>([]);
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string; grandTotal: number } | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const subtotal = cartItemsForOrder.reduce((s, i) => s + i.price * i.quantity, 0);
  const selectedRate = liveRates.find(r => r.rateId === selectedRateId) ?? null;
  const shippingCost = usingLiveRates
    ? Number(selectedRate?.amount ?? 0)
    : Number(fallbackMethods.find(m => m.id === selectedShipping)?.price ?? 0);
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
      setItemsWithMissingId(itemsMissingId.map(i => i.id));
      setOrderError(`${itemsMissingId.length} cart item(s) are missing product info and must be removed before placing your order.`);
      return;
    }
    setItemsWithMissingId([]);

    const missingFields: string[] = [];
    if (!form.firstName.trim()) missingFields.push('First Name');
    if (!form.lastName.trim()) missingFields.push('Last Name');
    if (!form.email.trim()) missingFields.push('Email');
    if (!form.address1.trim()) missingFields.push('Address');
    if (!form.city.trim()) missingFields.push('City');
    if (!form.zip.trim()) missingFields.push('ZIP / Postal Code');
    if (usingLiveRates && !selectedRateId) missingFields.push('Shipping Method');
    if (!usingLiveRates && !selectedShipping) missingFields.push('Shipping Method');
    if (missingFields.length > 0) {
      setOrderError(`Please fill in the following required fields: ${missingFields.join(', ')}.`);
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

      const orderBody: Record<string, unknown> = {
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
        couponCode: couponResult?.code ?? undefined,
        specialInstructions: form.notes || undefined,
        paymentMethodTokenId,
        currency: 'USD',
        orderType: 'retail',
      };

      if (usingLiveRates && selectedRate) {
        orderBody.shippoRateId = selectedRate.rateId;
        orderBody.shippoRateAmount = Number(selectedRate.amount);
        orderBody.shippoCarrier = selectedRate.provider;
        orderBody.shippoServiceLevel = selectedRate.servicelevel;
      } else {
        orderBody.shippingMethodId = selectedShipping || undefined;
      }

      const orderRes = await apiFetch<{ data: { id: string; grandTotal: string | number } }>('/orders', {
        method: 'POST',
        headers: getAuthHeader(),
        body: orderBody,
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

          {/* Shipping Method — Live Shippo Rates or Fallback */}
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '24px', marginBottom: 24 }}>
            <h5 style={{ fontSize: 17, fontWeight: 700, color: '#1F1F25', marginBottom: 4 }}>Shipping Method</h5>

            {/* Loading state */}
            {ratesLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: '#526484', fontSize: 14 }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ color: '#ff8c00' }} />
                Getting shipping rates for your address…
              </div>
            )}

            {/* Error / hint when address is incomplete */}
            {!ratesLoading && !usingLiveRates && !ratesError && (
              <p style={{ fontSize: 13, color: '#8094ae', marginBottom: 12 }}>
                Fill in your address above to get real-time shipping rates.
              </p>
            )}

            {/* Rate fetch error */}
            {ratesError && !ratesLoading && (
              <p style={{ fontSize: 13, color: '#e85347', marginBottom: 12 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />{ratesError}
              </p>
            )}

            {/* Live Shippo rates */}
            {usingLiveRates && !ratesLoading && liveRates.map(rate => (
              <label key={rate.rateId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="shippingRate"
                  value={rate.rateId}
                  checked={selectedRateId === rate.rateId}
                  onChange={() => setSelectedRateId(rate.rateId)}
                />
                {rate.providerImage && (
                  <img src={rate.providerImage} alt={rate.provider} style={{ height: 24, objectFit: 'contain' }} />
                )}
                <span style={{ flex: 1, color: '#1F1F25', fontSize: 15 }}>
                  <span style={{ fontWeight: 600 }}>{rate.provider}</span>
                  <span style={{ color: '#526484', fontWeight: 400 }}> — {rate.servicelevel}</span>
                </span>
                {rate.estimatedDays != null && (
                  <span style={{ fontSize: 13, color: '#8094ae' }}>{rate.estimatedDays} day{rate.estimatedDays !== 1 ? 's' : ''}</span>
                )}
                <span style={{ fontWeight: 700, color: '#1F1F25', fontSize: 15 }}>
                  ${Number(rate.amount).toFixed(2)}
                </span>
              </label>
            ))}

            {/* Fallback static methods when Shippo is unavailable */}
            {!usingLiveRates && !ratesLoading && fallbackMethods.map(method => (
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
              {itemsWithMissingId.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      itemsWithMissingId.forEach(id => removeFromCart(id));
                      setItemsWithMissingId([]);
                      setOrderError('');
                    }}
                    style={{ background: '#e85347', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Remove invalid items from cart
                  </button>
                </div>
              )}
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
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                Processing Order…
              </>
            ) : (
              <>
                <i className="fa-solid fa-lock" />
                Place Order — ${total.toFixed(2)}
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT COLUMN: Order Summary ─────────────────────────────────── */}
        <div className="col-lg-5 order-1 order-lg-2">
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '24px', position: 'sticky', top: 100 }}>
            <h5 style={{ fontSize: 17, fontWeight: 700, color: '#1F1F25', marginBottom: 20 }}>Order Summary</h5>

            {cartItemsForOrder.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #f5f5f5' }}>
                {item.image ? (
                  <img src={item.image} alt={item.title} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 6, background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-box" style={{ color: '#aab7c4', fontSize: 20 }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1F1F25', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: '#526484' }}>Qty: {item.quantity}</div>
                </div>
                <div style={{ fontWeight: 700, color: '#1F1F25', fontSize: 14, flexShrink: 0 }}>${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}

            <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: '#526484' }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {couponResult && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: '#629D23' }}>
                  <span>Coupon ({couponResult.code})</span>
                  <span>−${discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: shippingCost === 0 ? '#629D23' : '#526484' }}>
                <span>Shipping</span>
                <span>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
              </div>
              <div style={{ fontSize: 12, color: '#aab7c4', marginBottom: 16, fontStyle: 'italic' }}>
                Sales tax calculated at checkout based on your shipping address.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, color: '#1F1F25', paddingTop: 12, borderTop: '2px solid #1F1F25' }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: '12px', background: '#f8fdf5', borderRadius: 6, border: '1px solid #ddeecb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#526484' }}>
                <i className="fa-solid fa-shield-halved" style={{ color: '#629D23' }} />
                <span>Secure checkout. 30-day return policy.</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}

export default function CheckOutMain() {
  const [fallbackMethods, setFallbackMethods] = useState<ShippingMethod[]>([]);

  useEffect(() => {
    apiFetch<{ data: ShippingMethod[] }>('/orders/shipping-methods')
      .then(res => setFallbackMethods(res.data ?? []))
      .catch(() => {});
  }, []);

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm fallbackMethods={fallbackMethods} />
    </Elements>
  );
}
