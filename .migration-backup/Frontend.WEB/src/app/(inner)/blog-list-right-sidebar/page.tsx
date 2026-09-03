'use client';

import React, { useState, useEffect } from 'react';
import HeaderOne from '@/components/header/HeaderOne';
import ShortService from '@/components/service/ShortService';
import FooterOne from '@/components/footer/FooterOne';
import BlogListMain from './BlogListMain';
import Link from 'next/link';
import { apiGet, buildQS } from '@/lib/api';

interface ContentPost {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    bodyHtml?: string;
    postType: string;
    status: string;
    publishedAt?: string;
    featuredMediaAsset?: { url: string } | null;
    categories?: { category: { id: string; name: string; slug: string } }[];
    tags?: { tag: { id: string; name: string; slug: string } }[];
    authorUser?: { firstName: string; lastName: string };
}

interface PaginatedResponse {
    data: ContentPost[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BlogListRightSidebar() {
    const [posts, setPosts] = useState<ContentPost[]>([]);
    const [latestPosts, setLatestPosts] = useState<ContentPost[]>([]);
    const [allCategories, setAllCategories] = useState<{ id: string; name: string; slug: string; count: number }[]>([]);
    const [allTags, setAllTags] = useState<{ id: string; name: string; slug: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategoryId, setActiveCategoryId] = useState('');
    const [activeTagId, setActiveTagId] = useState('');
    const postsPerPage = 4;

    useEffect(() => {
        apiGet<PaginatedResponse>(`/content?limit=3&page=1&postType=blog`)
            .then(res => setLatestPosts(res.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        const params: Record<string, string | number | undefined> = {
            page,
            limit: postsPerPage,
            postType: 'blog',
        };
        if (searchQuery) params.search = searchQuery;
        if (activeCategoryId) params.categoryId = activeCategoryId;
        if (activeTagId) params.tagId = activeTagId;

        const qs = buildQS(params);
        apiGet<PaginatedResponse>(`/content${qs}`)
            .then(res => {
                setPosts(res.data || []);
                setTotalPages(res.meta?.totalPages || 1);
            })
            .catch(() => setPosts([]))
            .finally(() => setLoading(false));
    }, [page, searchQuery, activeCategoryId, activeTagId]);

    useEffect(() => {
        apiGet<PaginatedResponse>(`/content?limit=50&postType=blog`)
            .then(res => {
                const catMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
                const tagMap = new Map<string, { id: string; name: string; slug: string }>();
                (res.data || []).forEach(p => {
                    (p.categories || []).forEach(c => {
                        const existing = catMap.get(c.category.id);
                        if (existing) existing.count++;
                        else catMap.set(c.category.id, { id: c.category.id, name: c.category.name, slug: c.category.slug, count: 1 });
                    });
                    (p.tags || []).forEach(t => {
                        if (!tagMap.has(t.tag.id)) tagMap.set(t.tag.id, { id: t.tag.id, name: t.tag.name, slug: t.tag.slug });
                    });
                });
                setAllCategories([...catMap.values()]);
                setAllTags([...tagMap.values()]);
            })
            .catch(() => {});
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

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
                                    Blog
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

            <div className="blog-sidebar-area rts-section-gap" style={{ transform: "none" }}>
                <div className="container" style={{ transform: "none" }}>
                    <div className="row" style={{ transform: "none" }}>
                        <div className="col-lg-8 order-lg-1 order-md-2 order-sm-2 order-2">
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="mt-3">Loading posts...</p>
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="text-center py-5">
                                    <p>No posts found.</p>
                                </div>
                            ) : (
                                posts.map((post) => (
                                    <div key={post.id} className="single-blog-main-wrapper-top">
                                        <div className="single-blog-style-card-border mb--40">
                                            <BlogListMain
                                                slug={post.slug}
                                                imageUrl={post.featuredMediaAsset?.url}
                                                title={post.title}
                                                excerpt={post.excerpt}
                                                date={formatDate(post.publishedAt)}
                                                category={post.categories?.[0]?.category?.name}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}

                            {totalPages > 1 && (
                                <div className="pagination-area-blog mt--30">
                                    <nav>
                                        <ul className="pagination">
                                            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setPage(Math.max(1, page - 1))}>
                                                    <i className="fa-regular fa-chevron-left" />
                                                </button>
                                            </li>
                                            {pageNumbers.map(num => (
                                                <li key={num} className={`page-item ${num === page ? 'active' : ''}`}>
                                                    <button className="page-link" onClick={() => setPage(num)}>
                                                        {num}
                                                    </button>
                                                </li>
                                            ))}
                                            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setPage(Math.min(totalPages, page + 1))}>
                                                    <i className="fa-regular fa-chevron-right" />
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
                        </div>
                        <div
                            className="col-lg-4 pl--60 order-lg-2 order-md-1 order-sm-1 order-1 pl_md--10 pl_sm--10 rts-sticky-column-item"
                            style={{
                                position: "relative",
                                overflow: "visible",
                                boxSizing: "border-box",
                                minHeight: 1
                            }}
                        >
                            <div
                                className="theiaStickySidebar"
                                style={{
                                    paddingTop: 0,
                                    paddingBottom: 1,
                                    position: "static",
                                    transform: "none",
                                    top: 0,
                                }}
                            >
                                <div className="blog-sidebar-single-wized">
                                    <form onSubmit={handleSearch}>
                                        <input
                                            type="text"
                                            placeholder="Search Here"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        <button type="submit">
                                            <i className="fa-regular fa-magnifying-glass" />
                                        </button>
                                    </form>
                                </div>
                                <div className="blog-sidebar-single-wized with-title">
                                    <h4 className="title">Categories</h4>
                                    <div className="category-main-wrapper">
                                        {allCategories.map(cat => (
                                            <div
                                                key={cat.id}
                                                className="single-category-area"
                                                style={{
                                                    cursor: 'pointer',
                                                    fontWeight: activeCategoryId === cat.id ? 'bold' : 'normal',
                                                }}
                                                onClick={() => {
                                                    setActiveCategoryId(activeCategoryId === cat.id ? '' : cat.id);
                                                    setPage(1);
                                                }}
                                            >
                                                <p>{cat.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="blog-sidebar-single-wized with-title">
                                    <h4 className="title">Latest Posts</h4>
                                    <div className="latest-post-small-area-wrapper">
                                        {latestPosts.map(post => (
                                            <div key={post.id} className="single-latest-post-area">
                                                <Link href={`/blog/${post.slug}`} className="thumbnail">
                                                    <img
                                                        src={post.featuredMediaAsset?.url || "/assets/images/blog/thumb/01.jpg"}
                                                        alt={post.title}
                                                    />
                                                </Link>
                                                <div className="inner-content-area">
                                                    <div className="icon-top-area">
                                                        <i className="fa-light fa-clock" />
                                                        <span>{formatDate(post.publishedAt)}</span>
                                                    </div>
                                                    <Link href={`/blog/${post.slug}`}>
                                                        <h5 className="title-sm-blog">
                                                            {post.title}
                                                        </h5>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="blog-sidebar-single-wized with-title">
                                    <h4 className="title">Tags</h4>
                                    <div className="tags-area-blog-short-main">
                                        {allTags.map(tag => (
                                            <button
                                                key={tag.id}
                                                className="single-category"
                                                style={{
                                                    fontWeight: activeTagId === tag.id ? 'bold' : 'normal',
                                                }}
                                                onClick={() => {
                                                    setActiveTagId(activeTagId === tag.id ? '' : tag.id);
                                                    setPage(1);
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="blog-sidebar-single-wized with-add bg_image">
                                    <div className="add-are-content">
                                        <span className="pre">Check Out</span>
                                        <h5 className="title">
                                            The Jiggling Pig <br />
                                            <span>BBQ Products</span>
                                        </h5>
                                        <Link href="/shop" className="shop-now-goshop-btn">
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
                        </div>
                    </div>
                </div>
            </div>

            <ShortService />
            <FooterOne />
        </div>
    );
}
