"use client";

import Link from "next/link";
import React, { useState, useEffect, MouseEvent } from "react";
import { apiGet } from "@/lib/api";
import { Category } from "@/types/api";

function CategoryMenu() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiGet<Category[]>("/products/categories")
            .then((data) => {
                setCategories(data);
            })
            .catch(() => {
                setCategories([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const toggleMenu = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const iconFiles = [
        "01.svg", "02.svg", "03.svg", "04.svg", "05.svg",
        "06.svg", "07.svg", "08.svg", "09.svg", "10.svg",
    ];

    const parentCategories = categories.filter((c) => !c.parentCategoryId);
    const getChildren = (parentId: string) =>
        categories.filter((c) => c.parentCategoryId === parentId);

    if (loading) {
        return (
            <div>
                <ul className="category-sub-menu" id="category-active-four">
                    <li style={{ padding: "10px", textAlign: "center" }}>Loading...</li>
                </ul>
            </div>
        );
    }

    return (
        <div>
            <ul className="category-sub-menu" id="category-active-four">
                {parentCategories.map((item, index) => {
                    const children = getChildren(item.id);
                    const hasChildren = children.length > 0;
                    const iconSrc = item.imageUrl || `/assets/images/icons/${iconFiles[index % iconFiles.length]}`;

                    return (
                        <li key={item.id}>
                            <Link
                                href={`/shop?categoryId=${encodeURIComponent(item.id)}`}
                                className="menu-item"
                                onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                                    if (hasChildren) {
                                        e.preventDefault();
                                        toggleMenu(index);
                                    }
                                }}
                            >
                                <img src={iconSrc} alt={item.name} />
                                <span>{item.name}</span>
                                {hasChildren && (
                                    <i
                                        className={`fa-regular ${openIndex === index ? "fa-minus" : "fa-plus"}`}
                                    />
                                )}
                            </Link>

                            {hasChildren && (
                                <ul
                                    className={`submenu mm-collapse ${openIndex === index ? "mm-show" : ""}`}
                                >
                                    {children.map((child) => (
                                        <li key={child.id}>
                                            <Link className="mobile-menu-link" href={`/shop?categoryId=${encodeURIComponent(child.id)}`}>
                                                {child.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default CategoryMenu;
