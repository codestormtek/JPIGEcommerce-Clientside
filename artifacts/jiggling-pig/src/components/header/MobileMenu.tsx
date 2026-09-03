'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const MobileMenu = () => {
    const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
    const [openThirdLevelKey, setOpenThirdLevelKey] = useState<string | null>(null);

    const toggleMenu = (index: number) => {
        setOpenMenuIndex(prev => (prev === index ? null : index));
    };

    const toggleThirdMenu = (key: string) => {
        setOpenThirdLevelKey(prev => (prev === key ? null : key));
    };

    return (
        <nav className="nav-main mainmenu-nav mt--30">
            <ul className="mainmenu metismenu" id="mobile-menu-active">

                {/* Home */}
                <li><Link className="main" href="/">Home</Link></li>

                {/* About */}
                <li className={`has-droupdown ${openMenuIndex === 0 ? 'mm-active' : ''}`}>
                    <a href="#" className="main" onClick={() => toggleMenu(0)}>About</a>
                    <ul className={`submenu mm-collapse ${openMenuIndex === 0 ? 'mm-show' : ''}`}>
                        <li><Link className="mobile-menu-link" href="/about">Our Story</Link></li>
                        <li><Link className="mobile-menu-link" href="/gallery">Gallery</Link></li>
                        <li><Link className="mobile-menu-link" href="/catering">Catering</Link></li>
                        <li><Link className="mobile-menu-link" href="/bbq-live">BBQ Live</Link></li>
                        <li><Link className="mobile-menu-link" href="/faq">FAQ</Link></li>
                        <li><Link className="mobile-menu-link" href="/contact">Contact Us</Link></li>
                    </ul>
                </li>


                {/* Shop */}
                <li className={`has-droupdown ${openMenuIndex === 2 ? 'mm-active' : ''}`}>
                    <a href="#" className="main" onClick={() => toggleMenu(2)}>Shop</a>
                    <ul className={`submenu mm-collapse ${openMenuIndex === 2 ? 'mm-show' : ''}`}>
                        <li><Link className="mobile-menu-link" href="/shop-grid-top-filter">JPIG Shop</Link></li>
                        <li><Link className="mobile-menu-link" href="/cart">Cart</Link></li>
                        <li><Link className="mobile-menu-link" href="/checkout">Checkout</Link></li>
                        <li><Link className="mobile-menu-link" href="/trackorder">Track Order</Link></li>
                    </ul>
                </li>

                {/* Blog */}
                <li className={`has-droupdown ${openMenuIndex === 3 ? 'mm-active' : ''}`}>
                    <a href="#" className="main" onClick={() => toggleMenu(3)}>Blog</a>
                    <ul className={`submenu mm-collapse ${openMenuIndex === 3 ? 'mm-show' : ''}`}>
                        <li><Link className="mobile-menu-link" href="/blog">JPIG Blogs</Link></li>
                    </ul>
                </li>

                {/* Gallery */}
                <li><Link className="main" href="/gallery">Gallery</Link></li>

                {/* Contact */}
                <li><Link className="main" href="/contact">Contact Us</Link></li>

            </ul>
        </nav>
    );
};

export default MobileMenu;
