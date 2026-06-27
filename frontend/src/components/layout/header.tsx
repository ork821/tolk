"use client";

import Link from "next/link";
import {MobileNav} from "./mobile-nav";
import {Button} from "@/components/ui/button";
import {Search} from "lucide-react";
import {Suspense, useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";

function BrandLogo() {
    return (
        <div className="flex items-center gap-2" aria-label="ТОЛК">
            <img
                src="/icon.svg"
                alt=""
                className="size-11 shrink-0 rounded-xl object-contain"
            />
            <span className="hidden text-2xl font-black leading-none text-foreground sm:inline">
                ТОЛК
            </span>
        </div>
    );
}

function SearchBar() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [query, setQuery] = useState(searchParams.get("query") || "");

    useEffect(() => {
        setQuery(searchParams.get("query") || "");
    }, [searchParams]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?query=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <form 
            onSubmit={handleSearch} 
            className="mx-auto flex w-full max-w-2xl items-center gap-2 xl:max-w-3xl 2xl:max-w-4xl"
        >
            <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                    type="search"
                    placeholder="Найти что-нибудь..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full h-9 bg-muted/50 rounded-full pl-10 pr-4 text-sm outline-none border border-transparent focus:border-border focus:bg-background transition-all"
                />
            </div>
            <Button 
                type="submit" 
                size="sm" 
                className="rounded-full px-4 h-9 hidden xs:flex"
            >
                Найти
            </Button>
        </form>
    );
}

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            {/* 
                Используем ту же сетку (grid), что и в основном layout.tsx, 
                чтобы поиск был ровно над лентой постов.
            */}
            <div className="container flex h-14 items-center md:grid md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] px-5 md:px-0">
                
                {/* Левая часть (над сайдбаром) */}
                <div className="flex items-center gap-4 shrink-0 md:px-4 lg:px-6">
                    <MobileNav />
                    <Link href="/" className="flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <BrandLogo />
                    </Link>
                </div>

                {/* Центральная часть (над основным контентом) */}
                <div className="flex flex-1 items-center justify-center w-full">
                    <div className="w-full px-4 md:px-8">
                        <Suspense fallback={<div className="h-9 w-full bg-muted/20 animate-pulse rounded-full" />}>
                            <SearchBar />
                        </Suspense>
                    </div>
                </div>
            </div>
        </header>
    );
}
