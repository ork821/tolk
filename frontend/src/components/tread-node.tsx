"use client";

import React, {useState} from "react";
import Link from "next/link";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {ExternalLink, Flame, MessageCircle, MoreHorizontal, Repeat2} from "lucide-react";
import {cn, formatCompactNumber} from "@/lib/utils";
import type {PostCardProps} from "@/components/post-card";

interface ThreadNodeProps {
    post: PostCardProps;
    isLast?: boolean;
}

export function ThreadNode({post, isLast = false}: ThreadNodeProps) {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLiked(!liked);
        setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
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
                alert("Ссылка на пост скопирована в буфер обмена.");
            } catch (error) {
                console.error("Не удалось скопировать ссылку", error);
            }
        }
    };

    return (
        <div className="relative flex cursor-pointer gap-4 p-4 transition-colors hover:bg-accent/5">
            <ThreadRail post={post} showLineBelow={!isLast}/>

            <div className="min-w-0 flex-1 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                        <Link
                            href={`/u/${post.authorUsername}`}
                            className="truncate font-bold hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {post.authorDisplayName}
                        </Link>
                        <span className="truncate text-sm text-muted-foreground">@{post.authorUsername}</span>
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreHorizontal className="h-4 w-4"/>
                    </Button>
                </div>

                <div className="mt-1 break-words text-[15px] leading-normal text-foreground">
                    {post.content}
                </div>

                <div className="mt-3 flex max-w-md justify-start gap-10 text-muted-foreground">
                    <ActionIcon icon={MessageCircle} count={post.commentsCount} hoverClass="hover:text-blue-500 hover:bg-blue-500/10"/>
                    <ActionIcon icon={Repeat2} count={post.repliesCount} hoverClass="hover:text-green-500 hover:bg-green-500/10"/>
                    {/*<ActionIcon*/}
                    {/*    icon={Flame}*/}
                    {/*    count={likeCount}*/}
                    {/*    onClick={handleLike}*/}
                    {/*    hoverClass="hover:text-orange-500 hover:bg-orange-500/10"*/}
                    {/*    iconClass={cn(liked && "fill-current text-orange-500")}*/}
                    {/*/>*/}
                    <ActionIcon icon={ExternalLink} onClick={handleShare} hoverClass="hover:text-blue-500 hover:bg-blue-500/10"/>
                </div>
            </div>
        </div>
    );
}

export function ThreadMainPost({
    post,
    children,
    showLineAbove = false,
}: {
    post: PostCardProps;
    children: React.ReactNode;
    showLineAbove?: boolean;
}) {
    return (
        <div className="relative flex gap-4 p-4">
            <ThreadRail post={post} showLineAbove={showLineAbove} showLineBelow={false}/>
            <div className="min-w-0 flex-1">
                {children}
            </div>
        </div>
    );
}

function ThreadRail({
    post,
    showLineAbove = false,
    showLineBelow = false,
}: {
    post: PostCardProps;
    showLineAbove?: boolean;
    showLineBelow?: boolean;
}) {
    return (
        <div className="relative flex w-10 shrink-0 justify-center">
            {showLineAbove && (
                <div className="absolute left-1/2 top-[-2.25rem] h-[calc(2.25rem+20px)] w-0.5 -translate-x-1/2 bg-border"/>
            )}
            {showLineBelow && (
                <div className="absolute left-1/2 top-5 bottom-[-2.25rem] w-0.5 -translate-x-1/2 bg-border"/>
            )}
            <Avatar className="relative z-10 size-10 shrink-0">
                <AvatarFallback>{post.authorDisplayName[0]}</AvatarFallback>
            </Avatar>
        </div>
    );
}

function ActionIcon({icon: Icon, count, hoverClass, iconClass, onClick}: any) {
    return (
        <div
            className="group flex items-center gap-1 transition-colors"
            onClick={onClick || ((e) => e.stopPropagation())}
        >
            <div className={cn("rounded-full p-2 transition-colors", hoverClass)}>
                <Icon className={cn("h-4.5 w-4.5", iconClass)}/>
            </div>
            {count !== undefined && (
                <span className={cn("text-xs group-hover:text-current", iconClass && "text-orange-500")}>
                    {formatCompactNumber(count)}
                </span>
            )}
        </div>
    );
}
