"use client"
import React, { useState } from 'react';
import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";
import { apiPost } from "@/lib/api";

interface TrackItem {
    name: string;
    qty: number;
    lineTotal: number;
}

interface TrackTotals {
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    grand: number;
}

interface TrackShipment {
    carrier: string | null;
    trackingNumber: string | null;
    status: string;
    estimatedDelivery: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
}

interface TrackResult {
    orderNumber: string;
    status: string;
    orderDate: string;
    currency: string;
    items: TrackItem[];
    totals: TrackTotals;
    shippingMethod: string | null;
    shipment: TrackShipment | null;
    timeline: { status: string | null; at: string }[];
}

function formatDate(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusColor(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('deliver')) return '#629D23';
    if (s.includes('cancel') || s.includes('refund')) return '#e85347';
    if (s.includes('ship')) return '#0ea5e9';
    return '#ff8c00';
}

export default function Home() {

    const [orderId, setOrderId] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<TrackResult | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setResult(null);
        if (!orderId.trim() || !email.trim()) {
            setError('Please enter both your order number and the email used at checkout.');
            return;
        }
        setLoading(true);
        try {
            const res = await apiPost<{ data: TrackResult }>('/orders/track', {
                orderNumber: orderId.trim(),
                email: email.trim(),
            });
            setResult(res.data);
        } catch (err: unknown) {
            setError((err as Error)?.message ?? 'We could not find an order matching those details. Please double-check and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="demo-one">
            <HeaderOne />
            <div className="rts-navigation-area-breadcrumb bg_light-1">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="navigator-breadcrumb-wrapper">
                                <a href="index.html">Home</a>
                                <i className="fa-regular fa-chevron-right" />
                                <a className="current" href="index.html">
                                    Trac Order
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="track-order-area rts-section-gap">
                <div className="container-2">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="tracing-order-account">
                                <h2 className="title">Orders tracking</h2>
                                <p>
                                    To keep up with the status of your order, kindly input your OrderID in the designated box below and click the &quot;Track&quot; button. This unique identifier can be found on your receipt as well as in the confirmation email that was sent to you.
                                </p>
                                <form className="order-tracking" onSubmit={handleSubmit}>
                                    <div className="single-input">
                                        <label htmlFor="order-id">Order Id</label>
                                        <input
                                            id="order-id"
                                            type="text"
                                            placeholder="Found in your order confirmation email"
                                            required
                                            autoComplete="off"
                                            value={orderId}
                                            onChange={(e) => setOrderId(e.target.value)}
                                        />
                                    </div>
                                    <div className="single-input">
                                        <label htmlFor="billing-email">Billing email</label>
                                        <input
                                            id="billing-email"
                                            type="email"
                                            placeholder="Email you used during checkout"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="rts-btn btn-primary" disabled={loading}>
                                        {loading ? 'Tracking…' : 'Track'}
                                    </button>
                                </form>

                                {error && (
                                    <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '14px 18px', marginTop: 24, color: '#e85347', fontSize: 14 }}>
                                        <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }} />{error}
                                    </div>
                                )}

                                {result && (
                                    <div style={{ marginTop: 32, background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '28px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                                            <div>
                                                <div style={{ fontSize: 13, color: '#8094ae' }}>Order</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#1F1F25' }}>{result.orderNumber}</div>
                                                <div style={{ fontSize: 13, color: '#8094ae', marginTop: 2 }}>Placed {formatDate(result.orderDate)}</div>
                                            </div>
                                            <span style={{ background: statusColor(result.status), color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>
                                                {result.status}
                                            </span>
                                        </div>

                                        {result.shipment && (
                                            <div style={{ background: '#f8fafc', border: '1px solid #eef2f6', borderRadius: 8, padding: '16px', marginBottom: 20 }}>
                                                <div style={{ fontWeight: 700, color: '#1F1F25', marginBottom: 8, fontSize: 15 }}>
                                                    <i className="fa-solid fa-truck" style={{ color: '#ff8c00', marginRight: 8 }} />Shipment
                                                </div>
                                                <div style={{ fontSize: 14, color: '#526484', lineHeight: 1.9 }}>
                                                    <div>Carrier: <strong>{result.shipment.carrier ?? '—'}</strong></div>
                                                    <div>Tracking #: <strong>{result.shipment.trackingNumber ?? 'Not yet assigned'}</strong></div>
                                                    <div>Status: <strong style={{ textTransform: 'capitalize' }}>{result.shipment.status}</strong></div>
                                                    {result.shipment.estimatedDelivery && <div>Estimated delivery: <strong>{formatDate(result.shipment.estimatedDelivery)}</strong></div>}
                                                    {result.shipment.shippedAt && <div>Shipped: <strong>{formatDate(result.shipment.shippedAt)}</strong></div>}
                                                    {result.shipment.deliveredAt && <div>Delivered: <strong>{formatDate(result.shipment.deliveredAt)}</strong></div>}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ fontWeight: 700, color: '#1F1F25', marginBottom: 12, fontSize: 15 }}>Items</div>
                                        {result.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14, color: '#526484' }}>
                                                <span>{item.name} <span style={{ color: '#8094ae' }}>× {item.qty}</span></span>
                                                <span style={{ fontWeight: 600, color: '#1F1F25' }}>${item.lineTotal.toFixed(2)}</span>
                                            </div>
                                        ))}

                                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e0e0e0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#526484', marginBottom: 8 }}>
                                                <span>Subtotal</span><span>${result.totals.subtotal.toFixed(2)}</span>
                                            </div>
                                            {result.totals.discount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#629D23', marginBottom: 8 }}>
                                                    <span>Discount</span><span>−${result.totals.discount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#526484', marginBottom: 8 }}>
                                                <span>Shipping{result.shippingMethod ? ` (${result.shippingMethod})` : ''}</span><span>${result.totals.shipping.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#526484', marginBottom: 8 }}>
                                                <span>Tax</span><span>${result.totals.tax.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: '#1F1F25', paddingTop: 10, borderTop: '2px solid #1F1F25' }}>
                                                <span>Total</span><span>${result.totals.grand.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {result.timeline.length > 0 && (
                                            <div style={{ marginTop: 24 }}>
                                                <div style={{ fontWeight: 700, color: '#1F1F25', marginBottom: 12, fontSize: 15 }}>History</div>
                                                {result.timeline.map((t, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '6px 0', fontSize: 14, color: '#526484' }}>
                                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(t.status ?? ''), flexShrink: 0 }} />
                                                        <span style={{ flex: 1, textTransform: 'capitalize' }}>{t.status ?? 'Updated'}</span>
                                                        <span style={{ color: '#8094ae' }}>{formatDate(t.at)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ShortService />
            <FooterOne />
        </div>
    );
}
