"use client"
import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { CarouselSlide } from '@/types/api';

interface CarouselResponse {
    data: CarouselSlide[];
}

const BannerOne = () => {
    const [slides, setSlides] = useState<CarouselSlide[]>([]);

    useEffect(() => {
        apiGet<CarouselResponse | CarouselSlide[]>('/carousel/public')
            .then(res => {
                const data = Array.isArray(res) ? res : (res as CarouselResponse).data;
                if (Array.isArray(data) && data.length > 0) {
                    setSlides(data);
                }
            })
            .catch(() => {});
    }, []);

    const getImageUrl = (slide: CarouselSlide): string => {
        return slide.mediaAsset?.url || slide.desktopImage?.url || '';
    };

    const renderSlide = (slide: CarouselSlide) => {
        const imageUrl = getImageUrl(slide);
        const subtitle = slide.subTitle || slide.subtitle || '';
        const btnText = slide.buttonText || slide.linkText || 'Shop Now';
        const btnUrl = slide.buttonUrl || slide.linkUrl || '/shop';

        return (
            <div className="jpig-carousel-slide">
                <div className="jpig-carousel-image-wrapper">
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            alt={slide.title || 'Carousel slide'}
                            className="jpig-carousel-image"
                        />
                    )}
                    <div className="jpig-carousel-overlay" />
                </div>
                <div className="jpig-carousel-content">
                    {subtitle && (
                        <span className="jpig-carousel-subtitle">{subtitle}</span>
                    )}
                    {slide.title && (
                        <h2 className="jpig-carousel-title">{slide.title}</h2>
                    )}
                    <Link
                        href={btnUrl}
                        className="rts-btn btn-primary radious-sm with-icon"
                    >
                        <div className="btn-text">{btnText}</div>
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

    if (slides.length === 0) {
        return (
            <div className="jpig-carousel-loading">
                <div className="container">
                    <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="spinner-border text-secondary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="jpig-banner-area">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="jpig-carousel-wrapper">
                            <Swiper
                                modules={[Navigation, Autoplay]}
                                spaceBetween={0}
                                slidesPerView={1}
                                loop={slides.length > 1}
                                speed={800}
                                autoplay={{
                                    delay: 5000,
                                    disableOnInteraction: false,
                                }}
                                navigation={{
                                    nextEl: '.jpig-carousel-next',
                                    prevEl: '.jpig-carousel-prev',
                                }}
                            >
                                {slides.map((slide) => (
                                    <SwiperSlide key={slide.id}>
                                        {renderSlide(slide)}
                                    </SwiperSlide>
                                ))}
                            </Swiper>

                            {slides.length > 1 && (
                                <>
                                    <button className="jpig-carousel-prev" aria-label="Previous slide">
                                        <i className="fa-regular fa-arrow-left"></i>
                                    </button>
                                    <button className="jpig-carousel-next" aria-label="Next slide">
                                        <i className="fa-regular fa-arrow-right"></i>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BannerOne;
