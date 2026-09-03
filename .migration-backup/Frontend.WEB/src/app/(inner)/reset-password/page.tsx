"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";
import Link from "next/link";
import { resetPassword } from "@/lib/auth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="registration-wrapper-1">
        <div className="logo-area mb--0">
          <img
            className="mb--10"
            src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png"
            alt="The Jiggling Pig"
            style={{ height: 80, maxWidth: 'none' }}
          />
        </div>
        <h3 className="title">Password Reset Successfully</h3>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#28a745", marginBottom: "20px" }}>
            Your password has been reset. You can now log in with your new password.
          </p>
          <Link href="/login" className="rts-btn btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-wrapper-1">
      <div className="logo-area mb--0">
        <img
          className="mb--10"
          src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png"
          alt="The Jiggling Pig"
          style={{ height: 80, maxWidth: 'none' }}
        />
      </div>
      <h3 className="title">Reset Your Password</h3>
      <form onSubmit={handleSubmit} className="registration-form">
        <div className="input-wrapper">
          <label htmlFor="password">New Password*</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="confirmPassword">Confirm Password*</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? "Resetting..." : "Reset Password"}
        </button>
        <div className="another-way-to-registration">
          <p>
            <Link href="/login">Back to Login</Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
                    Reset Password
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
                <Suspense fallback={<div>Loading...</div>}>
                  <ResetPasswordForm />
                </Suspense>
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
