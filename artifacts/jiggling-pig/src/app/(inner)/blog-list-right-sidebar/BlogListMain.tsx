"use client"
import React from 'react';
import Link from 'next/link';

interface BlogListMainProps {
    slug: string;
    imageUrl?: string;
    title: string;
    excerpt?: string;
    date?: string;
    category?: string;
}

const BlogListMain: React.FC<BlogListMainProps> = ({
    slug,
    imageUrl,
    title,
    excerpt,
    date,
    category,
}) => {
    const imgSrc = imageUrl || "/assets/images/blog/blog-01.jpg";

    return (
        <>
            <Link href={`/blog/${slug}`} className="thumbnail">
                <img
                    src={imgSrc}
                    alt={title}
                    style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                />
            </Link>
            <div className="inner-content-body">
                <div className="tag-area">
                    {date && (
                        <div className="single">
                            <i className="fa-light fa-clock" />
                            <span>{date}</span>
                        </div>
                    )}
                    {category && (
                        <div className="single">
                            <i className="fa-light fa-folder" />
                            <span>{category}</span>
                        </div>
                    )}
                </div>
                <Link className="title-main" href={`/blog/${slug}`}>
                    <h3 className="title animated fadeIn">
                        {title}
                    </h3>
                </Link>
                {excerpt && (
                    <p className="disc mb--20">
                        {excerpt}
                    </p>
                )}
                <div className="button-area">
                    <Link
                        href={`/blog/${slug}`}
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

export default BlogListMain;
