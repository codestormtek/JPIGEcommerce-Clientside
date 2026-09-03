import BannerOne from "@/components/banner/BannerOne";
import FeatureOne from "@/components/feature/FeatureOne";
import HeaderOne from "@/components/header/HeaderOne";

import FeatureProduct from "@/components/product/FeatureProduct";
import WeeklyBestSelling from "@/components/product/WeeklyBestSelling";

import BlogOne from "@/components/blog/BlogOne";
import FooterOne from "@/components/footer/FooterOne";
import { ToastContainer } from 'react-toastify';


export default function Home() {
  return (
    <div className="demo-one">
      <ToastContainer position="top-right" autoClose={3000} />
      <HeaderOne />
      <BannerOne />
      <FeatureOne />
      <FeatureProduct />
      <WeeklyBestSelling />
      <BlogOne />
      <FooterOne />
    </div>
  );
}
