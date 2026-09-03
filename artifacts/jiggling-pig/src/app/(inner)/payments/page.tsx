import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";

export default function PaymentsPage() {
  return (
    <div className="demo-one">
      <HeaderOne />

      <>
        <div className="rts-navigation-area-breadcrumb bg_light-1">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="navigator-breadcrumb-wrapper">
                  <a href="/">Home</a>
                  <i className="fa-regular fa-chevron-right" />
                  <a className="current" href="/payments">
                    Payments
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

        <div className="rts-pricavy-policy-area rts-section-gap">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="container-privacy-policy">
                  <h1 className="title mb--40">Payments</h1>
                  <p className="disc" style={{ fontStyle: 'italic' }}>
                    Effective date: March 11, 2025
                  </p>
                  <p className="disc">
                    The Jiggling Pig is committed to providing a safe, simple, and secure checkout experience. Below you will find everything you need to know about how we handle payments for online orders.
                  </p>

                  <div className="section-list mt--40">
                    <h2 className="title">Accepted Payment Methods</h2>
                    <p className="disc">
                      We currently accept the following credit and debit cards for all online orders:
                    </p>
                    <ul>
                      <li><p><strong>Visa</strong></p></li>
                      <li><p><strong>Mastercard</strong></p></li>
                      <li><p><strong>American Express</strong></p></li>
                      <li><p><strong>Discover</strong></p></li>
                    </ul>
                    <p className="disc">
                      For in-person catering events and BBQ Live orders, we also accept cash payments. Please contact us in advance if you have specific payment requirements for a large or catering order.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Secure Payment Processing</h2>
                    <p className="disc">
                      All online payments are processed securely through <strong>Stripe</strong>, an industry-leading payment platform. Your card details are encrypted using SSL/TLS technology and are never stored on our servers. The Jiggling Pig does not have access to your full card number at any time.
                    </p>
                    <ul>
                      <li><p>256-bit SSL encryption on all transactions</p></li>
                      <li><p>PCI-DSS compliant payment processing</p></li>
                      <li><p>Your card information is tokenized and never stored</p></li>
                    </ul>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Payment Authorization</h2>
                    <p className="disc">
                      When you place an order, your card is <strong>authorized</strong> for the total amount. The charge is captured once your order has been confirmed and is being prepared. You will receive an email confirmation as soon as your payment is successfully processed.
                    </p>
                    <p className="disc">
                      If your payment is declined, please check with your bank or try a different card. You can also contact us at <a href="mailto:info@thejigglingpig.com" style={{ color: '#ff8c00' }}>info@thejigglingpig.com</a> for assistance.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Pricing &amp; Taxes</h2>
                    <p className="disc">
                      All prices listed on our website are in <strong>US Dollars (USD)</strong>. Applicable sales tax will be calculated and displayed at checkout based on your delivery address. Tax rates vary by jurisdiction and are determined in accordance with local and state laws.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Coupons &amp; Promotions</h2>
                    <p className="disc">
                      Valid coupon codes can be applied at checkout before completing your purchase. Discounts are applied to the order subtotal. Only one coupon code may be used per order. Coupon codes cannot be combined with other offers unless explicitly stated.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Refunds</h2>
                    <p className="disc">
                      Approved refunds are returned to the original payment method. Please allow <strong>5–10 business days</strong> for the refund to appear, depending on your bank or card issuer. For full details, please review our <a href="/cancellation-returns" style={{ color: '#ff8c00' }}>Cancellation &amp; Returns</a> policy.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Contact Us</h2>
                    <p className="disc">
                      If you have any billing questions or concerns, please reach out to our team:
                    </p>
                    <ul>
                      <li><p>By email: <a href="mailto:info@thejigglingpig.com" style={{ color: '#ff8c00' }}>info@thejigglingpig.com</a></p></li>
                      <li><p>By phone: 1-800-513-1710</p></li>
                      <li><p>Located in the metro DC area</p></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>

      <ShortService />
      <FooterOne />
    </div>
  );
}
