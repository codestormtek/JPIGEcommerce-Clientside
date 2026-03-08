"use client";
import React, { useEffect, useState } from 'react';
import BlogOneMain from './BlogOneMain';
import { apiGet } from '@/lib/api';
import { ContentPost, PaginatedResponse } from '@/types/api';

function BlogOne() {
    const [posts, setPosts] = useState<ContentPost[]>([]);

    useEffect(() => {
        apiGet<PaginatedResponse<ContentPost>>('/content?limit=4&page=1')
            .then(res => setPosts(res.data || []))
            .catch(() => {});
    }, []);

    return (
        <div>
            <div className="blog-area-start rts-section-gapBottom">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="title-area-between">
                                <h2 className="title-left mb--0">Latest Blog Post Insights</h2>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="cover-card-main-over">
                                <div className="row g-4">
                                    {posts.map((post, index) => (
                                        <div
                                            key={post.id || index}
                                            className="col-lg-3 col-md-6 col-sm-12"
                                        >
                                            <div className="single-blog-area-start">
                                                <BlogOneMain
                                                    Slug={post.slug}
                                                    blogImage={post.featuredImage?.url || ''}
                                                    blogTitle={post.title}
                                                    publishedDate={post.publishedAt || post.createdAt}
                                                    categoryName={post.categories?.[0]?.name}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BlogOne;
