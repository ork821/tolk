"use client";

import * as VKID from "@vkid/sdk";
import {useEffect, useState} from "react";
import {useNavigate} from "react-router";
import {useAuth} from "~/hooks/use-auth";
import {Button} from "~/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "~/components/ui/card";
import {Loader2} from "lucide-react";


const YandexIcon = ({className}: {className?: string}) => (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
        <path d="M2.04 12c0-5.523 4.476-10 10-10 5.522 0 10 4.477 10 10s-4.478 10-10 10c-5.524 0-10-4.477-10-10z" fill="#FC3F1D"/>
        <path d="M13.32 7.666h-.924c-1.694 0-2.585.858-2.585 2.123 0 1.43.616 2.1 1.881 2.959l1.045.704-3.003 4.487H7.49l2.695-4.014c-1.55-1.111-2.42-2.19-2.42-4.015 0-2.288 1.595-3.85 4.62-3.85h3.003v11.868H13.32V7.666z" fill="#fff"/>
    </svg>
);

const VkIcon = ({className}: {className?: string}) => (
    <svg width="101" height="100" viewBox="0 0 101 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_2_40)">
            <path d="M0.5 48C0.5 25.3726 0.5 14.0589 7.52944 7.02944C14.5589 0 25.8726 0 48.5 0H52.5C75.1274 0 86.4411 0 93.4706 7.02944C100.5 14.0589 100.5 25.3726 100.5 48V52C100.5 74.6274 100.5 85.9411 93.4706 92.9706C86.4411 100 75.1274 100 52.5 100H48.5C25.8726 100 14.5589 100 7.52944 92.9706C0.5 85.9411 0.5 74.6274 0.5 52V48Z" fill="#0077FF"/>
            <path d="M53.7085 72.042C30.9168 72.042 17.9169 56.417 17.3752 30.417H28.7919C29.1669 49.5003 37.5834 57.5836 44.25 59.2503V30.417H55.0004V46.8752C61.5837 46.1669 68.4995 38.667 70.8329 30.417H81.5832C79.7915 40.5837 72.2915 48.0836 66.9582 51.1669C72.2915 53.6669 80.8336 60.2086 84.0836 72.042H72.2499C69.7082 64.1253 63.3754 58.0003 55.0004 57.1669V72.042H53.7085Z" fill="white"/>
        </g>
        <defs>
            <clipPath id="clip0_2_40">
                <rect width="100" height="100" fill="white" transform="translate(0.5)"/>
            </clipPath>
        </defs>
    </svg>
);

function isVkAuthResponse(value: unknown): value is VKID.AuthResponse {
    return (
        typeof value === "object" &&
        value !== null &&
        "code" in value &&
        "device_id" in value &&
        typeof (value as VKID.AuthResponse).code === "string" &&
        typeof (value as VKID.AuthResponse).device_id === "string"
    );
}

export default function AuthPage() {
    const {isAuthenticated, isLoading: isAuthLoading, isSocialLoggingIn, socialLogin} = useAuth();
    const navigate = useNavigate();
    const [authError, setAuthError] = useState<string | null>(null);
    const [isVkAuthorizing, setIsVkAuthorizing] = useState(false);

    const vkAppId = Number(import.meta.env.VITE_VK_APP_ID);
    const isVkConfigured = Number.isInteger(vkAppId) && vkAppId > 0;
    const isVkLoading = isVkAuthorizing || isSocialLoggingIn === "vk";

    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            navigate("/profile");
        }
    }, [isAuthenticated, isAuthLoading, navigate]);

    const handleVkLogin = async () => {
        if (!isVkConfigured) {
            setAuthError("Для входа через VK ID нужно задать VITE_VK_APP_ID.");
            return;
        }

        setAuthError(null);
        setIsVkAuthorizing(true);

        try {
            const redirectUrl = `${window.location.origin}/auth`;

            VKID.Config.init({
                app: vkAppId,
                redirectUrl,
                mode: VKID.ConfigAuthMode.InNewWindow,
                responseMode: VKID.ConfigResponseMode.Callback,
                scope: "email",
            });

            const authResponse = await VKID.Auth.login();

            if (!isVkAuthResponse(authResponse)) {
                throw new Error("VK ID did not return an authorization code.");
            }

            const token = await VKID.Auth.exchangeCode(authResponse.code, authResponse.device_id);
            await socialLogin("vk", token.access_token, redirectUrl);
        } catch (error) {
            console.error("Failed to authorize with VK ID", error);
            setAuthError("Не удалось войти через VK ID. Попробуйте еще раз.");
        } finally {
            setIsVkAuthorizing(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
            </div>
        );
    }

    if (isAuthenticated) return null;

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4">
            <title>Авторизация | ТОЛК</title>
            <meta name="description" content="Войдите в аккаунт ТОЛК." />
            <Card className="w-full max-w-md border-2 shadow-xl rounded-3xl overflow-hidden border-border/50">
                <CardHeader className="flex flex-col items-center justify-center gap-3 space-y-1 text-center bg-muted/20 pb-8 pt-8">
                    <div className="flex items-center gap-2" aria-label="ТОЛК">
                        <img
                            src="/icon.svg"
                            alt=""
                            className="size-11 shrink-0 rounded-xl object-contain"
                        />
                        <span className="hidden text-2xl font-black leading-none text-foreground lg:inline">
                            ТОЛК
                        </span>
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight">Добро пожаловать</CardTitle>
                    <CardDescription className="text-base">
                        Выберите способ входа в аккаунт
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 p-4">
                    {authError && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {authError}
                        </div>
                    )}

                    <Button
                        variant="outline"
                        disabled={!!isSocialLoggingIn || isVkAuthorizing}
                        onClick={() => socialLogin("yandex")}
                        className="h-12 rounded-2xl font-bold border-2 hover:bg-muted/50 transition-all active:scale-95 flex items-center gap-3 relative overflow-hidden"
                    >
                        {isSocialLoggingIn === "yandex" ? <Loader2 className="w-6 h-6 animate-spin"/> : <YandexIcon className="w-8 h-8"/>}
                        {isSocialLoggingIn === "yandex" ? "Подключение..." : "Войти через Яндекс ID"}
                    </Button>

                    <Button
                        variant="outline"
                        disabled={!!isSocialLoggingIn || isVkAuthorizing}
                        onClick={handleVkLogin}
                        className="h-12 rounded-2xl font-bold border-2 hover:bg-muted/50 transition-all active:scale-95 flex items-center gap-3 relative overflow-hidden"
                    >
                        {isVkLoading ? <Loader2 className="w-6 h-6 animate-spin"/> : <VkIcon className="w-8 h-8"/>}
                        {isVkLoading ? "Авторизация..." : "Войти через ВКонтакте"}
                    </Button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t"/>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Или продолжайте как гость
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        disabled={!!isSocialLoggingIn || isVkAuthorizing}
                        onClick={() => navigate("/")}
                        className="h-12 rounded-2xl font-bold transition-all active:scale-95"
                    >
                        Вернуться на главную
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
