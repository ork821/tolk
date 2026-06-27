"use client";

import React, {useState} from "react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader} from "@/components/ui/card";
import {ExternalLink, Flame, MessageCircle, MoreHorizontal, Repeat2} from "lucide-react";
import {cn, formatCompactNumber} from "@/lib/utils";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Post, postsApi} from "@/lib/api";


export type PostCardProps = Post;

export function PostCard({post}: { post: PostCardProps }) {
    const router = useRouter();
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    // Имитация лайка (Optimistic UI)
    const handleLike = () => {
        const nextLiked = !liked;
        setLiked(nextLiked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
        postsApi.setPostReaction(post.id, nextLiked).catch((error) => {
            setLiked(!nextLiked);
            setLikeCount(prev => nextLiked ? prev - 1 : prev + 1);
            console.error("Не удалось изменить реакцию", error);
        });
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Не переходим на страницу поста при клике

        // Формируем абсолютную ссылку на пост
        const postUrl = `${window.location.origin}/p/${post.id}`;

        // Проверяем, поддерживает ли браузер Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Пост от ${post.authorDisplayName}`,
                    text: `Смотри, что пишет ${post.authorDisplayName}: ${post.content.substring(0, 50)}...`,
                    url: postUrl,
                });
            } catch (error) {
                // Пользователь мог просто закрыть окно шаринга, это нормально
                console.log("Шаринг отменен или произошла ошибка", error);
            }
        } else {
            // Запасной план (Fallback) для старых браузеров: копируем в буфер
            try {
                await navigator.clipboard.writeText(postUrl);
                // Здесь в идеале вызвать Toast (уведомление) из shadcn,
                // но пока для простоты выведем alert
                alert("Ссылка на пост скопирована в буфер обмена!");
            } catch (error) {
                console.error("Не удалось скопировать ссылку", error);
            }
        }
    };

    return (
        <Card
            className="w-full border rounded-2xl sm:rounded-3xl hover:bg-accent/5 transition-all duration-300 cursor-pointer group z-20 shadow-sm hover:shadow-md border-border/50"
            onClick={() => router.push(`/p/${post.id}`)}
        >
            <CardHeader className="flex flex-row items-start space-x-4 p-4 pb-2">
                {/* Аватарка */}
                <Avatar className="size-10 shrink-0">
                    {
                        post.authorAvatar !== null ?
                            <AvatarImage src={post.authorAvatar} alt={post.authorUsername}/> :
                            <AvatarFallback>{post.authorDisplayName[0]}</AvatarFallback>
                    }
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">

                        {/* ЛЕВАЯ ЧАСТЬ: Имя и Username */}
                        <div className="flex items-center gap-1 overflow-hidden flex-1">
                            <Link
                                href={`/u/${post.authorUsername}`}
                                className="font-bold truncate hover:underline decoration-2 underline-offset-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {post.authorDisplayName}
                            </Link>

                            <Link
                                href={`/u/${post.authorUsername}`}
                                className="text-muted-foreground truncate text-sm hover:text-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                @{post.authorUsername}
                            </Link>
                        </div>

                        {/* ПРАВАЯ ЧАСТЬ: Дата и кнопка "Еще" */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-muted-foreground text-sm whitespace-nowrap">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>

                            {/* Кнопка "Еще" */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()} // Важно: останавливаем всплытие, если нажмут на три точки
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>

                    </div>

                    {/* Текст поста */}
                    <CardContent className="p-0 mt-1">
                        <p className="text-[15px] leading-normal text-foreground wrap-break-word">
                            {post.content}
                        </p>
                    </CardContent>

                    {/* Панель действий */}
                    <CardFooter className="p-0 mt-3 flex justify-between max-w-md text-muted-foreground">
                        {/* Комментарии */}
                        <div className="flex items-center gap-1 group/icon">
                            <div
                                className="p-2 rounded-full group-hover/icon:bg-blue-500/10 group-hover/icon:text-blue-500 transition-colors">
                                <MessageCircle className="size-5"/>
                            </div>
                            <span className="text-s group-hover/icon:text-blue-500">{formatCompactNumber(post.commentsCount)}</span>
                        </div>

                        {/* Репосты */}
                        <div className="flex items-center gap-1 group/icon">
                            <div
                                className="p-2 rounded-full group-hover/icon:bg-green-500/10 group-hover/icon:text-green-500 transition-colors">
                                <Repeat2 className="size-5"/>
                            </div>
                            <span className="text-s group-hover/icon:text-green-500">{formatCompactNumber(post.repliesCount)}</span>
                        </div>

                        {/* Лайки */}
                        <div
                            className={cn(
                                "flex items-center gap-1 group/icon transition-colors",
                                liked && "text-orange-500"
                            )}
                            onClick={(e) => {
                                e.stopPropagation(); // Чтобы не срабатывал переход на страницу поста
                                handleLike();
                            }}
                        >
                            <div className={cn(
                                "p-2 rounded-full group-hover/icon:bg-orange-500/10 group-hover/icon:text-orange-500 transition-colors",
                                liked && "text-orange-500"
                            )}>
                                <Flame className={cn("size-5", liked && "text-orange-500 fill-current")}/>
                            </div>
                            <span className="text-s group-hover/icon:text-orange-500">{formatCompactNumber(likeCount)}</span>
                        </div>

                        {/* Поделиться */}
                        <div className="flex items-center group/icon" onClick={handleShare}>
                            <div
                                className="p-2 rounded-full group-hover/icon:bg-blue-500/10 group-hover/icon:text-blue-500 transition-colors">
                                <ExternalLink className={"size-5"}/>
                            </div>
                        </div>
                    </CardFooter>
                </div>
            </CardHeader>
        </Card>
    );
}
