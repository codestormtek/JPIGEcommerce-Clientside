export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="error-area-main-wrapper rts-section-gap2">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="error-main-wrapper" style={{ textAlign: 'center', padding: '80px 0' }}>
              <div className="content-main">
                <h2 className="title">404 - Page Not Found</h2>
                <p>
                  Sorry, we couldn&apos;t find the page you were looking for.
                </p>
                <a href="/" className="rts-btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
                  Back To Homepage
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
