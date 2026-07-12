"use client";

import React, {type ComponentType} from "react";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Check, ExternalLink, Flame, MessageCircle, Pencil, Repeat2, Trash2, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader} from "@/components/ui/card";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {UserAvatar} from "@/components/user-avatar";
import {client, type GetReactionsDto, type Post, type PostMetadataByPostId, type PostMetadataDto} from "@/lib/api";
import {cn, formatCompactNumber} from "@/lib/utils";

export type PostCardProps = Post;

const defaultReaction = "fire";
export const internalNavigationStorageKey = "tolk.hasInternalNavigation";

interface PostCardComponentProps {
    post: PostCardProps;
    showAvatar?: boolean;
    metadata?: PostMetadataDto;
    onClick?: () => void;
}

export function PostCard({post, showAvatar = true, metadata, onClick}: PostCardComponentProps) {
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
    const canEdit = metadata?.permissions?.canUpdate ?? false;
    const canDelete = metadata?.permissions?.canDelete ?? false;

    const reactionMutation = usePostReactionMutation(post.id, queryClient);
    const updateMutation = usePostUpdateMutation({
        post,
        queryClient,
        onUpdated: (nextContent) => {
            setContent(nextContent);
            setDraftContent(nextContent);
            setIsEditing(false);
        },
    });
    const deleteMutation = usePostDeleteMutation({
        postId: post.id,
        pathname,
        router,
        queryClient,
        onDeleted: () => setIsDeleted(true),
    });

    if (isDeleted) {
        return null;
    }

    const isClickable = Boolean(onClick);
    const isBusy = updateMutation.isPending || deleteMutation.isPending;

    return (
        <Card
            className={cn(
                "group z-20 w-full rounded-2xl border border-border/50 text-left shadow-sm transition-all duration-300 sm:rounded-3xl",
                isClickable && "cursor-pointer hover:bg-accent/5 hover:shadow-md"
            )}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-start gap-4 p-4 pb-2">
                {showAvatar && (
                    <UserAvatar
                        username={post.author.username}
                        avatarUrl={post.author.avatarUrl}
                        className="size-10 shrink-0"
                    />
                )}

                <div className="min-w-0 flex-1">
                    <PostHeader
                        post={post}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        isBusy={isBusy}
                        onEdit={(event) => {
                            event.stopPropagation();
                            setDraftContent(content);
                            setIsEditing(true);
                        }}
                        onDelete={(event) => {
                            event.stopPropagation();
                            if (deleteMutation.isPending || !window.confirm("Удалить пост?")) return;
                            deleteMutation.mutate();
                        }}
                    />

                    <CardContent className="mt-1 p-0">
                        {isEditing ? (
                            <PostEditor
                                content={content}
                                draftContent={draftContent}
                                isSaving={updateMutation.isPending}
                                onChange={setDraftContent}
                                onCancel={(event) => {
                                    event.stopPropagation();
                                    setDraftContent(content);
                                    setIsEditing(false);
                                }}
                                onSave={(event) => {
                                    event.stopPropagation();
                                    const nextContent = draftContent.trim();
                                    if (!canSavePostEdit(content, nextContent) || updateMutation.isPending) return;
                                    updateMutation.mutate(nextContent);
                                }}
                            />
                        ) : (
                            <PostContent content={content} />
                        )}
                    </CardContent>

                    <PostFooter
                        commentsCount={post.commentsCount}
                        repliesCount={post.repliesCount}
                        fireCount={fireCount}
                        isFireSelected={isFireSelected}
                        onReaction={(event) => {
                            event.stopPropagation();
                            if (reactionMutation.isPending) return;
                            reactionMutation.mutate(!isFireSelected);
                        }}
                        onShare={(event) => void sharePost(event, post)}
                    />
                </div>
            </CardHeader>
        </Card>
    );
}

