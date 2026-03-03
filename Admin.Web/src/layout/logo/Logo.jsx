import React from "react";
import { Link } from "react-router-dom";

const LOGO_URL = "/uploads/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png";

const Logo = () => {
  return (
    <Link to="/" className="logo-link">
      <img className="logo-light logo-img" src={LOGO_URL} alt="The Jiggling Pig, LLC" />
      <img className="logo-dark logo-img" src={LOGO_URL} alt="The Jiggling Pig, LLC" />
    </Link>
  );
};

export default Logo;
