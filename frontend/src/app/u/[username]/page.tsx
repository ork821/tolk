"use client";

import {use} from "react";
import {useQuery} from "@tanstack/react-query";
import {Loader2} from "lucide-react";
import {ProfileHeader, type ProfileUser} from "@/components/profile-header";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {PostFeed} from "@/components/post-feed";
import {client, getUserPosts, getUserReplies} from "@/lib/api";
import {useAuth} from "@/hooks/use-auth";

export default function UserProfilePage({params}: {params: Promise<{ username: string }>}) {
    const {username} = use(params);
    const {user: currentUser} = useAuth();

    const {data: profile, status} = useQuery({
        queryKey: ["users", username],
        queryFn: async () => {
            const {data, error} = await client.GET("/v1/users/{username}", {
                params: {
                    path: {
                        username,
                        version: "1",
                    },
                },
            });

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error("Failed to load user profile");
            }

            return data;
        },
    });

    if (status === "pending") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (status === "error" || !profile) {
        return (
            <div className="rounded-3xl border border-dashed p-10 text-center text-destructive">
                Не удалось загрузить профиль.
            </div>
        );
    }

    const profileData: ProfileUser = {
        displayName: profile.displayName,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        description: profile.description ?? "",
        stats: {
            following: profile.followUserCount,
            followers: profile.followersCount,
        },
    };
    const isCurrentUser = currentUser?.username === profile.username;

    return (
        <div className="flex flex-col w-full min-h-screen bg-background pb-20">
            <ProfileHeader user={profileData} isCurrentUser={isCurrentUser} />

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
                        queryKey={["posts", "user", username]}
                        fetchFn={(params) => getUserPosts(username, params)}
                    />
                </TabsContent>

                <TabsContent value="replies" className="m-0 p-12 text-center bg-muted/10 rounded-3xl mt-4 border border-dashed">
                    <PostFeed
                        queryKey={["replies", "user", username]}
                        fetchFn={(params) => getUserReplies(username, params)}
                    />
                </TabsContent>

                <TabsContent value="reactions" className="m-0 p-12 text-center bg-muted/10 rounded-3xl mt-4 border border-dashed">
                    <p className="text-muted-foreground font-medium italic">Посты, на которые пользователь отреагировал, появятся здесь.</p>
                </TabsContent>
            </Tabs>
        </div>
    );
}