function usePostReactionMutation(postId: string, queryClient: ReturnType<typeof useQueryClient>) {
    return useMutation({
        mutationFn: async (shouldSelect: boolean) => {
            const request = {
                params: {
                    path: {
                        post: postId,
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
                if (!current?.[postId]) return current;

                const postMetadata = current[postId];
                return {
                    ...current,
                    [postId]: {
                        ...postMetadata,
                        reactions: updateReactionSelection(postMetadata.reactions ?? [], shouldSelect),
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
}

function usePostUpdateMutation({
    post,
    queryClient,
    onUpdated,
}: {
    post: Post;
    queryClient: ReturnType<typeof useQueryClient>;
    onUpdated: (content: string) => void;
}) {
    return useMutation({
        mutationFn: async (nextContent: string) => {
            const {error} = await client.PUT("/v1/posts/{post}", {
                params: {
                    path: {
                        post: post.id,
                        version: "1",
                    },
                },
                body: {
                    type: post.contentType as 0,
                    content: nextContent,
                },
            });

            if (error) {
                throw error;
            }
        },
        onSuccess: async (_data, nextContent) => {
            onUpdated(nextContent);
            await invalidatePostLists(queryClient);
        },
        onError: (error) => {
            console.error("Failed to update post", error);
        },
    });
}

function usePostDeleteMutation({
    postId,
    pathname,
    router,
    queryClient,
    onDeleted,
}: {
    postId: string;
    pathname: string;
    router: ReturnType<typeof useRouter>;
    queryClient: ReturnType<typeof useQueryClient>;
    onDeleted: () => void;
}) {
    return useMutation({
        mutationFn: async () => {
            const {error} = await client.DELETE("/v1/posts/{post}", {
                params: {
                    path: {
                        post: postId,
                        version: "1",
                    },
                },
            });

            if (error) {
                throw error;
            }
        },
        onSuccess: async () => {
            onDeleted();
            await invalidatePostLists(queryClient);

            if (pathname === `/p/${postId}`) {
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
}

function PostHeader({
    post,
    canEdit,
    canDelete,
    isBusy,
    onEdit,
    onDelete,
}: {
    post: Post;
    canEdit: boolean;
    canDelete: boolean;
    isBusy: boolean;
    onEdit: (event: React.MouseEvent) => void;
    onDelete: (event: React.MouseEvent) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-2">
            <PostAuthorLinks post={post} />

            <div className="flex shrink-0 items-center gap-2">
                <PostDate createdAt={post.createdAt} updatedAt={post.updatedAt} />
                <PostOwnerControls
                    canEdit={canEdit}
                    canDelete={canDelete}
                    isBusy={isBusy}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
}

function PostAuthorLinks({post}: {post: Post}) {
    return (
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 overflow-hidden">
            <Link
                href={`/u/${post.author.username}`}
                className="truncate text-lg font-bold underline-offset-2 hover:underline decoration-2"
                onClick={(event) => event.stopPropagation()}
            >
                {post.author.displayName}
            </Link>

            <Link
                href={`/u/${post.author.username}`}
                className="truncate text-sm text-muted-foreground transition-colors hover:text-primary"
                onClick={(event) => event.stopPropagation()}
            >
                @{post.author.username}
            </Link>
        </div>
    );
}

function PostDate({createdAt, updatedAt}: {createdAt: string; updatedAt?: string | null}) {
    return (
        <div className="flex flex-col">
            <span className="whitespace-nowrap text-sm text-muted-foreground">
                {new Date(createdAt).toLocaleDateString()}
            </span>

            {updatedAt && <EditedAtLabel updatedAt={updatedAt} />}
        </div>
    );
}

function PostOwnerControls({
    canEdit,
    canDelete,
    isBusy,
    onEdit,
    onDelete,
}: {
    canEdit: boolean;
    canDelete: boolean;
    isBusy: boolean;
    onEdit: (event: React.MouseEvent) => void;
    onDelete: (event: React.MouseEvent) => void;
}) {
    if (!canEdit && !canDelete) {
        return null;
    }

    return (
        <div className="flex items-center gap-1">
            {canEdit && (
                <Button
                    variant="ghost"
                    size="icon"
                    title="Редактировать"
                    className="h-8 w-8 rounded-full"
                    onClick={onEdit}
                    disabled={isBusy}
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
                    onClick={onDelete}
                    disabled={isBusy}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

function PostContent({content}: {content: string}) {
    return (
        <p className="wrap-break-word text-left text-[15px] leading-normal text-foreground">
            {content}
        </p>
    );
}

function PostEditor({
    content,
    draftContent,
    isSaving,
    onChange,
    onCancel,
    onSave,
}: {
    content: string;
    draftContent: string;
    isSaving: boolean;
    onChange: (content: string) => void;
    onCancel: (event: React.MouseEvent) => void;
    onSave: (event: React.MouseEvent) => void;
}) {
    const nextContent = draftContent.trim();
    const canSave = canSavePostEdit(content, nextContent);

    return (
        <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
            <textarea
                value={draftContent}
                onChange={(event) => onChange(event.target.value)}
                className="min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-left text-[15px] leading-normal text-foreground outline-none focus:border-primary disabled:opacity-50"
                maxLength={500}
                disabled={isSaving}
                autoFocus
            />

            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
                    <X className="h-4 w-4" />
                    Отмена
                </Button>
                <Button size="sm" onClick={onSave} disabled={isSaving || !canSave}>
                    <Check className="h-4 w-4" />
                    Сохранить
                </Button>
            </div>
        </div>
    );
}

function PostFooter({
    commentsCount,
    repliesCount,
    fireCount,
    isFireSelected,
    onReaction,
    onShare,
}: {
    commentsCount: number;
    repliesCount: number;
    fireCount: number;
    isFireSelected: boolean;
    onReaction: (event: React.MouseEvent) => void;
    onShare: (event: React.MouseEvent) => void;
}) {
    return (
        <CardFooter className="mt-3 flex max-w-md justify-start gap-10 p-0 text-muted-foreground">
            <PostFooterStat icon={MessageCircle} count={commentsCount} hoverClass="group-hover/icon:text-blue-500" iconHoverClass="group-hover/icon:bg-blue-500/10 group-hover/icon:text-blue-500" />
            <PostFooterStat icon={Repeat2} count={repliesCount} hoverClass="group-hover/icon:text-green-500" iconHoverClass="group-hover/icon:bg-green-500/10 group-hover/icon:text-green-500" />
            <PostFooterAction
                icon={Flame}
                count={fireCount}
                active={isFireSelected}
                iconClass={isFireSelected ? "fill-current text-orange-500" : undefined}
                hoverClass="group-hover/icon:text-orange-500"
                iconHoverClass="group-hover/icon:bg-orange-500/10 group-hover/icon:text-orange-500"
                onClick={onReaction}
            />
            <PostFooterAction
                icon={ExternalLink}
                hoverClass="group-hover/icon:text-blue-500"
                iconHoverClass="group-hover/icon:bg-blue-500/10 group-hover/icon:text-blue-500"
                onClick={onShare}
            />
        </CardFooter>
    );
}

function PostFooterStat({
    icon,
    count,
    hoverClass,
    iconHoverClass,
}: {
    icon: ComponentType<{className?: string}>;
    count: number;
    hoverClass: string;
    iconHoverClass: string;
}) {
    return (
        <PostFooterAction
            icon={icon}
            count={count}
            hoverClass={hoverClass}
            iconHoverClass={iconHoverClass}
        />
    );
}

function PostFooterAction({
    icon: Icon,
    count,
    active,
    iconClass,
    hoverClass,
    iconHoverClass,
    onClick,
}: {
    icon: ComponentType<{className?: string}>;
    count?: number;
    active?: boolean;
    iconClass?: string;
    hoverClass: string;
    iconHoverClass: string;
    onClick?: (event: React.MouseEvent) => void;
}) {
    return (
        <div
            className={cn("group/icon flex items-center gap-1 transition-colors", hoverClass, active && "text-orange-500")}
            onClick={onClick}
        >
            <div className={cn("rounded-full p-2 transition-colors", iconHoverClass, active && "text-orange-500")}>
                <Icon className={cn("size-5", iconClass)} />
            </div>
            {typeof count === "number" && (
                <span className={cn("text-s", hoverClass)}>{formatCompactNumber(count)}</span>
            )}
        </div>
    );
}

function EditedAtLabel({updatedAt}: {updatedAt: string}) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className="whitespace-nowrap text-sm text-muted-foreground"
                        onClick={(event) => event.stopPropagation()}
                    >
                        изменено
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    {new Date(updatedAt).toLocaleString()}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function updateReactionSelection(reactions: GetReactionsDto[], shouldSelect: boolean) {
    const existing = reactions.find((reaction) => reaction.name === defaultReaction);
    const delta = shouldSelect ? 1 : -1;

    if (!existing) {
        return [
            ...reactions,
            {
                name: defaultReaction,
                count: shouldSelect ? 1 : 0,
                isSelected: shouldSelect,
            },
        ];
    }

    return reactions.map((reaction) =>
        reaction.name === defaultReaction
            ? {
                ...reaction,
                count: Math.max(0, reaction.count + delta),
                isSelected: shouldSelect,
            }
            : reaction
    );
}

function canSavePostEdit(currentContent: string, nextContent: string) {
    return nextContent.length >= 10 && nextContent.length <= 500 && nextContent !== currentContent;
}

async function sharePost(event: React.MouseEvent, post: Post) {
    event.stopPropagation();
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
        return;
    }

    try {
        await navigator.clipboard.writeText(postUrl);
        alert("Ссылка на пост скопирована в буфер обмена!");
    } catch (error) {
        console.error("Не удалось скопировать ссылку", error);
    }
}

async function invalidatePostLists(queryClient: ReturnType<typeof useQueryClient>) {
    await queryClient.invalidateQueries({queryKey: ["posts"]});
    await queryClient.invalidateQueries({queryKey: ["replies"]});
    await queryClient.invalidateQueries({queryKey: ["reacts"]});
}
