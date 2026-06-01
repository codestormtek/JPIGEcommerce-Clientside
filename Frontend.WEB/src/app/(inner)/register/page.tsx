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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [smsOptInOrders, setSmsOptInOrders] = useState(false);
  const [smsOptInMarketing, setSmsOptInMarketing] = useState(false);
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

    // If they opted into any texts, require a valid-looking mobile number
    if (smsOptInOrders || smsOptInMarketing) {
      const digits = phoneNumber.replace(/\D/g, "");
      if (digits.length < 10) {
        setError("Please enter a valid mobile number to receive text messages.");
        return;
      }
    }

    // Honeypot check — if this field has a value, a bot filled it in
    const honeypot = (e.currentTarget as HTMLFormElement).elements.namedItem("website") as HTMLInputElement | null;
    if (honeypot?.value) return;

    setLoading(true);
    try {
      await register({
        emailAddress,
        password,
        firstName,
        lastName,
        phoneNumber: phoneNumber.trim() || undefined,
        smsOptInOrders,
        smsOptInMarketing,
        website: "",
      });
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
                      <label htmlFor="phone">Mobile Phone {(smsOptInOrders || smsOptInMarketing) ? "*" : "(optional)"}</label>
                      <input
                        type="tel"
                        id="phone"
                        placeholder="(555) 123-4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        autoComplete="tel"
                        required={smsOptInOrders || smsOptInMarketing}
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
                    <div style={{ margin: "8px 0 4px", padding: "16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fafafa" }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                        Text Message Alerts
                      </p>
                      <label htmlFor="smsOptInOrders" style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#4b5563", cursor: "pointer", marginBottom: 10 }}>
                        <input
                          type="checkbox"
                          id="smsOptInOrders"
                          checked={smsOptInOrders}
                          onChange={(e) => setSmsOptInOrders(e.target.checked)}
                          style={{ marginTop: 3, flexShrink: 0 }}
                        />
                        <span>Text me updates about <strong>my orders</strong> (confirmation, shipping, and ready-for-pickup alerts).</span>
                      </label>
                      <label htmlFor="smsOptInMarketing" style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#4b5563", cursor: "pointer", marginBottom: 12 }}>
                        <input
                          type="checkbox"
                          id="smsOptInMarketing"
                          checked={smsOptInMarketing}
                          onChange={(e) => setSmsOptInMarketing(e.target.checked)}
                          style={{ marginTop: 3, flexShrink: 0 }}
                        />
                        <span>Text me about <strong>events &amp; live BBQ locations</strong> (find out where the truck is parked).</span>
                      </label>
                      <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5, margin: 0 }}>
                        By checking a box above you agree to receive recurring automated text messages from The Jiggling Pig
                        at the number provided. Consent is not a condition of purchase. Message frequency varies. Message &amp;
                        data rates may apply. Reply <strong>STOP</strong> to cancel or <strong>HELP</strong> for help. See our{" "}
                        <Link href="/privacy-policy" style={{ textDecoration: "underline" }}>Privacy Policy</Link> and{" "}
                        <Link href="/terms-condition" style={{ textDecoration: "underline" }}>Terms</Link>.
                      </p>
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
