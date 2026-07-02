"use client";

import React from "react";
import {useQuery} from "@tanstack/react-query";
import {Loader2} from "lucide-react";
import {ThreadMainPost, ThreadNode} from "@/components/tread-node";
import {BackButton} from "@/components/back-button";
import {PostCard} from "@/components/post-card";
import {SubmitForm} from "@/components/input-form";
import {CommentFeed} from "@/components/comment-feed";
import {useAuth} from "@/hooks/use-auth";
import {client, createPost} from "@/lib/api";
import {useRouter} from "next/navigation";
import {usePostReactionsBatch} from "@/hooks/use-post-reactions-batch";

export default function PostThreadPage({params}: {params: Promise<{id: string}>}) {
    const {user} = useAuth();
    let router = useRouter();
    const resolvedParams = React.use(params);
    const postId = resolvedParams.id;

    const {data, status} = useQuery({
        queryKey: ["posts", postId, "thread"],
        queryFn: async () => {
            const {data, error} = await client.GET("/v1/posts/{post}/thread", {
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

            if (!data) {
                throw new Error("Failed to load post thread");
            }

            return data;
        },
        enabled: postId.length > 0,
    });

    const threadPosts = data ? data.slice(0, data.length - 1) : [];
    const mainPost = data ? data[data.length - 1] : undefined;
    const postIds = React.useMemo(() => data?.map((post) => post.id) ?? [], [data]);
    const {data: reactionsByPostId = {}} = usePostReactionsBatch(postIds);


    const handleCreatePost = async (content: string) => {
        if (!mainPost)
            return;
        let post = await createPost({content, parentPostId: mainPost.id});
        router.push(`/p/${post.id}`);
    };



    return (
        <div className="flex min-h-screen flex-col pb-20">
            <div className="sticky top-14 z-40 my-2 flex items-center gap-4 border-b bg-background/95 px-2 py-3 backdrop-blur">
                <BackButton />
                <h2 className="text-xl font-bold">Тред</h2>
            </div>

            {status === "pending" ? (
                <div className="flex min-h-[50vh] items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : status === "error" || !mainPost ? (
                <div className="rounded-3xl border border-dashed p-10 text-center text-destructive">
                    Не удалось загрузить тред.
                </div>
            ) : (
                <div className="mt-6 flex flex-col sm:rounded-2xl">
                    {threadPosts.map((post) => (
                        <ThreadNode
                            key={post.id}
                            post={post}
                            isLast={false}
                            initialReactions={reactionsByPostId[post.id] ?? []}
                        />
                    ))}

                    <ThreadMainPost post={mainPost} showLineAbove={threadPosts.length > 0}>
                        <PostCard
                            post={mainPost}
                            showAvatar={false}
                            initialReactions={reactionsByPostId[mainPost.id] ?? []}
                        />
                    </ThreadMainPost>
                    {user && (
                        <SubmitForm
                            placeholder="Опубликуйте ваш ответ"
                            submitLabel="Ответить"
                            onSubmit={handleCreatePost}
                        />
                    )}

                    <div className="flex flex-col">
                        <div className="border-b bg-muted/30 px-4 py-2">
                            <span className="text-sm font-medium text-muted-foreground md:text-lg">
                                Комментарии
                            </span>
                        </div>

                        <div className="divide-y divide-border">
                            {!mainPost.isCommentsEnabled ? (
                                <div className="p-10 text-center italic text-muted-foreground">
                                    Комментарии выключены!
                                </div>
                            ) : (
                                <CommentFeed postId={postId} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
