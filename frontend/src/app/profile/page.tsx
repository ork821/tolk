"use client";

import {useEffect} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {useRouter} from "next/navigation";
import {Loader2} from "lucide-react";
import {useAuth} from "@/hooks/use-auth";
import {ProfileHeader, type ProfileUser} from "@/components/profile-header";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {PostFeed} from "@/components/post-feed";
import {SubmitForm} from "@/components/input-form";
import {createPost, getUserPosts, getUserReactedPosts, getUserReplies} from "@/lib/api";

export default function MyProfilePage() {
    const {user, isAuthenticated, isLoading} = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/auth");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
            </div>
        );
    }

    if (!user) return null;

    const username = user.username;
    const userPostsQueryKey = ["posts", "user", username];
    const repliesPostsQueryKey = ["replies", "user", username];
    const reactedPostsQueryKey = ["reacts", "user", username];

    const profileData: ProfileUser = {
        displayName: user.displayName,
        username,
        avatarUrl: user.avatarUrl,
        description: user.description ?? "",
        stats: {
            following: user.followUserCount,
            followers: user.followersCount,
        },
    };

    const handleCreatePost = async (content: string) => {
        await createPost({content});
        await queryClient.invalidateQueries({queryKey: userPostsQueryKey});
        await queryClient.invalidateQueries({queryKey: repliesPostsQueryKey});
        await queryClient.invalidateQueries({queryKey: reactedPostsQueryKey});
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-background pb-20">
            <div className="flex flex-col gap-4">
                <ProfileHeader user={profileData} isCurrentUser/>
            </div>

            <div className="mb-6 mt-6 bg-background border border-border/50 rounded-3xl shadow-sm overflow-hidden">
                <SubmitForm
                    placeholder="Поделитесь чем-нибудь интересным..."
                    onSubmit={handleCreatePost}
                />
            </div>

            <Tabs defaultValue="posts" className="w-full mt-6">
                <TabsList className="w-full h-12 justify-between rounded-xl border-b bg-transparent p-0 px-2">
                    <TabsTrigger
                        value="posts"
                        className="flex-1 h-full rounded-xl border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:bg-accent/50 transition-colors font-bold"
                    >
                        Посты
                    </TabsTrigger>
                    <TabsTrigger
                        value="replies"
                        className="flex-1 h-full rounded-xl border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:bg-accent/50 transition-colors font-bold"
                    >
                        Ответы
                    </TabsTrigger>
                    <TabsTrigger
                        value="reactions"
                        className="flex-1 h-full rounded-xl border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:bg-accent/50 transition-colors font-bold"
                    >
                        Реакции
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="posts" className="m-0 p-12 bg-muted/10 rounded-3xl mt-4 border border-dashed">
                    <PostFeed
                        queryKey={userPostsQueryKey}
                        fetchFn={(params) => getUserPosts(username, params)}
                    />
                </TabsContent>

                <TabsContent value="replies" className="m-0 p-12 text-center bg-muted/10 rounded-3xl mt-4 border border-dashed">
                    <PostFeed
                        queryKey={repliesPostsQueryKey}
                        fetchFn={(params) => getUserReplies(username, params)}
                    />
                </TabsContent>

                <TabsContent value="reactions" className="m-0 p-12 text-center bg-muted/10 rounded-3xl mt-4 border border-dashed">
                    <PostFeed
                        queryKey={reactedPostsQueryKey}
                        fetchFn={(params) => getUserReactedPosts(username, params)}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
