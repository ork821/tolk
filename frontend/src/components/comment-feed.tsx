"use client";

import {useCallback, useEffect, useState} from "react";
import {useInView} from "react-intersection-observer";
import {Comment, CommentNode} from "./comment-node";
import {Loader2} from "lucide-react";
import {commentsApi} from "@/lib/api";

interface CommentFeedProps {
    postId: number;
}

export function CommentFeed({postId}: CommentFeedProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [page, setPage] = useState<string>();
    const [hasMore, setHasMore] = useState(true);
    const [isFetching, setIsFetching] = useState(false);

    const {ref, inView} = useInView({
        rootMargin: "400px",
        threshold: 0,
    });

    const loadMore = useCallback(async () => {
        if (!hasMore || isFetching) return;

        setIsFetching(true);

        try {
            const response = await commentsApi.getComments(postId, page);

            if (response.comments.length === 0) {
                setHasMore(false);
            } else {
                setComments((prev) => [...prev, ...response.comments]);
                setPage(response.nextPageToken);
            }
        } catch (error) {
            console.error("Ошибка при загрузке комментариев:", error);
        } finally {
            setIsFetching(false);
        }
    }, [page, hasMore, isFetching, postId]);

    useEffect(() => {
        if (inView) {
            loadMore();
        }
    }, [inView, loadMore]);

    return (
        <div className="flex flex-col px-4 pb-4">
            {comments.map((comment) => (
                <div key={comment.id} className="border-b border-border/50 pb-2 last:border-b-0">
                    <CommentNode comment={comment} />
                </div>
            ))}

            {hasMore && (
                <div ref={ref} className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {!hasMore && comments.length > 0 && (
                <div className="py-8 text-center text-sm font-medium text-muted-foreground">
                    Вы посмотрели все комментарии
                </div>
            )}
        </div>
    );
}
