"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/api'

interface WidgetMediaAsset {
    id: string;
    url: string;
    altText?: string;
}

interface WidgetItemData {
    id: string;
    title?: string;
    subtitle?: string;
    badge?: string;
    buttonText?: string;
    buttonUrl?: string;
    backgroundColor?: string;
    sortOrder: number;
    isVisible: boolean;
    mediaAsset?: WidgetMediaAsset | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
}

interface WidgetData {
    id: string;
    name: string;
    placement: string;
    columns: number;
    isVisible: boolean;
    items: WidgetItemData[];
}

interface WidgetProps {
    placement: string;
    className?: string;
    variant?: 'feature-cards' | 'promo-banners' | 'services' | 'generic';
}

function getColClass(columns: number): string {
    switch (columns) {
        case 1: return 'col-12';
        case 2: return 'col-lg-6 col-md-6 col-sm-12 col-12';
        case 3: return 'col-lg-4 col-md-6 col-sm-12 col-12';
        case 4: return 'col-lg-3 col-md-6 col-sm-12 col-12';
        case 5: return 'col-lg-2 col-md-4 col-sm-6 col-12';
        case 6: return 'col-lg-2 col-md-4 col-sm-6 col-12';
        default: return 'col-lg-3 col-md-6 col-sm-12 col-12';
    }
}

const bgClassMap = ['one', 'two', 'three', 'four', 'five', 'six'];

