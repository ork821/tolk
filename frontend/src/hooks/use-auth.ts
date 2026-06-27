import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";
import {
    type AuthTokenDto,
    clearAccessToken,
    client,
    getAccessToken,
    type OAuthLoginDto,
    setAccessToken,
    type User,
} from "@/lib/api";

export type {User} from "@/lib/api";

const authSessionQueryKey = ["auth", "session"] as const;

async function fetchMe() {
    const {data, error, response} = await client.GET("/v1/me", {
        params: {
            path: {
                version: "v1",
            },
        },
    });

    if (response.status === 401) {
        clearAccessToken();
        return null;
    }

    if (error) {
        throw error;
    }

    return data;
}

export function useAuth() {
    const queryClient = useQueryClient();
    const [isMounted, setIsMounted] = useState(false);
    const [hasAccessToken, setHasAccessToken] = useState(false);
    const [isSocialLoggingIn, setIsSocialLoggingIn] = useState<string | null>(null);

    useEffect(() => {
        setHasAccessToken(!!getAccessToken());
        setIsMounted(true);
    }, []);

    const {data: user, isPending, isLoading, isError} = useQuery({
        queryKey: authSessionQueryKey,
        queryFn: fetchMe,
        enabled: isMounted && hasAccessToken,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const isAuthLoading = !isMounted || (hasAccessToken && (isPending || isLoading));

    const login = (userData: User, token?: AuthTokenDto) => {
        if (token?.accessToken) {
            setAccessToken(token.accessToken);
            setHasAccessToken(true);
        }

        queryClient.setQueryData(authSessionQueryKey, userData);
    };

    const logout = () => {
        client.POST("/v1/auth/logout", {
            params: {
                path: {
                    version: "v1",
                },
            },
        }).catch((error) => {
            console.error("Failed to logout on server", error);
        });

        clearAccessToken();
        setHasAccessToken(false);
        queryClient.setQueryData(authSessionQueryKey, null);
        queryClient.removeQueries({queryKey: authSessionQueryKey});
    };

    const socialLogin = async (provider: string, token?: string, redirectUri?: string) => {
        const type = provider.toLowerCase();
        setIsSocialLoggingIn(type);

        try {
            const body: OAuthLoginDto = {
                token: token ?? "",
                redirectUri,
            };

            const {data: authToken, error: loginError} = await client.POST("/v1/auth/{provider}", {
                params: {
                    path: {
                        provider: type,
                        version: "v1",
                    },
                },
                body,
            });

            if (loginError) {
                throw loginError;
            }

            setAccessToken(authToken.accessToken);
            setHasAccessToken(true);

            const userData = await fetchMe();
            if (!userData) {
                throw new Error("Authenticated user was not returned by /me");
            }

            queryClient.setQueryData(authSessionQueryKey, userData);
            return userData;
        } catch (error) {
            clearAccessToken();
            setHasAccessToken(false);
            queryClient.setQueryData(authSessionQueryKey, null);
            console.error("РћС€РёР±РєР° РїСЂРё Р°РІС‚РѕСЂРёР·Р°С†РёРё:", error);
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
