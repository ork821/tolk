"use client";

import {use, useEffect} from "react";
import {useInfiniteQuery} from "@tanstack/react-query";
import {useInView} from "react-intersection-observer";
import {BackButton} from "@/components/back-button";
import {FollowList, FollowListSkeleton} from "@/components/follow-list";
import {getUserFollowers} from "@/lib/api";

export default function FollowersPage({params}: {params: Promise<{ username: string }>}) {
    const {username} = use(params);
    const {ref, inView} = useInView({rootMargin: "500px"});
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ["user-connections", username, "followers"],
        queryFn: ({pageParam}) => getUserFollowers(username, {nextPageToken: pageParam}),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

    const users = data?.pages.flatMap((page) => page.followers) ?? [];

    return (
        <div className="flex min-h-screen flex-col gap-5 pb-20 mt-6">
            <div className="sticky top-14 z-40 -mx-3 flex items-center gap-3 border-b bg-background/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 md:-mx-8 md:px-8">
                <BackButton />
                <div className="min-w-0">
                    <h1 className="text-xl font-black leading-tight">Подписчики</h1>
                    <p className="truncate text-sm text-muted-foreground">@{username}</p>
                </div>
            </div>

            {status === "pending" ? (
                <FollowListSkeleton />
            ) : status === "error" ? (
                <div className="rounded-3xl border border-dashed p-10 text-center text-destructive">
                    Не удалось загрузить подписчиков.
                </div>
            ) : (
                <>
                    <FollowList users={users} />

                    {hasNextPage && (
                        <div ref={ref} className="mt-4">
                            {isFetchingNextPage && <FollowListSkeleton count={3} />}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
