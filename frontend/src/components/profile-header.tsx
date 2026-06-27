"use client";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/hooks/use-auth";
import {formatCompactNumber} from "@/lib/utils";
import Link from "next/link";
import {useState} from "react";
import {client} from "@/lib/api";

export interface ProfileUser {
    displayName: string;
    username: string;
    description: string;
    stats: {
        following: number;
        followers: number;
    };
    avatarUrl?: string;
    coverUrl?: string;
    isSubscribed?: boolean;
}

export function ProfileHeader({ user, isCurrentUser = false, isSubscribedProp = false }: {
    user: ProfileUser,
    isCurrentUser?: boolean,
    isSubscribedProp?: boolean
}) {
    const { isAuthenticated } = useAuth();
    
    // Имитируем локальное состояние подписки для мгновенного фидбека (Optimistic UI)
    const [isSubscribed, setIsSubscribed] = useState(isSubscribedProp);
    const [followersCount, setFollowersCount] = useState(user.stats.followers);

    const handleToggleSubscribe = async () => {
        const nextSubscribed = !isSubscribed;
        setIsSubscribed(nextSubscribed);
        setFollowersCount(prev => isSubscribed ? prev - 1 : prev + 1);

        try {
            if (nextSubscribed) {
                await client.POST("/v1/users/{username}/follow", {
                    params: {
                        path: {
                            username: user.username,
                            version: "v1"
                        }
                    }
                });
            } else {
                await client.DELETE("/v1/users/{username}/follow", {
                    params: {
                        path: {
                            username: user.username,
                            version: "v1"
                        }
                    }
                })
            }
        } catch (error) {
            setIsSubscribed(!nextSubscribed);
            setFollowersCount(prev => nextSubscribed ? prev - 1 : prev + 1);
            console.error("Не удалось изменить подписку", error);
        }
    };

    return (
        <div className="flex flex-col bg-background overflow-hidden rounded-3xl border border-border/50 shadow-sm">
            {/* 1. Обложка (Баннер) */}
            <div className="h-32 sm:h-48 w-full relative overflow-hidden bg-muted">
                {user.coverUrl ? (
                    <img src={user.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-linear-to-tr from-orange-500/20 via-primary/10 to-primary/30" />
                )}
            </div>

            <div className="px-4 pb-4 bg-background">
                {/* 2. Аватарка и кнопка действия */}
                <div className="flex justify-between items-start">
                    <Avatar className="relative z-10 h-24 w-24 sm:h-32 sm:w-32 -mt-12 sm:-mt-16 ring-4 ring-background bg-background shadow-lg">
                        <AvatarImage src={user.avatarUrl} alt={user.username} className="object-cover" />
                        <AvatarFallback className="text-2xl">{user.displayName[0]}</AvatarFallback>
                    </Avatar>

                    <div className="mt-3 flex gap-2">
                        {isCurrentUser ? (
                            <Button variant="outline" className="rounded-full font-bold shadow-sm active:scale-95 transition-all">
                                Редактировать профиль
                            </Button>
                        ) : isAuthenticated ? (
                            <Button 
                                variant={isSubscribed ? "outline" : "default"}
                                onClick={handleToggleSubscribe}
                                className="rounded-full font-bold px-6 shadow-md active:scale-95 transition-all"
                            >
                                {isSubscribed ? "Отписаться" : "Подписаться"}
                            </Button>
                        ) : null}
                    </div>
                </div>

                {/* 3. Информация о пользователе (Био) */}
                <div className="mt-3 flex flex-col gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold leading-none tracking-tight">{user.displayName}</h1>
                        <p className="text-muted-foreground mt-1.5 font-medium">@{user.username}</p>
                    </div>

                    <p className="text-[15px] leading-snug whitespace-pre-wrap text-foreground/90">{user.description}</p>


                    {/* Статистика */}
                    <div className="flex items-center gap-6 text-sm mt-1">
                        <Link href={`/u/${user.username}/following`} className="hover:underline transition-all">
                            <span className="font-bold text-foreground">{formatCompactNumber(user.stats.following)}</span>{" "}
                            <span className="text-muted-foreground">Подписок</span>
                        </Link>
                        <Link href={`/u/${user.username}/followers`} className="hover:underline transition-all">
                            <span className="font-bold text-foreground">{formatCompactNumber(followersCount)}</span>{" "}
                            <span className="text-muted-foreground">Подписчиков</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
