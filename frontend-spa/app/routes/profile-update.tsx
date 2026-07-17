"use client";

import {useEffect, useMemo, useState} from "react";
import type {FormEvent} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useNavigate} from "react-router";
import {AlertCircle, ArrowLeft, Loader2, Save} from "lucide-react";
import {Button} from "~/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader} from "~/components/ui/card";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {UserAvatar} from "~/components/user-avatar";
import {useAuth} from "~/hooks/use-auth";
import {type UpdateProfileInfoBodyDto, updateProfileInfo} from "~/lib/api";

const authSessionQueryKey = ["auth", "session"] as const;
const maxDescriptionLength = 500;

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Не удалось сохранить профиль";
}

function ReadonlyHint({children}: { children: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={children}
                >
                    <AlertCircle className="h-4 w-4"/>
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64">
                {children}
            </TooltipContent>
        </Tooltip>
    );
}

function ReadonlyField({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint: string;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">{label}</label>
                <ReadonlyHint>{hint}</ReadonlyHint>
            </div>
            <input
                value={value}
                disabled
                className="h-11 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground"
            />
        </div>
    );
}

export default function UpdateProfilePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const {user, isAuthenticated, isLoading} = useAuth();
    const [displayName, setDisplayName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate("/auth");
        }
    }, [isAuthenticated, isLoading, navigate]);

    useEffect(() => {
        if (!user) return;

        setDisplayName(user.displayName);
        setDescription(user.description ?? "");
    }, [user]);

    const trimmedDisplayName = displayName.trim();
    const isDisplayNameValid = trimmedDisplayName.length >= 2 && trimmedDisplayName.length <= 50;
    const isDescriptionValid = description.length <= maxDescriptionLength;

    const updatePayload = useMemo<UpdateProfileInfoBodyDto>(() => {
        if (!user) return {};

        const payload: UpdateProfileInfoBodyDto = {};
        if (trimmedDisplayName !== user.displayName) {
            payload.displayName = trimmedDisplayName;
        }

        if (description !== (user.description ?? "")) {
            payload.description = description;
        }

        return payload;
    }, [description, trimmedDisplayName, user]);

    const hasChanges = Object.keys(updatePayload).length > 0;

    const mutation = useMutation({
        mutationFn: updateProfileInfo,
        async onSuccess(updatedProfile) {
            queryClient.setQueryData(authSessionQueryKey, {
                ...updatedProfile,
                isMe: true,
                isSubscribed: false,
            });

            await queryClient.invalidateQueries({queryKey: authSessionQueryKey});
            navigate("/profile");
        },
    });

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!isDisplayNameValid || !isDescriptionValid || !hasChanges || mutation.isPending) {
            return;
        }

        mutation.mutate(updatePayload);
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <TooltipProvider delayDuration={150}>
            <main className="min-h-screen bg-background pb-20">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() => navigate(-1)}
                            aria-label="Назад"
                        >
                            <ArrowLeft className="h-4 w-4"/>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Редактирование профиля</h1>
                            <p className="text-sm text-muted-foreground">
                                Измените публичное имя и описание профиля.
                            </p>
                        </div>
                    </div>

                    <Card className="rounded-2xl border-border/60 p-10">
                        <form onSubmit={handleSubmit}>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <UserAvatar
                                    username={user.username}
                                    avatarUrl={user.avatarUrl}
                                    className="h-16 w-16"
                                    fallbackClassName="text-lg"
                                    imageClassName="object-cover"
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold">{user.displayName}</p>
                                    <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-5 mt-5">
                                <div className="space-y-2">
                                    <label htmlFor="displayName" className="text-sm font-medium text-foreground">
                                        Отображаемое имя
                                    </label>
                                    <input
                                        id="displayName"
                                        value={displayName}
                                        onChange={(event) => setDisplayName(event.target.value)}
                                        maxLength={50}
                                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        autoComplete="name"
                                    />
                                    {!isDisplayNameValid ? (
                                        <p className="text-xs text-destructive">
                                            Имя должно быть от 2 до 50 символов.
                                        </p>
                                    ) : null}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <label htmlFor="description" className="text-sm font-medium text-foreground">
                                            Описание
                                        </label>
                                        <span className="text-xs text-muted-foreground">
                                            {description.length}/{maxDescriptionLength}
                                        </span>
                                    </div>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        maxLength={maxDescriptionLength}
                                        rows={6}
                                        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                    {!isDescriptionValid ? (
                                        <p className="text-xs text-destructive">
                                            Описание не может быть длиннее {maxDescriptionLength} символов.
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <ReadonlyField
                                        label="Username"
                                        value={`@${user.username}`}
                                        hint="Username пока нельзя изменить. Позже для этого будет отдельная безопасная процедура."
                                    />
                                    <ReadonlyField
                                        label="Email"
                                        value={user.email ?? "Не указан"}
                                        hint="Email пока нельзя изменить на этой странице."
                                    />
                                </div>

                                <ReadonlyField
                                    label="Аватар"
                                    value={user.avatarUrl ?? "Не указан"}
                                    hint="Редактирование аватара пока недоступно."
                                />

                                {mutation.isError ? (
                                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                        {getErrorMessage(mutation.error)}
                                    </p>
                                ) : null}
                            </CardContent>

                            <CardFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end mt-5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => navigate(-1)}
                                    disabled={mutation.isPending}
                                >
                                    Отмена
                                </Button>
                                <Button
                                    type="submit"
                                    className="w-full gap-2 sm:w-auto"
                                    disabled={!hasChanges || !isDisplayNameValid || !isDescriptionValid || mutation.isPending}
                                >
                                    {mutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                    ) : (
                                        <Save className="h-4 w-4"/>
                                    )}
                                    Сохранить
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </main>
        </TooltipProvider>
    );
}
