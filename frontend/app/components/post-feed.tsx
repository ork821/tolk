"use client";

import {useEffect, useMemo} from "react";
import {useNavigate} from "react-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {useInView} from "react-intersection-observer";
import {internalNavigationStorageKey, PostCard} from "~/components/post-card";
import {PostCardSkeleton} from "~/components/post-card-skeleton";
import {usePostMetadataBatch} from "~/hooks/use-post-metadata-batch";
import type {Post, PostMetadataByPostId, PostsPageResponse} from "~/lib/api";

export type {PostsPageResponse} from "~/lib/api";

interface PostFeedProps {
    queryKey: string[];
    fetchFn: ({nextPageToken}: {nextPageToken: string | null}) => Promise<PostsPageResponse>;
}

export function PostFeed({queryKey, fetchFn}: PostFeedProps) {
    const navigate = useNavigate();
    const {ref, inView} = useInView({rootMargin: "600px"});

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

    const posts = useMemo(() => data?.pages.flatMap((page) => page.posts) ?? [], [data]);
    const postIds = useMemo(() => posts.map((post) => post.id), [posts]);
    const {data: metadataByPostId = {}} = usePostMetadataBatch(postIds);

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

    if (status === "pending") {
        return <PostFeedSkeletonList />;
    }

    if (status === "error") {
        return <PostFeedMessage className="text-destructive" text="Не удалось загрузить ленту" />;
    }

    if (posts.length === 0) {
        return <PostFeedMessage className="py-10" text="Здесь пока нет постов." />;
    }

    return (
        <div className="flex w-full flex-col gap-0 sm:gap-4">
            <PostFeedItems
                posts={posts}
                metadataByPostId={metadataByPostId}
                onOpenPost={(postId) => {
                    window.sessionStorage.setItem(internalNavigationStorageKey, "1");
                    navigate(`/p/${postId}`);
                }}
            />

            {hasNextPage && <PostFeedNextPageLoader refCallback={ref} />}

            {!hasNextPage && <PostFeedMessage text="Вы посмотрели все посты" />}
        </div>
    );
}

function PostFeedItems({
    posts,
    metadataByPostId,
    onOpenPost,
}: {
    posts: Post[];
    metadataByPostId: PostMetadataByPostId;
    onOpenPost: (postId: string) => void;
}) {
    return (
        <>
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    metadata={metadataByPostId[post.id]}
                    onClick={() => onOpenPost(post.id)}
                />
            ))}
        </>
    );
}

function PostFeedSkeletonList() {
    return (
        <div className="flex flex-col gap-0 sm:gap-4">
            {Array.from({length: 5}).map((_, index) => (
                <PostCardSkeleton key={index} />
            ))}
        </div>
    );
}

function PostFeedNextPageLoader({refCallback}: {refCallback: (node?: Element | null) => void}) {
    return (
        <div ref={refCallback} className="mt-0 flex flex-col gap-0 sm:mt-4 sm:gap-4">
            <PostCardSkeleton />
            <PostCardSkeleton />
        </div>
    );
}

function PostFeedMessage({text, className}: {text: string; className?: string}) {
    return (
        <div className={`py-8 text-center text-sm font-medium text-muted-foreground ${className ?? ""}`}>
            {text}
        </div>
    );
}
