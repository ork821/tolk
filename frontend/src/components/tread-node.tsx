"use client";

import React from "react";
import Link from "next/link";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {ExternalLink, Flame, MessageCircle, Repeat2, Skull} from "lucide-react";
import {cn, formatCompactNumber} from "@/lib/utils";
import type {PostCardProps} from "@/components/post-card";
import {client, type GetReactionsDto} from "@/lib/api";
import {UserAvatar} from "@/components/user-avatar";

interface ThreadNodeProps {
    post: PostCardProps;
    isLast?: boolean;
    initialReactions?: GetReactionsDto[];
}

const defaultReaction = "fire";

export function ThreadNode({post, isLast = false, initialReactions}: ThreadNodeProps) {
    if (post.deletedAt) {
        return <DeletedThreadNode post={post} isLast={isLast} />;
    }

    return <ActiveThreadNode post={post} isLast={isLast} initialReactions={initialReactions} />;
}

function ActiveThreadNode({post, isLast = false, initialReactions}: ThreadNodeProps) {
    const queryClient = useQueryClient();
    const reactionsQueryKey = React.useMemo(() => ["posts", post.id, "reactions"] as const, [post.id]);

    React.useEffect(() => {
        if (initialReactions === undefined) return;

        queryClient.setQueryData<GetReactionsDto[]>(reactionsQueryKey, initialReactions);
    }, [initialReactions, queryClient, reactionsQueryKey]);

    const {data: reactions = []} = useQuery({
        queryKey: reactionsQueryKey,
        queryFn: async () => {
            const {data, error} = await client.GET("/v1/posts/{post}/reactions", {
                params: {
                    path: {
                        post: post.id,
                        version: "1",
                    },
                },
            });

            if (error) {
                throw error;
            }

            return data ?? [];
        },
        enabled: initialReactions === undefined,
        initialData: initialReactions,
    });

    const fireReaction = reactions.find((reaction) => reaction.name === defaultReaction);
    const isFireSelected = fireReaction?.isSelected ?? false;
    const fireCount = fireReaction?.count ?? 0;

    const reactionMutation = useMutation({
        mutationFn: async (shouldSelect: boolean) => {
            const request = {
                params: {
                    path: {
                        post: post.id,
                        reaction: defaultReaction,
                        version: "1",
                    },
                },
            };

            const {error} = shouldSelect
                ? await client.PUT("/v1/posts/{post}/reactions/{reaction}", request)
                : await client.DELETE("/v1/posts/{post}/reactions/{reaction}", request);

            if (error) {
                throw error;
            }
        },
        onMutate: async (shouldSelect) => {
            await queryClient.cancelQueries({queryKey: reactionsQueryKey});

            const previousReactions = queryClient.getQueryData<GetReactionsDto[]>(reactionsQueryKey);

            queryClient.setQueryData<GetReactionsDto[]>(reactionsQueryKey, (current = []) => {
                const existing = current.find((reaction) => reaction.name === defaultReaction);
                const delta = shouldSelect ? 1 : -1;

                if (!existing) {
                    return [
                        ...current,
                        {
                            name: defaultReaction,
                            count: shouldSelect ? 1 : 0,
                            isSelected: shouldSelect,
                        },
                    ];
                }

                return current.map((reaction) =>
                    reaction.name === defaultReaction
                        ? {
                            ...reaction,
                            count: Math.max(0, reaction.count + delta),
                            isSelected: shouldSelect,
                        }
                        : reaction
                );
            });

            return {previousReactions};
        },
        onError: (error, _shouldSelect, context) => {
            queryClient.setQueryData(reactionsQueryKey, context?.previousReactions);
            console.error("Failed to change post reaction", error);
        },
        onSettled: () => {
            void queryClient.invalidateQueries({queryKey: reactionsQueryKey});
        },
    });

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        reactionMutation.mutate(!isFireSelected);
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const postUrl = `${window.location.origin}/p/${post.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Пост от ${post.author.displayName}`,
                    text: `Смотри, что пишет ${post.author.displayName}: ${post.content.substring(0, 50)}...`,
                    url: postUrl,
                });
            } catch (error) {
                console.log("Шаринг отменен или произошла ошибка", error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(postUrl);
                alert("Ссылка на пост скопирована в буфер обмена.");
            } catch (error) {
                console.error("Не удалось скопировать ссылку", error);
            }
        }
    };

    return (
        <div className="relative flex gap-4 p-4 transition-colors hover:bg-accent/5">
            <ThreadRail post={post} showLineBelow={!isLast}/>

            <div className="min-w-0 flex-1 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                        <Link
                            href={`/u/${post.author.username}`}
                            className="truncate font-bold hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {post.author.displayName}
                        </Link>
                        <span className="truncate text-sm text-muted-foreground">@{post.author.username}</span>
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="mt-1 break-words text-[15px] leading-normal text-foreground">
                    {post.content}
                </div>

                <div className="mt-3 flex max-w-md justify-start gap-10 text-muted-foreground">
                    <ActionIcon icon={MessageCircle} count={post.commentsCount} hoverClass="hover:text-blue-500 hover:bg-blue-500/10"/>
                    <ActionIcon icon={Repeat2} count={post.repliesCount} hoverClass="hover:text-green-500 hover:bg-green-500/10"/>
                    <ActionIcon
                        icon={Flame}
                        count={fireCount}
                        onClick={handleLike}
                        hoverClass="hover:text-orange-500 hover:bg-orange-500/10"
                        iconClass={cn(isFireSelected && "fill-current text-orange-500")}
                    />
                    <ActionIcon icon={ExternalLink} onClick={handleShare} hoverClass="hover:text-blue-500 hover:bg-blue-500/10"/>
                </div>
            </div>
        </div>
    );
}

