"use client";

import {useEffect, useMemo} from "react";
import {useInfiniteQuery} from "@tanstack/react-query";
import {useInView} from "react-intersection-observer";
import {Loader2} from "lucide-react";
import {CommentNode} from "~/components/comment-node";
import {useCommentMetadataBatch} from "~/hooks/use-comment-metadata-batch";
import {client, type CommentsPageResponse} from "~/lib/api";

interface CommentFeedProps {
    postId: string;
}

async function fetchPostComments(postId: string, nextPageToken: string | null): Promise<CommentsPageResponse> {
    const {data, error} = await client.GET("/v1/posts/{post}/comments", {
        params: {
            path: {
                post: postId,
                version: "1",
            },
            query: nextPageToken ? {next_page_token: nextPageToken} : undefined,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to load comments");
    }

    return data;
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
        queryFn: ({pageParam}) => fetchPostComments(postId, pageParam ?? null),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    });

    const comments = useMemo(
        () => data?.pages.flatMap((page) => page.comments) ?? [],
        [data]
    );
    const commentIds = useMemo(() => comments.map((comment) => comment.id), [comments]);
    const {data: metadataByCommentId = {}} = useCommentMetadataBatch(commentIds);

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

    if (status === "pending") {
        return <CommentFeedLoader />;
    }

    if (status === "error") {
        return <CommentFeedMessage className="text-destructive" text="Не удалось загрузить комментарии." />;
    }

    return (
        <div className="flex flex-col px-4 pb-4">
            {comments.map((comment) => (
                <div key={comment.id} className="border-b border-border/50 pb-2 last:border-b-0">
                    <CommentNode comment={comment} metadata={metadataByCommentId[comment.id]} />
                </div>
            ))}

            {hasNextPage && (
                <div ref={ref} className="flex items-center justify-center py-8">
                    {isFetchingNextPage && (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    )}
                </div>
            )}

            {!hasNextPage && comments.length > 0 && (
                <CommentFeedMessage text="Вы посмотрели все комментарии" />
            )}
        </div>
    );
}

function CommentFeedLoader() {
    return (
        <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );
}

function CommentFeedMessage({text, className}: {text: string; className?: string}) {
    return (
        <div className={`py-8 text-center text-sm font-medium text-muted-foreground ${className ?? ""}`}>
            {text}
        </div>
    );
}
