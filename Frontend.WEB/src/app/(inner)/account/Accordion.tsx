'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getMyProfile,
  updateMyProfile,
  getMyOrders,
  getOrderInvoice,
  getMyContactPreferences,
  updateMyContactPreferences,
  getMyReviews,
  changePassword,
} from '@/lib/account';
import type {
  UserProfile,
  ShopOrder,
  OrderInvoice,
  ContactPreference,
  UserReview,
} from '@/types/api';

function formatCurrency(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return '$' + v.toFixed(2);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function StarRating({ value }: { value: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <i
        key={i}
        className={i <= value ? 'fa-solid fa-star' : 'fa-regular fa-star'}
        style={{ color: i <= value ? '#f5a623' : '#ccc', marginRight: 2 }}
      />
    );
  }
  return <span>{stars}</span>;
}

const AccountTabs = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const [contactPref, setContactPref] = useState<ContactPreference | null>(null);
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefMsg, setPrefMsg] = useState('');

  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [profileError, setProfileError] = useState('');
  const [ordersError, setOrdersError] = useState('');
  const [prefError, setPrefError] = useState('');
  const [reviewsError, setReviewsError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [curPassword, setCurPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setProfileLoading(true);
    setProfileError('');
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setFirstName(p.firstName);
        setLastName(p.lastName);
        setPhoneNumber(p.phoneNumber || '');
        setEmailAddress(p.emailAddress);
      })
      .catch(() => setProfileError('Failed to load profile.'))
      .finally(() => setProfileLoading(false));
  }, [isAuthenticated]);

  const fetchOrders = useCallback(
    (page: number) => {
      setOrdersLoading(true);
      setOrdersError('');
      getMyOrders(page, 10)
        .then((res) => {
          setOrders(res.data);
          setOrdersTotalPages(res.totalPages);
          setOrdersPage(res.page);
        })
        .catch(() => setOrdersError('Failed to load orders.'))
        .finally(() => setOrdersLoading(false));
    },
    []
  );

  useEffect(() => {
    if (activeTab === 'order' && isAuthenticated) fetchOrders(ordersPage);
  }, [activeTab, isAuthenticated, ordersPage, fetchOrders]);

  useEffect(() => {
    if (activeTab === 'subscriptions' && isAuthenticated && !contactPref) {
      setPrefLoading(true);
      setPrefError('');
      getMyContactPreferences()
        .then(setContactPref)
        .catch(() => setPrefError('Failed to load preferences.'))
        .finally(() => setPrefLoading(false));
    }
  }, [activeTab, isAuthenticated, contactPref]);

  const fetchReviews = useCallback(
    (page: number) => {
      setReviewsLoading(true);
      setReviewsError('');
      getMyReviews(page, 10)
        .then((res) => {
          setReviews(res.data);
          setReviewsTotalPages(res.totalPages);
          setReviewsPage(res.page);
        })
        .catch(() => setReviewsError('Failed to load reviews.'))
        .finally(() => setReviewsLoading(false));
    },
    []
  );

  useEffect(() => {
    if (activeTab === 'reviews' && isAuthenticated) fetchReviews(reviewsPage);
  }, [activeTab, isAuthenticated, reviewsPage, fetchReviews]);

  const handleViewInvoice = async (orderId: string) => {
    setInvoiceLoading(true);
    setShowInvoice(true);
    try {
      const inv = await getOrderInvoice(orderId);
      setInvoice(inv);
    } catch {
      setInvoice(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleTogglePref = async (field: 'optInEmail' | 'optInSms', value: boolean) => {
    if (!contactPref) return;
    const updated = { ...contactPref, [field]: value };
    setContactPref(updated);
    setPrefMsg('');
    try {
      const res = await updateMyContactPreferences({ [field]: value });
      setContactPref(res);
      setPrefMsg('Preferences saved!');
      setTimeout(() => setPrefMsg(''), 3000);
    } catch {
      setContactPref(contactPref);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    setProfileErr('');
    try {
      const updated = await updateMyProfile({ firstName, lastName, phoneNumber });
      setProfile(updated);
      setProfileMsg('Profile updated successfully!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: unknown) {
      setProfileErr(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwErr('Passwords do not match');
      return;
    }
    setPwSaving(true);
    setPwMsg('');
    setPwErr('');
    try {
      await changePassword(curPassword, newPassword, confirmPassword);
      setPwMsg('Password changed successfully!');
      setCurPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err: unknown) {
      setPwErr(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="account-tab-area-start rts-section-gap">
        <div className="container-2" style={{ textAlign: 'center', padding: '60px 0' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-tab-area-start rts-section-gap">
      <div className="container-2">
        <div className="row">
          <div className="col-lg-3">
            <div className="nav accout-dashborard-nav flex-column nav-pills me-3" role="tablist">
              <button
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <i className="fa-regular fa-chart-line"></i> Dashboard
              </button>
              <button
                className={`nav-link ${activeTab === 'order' ? 'active' : ''}`}
                onClick={() => setActiveTab('order')}
              >
                <i className="fa-regular fa-bag-shopping"></i> Order
              </button>
              <button
                className={`nav-link ${activeTab === 'track' ? 'active' : ''}`}
                onClick={() => setActiveTab('track')}
              >
                <i className="fa-regular fa-tractor"></i> Track Your Order
              </button>
              <button
                className={`nav-link ${activeTab === 'address' ? 'active' : ''}`}
                onClick={() => setActiveTab('address')}
              >
                <i className="fa-regular fa-location-dot"></i> My Address
              </button>
              <button
                className={`nav-link ${activeTab === 'account' ? 'active' : ''}`}
                onClick={() => setActiveTab('account')}
              >
                <i className="fa-regular fa-user"></i> Account Details
              </button>
              <button
                className={`nav-link ${activeTab === 'subscriptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('subscriptions')}
              >
                <i className="fa-regular fa-bell"></i> Subscriptions
              </button>
              <button
                className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                <i className="fa-regular fa-star"></i> Reviews
              </button>
              <button className="nav-link" onClick={handleLogout}>
                <i className="fa-light fa-right-from-bracket"></i> Log Out
              </button>
            </div>
          </div>
          <div className="col-lg-9 pl--50 pl_md--10 pl_sm--10 pt_md--30 pt_sm--30">
            <div className="tab-content">

              {activeTab === 'dashboard' && (
                <div className="dashboard-account-area">
                  {profileLoading ? (
                    <p>Loading...</p>
                  ) : profileError ? (
                    <p style={{ color: '#dc3545' }}>{profileError}</p>
                  ) : profile ? (
                    <>
                      <h2 className="title">
                        Hello {profile.firstName}!{' '}
                        (Not {profile.firstName}?){' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Log Out.</a>
                      </h2>
                      <p className="disc">
                        From your account dashboard you can view your recent orders,
                        manage your shipping and billing addresses, and edit your password and account details.
                      </p>
                      <div style={{ marginTop: 20 }}>
                        <p><strong>Member since:</strong> {formatDate(profile.createdAt)}</p>
                        {profile._count && (
                          <p style={{ marginTop: 8 }}>
                            <strong>Orders:</strong> {profile._count.orders ?? profile._count.shopOrders ?? 0}
                            {' | '}
                            <strong>Reviews:</strong> {profile._count.reviews ?? profile._count.productReviews ?? 0}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p>Unable to load profile.</p>
                  )}
                </div>
              )}

              {activeTab === 'order' && (
                <div className="order-table-account">
                  <div className="h2 title">Your Orders</div>
                  {ordersLoading ? (
                    <p>Loading orders...</p>
                  ) : ordersError ? (
                    <p style={{ color: '#dc3545' }}>{ordersError}</p>
                  ) : orders.length === 0 ? (
                    <p>No orders yet.</p>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Order</th>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Total</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order) => (
                              <React.Fragment key={order.id}>
                                <tr>
                                  <td>#{order.id.slice(-6)}</td>
                                  <td>{formatDate(order.orderDate)}</td>
                                  <td>{order.orderStatus?.name || 'N/A'}</td>
                                  <td>{formatCurrency(order.grandTotal)}</td>
                                  <td>
                                    <a
                                      href="#"
                                      className="btn-small d-inline-block"
                                      style={{ marginRight: 8 }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setExpandedOrder(expandedOrder === order.id ? null : order.id);
                                      }}
                                    >
                                      {expandedOrder === order.id ? 'Hide' : 'View'}
                                    </a>
                                    <a
                                      href="#"
                                      className="btn-small d-inline-block"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleViewInvoice(order.id);
                                      }}
                                    >
                                      Invoice
                                    </a>
                                  </td>
                                </tr>
                                {expandedOrder === order.id && (
                                  <tr>
                                    <td colSpan={5} style={{ background: '#f9f9f9', padding: 16 }}>
                                      <strong>Order Lines:</strong>
                                      {order.lines && order.lines.length > 0 ? (
                                        <table className="table" style={{ marginTop: 8, marginBottom: 0 }}>
                                          <thead>
                                            <tr>
                                              <th>Product</th>
                                              <th>Qty</th>
                                              <th>Unit Price</th>
                                              <th>Line Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {order.lines.map((line) => (
                                              <tr key={line.id}>
                                                <td>{line.productName || line.product?.name || 'N/A'}</td>
                                                <td>{line.qty}</td>
                                                <td>{formatCurrency(line.unitPrice)}</td>
                                                <td>{formatCurrency(line.lineTotal)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <p style={{ marginTop: 8 }}>No line items.</p>
                                      )}
                                      <div style={{ marginTop: 8 }}>
                                        <span style={{ marginRight: 16 }}><strong>Subtotal:</strong> {formatCurrency(order.subtotal)}</span>
                                        <span style={{ marginRight: 16 }}><strong>Tax:</strong> {formatCurrency(order.taxTotal)}</span>
                                        <span style={{ marginRight: 16 }}><strong>Shipping:</strong> {formatCurrency(order.shippingTotal)}</span>
                                        {Number(order.discountTotal) > 0 && (
                                          <span style={{ marginRight: 16 }}><strong>Discount:</strong> -{formatCurrency(order.discountTotal)}</span>
                                        )}
                                        <span><strong>Grand Total:</strong> {formatCurrency(order.grandTotal)}</span>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {ordersTotalPages > 1 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                          <button
                            className="rts-btn btn-primary"
                            disabled={ordersPage <= 1}
                            onClick={() => setOrdersPage(ordersPage - 1)}
                            style={{ padding: '6px 16px', fontSize: 14 }}
                          >
                            Prev
                          </button>
                          <span style={{ lineHeight: '36px' }}>Page {ordersPage} of {ordersTotalPages}</span>
                          <button
                            className="rts-btn btn-primary"
                            disabled={ordersPage >= ordersTotalPages}
                            onClick={() => setOrdersPage(ordersPage + 1)}
                            style={{ padding: '6px 16px', fontSize: 14 }}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'track' && (
                <div className="tracing-order-account">
                  <h2 className="title">Orders tracking</h2>
                  <p>
                    To keep up with the status of your order, kindly input your OrderID
                    in the designated box below and click the &quot;Track&quot; button.
                  </p>
                  <form className="order-tracking">
                    <div className="single-input">
                      <label>Order Id</label>
                      <input type="text" placeholder="Found in your order confirmation email" required />
                    </div>
                    <div className="single-input">
                      <label>Billing email</label>
                      <input type="email" placeholder="Email You use during checkout" />
                    </div>
                    <button className="rts-btn btn-primary" type="submit">Track</button>
                  </form>
                </div>
              )}

              {activeTab === 'address' && (
                <div className="shipping-address-billing-address-account">
                  {profileLoading ? (
                    <p>Loading...</p>
                  ) : profile && profile.userAddresses && profile.userAddresses.length > 0 ? (
                    profile.userAddresses.map((addr) => (
                      <div className="half" key={addr.id} style={{ marginBottom: 24 }}>
                        <h2 className="title">
                          {addr.addressType
                            ? addr.addressType.charAt(0).toUpperCase() + addr.addressType.slice(1) + ' Address'
                            : 'Address'}
                        </h2>
                        <p className="address">
                          {addr.addressLine1}
                          <br />
                          {addr.addressLine2 && (
                            <>
                              {addr.addressLine2}
                              <br />
                            </>
                          )}
                          {addr.city}
                          {addr.stateProvince ? `, ${addr.stateProvince}` : ''}
                          {addr.postalCode ? ` ${addr.postalCode}` : ''}
                          <br />
                          {addr.country || ''}
                        </p>
                        {addr.isDefault && (
                          <span style={{ fontSize: 12, color: '#28a745', fontWeight: 600 }}>Default</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>No addresses saved.</p>
                  )}
                </div>
              )}

              {activeTab === 'account' && (
                <div className="account-details-area">
                  <h2 className="title">Account Details</h2>
                  <form onSubmit={handleProfileSave}>
                    <div className="input-half-area">
                      <div className="single-input">
                        <input
                          type="text"
                          placeholder="First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="single-input">
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="single-input" style={{ marginBottom: 16 }}>
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                    <div className="single-input" style={{ marginBottom: 16 }}>
                      <input
                        type="email"
                        placeholder="Email Address *"
                        value={emailAddress}
                        readOnly
                        disabled
                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                      />
                    </div>
                    {profileMsg && <p style={{ color: '#28a745', marginBottom: 12 }}>{profileMsg}</p>}
                    {profileErr && <p style={{ color: '#dc3545', marginBottom: 12 }}>{profileErr}</p>}
                    <button className="rts-btn btn-primary" type="submit" disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>

                  <hr style={{ margin: '32px 0' }} />

                  <h2 className="title">Change Password</h2>
                  <form onSubmit={handlePasswordChange}>
                    <div className="single-input" style={{ marginBottom: 16 }}>
                      <input
                        type="password"
                        placeholder="Current Password *"
                        value={curPassword}
                        onChange={(e) => setCurPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="single-input" style={{ marginBottom: 16 }}>
                      <input
                        type="password"
                        placeholder="New Password *"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="single-input" style={{ marginBottom: 16 }}>
                      <input
                        type="password"
                        placeholder="Confirm New Password *"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    {pwMsg && <p style={{ color: '#28a745', marginBottom: 12 }}>{pwMsg}</p>}
                    {pwErr && <p style={{ color: '#dc3545', marginBottom: 12 }}>{pwErr}</p>}
                    <button className="rts-btn btn-primary" type="submit" disabled={pwSaving}>
                      {pwSaving ? 'Changing...' : 'Change Password'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'subscriptions' && (
                <div className="subscriptions-area">
                  <h2 className="title">Subscriptions</h2>
                  {prefLoading ? (
                    <p>Loading preferences...</p>
                  ) : prefError ? (
                    <p style={{ color: '#dc3545' }}>{prefError}</p>
                  ) : contactPref ? (
                    <div style={{ maxWidth: 400 }}>
                      {prefMsg && <p style={{ color: '#28a745', marginBottom: 16 }}>{prefMsg}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #eee' }}>
                        <div>
                          <strong>Email Subscriptions</strong>
                          <p style={{ fontSize: 13, color: '#777', margin: 0 }}>Receive updates via email</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={contactPref.optInEmail}
                            onChange={(e) => handleTogglePref('optInEmail', e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute', inset: 0, borderRadius: 26,
                            background: contactPref.optInEmail ? '#28a745' : '#ccc',
                            transition: 'background 0.2s',
                          }}>
                            <span style={{
                              position: 'absolute', top: 3, left: contactPref.optInEmail ? 25 : 3,
                              width: 20, height: 20, borderRadius: '50%', background: '#fff',
                              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                          </span>
                        </label>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #eee' }}>
                        <div>
                          <strong>SMS Subscriptions</strong>
                          <p style={{ fontSize: 13, color: '#777', margin: 0 }}>Receive updates via SMS</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={contactPref.optInSms}
                            onChange={(e) => handleTogglePref('optInSms', e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute', inset: 0, borderRadius: 26,
                            background: contactPref.optInSms ? '#28a745' : '#ccc',
                            transition: 'background 0.2s',
                          }}>
                            <span style={{
                              position: 'absolute', top: 3, left: contactPref.optInSms ? 25 : 3,
                              width: 20, height: 20, borderRadius: '50%', background: '#fff',
                              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                          </span>
                        </label>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                        <div>
                          <strong>News Subscriptions</strong>
                          <p style={{ fontSize: 13, color: '#777', margin: 0 }}>Receive news and promotions</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={contactPref.optInEmail}
                            onChange={(e) => handleTogglePref('optInEmail', e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute', inset: 0, borderRadius: 26,
                            background: contactPref.optInEmail ? '#28a745' : '#ccc',
                            transition: 'background 0.2s',
                          }}>
                            <span style={{
                              position: 'absolute', top: 3, left: contactPref.optInEmail ? 25 : 3,
                              width: 20, height: 20, borderRadius: '50%', background: '#fff',
                              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                          </span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <p>Unable to load preferences.</p>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="reviews-area">
                  <h2 className="title">My Reviews</h2>
                  {reviewsLoading ? (
                    <p>Loading reviews...</p>
                  ) : reviewsError ? (
                    <p style={{ color: '#dc3545' }}>{reviewsError}</p>
                  ) : reviews.length === 0 ? (
                    <p>No reviews yet.</p>
                  ) : (
                    <>
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          style={{
                            border: '1px solid #eee',
                            borderRadius: 8,
                            padding: 20,
                            marginBottom: 16,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h4 style={{ margin: 0, fontSize: 16 }}>{review.product?.name || 'Product'}</h4>
                            <span style={{
                              fontSize: 12,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: review.isApproved ? '#d4edda' : '#fff3cd',
                              color: review.isApproved ? '#155724' : '#856404',
                            }}>
                              {review.isApproved ? 'Approved' : 'Pending'}
                            </span>
                          </div>
                          <StarRating value={review.ratingValue} />
                          {review.comment && <p style={{ marginTop: 8, color: '#555' }}>{review.comment}</p>}
                          <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>{formatDate(review.createdAt)}</p>
                        </div>
                      ))}
                      {reviewsTotalPages > 1 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                          <button
                            className="rts-btn btn-primary"
                            disabled={reviewsPage <= 1}
                            onClick={() => setReviewsPage(reviewsPage - 1)}
                            style={{ padding: '6px 16px', fontSize: 14 }}
                          >
                            Prev
                          </button>
                          <span style={{ lineHeight: '36px' }}>Page {reviewsPage} of {reviewsTotalPages}</span>
                          <button
                            className="rts-btn btn-primary"
                            disabled={reviewsPage >= reviewsTotalPages}
                            onClick={() => setReviewsPage(reviewsPage + 1)}
                            style={{ padding: '6px 16px', fontSize: 14 }}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {showInvoice && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { setShowInvoice(false); setInvoice(null); }}
        >
          <div
            style={{
              background: '#fff', borderRadius: 8,
              maxWidth: 860, width: '94%', maxHeight: '90vh', overflowY: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="no-print"
              onClick={() => { setShowInvoice(false); setInvoice(null); }}
              style={{
                position: 'absolute', top: 12, right: 16,
                background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', zIndex: 10,
                color: '#333', lineHeight: 1,
              }}
            >
              &times;
            </button>
            {invoiceLoading ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <p>Loading invoice...</p>
              </div>
            ) : invoice ? (
              <div className="rts-invoice-style-one" id="invoice-print-area">
                <div className="invoice-main-wrapper-1" style={{ marginTop: 0, marginBottom: 0, borderRadius: '8px 8px 0 0' }}>
                  <div className="logo-top-area">
                    <div className="logo">
                      <img
                        src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png"
                        alt="The Jiggling Pig"
                        style={{ height: 70 }}
                      />
                    </div>
                    <div className="invoice-location">
                      <h6 className="title">Invoice</h6>
                      <span className="number">#{invoice.invoiceNumber}</span>
                      <span className="email">{formatDate(invoice.issuedAt)}</span>
                      <span className="website" style={{ textTransform: 'capitalize' }}>
                        Status: {invoice.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 40, marginTop: 30, flexWrap: 'wrap' }}>
                    {invoice.billTo && (
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <h6 style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, textTransform: 'uppercase', color: '#888' }}>Bill To</h6>
                        <p style={{ margin: 0, lineHeight: 1.7 }}>
                          {invoice.billTo.addressLine1}
                          {invoice.billTo.addressLine2 && (<><br />{invoice.billTo.addressLine2}</>)}
                          <br />
                          {invoice.billTo.city}{invoice.billTo.stateProvince ? `, ${invoice.billTo.stateProvince}` : ''}{invoice.billTo.postalCode ? ` ${invoice.billTo.postalCode}` : ''}
                          {invoice.billTo.country && (<><br />{invoice.billTo.country}</>)}
                        </p>
                      </div>
                    )}
                    {invoice.shipTo && (
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <h6 style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, textTransform: 'uppercase', color: '#888' }}>Ship To</h6>
                        <p style={{ margin: 0, lineHeight: 1.7 }}>
                          {invoice.shipTo.addressLine1}
                          {invoice.shipTo.addressLine2 && (<><br />{invoice.shipTo.addressLine2}</>)}
                          <br />
                          {invoice.shipTo.city}{invoice.shipTo.stateProvince ? `, ${invoice.shipTo.stateProvince}` : ''}{invoice.shipTo.postalCode ? ` ${invoice.shipTo.postalCode}` : ''}
                          {invoice.shipTo.country && (<><br />{invoice.shipTo.country}</>)}
                        </p>
                      </div>
                    )}
                    {invoice.shippingMethod && (
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <h6 style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, textTransform: 'uppercase', color: '#888' }}>Shipping Method</h6>
                        <p style={{ margin: 0 }}>{invoice.shippingMethod}</p>
                      </div>
                    )}
                  </div>

                  <div className="invoice-center-rts">
                    <div className="table-responsive">
                      <table className="table table-striped invoice-table">
                        <thead className="bg-active">
                          <tr>
                            <th>Item</th>
                            <th className="text-center">Unit Price</th>
                            <th className="text-center">Quantity</th>
                            <th className="text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.lines.map((line, idx) => (
                            <tr key={idx}>
                              <td>
                                <div className="item-desc-1">
                                  <span>{line.name || 'N/A'}</span>
                                  {line.sku && <small>SKU: {line.sku}</small>}
                                  {line.options && line.options.length > 0 && (
                                    <small>{line.options.join(', ')}</small>
                                  )}
                                </div>
                              </td>
                              <td className="text-center">{formatCurrency(line.unitPrice)}</td>
                              <td className="text-center">{line.qty}</td>
                              <td className="text-right">{formatCurrency(line.lineTotal)}</td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={3} className="text-end f-w-600">SubTotal</td>
                            <td className="text-right">{formatCurrency(invoice.totals.subtotal)}</td>
                          </tr>
                          {invoice.totals.discount > 0 && (
                            <tr>
                              <td colSpan={3} className="text-end f-w-600">Discount</td>
                              <td className="text-right">-{formatCurrency(invoice.totals.discount)}</td>
                            </tr>
                          )}
                          <tr>
                            <td colSpan={3} className="text-end f-w-600">Tax</td>
                            <td className="text-right">{formatCurrency(invoice.totals.tax)}</td>
                          </tr>
                          {invoice.totals.shipping > 0 && (
                            <tr>
                              <td colSpan={3} className="text-end f-w-600">Shipping</td>
                              <td className="text-right">{formatCurrency(invoice.totals.shipping)}</td>
                            </tr>
                          )}
                          <tr>
                            <td colSpan={3} className="text-end f-w-600">Grand Total</td>
                            <td className="text-right f-w-600">{formatCurrency(invoice.totals.grand)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {invoice.payments && invoice.payments.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <h6 style={{ fontWeight: 600, marginBottom: 8, fontSize: 14, textTransform: 'uppercase', color: '#888' }}>Payments</h6>
                      {invoice.payments.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                          <span style={{ textTransform: 'capitalize' }}>{p.provider}</span>
                          <span>{formatCurrency(p.amount)} — <em style={{ textTransform: 'capitalize' }}>{p.status}</em></span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="invoice-area-bottom">
                    <div className="powerby">
                      <p>Powered by</p>
                      <img
                        src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png"
                        alt="The Jiggling Pig"
                        style={{ height: 30, maxWidth: 'none' }}
                      />
                    </div>
                    <p>
                      Note: This is a computer generated receipt and does not require
                      physical signature.
                    </p>
                  </div>
                </div>
                <div className="buttons-area-invoice no-print" style={{ marginBottom: 0, padding: '16px 50px 24px', background: '#f1f1f1', borderRadius: '0 0 8px 8px' }}>
                  <a
                    href="#"
                    className="rts-btn btn-primary radious-sm with-icon"
                    onClick={(e) => { e.preventDefault(); window.print(); }}
                  >
                    <div className="btn-text">Print Now</div>
                    <div className="arrow-icon">
                      <i className="fa-regular fa-print" />
                    </div>
                    <div className="arrow-icon">
                      <i className="fa-regular fa-print" />
                    </div>
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <p>Unable to load invoice.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountTabs;
