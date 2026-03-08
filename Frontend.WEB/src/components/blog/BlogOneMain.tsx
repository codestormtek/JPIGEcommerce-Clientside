"use client"
import React from 'react';
import Link from 'next/link';

interface BlogGridMainProps {
    Slug: string;
    blogImage: string;
    blogTitle?: string;
    publishedDate?: string;
    categoryName?: string;
}

const BlogGridMain: React.FC<BlogGridMainProps> = ({
    Slug,
    blogImage,
    blogTitle,
    publishedDate,
    categoryName,
}) => {
    const isExternal = blogImage && (blogImage.startsWith('http') || blogImage.startsWith('//'));
    const imageSrc = isExternal ? blogImage : (blogImage ? `assets/images/blog/${blogImage}` : 'assets/images/blog/01.jpg');

    const formattedDate = publishedDate
        ? new Date(publishedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        : '15 Sep, 2023';

    return (
        <>
            <Link href={`/blog/${Slug}`} className="thumbnail">
                <img src={imageSrc} alt="blog-area" />
            </Link>
            <div className="blog-body">
                <div className="top-area">
                    <div className="single-meta">
                        <i className="fa-light fa-clock" />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="single-meta">
                        <i className="fa-regular fa-folder" />
                        <span>{categoryName || 'Modern Fashion'}</span>
                    </div>
                </div>
                <Link href={`/blog/${Slug}`}>
                    <h4 className="title">
                        {blogTitle ? blogTitle : 'How to growing your business'}
                    </h4>
                </Link>
                <Link href={`/blog/${Slug}`} className="shop-now-goshop-btn">
                    <span className="text">Read Details</span>
                    <div className="plus-icon">
                        <i className="fa-sharp fa-regular fa-plus" />
                    </div>
                    <div className="plus-icon">
                        <i className="fa-sharp fa-regular fa-plus" />
                    </div>
                </Link>
            </div>

        </>
    );
};

export default BlogGridMain;
