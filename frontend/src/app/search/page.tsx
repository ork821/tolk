"use client";

import {Suspense, useEffect, useState} from "react";
import {useSearchParams} from "next/navigation";
import {Loader2} from "lucide-react";
import {PostCard, PostCardProps} from "@/components/post-card";

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get("query") || "";
    const [results, setResults] = useState<PostCardProps[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const performSearch = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                // const data = await postsApi.searchPosts(query);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        performSearch();
    }, [query]);

    if (!query.trim()) {
        return (
            <div className="text-center py-20 text-muted-foreground italic">
                Введите запрос в поиске выше, чтобы увидеть результаты.
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full gap-4">
            <h1 className="text-2xl font-bold px-1 mb-2">Результаты для "{query}"</h1>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium animate-pulse">Ищем в базе данных...</p>
                </div>
            ) : results.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {results.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
                    <p className="text-lg font-medium text-foreground">Ничего не найдено</p>
                    <p className="text-muted-foreground mt-1">Попробуйте использовать другие ключевые слова.</p>
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <SearchResults />
        </Suspense>
    );
}
