"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Honeypot check — if this field has a value, a bot filled it in
    const honeypot = (e.currentTarget as HTMLFormElement).elements.namedItem("website") as HTMLInputElement | null;
    if (honeypot?.value) return;

    setLoading(true);
    try {
      await register({ emailAddress, password, firstName, lastName, website: "" });
      setRegistered(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Registration failed. Please try again.");
      } else {
        setError("Registration failed. Please try again.");
      }
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
                  <Link className="current" href="/register">
                    Register
                  </Link>
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
        {/* rts register area start */}
        <div className="rts-register-area rts-section-gap bg_light-1">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="registration-wrapper-1">
                  <div className="logo-area mb--0">
                    <img
                      className="mb--10"
                      src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png"
                      alt="The Jiggling Pig"
                      style={{ height: 80, maxWidth: 'none' }}
                    />
                  </div>
                  <h3 className="title">{registered ? "Registration Submitted!" : "Register Into Your Account"}</h3>

                  {registered ? (
                    <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                      <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
                      <p style={{ fontSize: 16, color: "#374151", lineHeight: 1.7, marginBottom: 8 }}>
                        <strong>Your account is pending approval.</strong>
                      </p>
                      <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, marginBottom: 24 }}>
                        We&apos;ve sent a confirmation to <strong>{emailAddress}</strong>.<br />
                        An admin will review and activate your account shortly.
                      </p>
                      <Link href="/" className="rts-btn btn-primary" style={{ display: "inline-block" }}>
                        Return to Home
                      </Link>
                    </div>
                  ) : (
                  <>
                  {error && (
                    <div style={{ color: "red", marginBottom: "15px", textAlign: "center" }}>
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="registration-form">
                    {/* Honeypot — invisible to humans, bots fill it and get blocked */}
                    <div style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none", height: 0, overflow: "hidden" }} aria-hidden="true">
                      <label htmlFor="website">Website</label>
                      <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
                    </div>
                    <div className="input-wrapper">
                      <label htmlFor="firstName">First Name*</label>
                      <input
                        type="text"
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="input-wrapper">
                      <label htmlFor="lastName">Last Name*</label>
                      <input
                        type="text"
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="input-wrapper">
                      <label htmlFor="email">Email*</label>
                      <input
                        type="email"
                        id="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        required
                      />
                    </div>
                    <div className="input-wrapper">
                      <label htmlFor="password">Password*</label>
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
                    <button
                      type="submit"
                      className="rts-btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? "Registering..." : "Register Account"}
                    </button>
                    <div className="another-way-to-registration">
                      <p>
                        Already Have Account? <Link href="/login">Login</Link>
                      </p>
                    </div>
                  </form>
                  </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* rts register area end */}
      </>

      <ShortService />
      <FooterOne />
    </div>
  );
}
