import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Logo from "@/images/logo.png";
import LogoDark from "@/images/logo-dark.png";
import Head from "@/layout/head/Head";
import AuthFooter from "./AuthFooter";
import {
  Block, BlockContent, BlockDes, BlockHead, BlockTitle,
  Button, Icon, PreviewCard,
} from "@/components/Component";
import { Alert, Spinner } from "reactstrap";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";

const ForgotPassword = () => {
  const [searchParams]            = useSearchParams();
  const token                     = searchParams.get("token");
  const isResetView               = !!token;
  const [loading,   setLoading]   = useState(false);
  const [errorVal,  setError]     = useState("");
  const [passState, setPassState] = useState(false);
  const navigate                  = useNavigate();
  const { forgotPassword, resetPassword } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onForgotSubmit = async (formData) => {
    setLoading(true);
    setError("");
    try {
      await forgotPassword(formData.emailAddress);
      navigate("/auth-success?type=forgot");
    } catch (err) {
      setError(err.message || "Could not send reset link. Please try again.");
      setLoading(false);
    }
  };

  const onResetSubmit = async (formData) => {
    setLoading(true);
    setError("");
    try {
      await resetPassword(token, formData.password);
      navigate("/auth-success?type=reset");
    } catch (err) {
      setError(err.message || "Password reset failed. The link may have expired.");
      setLoading(false);
    }
  };
  return (
    <>
      <Head title={isResetView ? "Set New Password" : "Forgot Password"} />
        <Block className="nk-block-middle nk-auth-body wide-xs">
          <div className="brand-logo pb-4 text-center">
            <Link to="/auth-login" className="logo-link">
              <img className="logo-light logo-img logo-img-lg" src={Logo} alt="logo" />
              <img className="logo-dark logo-img logo-img-lg" src={LogoDark} alt="logo-dark" />
            </Link>
          </div>
          <PreviewCard className="card-bordered" bodyClass="card-inner-lg">
            <BlockHead>
              <BlockContent>
                <BlockTitle tag="h5">
                  {isResetView ? "Set New Password" : "Reset Password"}
                </BlockTitle>
                <BlockDes>
                  <p>
                    {isResetView
                      ? "Enter your new password below to complete the reset."
                      : "Enter your email and we'll send you a link to reset your password."}
                  </p>
                </BlockDes>
              </BlockContent>
            </BlockHead>

            {errorVal && (
              <div className="mb-3">
                <Alert color="danger" className="alert-icon">
                  <Icon name="alert-circle" /> {errorVal}
                </Alert>
              </div>
            )}

            {/* â”€â”€ Email form â”€â”€ */}
            {!isResetView && (
              <form className="is-alter" onSubmit={handleSubmit(onForgotSubmit)}>
                <div className="form-group">
                  <div className="form-label-group">
                    <label className="form-label" htmlFor="emailAddress">Email Address</label>
                  </div>
                  <div className="form-control-wrap">
                    <input
                      type="email"
                      id="emailAddress"
                      {...register("emailAddress", {
                        required: "Email is required",
                        pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
                      })}
                      placeholder="Enter your email address"
                      className="form-control form-control-lg"
                    />
                    {errors.emailAddress && <span className="invalid">{errors.emailAddress.message}</span>}
                  </div>
                </div>
                <div className="form-group">
                  <Button color="primary" size="lg" className="btn-block" type="submit">
                    {loading ? <Spinner size="sm" color="light" /> : "Send Reset Link"}
                  </Button>
                </div>
              </form>
            )}

            {/* â”€â”€ New password form â”€â”€ */}
            {isResetView && (
              <form className="is-alter" onSubmit={handleSubmit(onResetSubmit)}>
                <div className="form-group">
                  <div className="form-label-group">
                    <label className="form-label" htmlFor="password">New Password</label>
                  </div>
                  <div className="form-control-wrap">
                    <a href="#password" onClick={(ev) => { ev.preventDefault(); setPassState(!passState); }}
                      className={`form-icon lg form-icon-right passcode-switch ${passState ? "is-hidden" : "is-shown"}`}>
                      <Icon name="eye"     className="passcode-icon icon-show" />
                      <Icon name="eye-off" className="passcode-icon icon-hide" />
                    </a>
                    <input
                      type={passState ? "text" : "password"}
                      id="password"
                      {...register("password", {
                        required: "Password is required",
                        minLength: { value: 8, message: "Minimum 8 characters" },
                      })}
                      placeholder="Enter your new password"
                      className={`form-control-lg form-control ${passState ? "is-hidden" : "is-shown"}`}
                    />
                    {errors.password && <span className="invalid">{errors.password.message}</span>}
                  </div>
                </div>
                <div className="form-group">
                  <Button color="primary" size="lg" className="btn-block" type="submit">
                    {loading ? <Spinner size="sm" color="light" /> : "Set New Password"}
                  </Button>
                </div>
              </form>
            )}

            <div className="form-note-s2 text-center pt-4">
              <Link to="/auth-login"><strong>Back to Sign In</strong></Link>
            </div>
          </PreviewCard>
        </Block>
        <AuthFooter />
    </>
  );
};
export default ForgotPassword;
