import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";
import {usersApi, User} from "@/lib/api";

export type {User} from "@/lib/api";

export function useAuth() {
    const queryClient = useQueryClient();
    const [isMounted, setIsMounted] = useState(false);
    const [isSocialLoggingIn, setIsSocialLoggingIn] = useState<string | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const {data: user, isPending, isLoading, isError} = useQuery({
        queryKey: ["auth", "session"],
        queryFn: usersApi.getSession,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const isAuthLoading = !isMounted || isPending || isLoading;

    const login = (userData: User) => {
        queryClient.setQueryData(["auth", "session"], userData);
    };

    const logout = () => {
        queryClient.setQueryData(["auth", "session"], null);
    };

    const socialLogin = async (provider: string) => {
        const type = provider.toLowerCase();
        setIsSocialLoggingIn(type);

        try {
            const userData = await usersApi.socialLogin(type);
            login(userData);
            return userData;
        } catch (error) {
            console.error("Ошибка при авторизации:", error);
            throw error;
        } finally {
            setIsSocialLoggingIn(null);
        }
    };

    return {
        user: user ?? null,
        isLoading: isAuthLoading,
        isSocialLoggingIn,
        isError,
        isAuthenticated: !!user,
        login,
        logout,
        socialLogin,
    };
}
