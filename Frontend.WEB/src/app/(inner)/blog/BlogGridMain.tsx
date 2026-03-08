"use client"
import React from 'react';
import Link from 'next/link';
import { ContentPost } from '@/types/api';
import { getBlogImageUrl } from '@/lib/blogImages';

interface BlogGridMainProps {
    post: ContentPost;
}

const BlogGridMain: React.FC<BlogGridMainProps> = ({ post }) => {
    const imageUrl = getBlogImageUrl(post, 'medium');

    const formattedDate = post.publishedAt || post.createdAt
        ? new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    const firstCat = post.categories?.[0];
    const categoryName = firstCat?.category?.name || firstCat?.name || '';

    return (
        <>
            <Link href={`/blog/${post.slug}`} className="thumbnail">
                <img src={imageUrl} alt={post.title || 'blog-area'} />
            </Link>
            <div className="inner-content-body">
                <div className="tag-area">
                    {formattedDate && (
                        <div className="single">
                            <i className="fa-light fa-clock" />
                            <span>{formattedDate}</span>
                        </div>
                    )}
                    {categoryName && (
                        <div className="single">
                            <i className="fa-light fa-folder" />
                            <span>{categoryName}</span>
                        </div>
                    )}
                </div>
                <Link className="title-main" href={`/blog/${post.slug}`}>
                    <h3 className="title animated fadeIn">
                        {post.title || 'Untitled'}
                    </h3>
                </Link>
                <div className="button-area">
                    <Link
                        href={`/blog/${post.slug}`}
                        className="rts-btn btn-primary radious-sm with-icon"
                    >
                        <div className="btn-text">Read Details</div>
                        <div className="arrow-icon">
                            <i className="fa-solid fa-circle-plus" />
                        </div>
                        <div className="arrow-icon">
                            <i className="fa-solid fa-circle-plus" />
                        </div>
                    </Link>
                </div>
            </div>
        </>
    );
};

export default BlogGridMain;
