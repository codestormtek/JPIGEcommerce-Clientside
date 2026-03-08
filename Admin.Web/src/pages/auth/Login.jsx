import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Head from "@/layout/head/Head";
import AuthFooter from "./AuthFooter";
import {
  Block, BlockContent, BlockDes, BlockHead, BlockTitle,
  Button, Icon, PreviewCard,
} from "@/components/Component";
import { Form, Spinner, Alert } from "reactstrap";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const [loading, setLoading]   = useState(false);
  const [passState, setPassState] = useState(false);
  const [errorVal, setError]    = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onFormSubmit = async (formData) => {
    setLoading(true);
    setError("");
    try {
      await login(formData.emailAddress, formData.password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to sign in. Please check your credentials.");
      setLoading(false);
    }
  };

  return <>
    <Head title="Login" />
      <Block className="nk-block-middle nk-auth-body  wide-xs">
        <div className="brand-logo pb-4 text-center">
          <Link to={"/"} className="logo-link">
            <img className="logo-light logo-img logo-img-lg" src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png" alt="The Jiggling Pig, LLC" />
            <img className="logo-dark logo-img logo-img-lg" src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png" alt="The Jiggling Pig, LLC" />
          </Link>
        </div>

        <PreviewCard className="card-bordered" bodyClass="card-inner-lg">
          <BlockHead>
            <BlockContent>
              <BlockTitle tag="h4">Admin Sign-In</BlockTitle>
              <BlockDes>
                <p>Access The Jiggling Pig admin panel with your email and password.</p>
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

          <Form className="is-alter" onSubmit={handleSubmit(onFormSubmit)}>
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
                  className="form-control-lg form-control"
                />
                {errors.emailAddress && <span className="invalid">{errors.emailAddress.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-group">
                <label className="form-label" htmlFor="password">Password</label>
                <Link className="link link-primary link-sm" to="/auth-reset">
                  Forgot password?
                </Link>
              </div>
              <div className="form-control-wrap">
                <a
                  href="#password"
                  onClick={(ev) => { ev.preventDefault(); setPassState(!passState); }}
                  className={`form-icon lg form-icon-right passcode-switch ${passState ? "is-hidden" : "is-shown"}`}
                >
                  <Icon name="eye"     className="passcode-icon icon-show" />
                  <Icon name="eye-off" className="passcode-icon icon-hide" />
                </a>
                <input
                  type={passState ? "text" : "password"}
                  id="password"
                  {...register("password", { required: "Password is required" })}
                  placeholder="Enter your password"
                  className={`form-control-lg form-control ${passState ? "is-hidden" : "is-shown"}`}
                />
                {errors.password && <span className="invalid">{errors.password.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <Button size="lg" className="btn-block" type="submit" color="primary">
                {loading ? <Spinner size="sm" color="light" /> : "Sign In"}
              </Button>
            </div>
          </Form>
        </PreviewCard>
      </Block>
      <AuthFooter />
  </>;
};
export default Login;
