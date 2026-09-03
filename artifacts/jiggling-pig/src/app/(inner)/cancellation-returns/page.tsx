import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";

export default function CancellationReturnsPage() {
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
                  <a className="current" href="/cancellation-returns">
                    Cancellation &amp; Returns
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
                  <h1 className="title mb--40">Cancellation &amp; Returns</h1>
                  <p className="disc" style={{ fontStyle: 'italic' }}>
                    Effective date: March 11, 2025
                  </p>
                  <p className="disc">
                    At The Jiggling Pig, we take pride in delivering fresh, high-quality smoked meats and BBQ products to your door. We understand that sometimes things don&apos;t go as planned, and we&apos;re here to make it right.
                  </p>

                  <div className="section-list mt--40">
                    <h2 className="title">Order Cancellations</h2>
                    <p className="disc">
                      Because our products are freshly prepared and often made to order, cancellation requests must be submitted as early as possible.
                    </p>
                    <ul>
                      <li><p><strong>Before processing:</strong> Orders cancelled before they enter preparation will receive a full refund.</p></li>
                      <li><p><strong>After processing begins:</strong> Once your order has entered the preparation or smoking stage, cancellations may not be possible. Please contact us immediately at <a href="mailto:info@thejigglingpig.com" style={{ color: '#ff8c00' }}>info@thejigglingpig.com</a> or call <strong>1-800-513-1710</strong>.</p></li>
                      <li><p><strong>Catering &amp; large orders:</strong> Cancellations for catering events must be made at least 72 hours prior to the scheduled event date to be eligible for a refund.</p></li>
                    </ul>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Returns &amp; Refunds</h2>
                    <p className="disc">
                      Due to the perishable nature of our products, we are unable to accept physical returns of food items. However, your satisfaction is our top priority. If there is an issue with your order, we will make it right.
                    </p>
                    <h3 className="mt--20 mb--10" style={{ fontSize: '20px', fontWeight: 600 }}>Eligible Issues for Refund or Replacement</h3>
                    <ul>
                      <li><p>Item arrived damaged, spoiled, or in poor condition</p></li>
                      <li><p>Incorrect items were delivered</p></li>
                      <li><p>Significant portion of the order was missing</p></li>
                      <li><p>Quality did not meet our advertised standards</p></li>
                    </ul>
                    <h3 className="mt--20 mb--10" style={{ fontSize: '20px', fontWeight: 600 }}>How to Request a Refund</h3>
                    <p className="disc">
                      To initiate a refund or replacement, please contact us within <strong>48 hours</strong> of receiving your order:
                    </p>
                    <ul>
                      <li><p>Email us at <a href="mailto:info@thejigglingpig.com" style={{ color: '#ff8c00' }}>info@thejigglingpig.com</a> with your order number and a description of the issue</p></li>
                      <li><p>Include photos of the product if there is a quality or damage concern</p></li>
                      <li><p>Our team will review your request within 1–2 business days</p></li>
                    </ul>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Refund Processing</h2>
                    <p className="disc">
                      Approved refunds will be issued to your original payment method within <strong>5–10 business days</strong>, depending on your bank or card issuer. You will receive a confirmation email once your refund has been processed.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Non-Refundable Items</h2>
                    <ul>
                      <li><p>Items that have been fully consumed or partially eaten</p></li>
                      <li><p>Orders where the issue was not reported within 48 hours of delivery</p></li>
                      <li><p>Gift cards and promotional credits</p></li>
                    </ul>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Contact Us</h2>
                    <p className="disc">
                      If you have any questions about our cancellation or return policy, we&apos;re here to help:
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
