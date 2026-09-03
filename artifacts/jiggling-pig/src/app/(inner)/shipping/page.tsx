import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";

export default function ShippingPage() {
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
                  <a className="current" href="/shipping">
                    Shipping
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
                  <h1 className="title mb--40">Shipping Policy</h1>
                  <p className="disc" style={{ fontStyle: 'italic' }}>
                    Effective date: March 11, 2025
                  </p>
                  <p className="disc">
                    At The Jiggling Pig, we want your BBQ and smoked meats to arrive fresh, delicious, and ready to enjoy. Please read our shipping policy carefully so you know what to expect after placing your order.
                  </p>

                  <div className="section-list mt--40">
                    <h2 className="title">Shipping Area</h2>
                    <p className="disc">
                      We currently ship within the <strong>Washington, DC metro area</strong> and select surrounding regions. If you are unsure whether we deliver to your location, please contact us before placing your order.
                    </p>
                    <p className="disc">
                      For catering and large event orders, we offer expanded delivery coverage. Please <a href="/contact" style={{ color: '#ff8c00' }}>contact us</a> directly to discuss options.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Shipping Methods &amp; Timeframes</h2>
                    <p className="disc">
                      Available shipping methods and estimated delivery times will be shown at checkout based on your delivery address. Typical options include:
                    </p>
                    <ul>
                      <li><p><strong>Standard Delivery:</strong> 2–4 business days</p></li>
                      <li><p><strong>Express Delivery:</strong> Next business day (order by 12:00 PM)</p></li>
                      <li><p><strong>Local Pickup:</strong> Available at our DC metro location — we will contact you with pickup details after your order is confirmed</p></li>
                    </ul>
                    <p className="disc">
                      Delivery timeframes are estimates and may vary due to demand, holidays, or weather conditions.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Shipping Costs</h2>
                    <p className="disc">
                      Shipping costs are calculated at checkout based on your delivery address and selected shipping method. We occasionally offer <strong>free shipping promotions</strong> — check the banner on our homepage or subscribe to our newsletter to be notified of current deals.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Order Processing</h2>
                    <p className="disc">
                      Orders are processed Monday through Friday, excluding public holidays. Orders placed after 12:00 PM EST or on weekends will begin processing the next business day.
                    </p>
                    <p className="disc">
                      You will receive a confirmation email with your order details once your order has been placed, and a second notification once your order has been dispatched.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Fresh &amp; Perishable Items</h2>
                    <p className="disc">
                      Our smoked meats and BBQ products are perishable. All orders are carefully packaged with insulated materials and ice packs where necessary to maintain freshness during transit.
                    </p>
                    <ul>
                      <li><p>Please ensure someone is available to receive your delivery on the expected day</p></li>
                      <li><p>Refrigerate or freeze products immediately upon receipt</p></li>
                      <li><p>The Jiggling Pig is not responsible for spoilage resulting from an unattended delivery or failure to refrigerate promptly</p></li>
                    </ul>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Tracking Your Order</h2>
                    <p className="disc">
                      Once your order has shipped, you can track its status by logging into your account and visiting the <a href="/account" style={{ color: '#ff8c00' }}>My Orders</a> section, or by using our <a href="/trackorder" style={{ color: '#ff8c00' }}>Track Order</a> tool with your order number and email address.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Delivery Issues</h2>
                    <p className="disc">
                      If your order arrives damaged, is missing items, or does not arrive within the expected timeframe, please contact us within <strong>48 hours</strong> of the expected delivery date. We will investigate and resolve the issue promptly.
                    </p>
                    <p className="disc">
                      For full details on how we handle delivery problems, please see our <a href="/cancellation-returns" style={{ color: '#ff8c00' }}>Cancellation &amp; Returns</a> policy.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Contact Us</h2>
                    <p className="disc">
                      Have a question about your shipment? We&apos;re happy to help:
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
