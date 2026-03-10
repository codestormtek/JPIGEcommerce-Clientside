"use client"
import Link from 'next/link'
import React from 'react'
import { useSiteSettings } from '@/context/SiteSettingsContext'

interface FeatureCard {
    badge: string;
    title: string;
    subtitle: string;
    link: string;
    image_url: string;
    bg_class: string;
}

const defaultCards: FeatureCard[] = [
    { badge: "Weekend Discount", title: "Drink Fresh Corn Juice", subtitle: "Good Taste", link: "/shop", image_url: "", bg_class: "one" },
    { badge: "Weekend Discount", title: "Organic Lemon Flavored", subtitle: "Banana Chips", link: "/shop", image_url: "", bg_class: "two" },
    { badge: "Weekend Discount", title: "Nozes Pecanera Brasil", subtitle: "Chocolate Snacks", link: "/shop", image_url: "", bg_class: "three" },
    { badge: "Weekend Discount", title: "Strawberry Water Drinks", subtitle: "Flavors Awesome", link: "/shop", image_url: "", bg_class: "four" },
];

function parseCard(json: string | undefined, fallback: FeatureCard): FeatureCard {
    if (!json) return fallback;
    try {
        return { ...fallback, ...JSON.parse(json) };
    } catch {
        return fallback;
    }
}

function FeatureDiscount() {
    const { settings } = useSiteSettings();

    const cards = [
        parseCard(settings.feature_card_1, defaultCards[0]),
        parseCard(settings.feature_card_2, defaultCards[1]),
        parseCard(settings.feature_card_3, defaultCards[2]),
        parseCard(settings.feature_card_4, defaultCards[3]),
    ];

    return (
        <div>
            <>
                <div className="category-feature-area rts-section-gapTop">
                    <div className="container">
                        <div className="row g-4">
                            {cards.map((card, idx) => (
                                <div key={idx} className="col-lg-3 col-md-6 col-sm-12 col-12">
                                    <div
                                        className={`single-feature-card bg_image ${card.bg_class}`}
                                        style={card.image_url ? { backgroundImage: `url(${card.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                                    >
                                        <div className="content-area">
                                            <Link href={card.link} className="rts-btn btn-primary">
                                                {card.badge}
                                            </Link>
                                            <h3 className="title">
                                                {card.title}
                                                <span>{card.subtitle}</span>
                                            </h3>
                                            <Link href={card.link} className="shop-now-goshop-btn">
                                                <span className="text">Shop Now</span>
                                                <div className="plus-icon">
                                                    <i className="fa-sharp fa-regular fa-plus" />
                                                </div>
                                                <div className="plus-icon">
                                                    <i className="fa-sharp fa-regular fa-plus" />
                                                </div>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        </div>
    )
}

export default FeatureDiscount