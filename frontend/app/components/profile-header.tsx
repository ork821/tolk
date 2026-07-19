"use client";

import {Link} from "react-router";
import {useState} from "react";
import {Button} from "~/components/ui/button";
import {UserAvatar} from "~/components/user-avatar";
import {useAuth} from "~/hooks/use-auth";
import {client} from "~/lib/api";
import {formatCompactNumber} from "~/lib/utils";

export interface ProfileUser {
    displayName: string;
    username: string;
    description: string;
    stats: {
        following: number;
        followers: number;
    };
    avatarUrl?: string | null;
    coverUrl?: string;
    isSubscribed?: boolean;
}

export function ProfileHeader({
    user,
    isCurrentUser = false,
    isSubscribedProp = false,
}: {
    user: ProfileUser;
    isCurrentUser?: boolean;
    isSubscribedProp?: boolean;
}) {
    const {isAuthenticated} = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(isSubscribedProp);
    const [followersCount, setFollowersCount] = useState(user.stats.followers);

    const handleToggleSubscribe = async () => {
        const nextSubscribed = !isSubscribed;
        setIsSubscribed(nextSubscribed);
        setFollowersCount((current) => current + (nextSubscribed ? 1 : -1));

        try {
            const request = {
                params: {
                    path: {
                        username: user.username,
                        version: "v1",
                    },
                },
            };

            if (nextSubscribed) {
                await client.POST("/v1/users/{username}/subscribe", request);
            } else {
                await client.DELETE("/v1/users/{username}/subscribe", request);
            }
        } catch (error) {
            setIsSubscribed(!nextSubscribed);
            setFollowersCount((current) => current + (nextSubscribed ? -1 : 1));
            console.error("Не удалось изменить подписку", error);
        }
    };

    return (
        <div className="flex flex-col overflow-hidden rounded-3xl border border-border/50 bg-background shadow-sm">
            <div className="relative h-32 w-full overflow-hidden bg-muted sm:h-48">
                {user.coverUrl ? (
                    <img src={user.coverUrl} alt="" className="h-full w-full object-cover"/>
                ) : (
                    <div className="h-full w-full bg-linear-to-tr from-orange-500/20 via-primary/10 to-primary/30"/>
                )}
            </div>

            <div className="bg-background px-4 pb-4">
                <div className="flex items-start justify-between">
                    <UserAvatar
                        username={user.username}
                        avatarUrl={user.avatarUrl}
                        className="relative z-10 -mt-12 h-24 w-24 bg-background shadow-lg ring-4 ring-background sm:-mt-16 sm:h-32 sm:w-32"
                        imageClassName="object-cover"
                        fallbackClassName="text-2xl"
                    />

                    <div className="mt-3 flex gap-2">
                        {isCurrentUser ? (
                            <Button
                                asChild
                                variant="outline"
                                className="rounded-full font-bold shadow-sm transition-all active:scale-95"
                            >
                                <Link to="/profile/update">Редактировать профиль</Link>
                            </Button>
                        ) : isAuthenticated ? (
                            <Button
                                variant={isSubscribed ? "outline" : "default"}
                                onClick={handleToggleSubscribe}
                                className="rounded-full px-6 font-bold shadow-md transition-all active:scale-95"
                            >
                                {isSubscribed ? "Отписаться" : "Подписаться"}
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div className="mt-3 flex flex-col gap-3">
                    <div>
                        <h1 className="text-xl font-extrabold leading-none tracking-tight sm:text-2xl">
                            {user.displayName}
                        </h1>
                        <p className="mt-1.5 font-medium text-muted-foreground">@{user.username}</p>
                    </div>

                    {user.description ? (
                        <p className="whitespace-pre-wrap text-[15px] leading-snug text-foreground/90">
                            {user.description}
                        </p>
                    ) : null}

                    <div className="mt-1 flex items-center gap-6 text-sm">
                        <Link to={`/u/${user.username}/following`} className="transition-all hover:underline">
                            <span className="font-bold text-foreground">
                                {formatCompactNumber(user.stats.following)}
                            </span>{" "}
                            <span className="text-muted-foreground">Подписок</span>
                        </Link>
                        <Link to={`/u/${user.username}/followers`} className="transition-all hover:underline">
                            <span className="font-bold text-foreground">
                                {formatCompactNumber(followersCount)}
                            </span>{" "}
                            <span className="text-muted-foreground">Подписчиков</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
