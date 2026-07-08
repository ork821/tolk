"use client";

import {useEffect, useMemo} from "react";
import {useInfiniteQuery} from "@tanstack/react-query";
import {useInView} from "react-intersection-observer";

import {PostCardSkeleton} from "@/components/post-card-skeleton";
import {PostCard} from "@/components/post-card";
import type {PostsPageResponse} from "@/lib/api";
import {usePostMetadataBatch} from "@/hooks/use-post-metadata-batch";

export type {PostsPageResponse} from "@/lib/api";

interface PostFeedProps {
    queryKey: string[]; // Ключ для кеша (например: ['posts', 'feed'] или ['posts', 'user', '123'])
    fetchFn: ({ nextPageToken }: { nextPageToken: string | null }) => Promise<PostsPageResponse>;
}

export function PostFeed({ queryKey, fetchFn }: PostFeedProps) {
    // Настраиваем Intersection Observer для якоря внизу
    const { ref, inView } = useInView({
        rootMargin: "600px", // Начинаем грузить заранее
    });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey,
        queryFn: ({pageParam}) => fetchFn({nextPageToken: pageParam}),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    });
    const allPosts = useMemo(() => data?.pages.flatMap((page) => page.posts) ?? [], [data]);
    const postIds = useMemo(() => allPosts.map((post) => post.id), [allPosts]);
    const {data: metadataByPostId = {}} = usePostMetadataBatch(postIds);

    // Эффект: загружаем следующую страницу, когда якорь появляется на экране
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // 1. Состояние ПЕРВОЙ загрузки (когда данных еще нет вообще)
    if (status === "pending") {
        return (
            <div className="flex flex-col gap-0 sm:gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <PostCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    // 2. Состояние Ошибки
    if (status === "error") {
        return <div className="p-4 text-center text-destructive">Не удалось загрузить ленту</div>;
    }

    // 3. Состояние Пустоты
    if (allPosts.length === 0) {
        return <div className="p-10 text-center text-muted-foreground">Здесь пока нет постов.</div>;
    }
    return (
        <div className="flex flex-col w-full gap-0 sm:gap-4">
            {/* Рендерим посты */}
            {allPosts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    metadata={metadataByPostId[post.id]}
                />
            ))}

            {/* Якорь + Скелетоны для дозагрузки следующих страниц */}
            {hasNextPage && (
                <div ref={ref} className="flex flex-col gap-0 sm:gap-4 mt-0 sm:mt-4">
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                </div>
            )}

            {/* Конец ленты */}
            {!hasNextPage && (
                <div className="py-8 text-center text-sm text-muted-foreground font-medium">
                    Вы посмотрели все посты
                </div>
            )}
        </div>
    );
}
