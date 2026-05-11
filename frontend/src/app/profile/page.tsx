"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/hooks/use-auth";
import {ProfileHeader, ProfileUser} from "@/components/profile-header";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {PostFeed} from "@/components/post-feed";
import {SubmitForm} from "@/components/input-form";
import {Loader2} from "lucide-react";
import {postsApi} from "@/lib/api";

// Функция для загрузки постов текущего пользователя (имитация)
export default function MyProfilePage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/auth");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    // Преобразуем объект User из хука в ProfileUser для хедера
    const profileData: ProfileUser = {
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        description: "Пишу код, пью кофе. Это мой личный профиль в Social.App! 🚀",
        stats: { following: 142, followers: 1042 } 
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-background pb-20">
            {/* 
                Шапка профиля. 
                Мы убрали pt-2 и добавили ProfileHeader, который теперь сам рисует 
                баннер и правильно позиционирует аватарку, не давая ей вылезать за границы.
            */}
            <div className="flex flex-col gap-4">
                <ProfileHeader user={profileData} isCurrentUser={true} />
            </div>

            {/* Форма создания поста с современным дизайном */}
            <div className="mb-6 mt-6 bg-background border border-border/50 rounded-3xl shadow-sm overflow-hidden">
                <SubmitForm placeholder="Поделитесь чем-нибудь интересным..." />
            </div>

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
                        queryKey={["posts", "user", "me"]}
                        fetchFn={postsApi.getMyPosts}
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
