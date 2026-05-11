"use client"; // В реальности тут может быть серверный компонент, который загружает юзера, а табы - клиентские

import {ProfileHeader} from "@/components/profile-header";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {PostFeed} from "@/components/post-feed";
import {use} from "react";
import {postsApi, usersApi} from "@/lib/api";
import {useQuery} from "@tanstack/react-query";
import {Loader2} from "lucide-react";

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const resolvedParams = use(params);
    const {data: profile, status} = useQuery({
        queryKey: ["users", resolvedParams.username],
        queryFn: () => usersApi.getProfile(resolvedParams.username),
    });
    // Для примера: если username совпадает с твоим, показываем кнопку "Редактировать"
    const isCurrentUser = resolvedParams.username === "react_ninja";

    if (status === "pending") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className="flex flex-col w-full min-h-screen bg-background pb-20">
            {/* Hero-секция профиля */}
            <ProfileHeader user={profile} isCurrentUser={isCurrentUser} isSubscribedProp={profile.isSubscribed} />

            {/* Вкладки навигации */}
            {/* 2. Основной контент с табами */}
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

                <TabsContent value="posts" className="m-0 p-12 text-center bg-muted/10 rounded-3xl mt-4 border border-dashed">
                    <PostFeed
                        queryKey={["posts", "user", resolvedParams.username]}
                        fetchFn={({pageParam}) => postsApi.getUserPosts(resolvedParams.username, {pageParam})}
                    />
                </TabsContent>

                <TabsContent value="replies" className="m-0 p-12 text-center bg-muted/10 rounded-3xl mt-4 border border-dashed">
                    <p className="text-muted-foreground font-medium italic">Ваши ответы появятся здесь.</p>
                </TabsContent>

                <TabsContent value="reactions" className="m-0 p-12 text-center bg-muted/10 rounded-3xl mt-4 border border-dashed">
                    <p className="text-muted-foreground font-medium italic">Посты, на которые вы отреагировали огоньком 🔥</p>
                </TabsContent>
            </Tabs>

        </div>
    );
}
