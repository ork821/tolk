"use client";

import React from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Loader2} from "lucide-react";
import {ThreadMainPost, ThreadNode} from "~/components/tread-node";
import {BackButton} from "~/components/back-button";
import {PostCard} from "~/components/post-card";
import {SubmitForm} from "~/components/input-form";
import {CommentFeed} from "~/components/comment-feed";
import {useAuth} from "~/hooks/use-auth";
import {client, createComment, createPost} from "~/lib/api";
import {useNavigate, useParams} from "react-router";
import {usePostMetadataBatch} from "~/hooks/use-post-metadata-batch";

export default function PostThreadPage() {
    const {user} = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const {id: postId = ""} = useParams();

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
    const {data: metadataByPostId = {}} = usePostMetadataBatch(postIds);
    const mainPostMetadata = mainPost ? metadataByPostId[mainPost.id] : undefined;
    const canReplyToPost = Boolean(user && mainPostMetadata?.permissions?.canReply);

    const handleCreatePost = async (content: string) => {
        if (!mainPost || !canReplyToPost) {
            return;
        }

        const post = await createPost({content, parentPostId: mainPost.id});
        navigate(`/p/${post.id}`);
    };

    const handleCreateComment = async (content: string) => {
        if (!mainPost) {
            return;
        }

        await createComment({postId: mainPost.id, content});
        await queryClient.invalidateQueries({queryKey: ["posts", mainPost.id, "comments"]});
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
                            initialReactions={metadataByPostId[post.id]?.reactions ?? []}
                        />
                    ))}

                    <ThreadMainPost post={mainPost} showLineAbove={threadPosts.length > 0}>
                        <PostCard
                            post={mainPost}
                            showAvatar={false}
                            metadata={mainPostMetadata}
                        />
                    </ThreadMainPost>

                    {canReplyToPost && (
                        <SubmitForm
                            placeholder="Опубликуйте ваш ответ"
                            submitLabel="Ответить"
                            onSubmit={handleCreatePost}
                        />
                    )}

                    {user && !canReplyToPost && (
                        <div className="border-t px-4 py-4 text-sm text-muted-foreground">
                            Достигнут предел глубины треда.
                        </div>
                    )}

                    <div className="mt-6 flex flex-col border-t">
                        <div className="border-b bg-muted/30 px-4 py-3">
                            <h2 className="text-base font-semibold md:text-lg">
                                Обсуждение поста
                            </h2>
                        </div>

                        {!mainPost.isCommentsEnabled ? (
                            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                                Комментарии к этому посту выключены.
                            </div>
                        ) : (
                            <>
                                {user && (
                                    <div className="border-b">
                                        <SubmitForm
                                            placeholder="Добавьте комментарий к посту"
                                            submitLabel="Комментировать"
                                            onSubmit={handleCreateComment}
                                        />
                                    </div>
                                )}

                                <div className="divide-y divide-border">
                                    <CommentFeed postId={postId} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
