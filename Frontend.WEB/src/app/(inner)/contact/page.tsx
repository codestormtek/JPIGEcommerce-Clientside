import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";

export default function Home() {
    return (
        <div className="demo-one">
            <HeaderOne />

            <>
                {/* rts contact main wrapper */}
                <div className="rts-contact-main-wrapper-banner bg_image" style={{ backgroundImage: 'url(https://cdn.thejigglingpig.com/media/2026/03/494b230d-684b-4c0d-8ed5-b60b7bd7c071.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', height: '407px', display: 'flex', alignItems: 'center' }}>
                    <div className="container">
                        <div className="row">
                            <div className="co-lg-12">
                                <div className="contact-banner-content">
                                    <h1 className="title">Contact Jiggling Pig</h1>
                                    <p className="disc">
                                        Whether you need information on our products, need information on our catering; wanting to know where The Jiggling Pig will be &apos;jiggling&apos; at next, reach out with your inquiries.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* rts contact main wrapper end */}

                <div className="rts-map-contact-area rts-section-gap2">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-4">
                                <div className="contact-left-area-main-wrapper">
                                    <h2 className="title">You can ask us questions !</h2>
                                    <p className="disc">
                                        Whether you need information on our products, need information on our catering; wanting to know where The Jiggling Pig will be &apos;jiggling&apos; at next, reach out with your inquiries.
                                    </p>
                                    <div className="location-single-card">
                                        <div className="icon">
                                            <i className="fa-light fa-location-dot" />
                                        </div>
                                        <div className="information">
                                            <h3 className="title">Greater Washington DC Area (DMV)</h3>
                                            <p>Within 50 mile radius of the DC area.</p>
                                            <a href="tel:18005131710" className="number">
                                                1-800-513-1710
                                            </a>
                                            <a href="mailto:info@thejigglingpig.com" className="email">
                                                info@thejigglingpig.com
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-8 pl--50 pl_sm--5 pl_md--5">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d398000!2d-77.0369!3d38.9072!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1716725338558!5m2!1sen!2sus"
                                    width={600}
                                    height={540}
                                    style={{ border: 0 }}
                                    allowFullScreen={true}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* rts contact-form area start */}
                <div className="rts-contact-form-area rts-section-gapBottom">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-12">
                                <div className="bg_light-1 contact-form-wrapper-bg">
                                    <div className="row">
                                        <div className="col-lg-7 pr--30 pr_md--10 pr_sm--5">
                                            <div className="contact-form-wrapper-1">
                                                <h3 className="title mb--50">
                                                    Fill Up The Form If You Have Any Question
                                                </h3>
                                                <form action="#" className="contact-form-1">
                                                    <div className="contact-form-wrapper--half-area">
                                                        <div className="single">
                                                            <input type="text" placeholder="name*" />
                                                        </div>
                                                        <div className="single">
                                                            <input type="text" placeholder="Email*" />
                                                        </div>
                                                    </div>
                                                    <div className="single-select">
                                                        <select>
                                                            <option data-display="Subject*">All Categories</option>
                                                            <option value={1}>Some option</option>
                                                            <option value={2}>Another option</option>
                                                            <option value={3}>Potato</option>
                                                        </select>
                                                    </div>
                                                    <textarea
                                                        name="message"
                                                        placeholder="Write Message Here"
                                                        defaultValue={""}
                                                    />
                                                    <button className="rts-btn btn-primary mt--20">
                                                        Send Message
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                        <div className="col-lg-5 mt_md--30 mt_sm--30">
                                            <div className="thumbnail-area">
                                                <img src="assets/images/contact/02.jpg" alt="contact_form" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* rts contact-form area end */}
            </>

            <ShortService />
            <FooterOne />
        </div>
    );
}
