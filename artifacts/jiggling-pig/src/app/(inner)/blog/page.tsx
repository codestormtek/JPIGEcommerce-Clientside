'use client';

import React, { useState, useEffect } from 'react';
import HeaderOne from '@/components/header/HeaderOne';
import ShortService from '@/components/service/ShortService';
import FooterOne from '@/components/footer/FooterOne';
import BlogGridMain from './BlogGridMain';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { ContentPost, PaginatedResponse } from '@/types/api';

export default function BlogGridPage() {
    const [posts, setPosts] = useState<ContentPost[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const postsPerPage = 8;

    useEffect(() => {
        setLoading(true);
        setError(null);
        apiGet<PaginatedResponse<ContentPost>>(
            `/content?postType=blog&status=published&limit=${postsPerPage}&page=${currentPage}`
        )
            .then(res => {
                setPosts(res.data || []);
                setTotalPages(res.totalPages || 1);
            })
            .catch(e => setError(e.message || 'Failed to load blog posts'))
            .finally(() => setLoading(false));
    }, [currentPage]);

    return (
        <div className="demo-one">
            <HeaderOne />

            <div className="rts-navigation-area-breadcrumb bg_light-1">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="navigator-breadcrumb-wrapper">
                                <Link href="/">Home</Link>
                                <i className="fa-regular fa-chevron-right" />
                                <a className="current" href="#">
                                    Blog Grid
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="section-seperator bg_light-1">
                <div className="container">
                    <hr className="section-seperator" />
                </div>
            </div>

            <div className="rts-blog-area rts-section-gap bg_white bg_gradient-tranding-items">
                <div className="container">
                    {loading && (
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-5">
                            <p className="text-danger">{error}</p>
                            <button className="rts-btn btn-primary" onClick={() => setCurrentPage(1)}>
                                Try Again
                            </button>
                        </div>
                    )}

                    {!loading && !error && posts.length === 0 && (
                        <div className="text-center py-5">
                            <p>No blog posts found.</p>
                        </div>
                    )}

                    {!loading && !error && posts.length > 0 && (
                        <>
                            <div className="row g-5">
                                {posts.map((post) => (
                                    <div
                                        key={post.id}
                                        className="col-xl-3 col-lg-4 col-md-6 col-sm-12 col-12"
                                    >
                                        <div className="single-blog-style-card-border">
                                            <BlogGridMain post={post} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="row mt--50">
                                    <div className="col-lg-12">
                                        <div className="pagination-area-main-wrappper">
                                            <ul>
                                                {[...Array(totalPages)].map((_, i) => (
                                                    <li key={i}>
                                                        <button
                                                            className={currentPage === i + 1 ? 'active' : ''}
                                                            onClick={() => setCurrentPage(i + 1)}
                                                        >
                                                            {(i + 1).toString().padStart(2, '0')}
                                                        </button>
                                                    </li>
                                                ))}
                                                {currentPage < totalPages && (
                                                    <li>
                                                        <button onClick={() => setCurrentPage(currentPage + 1)}>
                                                            <i className="fa-regular fa-chevrons-right" />
                                                        </button>
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <ShortService />
            <FooterOne />
        </div>
    );
}
