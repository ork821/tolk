"use client";

import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {ExternalLink, Flame, MessageCircle, MoreHorizontal, Repeat2} from "lucide-react";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import {cn, formatCompactNumber} from "@/lib/utils";
import React, {useState} from "react";
import {PostCardProps} from "@/components/post-card";

interface ThreadNodeProps {
    post: PostCardProps; // В реальности здесь будет типизация твоего поста
    isLast?: boolean; // Если true, не рисуем линию вниз
    isMain?: boolean; // Если true, делаем шрифт крупнее (это пост, на который мы перешли)
}

export function ThreadNode({ post, isLast = false}: ThreadNodeProps) {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const postUrl = `${window.location.origin}/p/${post.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Пост от ${post.authorDisplayName}`,
                    text: `Смотри, что пишет ${post.authorDisplayName}: ${post.content.substring(0, 50)}...`,
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
        <div className={cn(
            "relative flex gap-4 p-4 hover:bg-accent/5 transition-colors cursor-pointer"
        )}>
            {/* Левая колонка: Аватар и соединительная линия */}
            <div className="flex flex-col items-center">
                <Avatar className="size-10 shrink-0">
                    <AvatarFallback>{post.authorDisplayName[0]}</AvatarFallback>
                </Avatar>

                {/* Вертикальная линия треда */}
                {!isLast && (
                    <div className="w-0.5 bg-border h-full absolute top-14 bottom-0 z-0" />
                )}
            </div>

            {/* Правая колонка: Контент */}
            <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 overflow-hidden">
                        <Link
                            href={`/u/${post.authorUsername}`}
                            className="font-bold truncate hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {post.authorDisplayName}
                        </Link>
                        <span className="text-muted-foreground truncate text-sm">
                            @{post.authorUsername}
                        </span>
                        <span className="text-muted-foreground text-sm">·</span>
                        <span className="text-muted-foreground text-sm">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>

                <div className={cn(
                    "mt-1 text-foreground break-words",
                    "text-[15px] leading-normal"
                )}>
                    {post.content}
                </div>

                {/* Панель действий */}
                <div className="flex justify-between max-w-md mt-3 text-muted-foreground">
                    <ActionIcon icon={MessageCircle} count={post.commentsCount} hoverClass="hover:text-blue-500 hover:bg-blue-500/10" />
                    <ActionIcon icon={Repeat2} count={post.repliesCount} hoverClass="hover:text-green-500 hover:bg-green-500/10" />
                    <ActionIcon 
                        icon={Flame} 
                        count={likeCount} 
                        onClick={handleLike}
                        hoverClass="hover:text-orange-500 hover:bg-orange-500/10" 
                        iconClass={cn(liked && "text-orange-500 fill-current")} 
                    />
                    <ActionIcon icon={ExternalLink} onClick={handleShare} hoverClass="hover:text-blue-500 hover:bg-blue-500/10" />
                </div>
            </div>
        </div>
    );
}

// Вспомогательный компонент для кнопок лайков/репостов
function ActionIcon({ icon: Icon, count, hoverClass, iconClass, onClick }: any) {
    return (
        <div 
            className="flex items-center gap-1 group transition-colors" 
            onClick={onClick || ((e) => e.stopPropagation())}
        >
            <div className={cn("p-2 rounded-full transition-colors", hoverClass)}>
                <Icon className={cn("h-4.5 w-4.5", iconClass)} />
            </div>
            {count !== undefined && (
                <span className={cn("text-xs group-hover:text-current", iconClass && "text-orange-500")}>
                    {formatCompactNumber(count)}
                </span>
            )}
        </div>
    );
}
