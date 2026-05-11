"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/hooks/use-auth";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Loader2} from "lucide-react";

// --- CUSTOM SOCIAL ICONS (YANDEX & VK) ---

const YandexIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
        <path d="M2.04 12c0-5.523 4.476-10 10-10 5.522 0 10 4.477 10 10s-4.478 10-10 10c-5.524 0-10-4.477-10-10z" fill="#FC3F1D"/>
        <path d="M13.32 7.666h-.924c-1.694 0-2.585.858-2.585 2.123 0 1.43.616 2.1 1.881 2.959l1.045.704-3.003 4.487H7.49l2.695-4.014c-1.55-1.111-2.42-2.19-2.42-4.015 0-2.288 1.595-3.85 4.62-3.85h3.003v11.868H13.32V7.666z" fill="#fff"/>
    </svg>
);

const VkIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.074 2c4.17 0 5.426.417 6.92 1.91 1.493 1.494 1.91 2.75 1.91 6.92v2.338c0 4.17-.417 5.426-1.91 6.92-1.494 1.493-2.75 1.91-6.92 1.91h-6.148c-4.17 0-5.426-.417-6.92-1.91-1.493-1.494-1.91-2.75-1.91-6.92v-2.338c0-4.17.417-5.426 1.91-6.92C3.502 2.417 4.757 2 8.926 2h6.148zM19.123 7.854h-2.142c-.417 0-.584.182-.916.666-.834 1.25-2.084 3.333-2.458 3.333-.167 0-.25-.083-.25-.458V8.646c0-.584-.167-.792-.667-.792H9.043c-.375 0-.584.25-.584.5 0 .542.834.667.917 2.167v2.292c0 .5-.209.625-.417.625-.584 0-2.042-2.083-2.875-4.458-.209-.542-.459-.75-.959-.75H3.041c-.5 0-.584.25-.584.542 0 .5.625 3 2.917 6.208C7.043 17.521 9.459 18.646 11.584 18.646c1.292 0 1.459-.292 1.459-.792v-1.875c0-.583.25-.708.625-.708.291 0 .791.125 1.833 1.167.792.792 1.334 1.208 2.292 1.208h2.125c.5 0 .75-.25.583-.75-.166-.458-.583-1.125-1.166-1.792-.459-.541-1.167-1.125-1.375-1.416-.292-.417-.209-.584 0-.917 0 0 .792-1.125 2.167-3.083.458-.708.125-1.125-.458-1.125z" fill="#0077FF"/>
    </svg>
);

export default function AuthPage() {
    const { isAuthenticated, isLoading: isAuthLoading, isSocialLoggingIn, socialLogin } = useAuth();
    const router = useRouter();

    // Редирект, если пользователь уже залогинен
    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            router.push("/profile");
        }
    }, [isAuthenticated, isAuthLoading, router]);

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (isAuthenticated) return null;

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4">
            <Card className="w-full max-w-md border-2 shadow-xl rounded-3xl overflow-hidden border-border/50">
                <CardHeader className="space-y-1 text-center bg-muted/20 pb-8 pt-8">
                    <div className="mx-auto w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 shadow-lg">
                        N
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight">Добро пожаловать</CardTitle>
                    <CardDescription className="text-base">
                        Выберите способ входа в аккаунт Social.App
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 p-8">
                    <Button 
                        variant="outline" 
                        disabled={!!isSocialLoggingIn}
                        onClick={() => socialLogin("yandex")}
                        className="h-12 rounded-2xl font-bold border-2 hover:bg-muted/50 transition-all active:scale-95 flex items-center gap-3 relative overflow-hidden"
                    >
                        {isSocialLoggingIn === "yandex" ? <Loader2 className="w-6 h-6 animate-spin" /> : <YandexIcon className="w-8 h-8" />}
                        {isSocialLoggingIn === "yandex" ? "Подключение..." : "Войти через Яндекс ID"}
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        disabled={!!isSocialLoggingIn}
                        onClick={() => socialLogin("vk")}
                        className="h-12 rounded-2xl font-bold border-2 hover:bg-muted/50 transition-all active:scale-95 flex items-center gap-3 relative overflow-hidden"
                    >
                        {isSocialLoggingIn === "vk" ? <Loader2 className="w-6 h-6 animate-spin" /> : <VkIcon className="w-8 h-8" />}
                        {isSocialLoggingIn === "vk" ? "Авторизация..." : "Войти через ВКонтакте"}
                    </Button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Или продолжайте как гость
                            </span>
                        </div>
                    </div>

                    <Button 
                        variant="ghost" 
                        disabled={!!isSocialLoggingIn}
                        onClick={() => router.push("/")}
                        className="h-12 rounded-2xl font-bold transition-all active:scale-95"
                    >
                        Вернуться на главную
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
