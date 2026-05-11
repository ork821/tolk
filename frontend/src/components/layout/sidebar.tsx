"use client";

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {Bookmark, Home, LogOut, TrendingUp} from "lucide-react";
import {cn} from "@/lib/utils";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {useAuth} from "@/hooks/use-auth";
import {Skeleton} from "@/components/ui/skeleton";

const NAV_ITEMS = [
    { icon: Home, label: "Главная", href: "/" },
    { icon: TrendingUp, label: "Тренды", href: "/trends" },
    { icon: Bookmark, label: "Закладки", href: "/bookmarks" },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const { user: currentUser, isLoading, logout } = useAuth();

    return (
        <div className="flex flex-col h-full w-full px-2 py-4 overflow-y-auto">


            {/* 2. Основная навигация */}
            <nav className="flex flex-col gap-1 w-full mt-2 shrink-0">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group flex items-center justify-start outline-none"
                        >
                            <div className={cn(
                                "flex items-center gap-4 rounded-full p-3 px-4 transition-colors w-full",
                                isActive
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}>
                                <Icon
                                    className="h-6 w-6 transition-transform group-hover:scale-105 shrink-0"
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span className="text-[17px]">
                  {item.label}
                </span>
                            </div>
                        </Link>
                    );
                })}
            </nav>


            {/* 4. Блок авторизации ИЛИ профиль */}
            <div className="mt-auto shrink-0 mx-2 mb-4">
                {isLoading ? (
                    // --- Состояние ЗАГРУЗКИ ---
                    <div className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="flex flex-col gap-2 w-full">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ) : currentUser ? (
                    // --- Вид АВТОРИЗОВАННОГО пользователя ---
                    <div 
                        onClick={() => router.push("/profile")}
                        className="flex items-center justify-start rounded-full p-2 hover:bg-accent transition-colors group cursor-pointer"
                    >
                        <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={currentUser.avatarUrl} />
                            <AvatarFallback>{currentUser.displayName[0]}</AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col ml-3 min-w-0 flex-1">
                            <span className="font-semibold text-[15px] truncate leading-tight">{currentUser.displayName}</span>
                            <span className="text-muted-foreground text-[14px] truncate leading-tight">@{currentUser.username}</span>
                        </div>

                        {/* Кнопка выхода */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                logout();
                            }}
                            className="text-muted-foreground ml-2 hover:text-destructive transition-colors shrink-0 p-1"
                            title="Выйти"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                ) : (
                    // --- Вид ГОСТЯ (Неавторизованного) ---
                    <div className="flex flex-col gap-3 bg-muted/50 p-4 rounded-2xl border">
                         <p className="text-sm text-muted-foreground px-1">
                            Войдите, чтобы подписываться на авторов и комментировать.
                        </p>
                        <Button onClick={() => router.push("/auth")} className="w-full rounded-full font-bold active:scale-95 transition-transform">Войти</Button>
                        <Button onClick={() => router.push("/auth")} variant="outline" className="w-full rounded-full font-bold active:scale-95 transition-transform">Регистрация</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Added missing Button import since it's used in the Guest view but might have been removed or lost if I just deleted the other button
import {Button} from "@/components/ui/button";