function FeatureCardItem({ item, index }: { item: WidgetItemData; index: number }) {
    const bgClass = bgClassMap[index % bgClassMap.length];
    const hasCustomSize = item.imageWidth || item.imageHeight;
    const style: React.CSSProperties = {
        ...(item.mediaAsset?.url
            ? { backgroundImage: `url(${item.mediaAsset.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : item.backgroundColor
                ? { backgroundColor: item.backgroundColor }
                : {}),
        ...(hasCustomSize ? {
            width: item.imageWidth ? `${item.imageWidth}px` : '100%',
            height: item.imageHeight ? `${item.imageHeight}px` : undefined,
            maxWidth: '100%',
        } : {}),
    };

    const linkUrl = item.buttonUrl || '/shop';

    return (
        <div className={`single-feature-card bg_image ${bgClass}`} style={style}>
            <div className="content-area">
                {item.badge && (
                    <Link href={linkUrl} className="rts-btn btn-primary">
                        {item.badge}
                    </Link>
                )}
                <h3 className="title">
                    {item.title}
                    {item.subtitle && <span>{item.subtitle}</span>}
                </h3>
                <Link href={linkUrl} className="shop-now-goshop-btn">
                    <span className="text">{item.buttonText || "Shop Now"}</span>
                    <div className="plus-icon">
                        <i className="fa-sharp fa-regular fa-plus" />
                    </div>
                    <div className="plus-icon">
                        <i className="fa-sharp fa-regular fa-plus" />
                    </div>
                </Link>
            </div>
        </div>
    );
}

function PromoBannerItem({ item }: { item: WidgetItemData }) {
    const hasCustomSize = item.imageWidth || item.imageHeight;
    const style: React.CSSProperties = {
        ...(item.mediaAsset?.url
            ? { backgroundImage: `url(${item.mediaAsset.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : item.backgroundColor
                ? { backgroundColor: item.backgroundColor }
                : {}),
        ...(hasCustomSize ? {
            width: item.imageWidth ? `${item.imageWidth}px` : undefined,
            height: item.imageHeight ? `${item.imageHeight}px` : undefined,
            maxWidth: '100%',
        } : {}),
    };

    return (
        <a href={item.buttonUrl || '/shop'} className="single-discount-with-bg" style={style}>
            <div className="inner-content">
                {item.title && (
                    <h4 className="title">
                        {item.title}
                        {item.subtitle && <><br />{item.subtitle}</>}
                    </h4>
                )}
                {item.badge && (
                    <div className="price-area">
                        <span>{item.badge}</span>
                    </div>
                )}
            </div>
        </a>
    );
}

function ServiceItem({ item }: { item: WidgetItemData }) {
    return (
        <div className="single-feature-area text-center">
            <div className="icon">
                {item.mediaAsset?.url ? (
                    <img src={item.mediaAsset.url} alt={item.title || ''} style={{ width: 43, height: 43, objectFit: 'contain' }} />
                ) : (
                    <svg width={43} height={43} viewBox="0 0 43 43" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M36.7029 6.29715C32.642 2.23634 27.2429 0 21.5 0C15.7571 0 10.358 2.23634 6.29715 6.29715C2.23642 10.358 0 15.7571 0 21.5C0 27.2429 2.23642 32.642 6.29715 36.7029C10.358 40.7637 15.7571 43 21.5 43C27.2429 43 32.642 40.7637 36.7029 36.7029C40.7636 32.642 43 27.2429 43 21.5C43 15.7571 40.7636 10.358 36.7029 6.29715ZM21.5 40.4805C11.0341 40.4805 2.51953 31.9659 2.51953 21.5C2.51953 11.0341 11.0341 2.51953 21.5 2.51953C31.9659 2.51953 40.4805 11.0341 40.4805 21.5C40.4805 31.9659 31.9659 40.4805 21.5 40.4805Z" fill="#629D23" />
                        <path d="M22.8494 20.2402H20.1506C18.6131 20.2402 17.3623 18.9895 17.3623 17.452C17.3623 15.9145 18.6132 14.6638 20.1506 14.6638H25.548C26.2438 14.6638 26.8078 14.0997 26.8078 13.404C26.8078 12.7083 26.2438 12.1442 25.548 12.1442H22.7598V9.35594C22.7598 8.66022 22.1957 8.09618 21.5 8.09618C20.8043 8.09618 20.2402 8.66022 20.2402 9.35594V12.1442H20.1507C17.2239 12.1442 14.8429 14.5253 14.8429 17.452C14.8429 20.3787 17.224 22.7598 20.1507 22.7598H22.8495C24.3869 22.7598 25.6377 24.0106 25.6377 25.548C25.6377 27.0855 24.3869 28.3363 22.8495 28.3363H17.452C16.7563 28.3363 16.1923 28.9004 16.1923 29.5961C16.1923 30.2918 16.7563 30.8559 17.452 30.8559H20.2402V33.6442C20.2402 34.34 20.8043 34.904 21.5 34.904C22.1957 34.904 22.7598 34.34 22.7598 33.6442V30.8559H22.8494C25.7761 30.8559 28.1571 28.4747 28.1571 25.548C28.1571 22.6214 25.7761 20.2402 22.8494 20.2402Z" fill="#629D23" />
                    </svg>
                )}
            </div>
            <div className="content">
                {item.title && <h6 className="title">{item.title}</h6>}
                {item.subtitle && <p className="disc">{item.subtitle}</p>}
            </div>
        </div>
    );
}

function GenericItem({ item }: { item: WidgetItemData }) {
    const linkUrl = item.buttonUrl || '#';
    const hasCustomSize = item.imageWidth || item.imageHeight;

    return (
        <div
            className="p-4 rounded-3 h-100 d-flex flex-column justify-content-between"
            style={{
                backgroundColor: item.backgroundColor || '#f5f5f5',
                backgroundImage: item.mediaAsset?.url ? `url(${item.mediaAsset.url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: hasCustomSize ? undefined : 200,
                ...(hasCustomSize ? {
                    width: item.imageWidth ? `${item.imageWidth}px` : undefined,
                    height: item.imageHeight ? `${item.imageHeight}px` : undefined,
                    maxWidth: '100%',
                } : {}),
            }}
        >
            <div>
                {item.badge && <span className="badge bg-warning text-dark mb-2">{item.badge}</span>}
                {item.title && <h5 className="mb-1">{item.title}</h5>}
                {item.subtitle && <p className="text-muted mb-2">{item.subtitle}</p>}
            </div>
            {item.buttonText && (
                <Link href={linkUrl} className="btn btn-sm btn-primary mt-2 align-self-start">
                    {item.buttonText}
                </Link>
            )}
        </div>
    );
}

export default function Widget({ placement, className, variant = 'generic' }: WidgetProps) {
    const [widget, setWidget] = useState<WidgetData | null>(null);

    useEffect(() => {
        apiGet<{ data: WidgetData | null }>(`/widgets/public/${placement}`)
            .then(res => {
                if (res?.data) setWidget(res.data);
            })
            .catch(() => {});
    }, [placement]);

    if (!widget || !widget.items || widget.items.length === 0) return null;

    const colClass = getColClass(widget.columns);

    if (variant === 'feature-cards') {
        return (
            <div className={className}>
                <div className="category-feature-area rts-section-gapTop">
                    <div className="container">
                        <div className="row g-4">
                            {widget.items.map((item, idx) => (
                                <div key={item.id} className={colClass}>
                                    <FeatureCardItem item={item} index={idx} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'promo-banners') {
        return (
            <div className={className}>
                {widget.items.map((item) => (
                    <PromoBannerItem key={item.id} item={item} />
                ))}
            </div>
        );
    }

    if (variant === 'services') {
        return (
            <div className={className}>
                <div className="rts-feature-area rts-section-gap">
                    <div className="container">
                        <div className="row g-4">
                            {widget.items.map((item) => (
                                <div key={item.id} className={colClass}>
                                    <ServiceItem item={item} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            <div className="container">
                <div className="row g-4">
                    {widget.items.map((item) => (
                        <div key={item.id} className={colClass}>
                            <GenericItem item={item} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
