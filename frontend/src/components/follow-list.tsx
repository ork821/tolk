"use client";

import Link from "next/link";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {setUserFollow, type FollowListUser} from "@/lib/api";
import {cn} from "@/lib/utils";
import {useAuth} from "@/hooks/use-auth";
import {Skeleton} from "@/components/ui/skeleton";
import {UserAvatar} from "@/components/user-avatar";

interface FollowListProps {
    users: FollowListUser[];
}

function FollowListItem({ user }: { user: FollowListUser }) {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(user.isSubscribed ?? true);
    const [isPending, setIsPending] = useState(false);

    const handleToggle = async () => {
        if (isPending) return;

        const nextValue = !isSubscribed;
        setIsSubscribed(nextValue);
        setIsPending(true);

        try {
            await setUserFollow(user.username, nextValue);
        } catch (error) {
            setIsSubscribed(!nextValue);
            console.error("Не удалось изменить подписку", error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="flex gap-3 border-b border-border/60 p-4 last:border-b-0">
            <Link href={`/u/${user.username}`} className="shrink-0">
                <UserAvatar username={user.username} avatarUrl={user.avatarUrl} className="size-12" />
            </Link>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <Link
                            href={`/u/${user.username}`}
                            className="block truncate font-bold leading-tight hover:underline"
                        >
                            {user.displayName}
                        </Link>
                        <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
                    </div>

                    {!isAuthLoading && isAuthenticated && (
                        <Button
                            variant={isSubscribed ? "outline" : "default"}
                            size="sm"
                            disabled={isPending}
                            onClick={handleToggle}
                            className={cn(
                                "rounded-full px-4 font-bold",
                                isSubscribed && "hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            )}
                        >
                            {isSubscribed ? "Отписаться" : "Подписаться"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function FollowList({ users }: FollowListProps) {
    if (users.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed bg-muted/10 p-10 text-center text-muted-foreground">
                Список пока пуст.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
            {users.map((user) => (
                <FollowListItem key={user.username} user={user} />
            ))}
        </div>
    );
}

export function FollowListSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="flex gap-3 border-b border-border/60 p-4 last:border-b-0">
                    <Skeleton className="size-12 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-8 w-28 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            ))}
        </div>
    );
}
