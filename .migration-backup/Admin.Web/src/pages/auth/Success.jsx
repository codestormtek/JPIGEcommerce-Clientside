import React from "react";
import Logo from "@/images/logo.png";
import LogoDark from "@/images/logo-dark.png";
import Head from "@/layout/head/Head";
import AuthFooter from "./AuthFooter";
import { Block, BlockContent, BlockDes, BlockHead, BlockTitle, Button } from "@/components/Component";
import { Link, useSearchParams } from "react-router-dom";

const MESSAGES = {
  register: {
    title: "Welcome aboard!",
    body:  "Your account has been created and you're now signed in. Head to the dashboard to get started.",
    cta:   "Go to Dashboard",
    href:  "/",
  },
  forgot: {
    title: "Check your inbox",
    body:  "We sent a password-reset link to your email address. Follow the link to set a new password.",
    cta:   "Back to Sign In",
    href:  "/auth-login",
  },
  reset: {
    title: "Password updated!",
    body:  "Your password has been reset successfully. You can now sign in with your new password.",
    cta:   "Sign In",
    href:  "/auth-login",
  },
  default: {
    title: "All done!",
    body:  "The action was completed successfully.",
    cta:   "Back to Sign In",
    href:  "/auth-login",
  },
};

const Success = () => {
  const [searchParams] = useSearchParams();
  const type           = searchParams.get("type") || "default";
  const msg            = MESSAGES[type] || MESSAGES.default;

  return (
    <>
      <Head title={msg.title} />
      <Block className="nk-block-middle nk-auth-body">
        <div className="brand-logo pb-5 text-center">
          <Link to="/auth-login" className="logo-link">
            <img className="logo-light logo-img logo-img-lg" src={Logo} alt="logo" />
            <img className="logo-dark logo-img logo-img-lg" src={LogoDark} alt="logo-dark" />
          </Link>
        </div>
        <BlockHead>
          <BlockContent>
            <BlockTitle tag="h4">{msg.title}</BlockTitle>
            <BlockDes className="text-success">
              <p>{msg.body}</p>
              <Link to={msg.href}>
                <Button color="primary" size="lg" className="mt-3">
                  {msg.cta}
                </Button>
              </Link>
            </BlockDes>
          </BlockContent>
        </BlockHead>
      </Block>
      <AuthFooter />
    </>
  );
};
export default Success;
