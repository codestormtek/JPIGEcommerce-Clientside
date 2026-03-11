
import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";

export default function Home() {
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
            <a className="current" href="/cookies-policy">
              Cookies Policy
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
  {/* Cookies Policy area start */}
  <div className="rts-pricavy-policy-area rts-section-gap">
    <div className="container">
      <div className="row">
        <div className="col-lg-12">
          <div className="container-privacy-policy">
            <h1 className="title mb--40">Cookies Policy</h1>
            <p className="disc" style={{ fontStyle: 'italic' }}>
              Effective date: March 11, 2025
            </p>
            <p className="disc">
              The Jiggling Pig, LLC (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;) uses cookies on the thejigglingpig.com website (the &quot;Service&quot;). By using the Service, you consent to the use of cookies.
            </p>
            <p className="disc mb--15">
              Our Cookies Policy explains what cookies are, how we use cookies, how third parties we may partner with may use cookies on the Service, your choices regarding cookies, and further information about cookies.
            </p>

            <div className="section-list mt--40">
              <h2 className="title">What Are Cookies</h2>
              <p className="disc">
                Cookies are small pieces of text sent to your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third party to recognize you and make your next visit easier and the Service more useful to you.
              </p>
              <p className="disc">
                Cookies can be &quot;persistent&quot; or &quot;session&quot; cookies. Persistent cookies remain on your personal computer or mobile device when you go offline, while session cookies are deleted as soon as you close your web browser.
              </p>
            </div>

            <div className="section-list mt--40">
              <h2 className="title">How The Jiggling Pig Uses Cookies</h2>
              <p className="disc">
                When you use and access the Service, we may place a number of cookies files in your web browser. We use cookies for the following purposes:
              </p>
              <ul>
                <li><p><strong>Essential Cookies:</strong> These cookies are required for the operation of our website. They include, for example, cookies that enable you to log into secure areas, add items to your shopping cart, and proceed to checkout.</p></li>
                <li><p><strong>Functionality Cookies:</strong> These cookies allow us to remember choices you make when you use the Service, such as remembering your login details, language preference, or the region you are in. The purpose of these cookies is to provide you with a more personal experience.</p></li>
                <li><p><strong>Analytics Cookies:</strong> These cookies allow us to understand how visitors interact with the Service by collecting and reporting information anonymously. This helps us improve how our website works.</p></li>
                <li><p><strong>Advertising Cookies:</strong> These cookies are used to make advertising messages more relevant to you. They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed, and in some cases selecting advertisements based on your interests.</p></li>
              </ul>
            </div>

            <div className="section-list mt--40">
              <h2 className="title">Third-Party Cookies</h2>
              <p className="disc">
                In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service, deliver advertisements on and through the Service, and so on. These may include:
              </p>
              <ul>
                <li><p><strong>Google Analytics:</strong> Used to track and analyze website traffic and user behavior to help us improve the Service.</p></li>
                <li><p><strong>Stripe:</strong> Used to process payments securely when you make purchases through our online store.</p></li>
                <li><p><strong>Social Media Cookies:</strong> Set by social media services that we have added to the site to enable you to share our content with your friends and networks.</p></li>
              </ul>
            </div>

            <div className="section-list mt--40">
              <h2 className="title">Your Choices Regarding Cookies</h2>
              <p className="disc">
                If you prefer to avoid the use of cookies on the Service, you must first disable the use of cookies in your browser and then delete the cookies saved in your browser associated with this website. You may use this option for preventing the use of cookies at any time.
              </p>
              <p className="disc">
                If you do not accept our cookies, you may experience some inconvenience in your use of the Service. For example, you may not be able to add items to your cart, proceed to checkout, or use any Service features that require you to sign in.
              </p>
              <h3 className="mt--20 mb--10" style={{ fontSize: '20px', fontWeight: 600 }}>How to Manage Cookies in Your Browser</h3>
              <p className="disc">
                Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit <a href="https://www.aboutcookies.org" target="_blank" rel="noopener noreferrer" style={{ color: '#f47920' }}>www.aboutcookies.org</a> or <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" style={{ color: '#f47920' }}>www.allaboutcookies.org</a>.
              </p>
              <p className="disc">You can manage cookies in the most popular browsers as follows:</p>
              <ul>
                <li><p><strong>Google Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</p></li>
                <li><p><strong>Mozilla Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</p></li>
                <li><p><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</p></li>
                <li><p><strong>Microsoft Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies and site data</p></li>
              </ul>
            </div>

            <div className="section-list mt--40">
              <h2 className="title">Changes to This Cookies Policy</h2>
              <p className="disc">
                We may update our Cookies Policy from time to time. We will notify you of any changes by posting the new Cookies Policy on this page and updating the &quot;effective date&quot; at the top.
              </p>
              <p className="disc">
                You are advised to review this Cookies Policy periodically for any changes. Changes to this Cookies Policy are effective when they are posted on this page.
              </p>
            </div>

            <div className="section-list mt--40">
              <h2 className="title">Contact Us</h2>
              <p className="disc">
                If you have any questions about our use of cookies, please contact us:
              </p>
              <ul>
                <li><p>By email: info@thejigglingpig.com</p></li>
                <li><p>By phone: 1-800-513-1710</p></li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
  {/* Cookies Policy area end */}
</>

            <ShortService/>
            <FooterOne />

        </div>
    );
}
