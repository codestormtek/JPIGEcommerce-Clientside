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
    variant?: 'feature-cards' | 'promo-banners' | 'generic';
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
    const style: React.CSSProperties = item.mediaAsset?.url
        ? { backgroundImage: `url(${item.mediaAsset.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : item.backgroundColor
            ? { backgroundColor: item.backgroundColor }
            : {};

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
    const style: React.CSSProperties = item.mediaAsset?.url
        ? { backgroundImage: `url(${item.mediaAsset.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : item.backgroundColor
            ? { backgroundColor: item.backgroundColor }
            : {};

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

function GenericItem({ item }: { item: WidgetItemData }) {
    const linkUrl = item.buttonUrl || '#';

    return (
        <div
            className="p-4 rounded-3 h-100 d-flex flex-column justify-content-between"
            style={{
                backgroundColor: item.backgroundColor || '#f5f5f5',
                backgroundImage: item.mediaAsset?.url ? `url(${item.mediaAsset.url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: 200,
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
