import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const Register = () => {
  const [passState, setPassState] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [errorVal,  setError]     = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  const handleFormSubmit = async (formData) => {
    setLoading(true);
    setError("");
    try {
      await registerUser({
        firstName:    formData.firstName,
        lastName:     formData.lastName,
        emailAddress: formData.emailAddress,
        password:     formData.password,
      });
      navigate("/auth-success?type=register");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <Head title="Create Account" />
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
              <BlockTitle tag="h4">Create Admin Account</BlockTitle>
              <BlockDes><p>Register a new Jiggling Pig admin account.</p></BlockDes>
            </BlockContent>
          </BlockHead>

          {errorVal && (
            <div className="mb-3">
              <Alert color="danger" className="alert-icon">
                <Icon name="alert-circle" /> {errorVal}
              </Alert>
            </div>
          )}

          <form className="is-alter" onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">First Name</label>
              <div className="form-control-wrap">
                <input type="text" id="firstName"
                  {...register("firstName", { required: "First name is required" })}
                  placeholder="First name" className="form-control-lg form-control" />
                {errors.firstName && <p className="invalid">{errors.firstName.message}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="lastName">Last Name</label>
              <div className="form-control-wrap">
                <input type="text" id="lastName"
                  {...register("lastName", { required: "Last name is required" })}
                  placeholder="Last name" className="form-control-lg form-control" />
                {errors.lastName && <p className="invalid">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="emailAddress">Email Address</label>
              <div className="form-control-wrap">
                <input type="email" id="emailAddress"
                  {...register("emailAddress", {
                    required: "Email is required",
                    pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
                  })}
                  placeholder="Enter your email" className="form-control-lg form-control" />
                {errors.emailAddress && <p className="invalid">{errors.emailAddress.message}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="form-control-wrap">
                <a href="#password" onClick={(ev) => { ev.preventDefault(); setPassState(!passState); }}
                  className={`form-icon lg form-icon-right passcode-switch ${passState ? "is-hidden" : "is-shown"}`}>
                  <Icon name="eye"     className="passcode-icon icon-show" />
                  <Icon name="eye-off" className="passcode-icon icon-hide" />
                </a>
                <input type={passState ? "text" : "password"} id="password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 8, message: "Minimum 8 characters" },
                    pattern:   { value: /(?=.*[A-Z])(?=.*[0-9])/, message: "Must include an uppercase letter and a number" },
                  })}
                  placeholder="Create a password"
                  className={`form-control-lg form-control ${passState ? "is-hidden" : "is-shown"}`} />
                {errors.password && <span className="invalid">{errors.password.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <Button type="submit" color="primary" size="lg" className="btn-block">
                {loading ? <Spinner size="sm" color="light" /> : "Create Account"}
              </Button>
            </div>
          </form>

          <div className="form-note-s2 text-center pt-4">
            Already have an account?{" "}
            <Link to="/auth-login"><strong>Sign in</strong></Link>
          </div>
        </PreviewCard>
      </Block>
      <AuthFooter />
    </>
  );
};
export default Register;
