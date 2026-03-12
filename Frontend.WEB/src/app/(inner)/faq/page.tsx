import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";

export default function FAQPage() {
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
                  <a className="current" href="/faq">
                    FAQ
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
                  <h1 className="title mb--40">Frequently Asked Questions</h1>
                  <p className="disc">
                    Got questions? We&apos;ve got answers. If you don&apos;t find what you&apos;re looking for here, feel free to reach out to us directly at <a href="mailto:info@thejigglingpig.com" style={{ color: '#ff8c00' }}>info@thejigglingpig.com</a> or call <strong>1-800-513-1710</strong>.
                  </p>

                  <div className="section-list mt--40">
                    <h2 className="title">About The Jiggling Pig</h2>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      What is The Jiggling Pig?
                    </h3>
                    <p className="disc">
                      The Jiggling Pig is a DC metro area BBQ brand specializing in authentic, slow-smoked meats, sides, and sauces. We offer online ordering for retail products, as well as catering services and live BBQ events.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      Where are you located?
                    </h3>
                    <p className="disc">
                      We are located in the metro Washington, DC area. For specific location details or pickup arrangements, please <a href="/contact" style={{ color: '#ff8c00' }}>contact us</a>.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      What makes your BBQ different?
                    </h3>
                    <p className="disc">
                      Everything we make is slow-smoked the traditional way — low and slow, with real wood, real fire, and a lot of patience. No shortcuts, no artificial flavors. Just authentic BBQ the way it was meant to be.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Ordering Online</h2>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      Do I need an account to place an order?
                    </h3>
                    <p className="disc">
                      Yes, an account is required to complete a purchase on our website. Creating an account is quick and free — it also lets you track your orders and save your details for future checkouts.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      What payment methods do you accept?
                    </h3>
                    <p className="disc">
                      We accept all major credit cards including Visa, Mastercard, American Express, and Discover. All payments are processed securely through Stripe. For more information, see our <a href="/payments" style={{ color: '#ff8c00' }}>Payments page</a>.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      Can I apply a coupon code to my order?
                    </h3>
                    <p className="disc">
                      Yes! During checkout, you&apos;ll see an option to enter a coupon code. Enter your code and click &quot;Apply Coupon&quot; to see your discount applied before completing your purchase. Only one coupon can be used per order.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      How do I track my order?
                    </h3>
                    <p className="disc">
                      You can track your order by logging into your account and visiting the My Orders section, or by using our <a href="/trackorder" style={{ color: '#ff8c00' }}>Track Order</a> tool with your order number and email address.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      Can I modify or cancel my order after placing it?
                    </h3>
                    <p className="disc">
                      Orders can only be modified or cancelled before they enter the preparation stage. Please contact us as soon as possible at <a href="mailto:info@thejigglingpig.com" style={{ color: '#ff8c00' }}>info@thejigglingpig.com</a> or call <strong>1-800-513-1710</strong>. For full details, see our <a href="/cancellation-returns" style={{ color: '#ff8c00' }}>Cancellation &amp; Returns</a> policy.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Shipping &amp; Delivery</h2>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      Do you deliver to my area?
                    </h3>
                    <p className="disc">
                      We currently deliver within the Washington, DC metro area and select surrounding regions. Enter your address at checkout to confirm availability. For more details, see our <a href="/shipping" style={{ color: '#ff8c00' }}>Shipping page</a>.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      How long does delivery take?
                    </h3>
                    <p className="disc">
                      Standard delivery typically takes 2–4 business days. Express next-day delivery is available for orders placed before 12:00 PM EST. Delivery timeframes may vary depending on your location.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      How should I store my order when it arrives?
                    </h3>
                    <p className="disc">
                      Please refrigerate or freeze your products immediately upon arrival. Our items are shipped with insulated packaging to maintain freshness, but perishables should not be left unrefrigerated for more than 2 hours.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      My order didn&apos;t arrive. What should I do?
                    </h3>
                    <p className="disc">
                      If your order hasn&apos;t arrived within the expected timeframe, please contact us within 48 hours of the expected delivery date and we will investigate immediately. Email us at <a href="mailto:info@thejigglingpig.com" style={{ color: '#ff8c00' }}>info@thejigglingpig.com</a> with your order number.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Products &amp; Quality</h2>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      Are your products made fresh?
                    </h3>
                    <p className="disc">
                      Absolutely. All of our smoked meats and BBQ products are prepared fresh using traditional smoking techniques. We do not use preservatives or artificial additives.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      Do you accommodate dietary restrictions or allergies?
                    </h3>
                    <p className="disc">
                      Our products are prepared in a shared kitchen environment and may come into contact with common allergens. If you have specific dietary needs or allergen concerns, please <a href="/contact" style={{ color: '#ff8c00' }}>contact us</a> before ordering so we can advise you appropriately.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      What are your best sellers?
                    </h3>
                    <p className="disc">
                      Our most popular items include our signature smoked brisket, pulled pork, BBQ ribs, and house-made rubs and sauces. Browse our <a href="/shop" style={{ color: '#ff8c00' }}>online store</a> to see the full range of available products.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Catering &amp; Events</h2>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      Do you offer catering?
                    </h3>
                    <p className="disc">
                      Yes! The Jiggling Pig offers full-service catering for private events, corporate gatherings, weddings, and more. Visit our <a href="/catering" style={{ color: '#ff8c00' }}>Catering page</a> or contact us to get a custom quote.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      What is BBQ Live?
                    </h3>
                    <p className="disc">
                      BBQ Live is our on-site live cooking experience — we set up our smokers at your location and cook fresh BBQ right there for your guests. It&apos;s the ultimate addition to any outdoor event. Learn more on our <a href="/bbq-live" style={{ color: '#ff8c00' }}>BBQ Live page</a>.
                    </p>

                    <h3 className="mt--30 mb--10" style={{ fontSize: '18px', fontWeight: 700, color: '#1F1F25' }}>
                      How far in advance should I book catering?
                    </h3>
                    <p className="disc">
                      We recommend booking at least 2–3 weeks in advance for catering events, and longer for large or complex events. Cancellations must be made at least 72 hours prior to the event for a full refund.
                    </p>
                  </div>

                  <div className="section-list mt--40">
                    <h2 className="title">Still Have Questions?</h2>
                    <p className="disc">
                      We&apos;re here to help. Don&apos;t hesitate to reach out:
                    </p>
                    <ul>
                      <li><p>By email: <a href="mailto:info@thejigglingpig.com" style={{ color: '#ff8c00' }}>info@thejigglingpig.com</a></p></li>
                      <li><p>By phone: 1-800-513-1710</p></li>
                      <li><p>Or visit our <a href="/contact" style={{ color: '#ff8c00' }}>Contact page</a></p></li>
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
