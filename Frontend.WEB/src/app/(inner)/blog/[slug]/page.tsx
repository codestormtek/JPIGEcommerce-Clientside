"use client"
import React, { useState, useEffect } from 'react';
import HeaderOne from "@/components/header/HeaderOne";
import ShortService from "@/components/service/ShortService";
import FooterOne from "@/components/footer/FooterOne";
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { ContentPost, PaginatedResponse } from '@/types/api';
import { getBlogImageUrl } from '@/lib/blogImages';

interface SinglePostResponse {
    success: boolean;
    data: ContentPost;
}

export default function BlogDetailPage() {
    const { slug } = useParams();
    const [post, setPost] = useState<ContentPost | null>(null);
    const [recentPosts, setRecentPosts] = useState<ContentPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;

        setLoading(true);
        setError(null);

        Promise.all([
            apiGet<SinglePostResponse>(`/content/${slug}`),
            apiGet<PaginatedResponse<ContentPost>>('/content?postType=blog&status=published&limit=4')
        ])
            .then(([postRes, recentRes]) => {
                const postData = (postRes as any).data || postRes;
                setPost(postData);

                const recent = (recentRes.data || []).filter((p: ContentPost) => p.slug !== slug);
                setRecentPosts(recent.slice(0, 3));
            })
            .catch(() => setError('Failed to load blog post'))
            .finally(() => setLoading(false));
    }, [slug]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const getCategoryName = (post: ContentPost) => {
        const first = post.categories?.[0];
        return first?.category?.name || first?.name || '';
    };

    const getTagName = (tag: ContentPost['tags'][number]) => {
        return tag?.tag?.name || tag?.name || '';
    };

    const getAuthorName = (post: ContentPost) => {
        if (!post.authorUser) return '';
        return `${post.authorUser.firstName} ${post.authorUser.lastName}`.trim();
    };

    const getAuthorInitials = (post: ContentPost) => {
        if (!post.authorUser) return '?';
        const f = post.authorUser.firstName?.[0] || '';
        const l = post.authorUser.lastName?.[0] || '';
        return (f + l).toUpperCase() || '?';
    };

    if (loading) {
        return (
            <div className="demo-one">
                <HeaderOne />
                <div className="blog-sidebar-area rts-section-gap">
                    <div className="container">
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
                <FooterOne />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="demo-one">
                <HeaderOne />
                <div className="blog-sidebar-area rts-section-gap">
                    <div className="container">
                        <div className="text-center py-5">
                            <h3>{error || 'Post not found'}</h3>
                            <Link href="/blog" className="rts-btn btn-primary mt--20">
                                Back to Blog
                            </Link>
                        </div>
                    </div>
                </div>
                <FooterOne />
            </div>
        );
    }

    const featuredImg = getBlogImageUrl(post, 'xlarge');
    const publishDate = formatDate(post.publishedAt || post.createdAt);
    const category = getCategoryName(post);
    const authorName = getAuthorName(post);

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
                                <Link href="/blog">Blog</Link>
                                <i className="fa-regular fa-chevron-right" />
                                <span className="current">{post.title}</span>
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

            <div className="blog-sidebar-area rts-section-gap">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-8 order-lg-1 order-md-2 order-sm-2 order-2">
                            <div className="blog-details-area-1">
                                {featuredImg && (
                                    <div className="thumbnail">
                                        <img src={featuredImg} alt={post.title} />
                                    </div>
                                )}
                                <div className="body-content-blog-details">
                                    <div className="top-tag-time">
                                        {publishDate && (
                                            <div className="single">
                                                <i className="fa-solid fa-clock" />
                                                <span>{publishDate}</span>
                                            </div>
                                        )}
                                        {category && (
                                            <div className="single">
                                                <i className="fa-solid fa-folder" />
                                                <span>{category}</span>
                                            </div>
                                        )}
                                        {authorName && (
                                            <div className="single">
                                                <i className="fa-solid fa-user" />
                                                <span>{authorName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <h1 className="title">{post.title}</h1>

                                    {post.excerpt && (
                                        <p className="disc blog-excerpt-text">
                                            <em>{post.excerpt}</em>
                                        </p>
                                    )}

                                    {post.bodyHtml && (
                                        <div
                                            className="blog-body-content"
                                            dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
                                        />
                                    )}

                                    {post.tags && post.tags.length > 0 && (
                                        <div className="tag-social-share-wrapper-area-wrapper">
                                            <div className="tags-area">
                                                <span>Tags</span>
                                                {post.tags.map((tag, idx) => (
                                                    <button key={idx}>{getTagName(tag)}</button>
                                                ))}
                                            </div>
                                            <div className="social-icons">
                                                <span>Share</span>
                                                <ul>
                                                    <li>
                                                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" rel="noopener noreferrer">
                                                            <i className="fa-brands fa-facebook-f" />
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer">
                                                            <i className="fa-brands fa-twitter" />
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {authorName && (
                                        <div className="blog-details-author">
                                            <div className="thumbnail">
                                                <div className="author-avatar-placeholder">
                                                    {getAuthorInitials(post)}
                                                </div>
                                            </div>
                                            <div className="author-information">
                                                <span>Written by</span>
                                                <h5 className="title">{authorName}</h5>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-4 pl--60 order-lg-2 order-md-1 order-sm-1 order-1 pl_md--10 pl_sm--10 rts-sticky-column-item">
                            <div className="blog-sidebar-single-wized with-title">
                                <h4 className="title">Categories</h4>
                                <div className="category-main-wrapper">
                                    {post.categories?.map((cat, idx) => {
                                        const name = cat?.category?.name || cat?.name || '';
                                        return name ? (
                                            <div className="single-category-area" key={idx}>
                                                <p>{name}</p>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            </div>

                            {recentPosts.length > 0 && (
                                <div className="blog-sidebar-single-wized with-title">
                                    <h4 className="title">Latest Posts</h4>
                                    <div className="latest-post-small-area-wrapper">
                                        {recentPosts.map((recent) => {
                                            const thumbUrl = getBlogImageUrl(recent, 'small');
                                            const recentDate = formatDate(recent.publishedAt || recent.createdAt);
                                            return (
                                                <div className="single-latest-post-area" key={recent.id}>
                                                    <Link href={`/blog/${recent.slug}`} className="thumbnail">
                                                        {thumbUrl && <img src={thumbUrl} alt={recent.title} />}
                                                    </Link>
                                                    <div className="inner-content-area">
                                                        {recentDate && (
                                                            <div className="icon-top-area">
                                                                <i className="fa-light fa-clock" />
                                                                <span>{recentDate}</span>
                                                            </div>
                                                        )}
                                                        <Link href={`/blog/${recent.slug}`}>
                                                            <h5 className="title-sm-blog">{recent.title}</h5>
                                                        </Link>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {post.tags && post.tags.length > 0 && (
                                <div className="blog-sidebar-single-wized with-title">
                                    <h4 className="title">Tags</h4>
                                    <div className="tags-area-blog-short-main">
                                        {post.tags.map((tag, idx) => (
                                            <button key={idx} className="single-category">
                                                {getTagName(tag)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ShortService />
            <FooterOne />
        </div>
    );
}
