"use client";

import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {PostCard} from "@/components/post-card";
import {PostCardSkeleton} from "@/components/post-card-skeleton";
import {formatCompactNumber} from "@/lib/utils";
import {postsApi, usersApi} from "@/lib/api";

export default function TrendsPage() {
    const {data: posts = [], status: postsStatus} = useQuery({
        queryKey: ["trends", "posts"],
        queryFn: (params) => postsApi.getUserPosts("react_ninja", {}),
    });
    const {data: authors = []} = useQuery({
        queryKey: ["trends", "authors"],
        queryFn: usersApi.getTrendingAuthors,
    });

    return (
        <div className="flex w-full flex-col gap-6 pb-20">
            <section className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight">Тренды</h1>
                <p className="text-muted-foreground">
                    Горячие обсуждения и авторы, на которых сейчас стоит обратить внимание.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold">Популярные посты</h2>
                    <span className="text-sm font-medium text-muted-foreground">Сегодня</span>
                </div>

                {/*<div className="flex flex-col gap-4">*/}
                {/*    {postsStatus === "pending" ? (*/}
                {/*        <>*/}
                {/*            <PostCardSkeleton />*/}
                {/*            <PostCardSkeleton />*/}
                {/*            <PostCardSkeleton />*/}
                {/*        </>*/}
                {/*    ) : (*/}
                {/*        posts.map((post) => (*/}
                {/*            <PostCard key={post.id} post={post} />*/}
                {/*        ))*/}
                {/*    )}*/}
                {/*</div>*/}
            </section>

            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold">Авторы в тренде</h2>
                    <span className="text-sm font-medium text-muted-foreground">Рекомендации</span>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                    {authors.map((author) => (
                        <div
                            key={author.username}
                            className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
                        >
                            <div className="flex items-start gap-3">
                                <Link href={`/u/${author.username}`} className="shrink-0">
                                    <Avatar className="size-12">
                                        <AvatarImage src={author.avatarUrl ?? undefined} alt={author.username} />
                                        <AvatarFallback>{author.displayName[0]}</AvatarFallback>
                                    </Avatar>
                                </Link>

                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={`/u/${author.username}`}
                                        className="block truncate font-bold leading-tight hover:underline"
                                    >
                                        {author.displayName}
                                    </Link>
                                    <p className="truncate text-sm text-muted-foreground">@{author.username}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
