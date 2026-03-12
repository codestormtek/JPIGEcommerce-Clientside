import React from 'react'
import NewsletterForm from './NewsletterForm'

function FooterThree() {
    return (
        <div>
            <div className="rts-footer-area pt--80 bg_blue-footer">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="footer-main-content-wrapper pb--70">
                                {/* single footer area wrapper */}
                                <div className="single-footer-wized">
                                    <h3 className="footer-title animated fadeIn">About Company</h3>
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
                                {/* single footer area wrapper */}
                                {/* single footer area wrapper */}
                                <div className="single-footer-wized">
                                    <h3 className="footer-title animated fadeIn">Our Stores</h3>
                                    <div className="footer-nav">
                                        <ul>
                                            <li>
                                                <a href="/privacy-policy">Privacy Policy</a>
                                            </li>
                                            <li>
                                                <a href="/terms-condition">Terms &amp; Conditions</a>
                                            </li>
                                            <li>
                                                <a href="/cookies-policy">Cookies Policy</a>
                                            </li>
                                            <li>
                                                <a href="https://admin-new.thejigglingpig.com" target="_blank" rel="noopener noreferrer">Administration</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                {/* single footer area wrapper */}
                                {/* single footer area wrapper */}
                                <div className="single-footer-wized">
                                    <h3 className="footer-title animated fadeIn">Shop Categories</h3>
                                    <div className="footer-nav">
                                        <ul>
                                            <li>
                                                <a href="/contact">Contact Us</a>
                                            </li>
                                            <li>
                                                <a href="#">Information</a>
                                            </li>
                                            <li>
                                                <a href="#">About Us</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                {/* single footer area wrapper */}
                                {/* single footer area wrapper */}
                                <div className="single-footer-wized">
                                    <h3 className="footer-title animated fadeIn">Useful Links</h3>
                                    <div className="footer-nav">
                                        <ul>
                                            <li>
                                                <a href="/cancellation-returns">Cancellation &amp; Returns</a>
                                            </li>
                                            <li>
                                                <a href="/payments">Payments</a>
                                            </li>
                                            <li>
                                                <a href="/shipping">Shipping</a>
                                            </li>
                                            <li>
                                                <a href="/faq">FAQ</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                {/* single footer area wrapper */}
                                {/* single footer area wrapper */}
                                <div className="single-footer-wized">
                                    <h3 className="footer-title animated fadeIn">Our Newsletter</h3>
                                    <p className="disc-news-letter">
                                        Subscribe to the mailing list to receive updates one <br /> the
                                        new arrivals and other discounts
                                    </p>
                                    <NewsletterForm />
                                    <p className="dsic">
                                        I would like to receive news and special offer
                                    </p>
                                </div>
                                {/* single footer area wrapper */}
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
                                    <img src="https://cdn.thejigglingpig.com/media/2026/03/35509b8d-5593-4e4e-ab96-956e95a78655.png" alt="Payment methods" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default FooterThree