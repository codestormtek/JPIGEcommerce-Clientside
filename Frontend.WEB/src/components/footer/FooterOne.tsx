import React from 'react'

function FooterOne() {
    return (
        <div><>
            <style>{`
                .rts-footer-area.footer-custom {
                    background: #2c2c2c !important;
                }
                .footer-custom .footer-title {
                    color: #ffffff !important;
                }
                .footer-custom .footer-nav ul li a,
                .footer-custom .call-area .info span,
                .footer-custom .call-area .info a,
                .footer-custom .opening-hour .single p,
                .footer-custom .opening-hour .single p span,
                .footer-custom p.disc-news-letter,
                .footer-custom p.dsic,
                .footer-custom .social-one-wrapper span,
                .footer-custom .payment-access span {
                    color: #909090 !important;
                }
                .footer-custom .footer-nav ul li a:hover,
                .footer-custom .call-area .info a:hover {
                    color: #f47920 !important;
                }
                .footer-custom .call-area .icon i,
                .footer-custom .social-one-wrapper ul li a i {
                    color: #f47920 !important;
                }
                .footer-custom .social-one-wrapper ul li a {
                    color: #909090 !important;
                    border-color: #f47920 !important;
                }
                .footer-custom .rts-btn.btn-primary,
                .footer-custom .footersubscribe-form button {
                    background: #f47920 !important;
                    border-color: #f47920 !important;
                }
                .rts-copyright-area.copyright-custom {
                    background: #2c2c2c !important;
                }
                .copyright-custom .disc,
                .copyright-custom .disc a,
                .copyright-custom .playstore-app-area span {
                    color: #909090 !important;
                }
                .copyright-custom .disc a:hover {
                    color: #f47920 !important;
                }
            `}</style>
            <div className="rts-footer-area footer-custom pt--80">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="footer-main-content-wrapper pb--70 pb_sm--30">
                                <div className="single-footer-wized">
                                    <h3 className="footer-title">About Company</h3>
                                    <div className="call-area">
                                        <div className="icon">
                                            <i className="fa-solid fa-phone-rotary" />
                                        </div>
                                        <div className="info">
                                            <span>Have Question? Call Us 24/7</span>
                                            <a href="tel:18005131710" className="number" style={{ color: '#f47920', transition: 'color 0.3s' }}>
                                                1-800-513-1710
                                            </a>
                                        </div>
                                    </div>
                                    <div className="opening-hour">
                                        <div className="single">
                                            <p>Located in the metro DC area</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="single-footer-wized">
                                    <h3 className="footer-title">Our Stores</h3>
                                    <div className="footer-nav">
                                        <ul>
                                            <li>
                                                <a href="#">Delivery Information</a>
                                            </li>
                                            <li>
                                                <a href="#">Privacy Policy</a>
                                            </li>
                                            <li>
                                                <a href="#">Terms &amp; Conditions</a>
                                            </li>
                                            <li>
                                                <a href="#">Support Center</a>
                                            </li>
                                            <li>
                                                <a href="#">Careers</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="single-footer-wized">
                                    <h3 className="footer-title">Shop Categories</h3>
                                    <div className="footer-nav">
                                        <ul>
                                            <li>
                                                <a href="#">Contact Us</a>
                                            </li>
                                            <li>
                                                <a href="#">Information</a>
                                            </li>
                                            <li>
                                                <a href="#">About Us</a>
                                            </li>
                                            <li>
                                                <a href="#">Careers</a>
                                            </li>
                                            <li>
                                                <a href="#">Nest Stories</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="single-footer-wized">
                                    <h3 className="footer-title">Useful Links</h3>
                                    <div className="footer-nav">
                                        <ul>
                                            <li>
                                                <a href="#">Cancellation &amp; Returns</a>
                                            </li>
                                            <li>
                                                <a href="#">Report Infringement</a>
                                            </li>
                                            <li>
                                                <a href="#">Payments</a>
                                            </li>
                                            <li>
                                                <a href="#">Shipping</a>
                                            </li>
                                            <li>
                                                <a href="#">FAQ</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="single-footer-wized">
                                    <h3 className="footer-title">Our Newsletter</h3>
                                    <p className="disc-news-letter">
                                        Subscribe to the mailing list to receive updates one <br /> the
                                        new arrivals and other discounts
                                    </p>
                                    <form className="footersubscribe-form" action="#">
                                        <input
                                            type="email"
                                            placeholder="Your email address"
                                            required
                                        />
                                        <button className="rts-btn btn-primary">Subscribe</button>
                                    </form>
                                    <p className="dsic">
                                        I would like to receive news and special offer
                                    </p>
                                </div>
                            </div>
                            <div className="social-and-payment-area-wrapper">
                                <div className="social-one-wrapper">
                                    <span>Follow Us:</span>
                                    <ul>
                                        <li>
                                            <a href="#">
                                                <i className="fa-brands fa-facebook-f" />
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#">
                                                <i className="fa-brands fa-twitter" />
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#">
                                                <i className="fa-brands fa-youtube" />
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#">
                                                <i className="fa-brands fa-whatsapp" />
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#">
                                                <i className="fa-brands fa-instagram" />
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                <div className="payment-access">
                                    <span>Payment Accepts:</span>
                                    <img src="assets/images/payment/01.png" alt="" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="rts-copyright-area copyright-custom">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="copyright-between-1">
                                <p className="disc">
                                    Copyright 2025 <a href="#">©Ekomart</a>. All rights reserved.
                                </p>
                                <a href="#" className="playstore-app-area">
                                    <span>Download App</span>
                                    <img src="assets/images/payment/02.png" alt="" />
                                    <img src="assets/images/payment/03.png" alt="" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
        </div>
    )
}

export default FooterOne