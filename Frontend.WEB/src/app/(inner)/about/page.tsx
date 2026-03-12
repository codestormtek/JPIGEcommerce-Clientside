import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";

export default function AboutPage() {
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
                  <a className="current" href="/about">Our Story</a>
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

                  {/* Logo banner */}
                  <div style={{ marginBottom: 32 }}>
                    <img
                      src="https://cdn.thejigglingpig.com/media/2026/03/1f35afa2-7dc7-4477-8459-e9f7f4aab0e7.png"
                      alt="The Jiggling Pig"
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </div>

                  {/* Story */}
                  <h2 className="title mb--20">The Jiggling Pig Story</h2>
                  <p className="disc">
                    The Jiggling Pig, LLC (JP) can be described as a mobile bbq pit service moreso than a catering
                    service. Although we may use the word &ldquo;catering&rdquo; here and there to describe services
                    we provide, we really like to think of ourselves as just Southern boys who bring that Carolina
                    flavor bbq to your back yard. We believe that the most important element to operating a successful
                    pit service business is to place the most importance on client experience. This requires excellent
                    service, phenomenal BBQ and friendly accommodating staff.&nbsp; The Jiggling Pig (JP) serves
                    authentic slow cooked, pit smoked barbecue. We serve only the highest quality beef, pork and
                    poultry. Everything is smoked low and slow, daily, using hickory, maple and oak wood. We rub our
                    meats with our dry rub prior to cooking. The result is melt in your mouth, authentic (and
                    slightly addictive) Southern style BBQ. No sauce required, but feel free to add our homemade
                    sauces to enhance the flavor. We also complement each of our meat selections with a choice of
                    delicious homemade sides which are prepared fresh, in our kitchen, each day.
                  </p>

                  {/* Big Baby */}
                  <h2 className="title mt--40 mb--20">
                    &ldquo;BIG BABY&rdquo; &ndash; CUSTOMIZED BBQ TRAILER
                  </h2>
                  <p className="disc">
                    When I had my first customized BBQ trailer built, it was of moderate size and my little girl would
                    refer to it affectionately as &ldquo;Big Baby&rdquo;. Thanks to the guys down in North Charleston,
                    SC at Gorilla Fabrication, Big Baby II is bigger, badder and ready to &ldquo;smoke up a
                    storm&rdquo;. Since the core of our business is mobile pit service, you will definitely recognize
                    us if you see us parked roadside, at a local farmer&rsquo;s market and fair.
                  </p>

                </div>

                {/* Feature cards */}
                <div style={{ marginTop: 60 }}>
                  <div className="row g-4">
                    <div className="col-lg-3 col-md-6 col-sm-12 col-12">
                      <div className="single-feature-card bg_image one" style={{ backgroundImage: 'url(https://cdn.thejigglingpig.com/media/2026/03/2abbecc4-de1c-429a-9b01-4998cd9155e3.png)' }}>
                        <div className="content-area">
                          <a className="rts-btn btn-primary" href="/shop">Weekend Discount</a>
                          <h3 className="title">Shop Our Smoked<br />Brisket &amp; Ribs</h3>
                          <a className="shop-now-goshop-btn" href="/shop">
                            <span className="text">Shop Now</span>
                            <div className="plus-icon">&nbsp;</div>
                            <div className="plus-icon">&nbsp;</div>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-sm-12 col-12">
                      <div className="single-feature-card bg_image two" style={{ backgroundImage: 'url(https://cdn.thejigglingpig.com/media/2026/03/e375a273-3b41-4ccc-acbc-4ec2e00a53a2.png)' }}>
                        <div className="content-area">
                          <a className="rts-btn btn-primary" href="/shop">Weekend Discount</a>
                          <h3 className="title">Fresh Homemade<br />Sides &amp; Sauces</h3>
                          <a className="shop-now-goshop-btn" href="/shop">
                            <span className="text">Shop Now</span>
                            <div className="plus-icon">&nbsp;</div>
                            <div className="plus-icon">&nbsp;</div>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-sm-12 col-12">
                      <div className="single-feature-card bg_image three" style={{ backgroundImage: 'url(https://cdn.thejigglingpig.com/media/2026/03/76bf7631-29dc-470c-a9b4-27cb37e7692c.png)' }}>
                        <div className="content-area">
                          <a className="rts-btn btn-primary" href="/shop">Weekend Discount</a>
                          <h3 className="title">Slow Smoked<br />Pulled Pork</h3>
                          <a className="shop-now-goshop-btn" href="/shop">
                            <span className="text">Shop Now</span>
                            <div className="plus-icon">&nbsp;</div>
                            <div className="plus-icon">&nbsp;</div>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-sm-12 col-12">
                      <div className="single-feature-card bg_image four" style={{ backgroundImage: 'url(https://cdn.thejigglingpig.com/media/2026/03/123a3935-e0e1-463e-9c43-3887a0c42049.png)' }}>
                        <div className="content-area">
                          <a className="rts-btn btn-primary" href="/shop">Weekend Discount</a>
                          <h3 className="title">Pit Smoked<br />Chicken &amp; Poultry</h3>
                          <a className="shop-now-goshop-btn" href="/shop">
                            <span className="text">Shop Now</span>
                            <div className="plus-icon">&nbsp;</div>
                            <div className="plus-icon">&nbsp;</div>
                          </a>
                        </div>
                      </div>
                    </div>
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
