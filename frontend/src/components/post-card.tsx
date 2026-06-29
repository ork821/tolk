"use client";

import React, {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ExternalLink, Flame, MessageCircle, MoreHorizontal, Repeat2} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader} from "@/components/ui/card";
import {client, type Post} from "@/lib/api";
import {cn, formatCompactNumber} from "@/lib/utils";

export type PostCardProps = Post;

const defaultReaction = "like";

export function PostCard({post, showAvatar = true}: { post: PostCardProps; showAvatar?: boolean }) {
    const router = useRouter();
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    const handleLike = async () => {
        const nextLiked = !liked;
        setLiked(nextLiked);
        setLikeCount((prev) => (liked ? prev - 1 : prev + 1));

        try {
            const request = {
                params: {
                    path: {
                        post: post.id,
                        reaction: defaultReaction,
                        version: "1",
                    },
                },
            };
            const {error} = nextLiked
                ? await client.PUT("/v1/posts/{post}/reactions/{reaction}", request)
                : await client.DELETE("/v1/posts/{post}/reactions/{reaction}", request);

            if (error) {
                throw error;
            }
        } catch (error) {
            setLiked(!nextLiked);
            setLikeCount((prev) => (nextLiked ? prev - 1 : prev + 1));
            console.error("Не удалось изменить реакцию", error);
        }
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
        <Card
            className="w-full border rounded-2xl sm:rounded-3xl hover:bg-accent/5 transition-all duration-300 cursor-pointer group z-20 text-left shadow-sm hover:shadow-md border-border/50"
            onClick={() => router.push(`/p/${post.id}`)}
        >
            <CardHeader className="flex flex-row items-start gap-4 p-4 pb-2">
                {showAvatar && (
                    <Avatar className="size-10 shrink-0">
                        <AvatarFallback>{post.authorDisplayName[0]}</AvatarFallback>
                    </Avatar>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col items-start gap-1 overflow-hidden flex-1">
                            <Link
                                href={`/u/${post.authorUsername}`}
                                className="text-lg font-bold truncate hover:underline decoration-2 underline-offset-2"
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

                    <CardFooter className="p-0 mt-3 flex justify-between max-w-md text-muted-foreground">
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
                                liked && "text-orange-500"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                void handleLike();
                            }}
                        >
                            <div className={cn(
                                "p-2 rounded-full group-hover/icon:bg-orange-500/10 group-hover/icon:text-orange-500 transition-colors",
                                liked && "text-orange-500"
                            )}>
                                <Flame className={cn("size-5", liked && "text-orange-500 fill-current")} />
                            </div>
                            <span className="text-s group-hover/icon:text-orange-500">{formatCompactNumber(likeCount)}</span>
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
