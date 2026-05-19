"use client";

import {useEffect} from "react";
import {useInfiniteQuery} from "@tanstack/react-query";
import {useInView} from "react-intersection-observer";
import {Loader2} from "lucide-react";
import {CommentNode} from "./comment-node";
import {api} from "@/lib/api";
import {mapCommentsPageToComments} from "@/lib/api/comment-mappers";

interface CommentFeedProps {
    postId: number;
}

export function CommentFeed({postId}: CommentFeedProps) {
    const {ref, inView} = useInView({
        rootMargin: "400px",
        threshold: 0,
    });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ["posts", postId, "comments"],
        queryFn: async ({pageParam}) => {
            const {data, error} = await api.GET("/v1/posts/{post}/comments", {
                params: {
                    path: {
                        post: postId,
                        version: "1",
                    },
                    query: pageParam ? {next_page_token: pageParam} : undefined,
                },
            });

            if (error) {
                throw error;
            }

            return data;
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage?.nextPageToken ?? undefined,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

    const comments = data?.pages.flatMap(mapCommentsPageToComments) ?? [];

    return (
        <div className="flex flex-col px-4 pb-4">
            {status === "pending" && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {status === "error" && (
                <div className="py-8 text-center text-sm text-destructive">
                    Не удалось загрузить комментарии.
                </div>
            )}

            {comments.map((comment) => (
                <div key={comment.id} className="border-b border-border/50 pb-2 last:border-b-0">
                    <CommentNode comment={comment} />
                </div>
            ))}

            {hasNextPage && (
                <div ref={ref} className="flex items-center justify-center py-8">
                    {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                </div>
            )}

            {!hasNextPage && comments.length > 0 && (
                <div className="py-8 text-center text-sm font-medium text-muted-foreground">
                    Вы посмотрели все комментарии
                </div>
            )}
        </div>
    );
}
