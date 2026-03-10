"use client"
import React from 'react';
import Link from "next/link";
function NavItem() {
    return (
        <div>
            <nav>
                <ul className="parent-nav">
                    <li className="parent">
                        <Link href="/">Home</Link>
                    </li>
                    <li className="parent">
                        <Link href="/about">About</Link>
                    </li>
                    <li className="parent has-dropdown">
                        <Link className="nav-link" href="#">
                            Shop
                        </Link>
                        <ul className="submenu">
                            <li>
                                <Link className="sub-b" href="/shop-grid-top-filter">
                                    JPIG Shop
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/cart">
                                    Cart
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/checkout">
                                    Checkout
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/trackorder">
                                    Track Order
                                </Link>
                            </li>
                        </ul>
                    </li>
                    <li className="parent has-dropdown">
                        <Link className="nav-link" href="#">
                            Pages
                        </Link>
                        <ul className="submenu">
                            <li>
                                <Link className="sub-b" href="/dashboard">
                                    Dashboard
                                    <span className="badge">( New )</span>
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/about">
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/store">
                                    Store
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/invoice">
                                    Invoice
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/contact">
                                    Contact
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/register">
                                    Register
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/login">
                                    Login
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/privacy-policy">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/cookies-policy">
                                    Cookies Policy
                                </Link>
                            </li>
                            <li>
                                <Link className="sub-b" href="/terms-condition">
                                    Terms &amp; Condition
                                </Link>
                            </li>
                        </ul>
                    </li>
                    <li className="parent has-dropdown">
                        <Link className="nav-link" href="#">
                            Blog
                        </Link>
                        <ul className="submenu">
                            <li>
                                <Link className="sub-b" href="/blog">
                                    JPIG Blogs
                                </Link>
                            </li>
                        </ul>
                    </li>
                    <li className="parent">
                        <Link href="/catering">Catering</Link>
                    </li>
                    <li className="parent">
                        <Link href="/bbq-live">BBQ Live</Link>
                    </li>
                    <li className="parent">
                        <Link href="/gallery">Gallery</Link>
                    </li>
                    <li className="parent">
                        <Link href="/contact">Contact</Link>
                    </li>
                </ul>
            </nav>
        </div>
    );
}

export default NavItem;