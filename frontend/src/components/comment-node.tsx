"use client";

import {useState} from "react";
import {useInfiniteQuery} from "@tanstack/react-query";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Flame, Loader2, MessageCircle} from "lucide-react";
import {cn, formatCompactNumber} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {SubmitForm} from "@/components/input-form";
import {api} from "@/lib/api";
import type {Comment} from "@/lib/api";
import {mapCommentsPageToComments} from "@/lib/api/comment-mappers";

export type {Comment} from "@/lib/api";

export function CommentNode({comment}: {comment: Comment}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const currentUser = {displayName: "Ninja", avatarUrl: "https://github.com/shadcn.png"};
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isError,
        refetch,
        status,
    } = useInfiniteQuery({
        queryKey: ["comments", comment.id, "replies"],
        queryFn: async ({pageParam}) => {
            const {data, error} = await api.GET("/v1/comments/{comment}/replies", {
                params: {
                    path: {
                        comment: comment.id,
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
        enabled: isExpanded && comment.replyCount > 0,
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage?.nextPageToken ?? undefined,
    });

    const hasReplies = comment.replyCount > 0;
    const replies = data?.pages.flatMap(mapCommentsPageToComments) ?? [];

    return (
        <div className="relative flex flex-col pt-3">
            <div className="flex gap-3">
                <div className="flex w-9 shrink-0 flex-col items-center">
                    <Avatar className="h-9 w-9 border border-background">
                        <AvatarImage src={comment.authorAvatar} alt={comment.authorUsername} />
                        <AvatarFallback>{comment.authorDisplayName[0]}</AvatarFallback>
                    </Avatar>

                    {isExpanded && hasReplies && (
                        <div
                            className="mt-2 flex w-full grow cursor-pointer justify-center"
                            onClick={() => setIsExpanded(false)}
                            title="Свернуть ветку"
                        >
                            <div className="h-full w-[2px] bg-border transition-colors hover:bg-foreground/20" />
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1 pb-2">
                    <div className="flex items-center gap-1 overflow-hidden">
                        <span className="cursor-pointer truncate text-sm font-bold hover:underline">
                            {comment.authorDisplayName}
                        </span>
                        <span className="text-xs text-muted-foreground">· {comment.createdAt}</span>
                    </div>
                    <div className="mt-0.5 break-words text-[15px] leading-snug text-foreground">
                        {comment.content}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-muted-foreground">
                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className="group flex items-center gap-1.5 transition-colors hover:text-blue-500"
                        >
                            <div className="rounded-full p-1.5 group-hover:bg-blue-500/10">
                                <MessageCircle className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium">Ответить</span>
                        </button>

                        <button className="group flex items-center gap-1.5 transition-colors hover:text-orange-500">
                            <div className="rounded-full p-1.5 group-hover:bg-orange-500/10">
                                <Flame className="h-4 w-4 text-orange-500" />
                            </div>
                            <span className="text-xs font-medium">{formatCompactNumber(0)}</span>
                        </button>
                    </div>

                    {!isExpanded && hasReplies && (
                        <Button
                            variant="link"
                            onClick={() => setIsExpanded(true)}
                            className="mt-1 flex h-auto items-center gap-3 p-0 text-sm font-medium text-primary hover:no-underline"
                        >
                            <div className="inline-block h-0.5 w-6 bg-border" />
                            Посмотреть ответы ({formatCompactNumber(comment.replyCount)})
                        </Button>
                    )}

                    {isReplying && currentUser && (
                        <div className="mt-3 animate-in rounded-xl border bg-background p-2 shadow-sm fade-in slide-in-from-top-2">
                            <SubmitForm
                                autoFocus
                                onCancel={() => setIsReplying(false)}
                                placeholder={`Ответить ${comment.authorUsername}...`}
                                compact
                            />
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="flex flex-col">
                    {status === "pending" && (
                        <div className="flex items-center gap-2 py-2 pl-[48px] text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Загрузка...
                        </div>
                    )}

                    {isError && (
                        <div className="py-2 pl-[48px] text-sm text-destructive">
                            Ошибка. <button onClick={() => refetch()} className="underline">Повторить</button>
                        </div>
                    )}

                    {replies.map((reply, index) => {
                        const isLast = index === replies.length - 1 && !hasNextPage;

                        return (
                            <div key={reply.id} className="relative pl-12">
                                <div
                                    className={cn(
                                        "absolute left-[10px] top-0 flex w-4 cursor-pointer justify-center",
                                        isLast ? "h-[30px]" : "bottom-0"
                                    )}
                                    onClick={() => setIsExpanded(false)}
                                    title="Свернуть ветку"
                                >
                                    <div className="h-full w-[2px] bg-border transition-colors hover:bg-foreground/20" />
                                </div>
                                <div className="absolute left-[18px] top-[30px] h-[2px] w-[30px] bg-border" />
                                <CommentNode comment={reply} />
                            </div>
                        );
                    })}

                    {hasNextPage && (
                        <Button
                            variant="link"
                            disabled={isFetchingNextPage}
                            onClick={() => fetchNextPage()}
                            className="ml-12 mt-1 h-auto justify-start p-0 text-sm font-medium text-primary hover:no-underline"
                        >
                            {isFetchingNextPage ? "Загрузка..." : "Показать еще ответы"}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