function DeletedThreadNode({post, isLast = false}: Pick<ThreadNodeProps, "post" | "isLast">) {
    return (
        <div className="relative flex gap-4 p-4">
            <ThreadRail post={post} showLineBelow={!isLast}/>

            <DeletedPostTombstone deletedAt={post.deletedAt} />
        </div>
    );
}

function DeletedPostTombstone({deletedAt}: {deletedAt?: string | null}) {
    return (
        <div className="min-w-0 flex-1 pb-2">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex flex-row items-center justify-start text-center">
                    <Skull />
                    <div className="font-medium text-foreground">Пост удален</div>
                </div>
                {deletedAt && (
                    <div className="mt-1">
                        {new Date(deletedAt).toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ThreadMainPost({
    post,
    children,
    showLineAbove = false,
}: {
    post: PostCardProps;
    children: React.ReactNode;
    showLineAbove?: boolean;
}) {
    if (post.deletedAt) {
        return (
            <div className="relative flex gap-4 p-4">
                <ThreadRail post={post} showLineAbove={showLineAbove} showLineBelow={false}/>
                <DeletedPostTombstone deletedAt={post.deletedAt} />
            </div>
        );
    }

    return (
        <div className="relative flex gap-4 p-4">
            <ThreadRail post={post} showLineAbove={showLineAbove} showLineBelow={false}/>
            <div className="min-w-0 flex-1">
                {children}
            </div>
        </div>
    );
}

function ThreadRail({
    post,
    showLineAbove = false,
    showLineBelow = false,
}: {
    post: PostCardProps;
    showLineAbove?: boolean;
    showLineBelow?: boolean;
}) {
    return (
        <div className="relative flex w-10 shrink-0 justify-center">
            {showLineAbove && (
                <div className="absolute left-1/2 top-[-2.25rem] h-[calc(2.25rem+20px)] w-0.5 -translate-x-1/2 bg-border"/>
            )}
            {showLineBelow && (
                <div className="absolute left-1/2 top-5 bottom-[-2.25rem] w-0.5 -translate-x-1/2 bg-border"/>
            )}
            {post.deletedAt ? (
                <div className="relative z-10 size-10 shrink-0 rounded-full border border-dashed border-border bg-muted" />
            ) : (
                <UserAvatar username={post.author.username} avatarUrl={post.author.avatarUrl} className="relative z-10 size-10 shrink-0" />
            )}
        </div>
    );
}

function ActionIcon({icon: Icon, count, hoverClass, iconClass, onClick}: any) {
    return (
        <div
            className="group flex items-center gap-1 transition-colors"
            onClick={onClick || ((e) => e.stopPropagation())}
        >
            <div className={cn("rounded-full p-2 transition-colors", hoverClass)}>
                <Icon className={cn("h-4.5 w-4.5", iconClass)}/>
            </div>
            {count !== undefined && (
                <span className={cn("text-xs group-hover:text-current", iconClass && "text-orange-500")}>
                    {formatCompactNumber(count)}
                </span>
            )}
        </div>
    );
}
