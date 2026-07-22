import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";
import {
    type AuthTokenDto,
    clearAccessToken,
    client,
    type DeletedAccountDto,
    type OAuthLoginDto,
    restoreDeletedAccount,
    setAccessToken,
    type User,
} from "~/lib/api";

export type {User} from "~/lib/api";

const authSessionQueryKey = ["auth", "session"] as const;

function isDeletedAccountResponse(value: unknown): value is DeletedAccountDto {
    return (
        typeof value === "object" &&
        value !== null &&
        "code" in value &&
        value.code === "account_pending_deletion" &&
        "canRestore" in value &&
        typeof value.canRestore === "boolean" &&
        "restoreUntil" in value &&
        typeof value.restoreUntil === "string"
    );
}

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
    const [isSocialLoggingIn, setIsSocialLoggingIn] = useState<string | null>(null);
    const [accountRecovery, setAccountRecovery] = useState<DeletedAccountDto | null>(null);
    const [isRestoringAccount, setIsRestoringAccount] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const {data: user, isPending, isLoading, isError} = useQuery({
        queryKey: authSessionQueryKey,
        queryFn: fetchMe,
        enabled: isMounted,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const isAuthLoading = !isMounted || isPending || isLoading;

    const login = (userData: User, token?: AuthTokenDto) => {
        if (token?.accessToken) {
            setAccessToken(token.accessToken);
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
        queryClient.setQueryData(authSessionQueryKey, null);
        queryClient.removeQueries({queryKey: authSessionQueryKey});
    };

    const socialLogin = async (provider: string, token?: string, redirectUri?: string) => {
        const type = provider.toLowerCase();
        setIsSocialLoggingIn(type);
        setAccountRecovery(null);

        try {
            const body: OAuthLoginDto = {
                token: token ?? "",
                redirectUri,
            };

            const {data: authToken, error: loginError, response} = await client.POST("/v1/auth/{provider}", {
                params: {
                    path: {
                        provider: type,
                        version: "v1",
                    },
                },
                body,
            });

            if (response.status === 409 && isDeletedAccountResponse(loginError)) {
                setAccountRecovery(loginError);
                return null;
            }

            if (loginError) {
                throw loginError;
            }

            setAccessToken(authToken.accessToken);

            const userData = await fetchMe();
            if (!userData) {
                throw new Error("Authenticated user was not returned by /me");
            }

            queryClient.setQueryData(authSessionQueryKey, userData);
            return userData;
        } catch (error) {
            clearAccessToken();
            queryClient.setQueryData(authSessionQueryKey, null);
            console.error("Ошибка при авторизации:", error);
            throw error;
        } finally {
            setIsSocialLoggingIn(null);
        }
    };

    const restoreAccount = async () => {
        const recoveryToken = accountRecovery?.recoveryToken;
        if (!accountRecovery?.canRestore || !recoveryToken) {
            throw new Error("Account recovery is not available");
        }

        setIsRestoringAccount(true);

        try {
            const authToken = await restoreDeletedAccount(recoveryToken);
            setAccessToken(authToken.accessToken);

            const userData = await fetchMe();
            if (!userData) {
                throw new Error("Restored user was not returned by /me");
            }

            setAccountRecovery(null);
            queryClient.setQueryData(authSessionQueryKey, userData);
            return userData;
        } catch (error) {
            clearAccessToken();
            queryClient.setQueryData(authSessionQueryKey, null);
            throw error;
        } finally {
            setIsRestoringAccount(false);
        }
    };

    return {
        user: user ?? null,
        isLoading: isAuthLoading,
        isSocialLoggingIn,
        accountRecovery,
        isRestoringAccount,
        isError,
        isAuthenticated: !!user,
        login,
        logout,
        socialLogin,
        restoreAccount,
        clearAccountRecovery: () => setAccountRecovery(null),
    };
}
