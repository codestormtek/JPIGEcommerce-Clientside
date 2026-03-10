import HeaderOne from "@/components/header/HeaderOne";
import FooterOne from "@/components/footer/FooterOne";
import LiveLocationStatus from "@/components/live-location/LiveLocationStatus";

export default function BbqLivePage() {
  return (
    <div className="demo-one">
      <HeaderOne />

      <div className="rts-catering-banner bg_image" style={{
        backgroundImage: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        minHeight: "200px",
      }}>
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="contact-banner-content">
                <h1 className="title">BBQ Live</h1>
                <p className="disc">
                  Find us on the road! See where The Jiggling Pig is smoking today
                  and get directions straight to the action.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LiveLocationStatus />

      <FooterOne />
    </div>
  );
}
