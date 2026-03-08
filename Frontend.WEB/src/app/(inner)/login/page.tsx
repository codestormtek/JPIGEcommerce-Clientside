"use client";

import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
    const router = useRouter();
    const { login } = useAuth();
    const [emailAddress, setEmailAddress] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(emailAddress, password);
            router.push("/");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Login failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

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
            <Link className="current" href="/login">
              Log In
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
  <div className="rts-register-area rts-section-gap bg_light-1">
    <div className="container">
      <div className="row">
        <div className="col-lg-12">
          <div className="registration-wrapper-1">
            <div className="logo-area mb--0">
              <img
                className="mb--10"
                src="assets/images/logo/fav.png"
                alt="logo"
              />
            </div>
            <h3 className="title">Login Into Your Account</h3>
            <form onSubmit={handleSubmit} className="registration-form">
              <div className="input-wrapper">
                <label htmlFor="email">Email*</label>
                <input
                  type="email"
                  id="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  required
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="text-danger mb-3" style={{ color: "red", marginBottom: "10px" }}>
                  {error}
                </div>
              )}
              <button className="rts-btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login Account"}
              </button>
              <div className="another-way-to-registration">
                <p>
                  <Link href="/forgot-password">Forgot Password?</Link>
                </p>
                <p>
                  Don't have Account? <Link href="/register">Registration</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</>

            <ShortService/>
            <FooterOne />

        </div>
    );
}
