"use client";

import {type ComponentType, type ReactNode, useEffect, useMemo, useState} from "react";
import {useInfiniteQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Flame, Loader2, MessageCircle, Skull, Trash2} from "lucide-react";
import {Button} from "~/components/ui/button";
import {SubmitForm} from "~/components/input-form";
import {getAuthorDisplayName, UserAvatar} from "~/components/user-avatar";
import {useAuth} from "~/hooks/use-auth";
import {useCommentMetadataBatch} from "~/hooks/use-comment-metadata-batch";
import {cn, formatCompactNumber, formatDateTime} from "~/lib/utils";
import {
    createReplyComment,
    deleteComment,
    getCommentReplies,
    setCommentReaction,
    type Comment,
    type CommentMetadataDto,
    type GetReactionsDto,
} from "~/lib/api";

const defaultReaction = "fire";

interface CommentNodeProps {
    comment: Comment;
    metadata?: CommentMetadataDto;
}

export function CommentNode({comment, metadata}: CommentNodeProps) {
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [localVisibleRepliesCount, setLocalVisibleRepliesCount] = useState(comment.visibleRepliesCount);
    const [reactions, setReactions] = useState<GetReactionsDto[]>(metadata?.reactions ?? []);
    const [deletedAt, setDeletedAt] = useState<string | null>(comment.deletedAt ?? null);

    const isDeleted = Boolean(deletedAt);
    const hasReplies = localVisibleRepliesCount > 0;
    const canReply = Boolean(user && metadata?.permissions?.canReply);
    const canDelete = metadata?.permissions?.canDelete ?? false;
    const repliesQueryKey = ["comments", comment.id, "replies"];

    useEffect(() => {
        setReactions(metadata?.reactions ?? []);
    }, [metadata?.reactions]);

    const repliesQuery = useInfiniteQuery({
        queryKey: repliesQueryKey,
        queryFn: ({pageParam}) => getCommentReplies(comment.id, {nextPageToken: pageParam ?? null}),
        enabled: isExpanded && hasReplies,
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    });

    const replies = useMemo(
        () => repliesQuery.data?.pages.flatMap((page) => page.comments) ?? [],
        [repliesQuery.data]
    );
    const replyIds = useMemo(() => replies.map((reply) => reply.id), [replies]);
    const {data: metadataByReplyId = {}} = useCommentMetadataBatch(replyIds);

    const fireReaction = reactions.find((reaction) => reaction.name === defaultReaction);
    const isFireSelected = fireReaction?.isSelected ?? false;
    const fireCount = fireReaction?.count ?? 0;

    const reactionMutation = useMutation({
        mutationFn: (shouldSelect: boolean) => setCommentReaction(comment.id, defaultReaction, shouldSelect),
        onMutate: (shouldSelect) => {
            const previousReactions = reactions;
            setReactions((current) => updateReactionSelection(current, shouldSelect));
            return {previousReactions};
        },
        onError: (_error, _shouldSelect, context) => {
            setReactions(context?.previousReactions ?? []);
        },
        onSettled: () => {
            void queryClient.invalidateQueries({queryKey: ["comments", "metadata"]});
        },
    });

    const replyMutation = useMutation({
        mutationFn: (content: string) => createReplyComment({commentId: comment.id, content}),
        onSuccess: async () => {
            setLocalVisibleRepliesCount((count) => count + 1);
            setIsReplying(false);
            setIsExpanded(true);
            await queryClient.invalidateQueries({queryKey: repliesQueryKey});
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteComment(comment.id),
        onSuccess: async () => {
            setDeletedAt(new Date().toISOString());
            setIsReplying(false);
            await queryClient.invalidateQueries({queryKey: ["comments"]});
            await queryClient.invalidateQueries({queryKey: ["comments", "metadata"]});
            await queryClient.invalidateQueries({queryKey: ["posts"]});
        },
    });

    const toggleReaction = () => {
        if (isDeleted || !user || reactionMutation.isPending) return;
        reactionMutation.mutate(!isFireSelected);
    };

    const handleDelete = () => {
        if (!canDelete || deleteMutation.isPending) return;
        if (!window.confirm("Удалить комментарий?")) return;
        deleteMutation.mutate();
    };

    return (
        <div className="relative flex flex-col pt-3">
            <div className="flex gap-3">
                <CommentRail
                    comment={comment}
                    isExpanded={isExpanded}
                    hasReplies={hasReplies}
                    onCollapse={() => setIsExpanded(false)}
                />

                <div className="min-w-0 flex-1 pb-2">
                    {isDeleted ? (
                        <DeletedCommentTombstone deletedAt={deletedAt} />
                    ) : (
                        <ActiveCommentBody
                            comment={comment}
                            canReply={canReply}
                            canDelete={canDelete}
                            fireCount={fireCount}
                            isFireSelected={isFireSelected}
                            isReactionPending={reactionMutation.isPending}
                            isDeletePending={deleteMutation.isPending}
                            onReply={() => setIsReplying((value) => !value)}
                            onReaction={toggleReaction}
                            onDelete={handleDelete}
                        />
                    )}

                    {!isExpanded && hasReplies && (
                        <ViewRepliesButton
                            visibleRepliesCount={localVisibleRepliesCount}
                            onClick={() => setIsExpanded(true)}
                        />
                    )}

                    {isReplying && user && !isDeleted && (
                        <ReplyForm
                            username={comment.author.isDeleted ? undefined : comment.author.username}
                            onCancel={() => setIsReplying(false)}
                            onSubmit={(content) => replyMutation.mutateAsync(content).then(() => undefined)}
                        />
                    )}
                </div>
            </div>

            {isExpanded && (
                <RepliesBranch
                    replies={replies}
                    metadataByReplyId={metadataByReplyId}
                    hasNextPage={Boolean(repliesQuery.hasNextPage)}
                    isFetchingNextPage={repliesQuery.isFetchingNextPage}
                    status={repliesQuery.status}
                    isError={repliesQuery.isError}
                    onRetry={() => void repliesQuery.refetch()}
                    onFetchNext={() => void repliesQuery.fetchNextPage()}
                    onCollapse={() => setIsExpanded(false)}
                />
            )}
        </div>
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

function CommentRail({
    comment,
    isExpanded,
    hasReplies,
    onCollapse,
}: {
    comment: Comment;
    isExpanded: boolean;
    hasReplies: boolean;
    onCollapse: () => void;
}) {
    return (
        <div className="flex w-9 shrink-0 flex-col items-center">
            {comment.deletedAt ? (
                <div className="h-9 w-9 rounded-full border border-dashed border-border bg-muted" />
            ) : (
                <UserAvatar
                    username={comment.author.username}
                    avatarUrl={comment.author.avatarUrl}
                    isDeleted={comment.author.isDeleted}
                    className="h-9 w-9 border border-background"
                />
            )}

            {isExpanded && hasReplies && (
                <button
                    type="button"
                    className="mt-2 flex w-full grow cursor-pointer justify-center"
                    onClick={onCollapse}
                    title="Свернуть ветку"
                >
                    <span className="h-full w-[2px] bg-border transition-colors hover:bg-foreground/20" />
                </button>
            )}
        </div>
    );
}

function ActiveCommentBody({
    comment,
    canReply,
    canDelete,
    fireCount,
    isFireSelected,
    isReactionPending,
    isDeletePending,
    onReply,
    onReaction,
    onDelete,
}: {
    comment: Comment;
    canReply: boolean;
    canDelete: boolean;
    fireCount: number;
    isFireSelected: boolean;
    isReactionPending: boolean;
    isDeletePending: boolean;
    onReply: () => void;
    onReaction: () => void;
    onDelete: () => void;
}) {
    return (
        <>
            <div className="flex items-center gap-1 overflow-hidden">
                <span className="truncate text-sm font-bold hover:underline">
                    {getAuthorDisplayName(comment.author)}
                </span>
                <span className="text-xs text-muted-foreground" title={formatDateTime(comment.createdAt)}>
                    · {formatDateTime(comment.createdAt)}
                </span>
            </div>

            <div className="mt-0.5 break-words text-[15px] leading-snug text-foreground">
                {comment.content}
            </div>

            <div className="mt-2 flex items-center gap-4 text-muted-foreground">
                {canReply && (
                    <CommentActionButton
                        icon={MessageCircle}
                        label="Ответить"
                        hoverClass="hover:text-blue-500"
                        iconHoverClass="group-hover:bg-blue-500/10"
                        onClick={onReply}
                    />
                )}

                <CommentActionButton
                    icon={Flame}
                    label={formatCompactNumber(fireCount)}
                    active={isFireSelected}
                    disabled={!canReply || isReactionPending}
                    hoverClass="hover:text-orange-500"
                    iconHoverClass="group-hover:bg-orange-500/10"
                    iconClass={isFireSelected ? "fill-current text-orange-500" : undefined}
                    onClick={onReaction}
                />

                {canDelete && (
                    <CommentActionButton
                        icon={Trash2}
                        label="Удалить"
                        disabled={isDeletePending}
                        hoverClass="hover:text-destructive"
                        iconHoverClass="group-hover:bg-destructive/10"
                        onClick={onDelete}
                    />
                )}
            </div>
        </>
    );
}

function CommentActionButton({
    icon: Icon,
    label,
    active,
    disabled,
    hoverClass,
    iconClass,
    iconHoverClass,
    onClick,
}: {
    icon: ComponentType<{className?: string}>;
    label: string;
    active?: boolean;
    disabled?: boolean;
    hoverClass: string;
    iconClass?: string;
    iconHoverClass: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
                "group flex items-center gap-1.5 transition-colors disabled:cursor-default disabled:opacity-60",
                hoverClass,
                active && "text-orange-500"
            )}
        >
            <span className={cn("rounded-full p-1.5", iconHoverClass)}>
                <Icon className={cn("h-4 w-4", iconClass)} />
            </span>
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
}

function ViewRepliesButton({
    visibleRepliesCount,
    onClick,
}: {
    visibleRepliesCount: number;
    onClick: () => void;
}) {
    const repliesCount = visibleRepliesCount;

    return (
        <Button
            variant="link"
            onClick={onClick}
            className="mt-1 flex h-auto items-center gap-3 p-0 text-sm font-medium text-primary hover:no-underline"
        >
            <span className="inline-block h-0.5 w-6 bg-border" />
            Посмотреть ответы ({formatCompactNumber(repliesCount)})
        </Button>
    );
}

function ReplyForm({
    username,
    onCancel,
    onSubmit,
}: {
    username?: string;
    onCancel: () => void;
    onSubmit: (content: string) => Promise<void>;
}) {
    return (
        <div className="mt-3 animate-in rounded-xl border bg-background p-2 shadow-sm fade-in slide-in-from-top-2">
            <SubmitForm
                autoFocus
                onCancel={onCancel}
                onSubmit={onSubmit}
                placeholder={username ? `Ответить ${username}...` : "Написать ответ..."}
                submitLabel="Ответить"
                compact
            />
        </div>
    );
}

function RepliesBranch({
    replies,
    metadataByReplyId,
    hasNextPage,
    isFetchingNextPage,
    status,
    isError,
    onRetry,
    onFetchNext,
    onCollapse,
}: {
    replies: Comment[];
    metadataByReplyId: Record<string, CommentMetadataDto>;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    status: "error" | "success" | "pending";
    isError: boolean;
    onRetry: () => void;
    onFetchNext: () => void;
    onCollapse: () => void;
}) {
    return (
        <div className="flex flex-col">
            {status === "pending" && (
                <div className="flex items-center gap-2 py-2 pl-[48px] text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Загрузка...
                </div>
            )}

            {isError && (
                <div className="py-2 pl-[48px] text-sm text-destructive">
                    Ошибка. <button onClick={onRetry} className="underline">Повторить</button>
                </div>
            )}

            {replies.map((reply, index) => (
                <ReplyNodeShell
                    key={reply.id}
                    isLast={index === replies.length - 1 && !hasNextPage}
                    onCollapse={onCollapse}
                >
                    <CommentNode comment={reply} metadata={metadataByReplyId[reply.id]} />
                </ReplyNodeShell>
            ))}

            {hasNextPage && (
                <Button
                    variant="link"
                    disabled={isFetchingNextPage}
                    onClick={onFetchNext}
                    className="ml-12 mt-1 h-auto justify-start p-0 text-sm font-medium text-primary hover:no-underline"
                >
                    {isFetchingNextPage ? "Загрузка..." : "Показать еще ответы"}
                </Button>
            )}
        </div>
    );
}

function ReplyNodeShell({
    isLast,
    onCollapse,
    children,
}: {
    isLast: boolean;
    onCollapse: () => void;
    children: ReactNode;
}) {
    return (
        <div className="relative pl-12">
            <button
                type="button"
                className={cn(
                    "absolute left-[10px] top-0 flex w-4 cursor-pointer justify-center",
                    isLast ? "h-[30px]" : "bottom-0"
                )}
                onClick={onCollapse}
                title="Свернуть ветку"
            >
                <span className="h-full w-[2px] bg-border transition-colors hover:bg-foreground/20" />
            </button>
            <div className="absolute left-[18px] top-[30px] h-[2px] w-[30px] bg-border" />
            {children}
        </div>
    );
}

function DeletedCommentTombstone({deletedAt}: {deletedAt?: string | null}) {
    return (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <Skull className="h-4 w-4" />
                <div className="font-medium text-foreground">Комментарий удален</div>
            </div>
            {deletedAt && <div className="mt-1">{formatDateTime(deletedAt)}</div>}
        </div>
    );
}
