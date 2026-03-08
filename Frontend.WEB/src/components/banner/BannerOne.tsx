"use client"
import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { CarouselSlide } from '@/types/api';

const BannerOne = () => {
    const [slides, setSlides] = useState<CarouselSlide[]>([]);

    useEffect(() => {
        apiGet<CarouselSlide[]>('/carousel/public')
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setSlides(data);
                }
            })
            .catch(() => {});
    }, []);

    const renderSlide = (slide: CarouselSlide, extraClass?: string) => {
        const bgStyle = slide.desktopImage?.url
            ? { backgroundImage: `url(${slide.desktopImage.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined;

        return (
            <div
                className={`banner-bg-image bg_image ${extraClass || 'bg_one-banner'} ptb--120 ptb_md--80 ptb_sm--60`}
                style={bgStyle}
            >
                <div className="banner-one-inner-content">
                    <span className="pre">
                        {slide.subtitle || 'Get up to 30% off on your first $150 purchase'}
                    </span>
                    <h1 className="title">
                        {slide.title || 'Do not miss our amazing grocery deals'}
                    </h1>
                    <Link
                        href={slide.linkUrl || '/shop'}
                        className="rts-btn btn-primary radious-sm with-icon"
                    >
                        <div className="btn-text">{slide.linkText || 'Shop Now'}</div>
                        <div className="arrow-icon">
                            <i className="fa-light fa-arrow-right"></i>
                        </div>
                        <div className="arrow-icon">
                            <i className="fa-light fa-arrow-right"></i>
                        </div>
                    </Link>
                </div>
            </div>
        );
    };

    return (
        <div className="background-light-gray-color rts-section-gap bg_light-1 pt_sm--20">
            <div className="rts-banner-area-one mb--30">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="category-area-main-wrapper-one">
                                <Swiper
                                    modules={[Navigation, Autoplay]}
                                    spaceBetween={1}
                                    slidesPerView={1}
                                    loop={true}
                                    speed={2000}
                                    autoplay={{
                                        delay: 4000,
                                    }}
                                    navigation={{
                                        nextEl: '.swiper-button-next',
                                        prevEl: '.swiper-button-prev',
                                    }}
                                    breakpoints={{
                                        0: { slidesPerView: 1, spaceBetween: 0 },
                                        320: { slidesPerView: 1, spaceBetween: 0 },
                                        480: { slidesPerView: 1, spaceBetween: 0 },
                                        640: { slidesPerView: 1, spaceBetween: 0 },
                                        840: { slidesPerView: 1, spaceBetween: 0 },
                                        1140: { slidesPerView: 1, spaceBetween: 0 },
                                    }}
                                >
                                    {slides.length > 0 ? (
                                        slides.map((slide, i) => (
                                            <SwiperSlide key={slide.id}>
                                                {renderSlide(slide, i === 1 ? 'bg_one-banner two' : 'bg_one-banner')}
                                            </SwiperSlide>
                                        ))
                                    ) : (
                                        <>
                                            <SwiperSlide>
                                                <div className="banner-bg-image bg_image bg_one-banner ptb--120 ptb_md--80 ptb_sm--60">
                                                    <div className="banner-one-inner-content">
                                                        <span className="pre">
                                                            Get up to 30% off on your first $150 purchase
                                                        </span>
                                                        <h1 className="title">
                                                            Do not miss our amazing <br />
                                                            grocery deals
                                                        </h1>
                                                        <Link
                                                            href="/shop"
                                                            className="rts-btn btn-primary radious-sm with-icon"
                                                        >
                                                            <div className="btn-text">Shop Now</div>
                                                            <div className="arrow-icon">
                                                                <i className="fa-light fa-arrow-right"></i>
                                                            </div>
                                                            <div className="arrow-icon">
                                                                <i className="fa-light fa-arrow-right"></i>
                                                            </div>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </SwiperSlide>

                                            <SwiperSlide>
                                                <div className="banner-bg-image bg_image bg_one-banner two ptb--120 ptb_md--80 ptb_sm--60">
                                                    <div className="banner-one-inner-content">
                                                        <span className="pre">
                                                            Get up to 30% off on your first $150 purchase
                                                        </span>
                                                        <h1 className="title">
                                                            Do not miss our amazing <br />
                                                            grocery deals
                                                        </h1>
                                                        <Link
                                                            href="/shop"
                                                            className="rts-btn btn-primary radious-sm with-icon"
                                                        >
                                                            <div className="btn-text">Shop Now</div>
                                                            <div className="arrow-icon">
                                                                <i className="fa-light fa-arrow-right"></i>
                                                            </div>
                                                            <div className="arrow-icon">
                                                                <i className="fa-light fa-arrow-right"></i>
                                                            </div>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </SwiperSlide>
                                        </>
                                    )}
                                </Swiper>

                                <button className="swiper-button-next">
                                    <i className="fa-regular fa-arrow-right"></i>
                                </button>
                                <button className="swiper-button-prev">
                                    <i className="fa-regular fa-arrow-left"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BannerOne;
