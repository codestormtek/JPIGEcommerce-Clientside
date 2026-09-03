import HeaderOne from "@/components/header/HeaderOne";
import FooterOne from "@/components/footer/FooterOne";
import CateringCalculator from "@/components/catering/CateringCalculator";

export default function CateringPage() {
  return (
    <div className="demo-one">
      <HeaderOne />

      <div className="rts-catering-banner bg_image">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="contact-banner-content">
                <h1 className="title">BBQ Catering</h1>
                <p className="disc">
                  Let The Jiggling Pig bring the smoke to your next event!
                  Build your custom catering order, get an instant estimate,
                  and submit a quote request — all in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CateringCalculator />

      <FooterOne />
    </div>
  );
}
