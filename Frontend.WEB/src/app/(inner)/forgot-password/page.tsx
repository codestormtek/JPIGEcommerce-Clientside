"use client";

import { useState } from "react";
import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";
import Link from "next/link";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [emailAddress, setEmailAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      await forgotPassword(emailAddress);
      setSuccess(true);
    } catch (err: any) {
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="demo-one">
      <HeaderOne />

      <>
        <div className="rts-navigation-area-breadcrumb bg_light-1">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="navigator-breadcrumb-wrapper">
                  <Link href="/">Home</Link>
                  <i className="fa-regular fa-chevron-right" />
                  <a className="current" href="#">
                    Forgot Password
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
        <div className="rts-register-area rts-section-gap bg_light-1">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="registration-wrapper-1">
                  <div className="logo-area mb--0">
                    <img
                      className="mb--10"
                      src="/assets/images/logo/fav.png"
                      alt="logo"
                    />
                  </div>
                  <h3 className="title">Forgot Your Password?</h3>
                  {success ? (
                    <div style={{ textAlign: "center" }}>
                      <p style={{ color: "#28a745", marginBottom: "20px" }}>
                        If an account exists with that email, you'll receive a password reset link.
                      </p>
                      <Link href="/login" className="rts-btn btn-primary">
                        Back to Login
                      </Link>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="registration-form">
                      <div className="input-wrapper">
                        <label htmlFor="email">Email Address*</label>
                        <input
                          type="email"
                          id="email"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          required
                        />
                      </div>
                      {error && (
                        <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>
                      )}
                      <button
                        type="submit"
                        className="rts-btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? "Sending..." : "Send Reset Link"}
                      </button>
                      <div className="another-way-to-registration">
                        <p>
                          Remember your password? <Link href="/login">Login</Link>
                        </p>
                      </div>
                    </form>
                  )}
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
