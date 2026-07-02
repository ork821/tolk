"use client";

import React from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ExternalLink, Flame, MessageCircle, MoreHorizontal, Repeat2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader} from "@/components/ui/card";
import {client, type GetReactionsDto, type Post} from "@/lib/api";
import {cn, formatCompactNumber} from "@/lib/utils";
import {UserAvatar} from "@/components/user-avatar";

export type PostCardProps = Post;

const defaultReaction = "fire";

export function PostCard({
    post,
    showAvatar = true,
    initialReactions,
}: {
    post: PostCardProps;
    showAvatar?: boolean;
    initialReactions?: GetReactionsDto[];
}) {
    const router = useRouter();
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

    const handleLike = () => {
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
                alert("Ссылка на пост скопирована в буфер обмена!");
            } catch (error) {
                console.error("Не удалось скопировать ссылку", error);
            }
        }
    };

    return (
        <Card
            className="w-full border rounded-2xl sm:rounded-3xl hover:bg-accent/5 transition-all duration-300 cursor-pointer group z-20 text-left shadow-sm hover:shadow-md border-border/50"
            onClick={() => router.push(`/p/${post.id}`)}
        >
            <CardHeader className="flex flex-row items-start gap-4 p-4 pb-2">
                {showAvatar && (
                    <UserAvatar username={post.author.username} avatarUrl={post.author.avatarUrl} className="size-10 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col items-start gap-1 overflow-hidden flex-1">
                            <Link
                                href={`/u/${post.author.username}`}
                                className="text-lg font-bold truncate hover:underline decoration-2 underline-offset-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {post.author.displayName}
                            </Link>

                            <Link
                                href={`/u/${post.author.username}`}
                                className="text-muted-foreground truncate text-sm hover:text-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                @{post.author.username}
                            </Link>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-muted-foreground text-sm whitespace-nowrap">
                                {new Date(post.createdAt).toLocaleDateString()}
                            </span>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <CardContent className="p-0 mt-1">
                        <p className="text-left text-[15px] leading-normal text-foreground wrap-break-word">
                            {post.content}
                        </p>
                    </CardContent>

                    <CardFooter className="p-0 mt-3 flex justify-start gap-10 max-w-md text-muted-foreground">
                        <div className="flex items-center gap-1 group/icon">
                            <div className="p-2 rounded-full group-hover/icon:bg-blue-500/10 group-hover/icon:text-blue-500 transition-colors">
                                <MessageCircle className="size-5" />
                            </div>
                            <span className="text-s group-hover/icon:text-blue-500">{formatCompactNumber(post.commentsCount)}</span>
                        </div>

                        <div className="flex items-center gap-1 group/icon">
                            <div className="p-2 rounded-full group-hover/icon:bg-green-500/10 group-hover/icon:text-green-500 transition-colors">
                                <Repeat2 className="size-5" />
                            </div>
                            <span className="text-s group-hover/icon:text-green-500">{formatCompactNumber(post.repliesCount)}</span>
                        </div>

                        <div
                            className={cn(
                                "flex items-center gap-1 group/icon transition-colors",
                                isFireSelected && "text-orange-500"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLike();
                            }}
                        >
                            <div className={cn(
                                "p-2 rounded-full group-hover/icon:bg-orange-500/10 group-hover/icon:text-orange-500 transition-colors",
                                isFireSelected && "text-orange-500"
                            )}>
                                <Flame className={cn("size-5", isFireSelected && "text-orange-500 fill-current")} />
                            </div>
                            <span className="text-s group-hover/icon:text-orange-500">{formatCompactNumber(fireCount)}</span>
                        </div>

                        <div className="flex items-center group/icon" onClick={handleShare}>
                            <div className="p-2 rounded-full group-hover/icon:bg-blue-500/10 group-hover/icon:text-blue-500 transition-colors">
                                <ExternalLink className="size-5" />
                            </div>
                        </div>
                    </CardFooter>
                </div>
            </CardHeader>
        </Card>
    );
}
