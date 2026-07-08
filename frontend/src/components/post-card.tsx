"use client";

import React from "react";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Check, ExternalLink, Flame, MessageCircle, Pencil, Repeat2, Trash2, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader} from "@/components/ui/card";
import {client, type Post, type PostMetadataByPostId, type PostMetadataDto} from "@/lib/api";
import {cn, formatCompactNumber} from "@/lib/utils";
import {UserAvatar} from "@/components/user-avatar";

export type PostCardProps = Post;

const defaultReaction = "fire";
const internalNavigationStorageKey = "tolk.hasInternalNavigation";

export function PostCard({
    post,
    showAvatar = true,
    metadata,
}: {
    post: PostCardProps;
    showAvatar?: boolean;
    metadata?: PostMetadataDto;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const [isDeleted, setIsDeleted] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [content, setContent] = React.useState(post.content);
    const [draftContent, setDraftContent] = React.useState(post.content);

    React.useEffect(() => {
        setContent(post.content);
        setDraftContent(post.content);
    }, [post.content]);

    const reactions = metadata?.reactions ?? [];
    const fireReaction = reactions.find((reaction) => reaction.name === defaultReaction);
    const isFireSelected = fireReaction?.isSelected ?? false;
    const fireCount = fireReaction?.count ?? 0;
    const permissions = metadata?.permissions;
    const canEdit = permissions?.canEdit ?? false;
    const canDelete = permissions?.canDelete ?? false;

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
            await queryClient.cancelQueries({queryKey: ["posts", "metadata"]});

            const previousMetadata = queryClient.getQueriesData<PostMetadataByPostId>({
                queryKey: ["posts", "metadata"],
            });

            queryClient.setQueriesData<PostMetadataByPostId>({queryKey: ["posts", "metadata"]}, (current) => {
                if (!current?.[post.id]) return current;

                const postMetadata = current[post.id];
                const currentReactions = postMetadata.reactions ?? [];
                const existing = currentReactions.find((reaction) => reaction.name === defaultReaction);
                const delta = shouldSelect ? 1 : -1;
                let nextReactions;

                if (!existing) {
                    nextReactions = [
                        ...currentReactions,
                        {
                            name: defaultReaction,
                            count: shouldSelect ? 1 : 0,
                            isSelected: shouldSelect,
                        },
                    ];
                } else {
                    nextReactions = currentReactions.map((reaction) =>
                        reaction.name === defaultReaction
                            ? {
                                ...reaction,
                                count: Math.max(0, reaction.count + delta),
                                isSelected: shouldSelect,
                            }
                            : reaction
                    );
                }

                return {
                    ...current,
                    [post.id]: {
                        ...postMetadata,
                        reactions: nextReactions,
                    },
                };
            });

            return {previousMetadata};
        },
        onError: (error, _shouldSelect, context) => {
            context?.previousMetadata?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
            console.error("Failed to change post reaction", error);
        },
        onSettled: () => {
            void queryClient.invalidateQueries({queryKey: ["posts", "metadata"]});
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (nextContent: string) => {
            const {error} = await client.PUT("/v1/posts/{post}", {
                params: {
                    path: {
                        post: post.id,
                        version: "1",
                    },
                },
                body: {
                    title: post.title,
                    type: post.contentType as 0,
                    content: nextContent,
                },
            });

            if (error) {
                throw error;
            }
        },
        onSuccess: async (_data, nextContent) => {
            setContent(nextContent);
            setDraftContent(nextContent);
            setIsEditing(false);
            await queryClient.invalidateQueries({queryKey: ["posts"]});
            await queryClient.invalidateQueries({queryKey: ["replies"]});
            await queryClient.invalidateQueries({queryKey: ["reacts"]});
        },
        onError: (error) => {
            console.error("Failed to update post", error);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const {error} = await client.DELETE("/v1/posts/{post}", {
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
        },
        onSuccess: async () => {
            setIsDeleted(true);
            await queryClient.invalidateQueries({queryKey: ["posts"]});
            await queryClient.invalidateQueries({queryKey: ["replies"]});
            await queryClient.invalidateQueries({queryKey: ["reacts"]});

            if (pathname === `/p/${post.id}`) {
                if (window.sessionStorage.getItem(internalNavigationStorageKey) === "1") {
                    window.sessionStorage.removeItem(internalNavigationStorageKey);
                    router.back();
                } else {
                    router.replace("/");
                }
            }
        },
        onError: (error) => {
            console.error("Failed to delete post", error);
        },
    });

    const handleReaction = () => {
        reactionMutation.mutate(!isFireSelected);
    };

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDraftContent(content);
        setIsEditing(true);
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDraftContent(content);
        setIsEditing(false);
    };

    const handleSaveEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextContent = draftContent.trim();
        if (nextContent.length < 10 || nextContent.length > 500 || nextContent === content || updateMutation.isPending) {
            return;
        }

        updateMutation.mutate(nextContent);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (deleteMutation.isPending) return;
        if (!window.confirm("Удалить пост?")) return;

        deleteMutation.mutate();
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

    if (isDeleted) {
        return null;
    }

    const handleOpenPost = () => {
        window.sessionStorage.setItem(internalNavigationStorageKey, "1");
        router.push(`/p/${post.id}`);
    };

    return (
        <Card
            className="w-full border rounded-2xl sm:rounded-3xl hover:bg-accent/5 transition-all duration-300 cursor-pointer group z-20 text-left shadow-sm hover:shadow-md border-border/50"
            onClick={handleOpenPost}
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

                            {canEdit && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Редактировать"
                                    className="h-8 w-8 rounded-full"
                                    onClick={handleStartEdit}
                                    disabled={updateMutation.isPending || deleteMutation.isPending}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}

                            {canDelete && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Удалить"
                                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={handleDelete}
                                    disabled={updateMutation.isPending || deleteMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <CardContent className="p-0 mt-1">
                        {isEditing ? (
                            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                <textarea
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    className="w-full min-h-24 resize-y rounded-lg border border-border bg-background px-3 py-2 text-left text-[15px] leading-normal text-foreground outline-none focus:border-primary disabled:opacity-50"
                                    maxLength={500}
                                    disabled={updateMutation.isPending}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                        disabled={updateMutation.isPending}
                                    >
                                        <X className="h-4 w-4" />
                                        Отмена
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={
                                            updateMutation.isPending ||
                                            draftContent.trim().length < 10 ||
                                            draftContent.trim().length > 500 ||
                                            draftContent.trim() === content
                                        }
                                    >
                                        <Check className="h-4 w-4" />
                                        Сохранить
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-left text-[15px] leading-normal text-foreground wrap-break-word">
                                {content}
                            </p>
                        )}
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
                                handleReaction();
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
