"use client";

import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {AlertTriangle, Loader2, Trash2, X} from "lucide-react";
import {useNavigate} from "react-router";
import {Button} from "~/components/ui/button";
import {clearAccessToken, deleteProfile} from "~/lib/api";

function getDeleteErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return "Не удалось удалить аккаунт. Попробуйте ещё раз.";
}

export function AccountDeletionSection({username}: {username: string}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [confirmation, setConfirmation] = useState("");

    const deleteMutation = useMutation({
        mutationFn: deleteProfile,
        onSuccess() {
            clearAccessToken();
            queryClient.clear();
            navigate("/", {replace: true});
        },
    });

    const expectedConfirmation = `@${username}`;
    const isConfirmed = confirmation.trim() === expectedConfirmation;

    const handleOpenChange = (open: boolean) => {
        if (deleteMutation.isPending) return;

        setIsOpen(open);
        if (!open) {
            setConfirmation("");
            deleteMutation.reset();
        }
    };

    return (
        <section className="border-t border-destructive/20 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-base font-semibold text-destructive">Удаление аккаунта</h2>
                    <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                        Профиль станет недоступен, а все активные сеансы будут завершены.
                    </p>
                </div>

                <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
                    <Dialog.Trigger asChild>
                        <Button type="button" variant="destructive" className="gap-2 sm:self-start">
                            <Trash2 className="size-4" />
                            Удалить аккаунт
                        </Button>
                    </Dialog.Trigger>

                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in" />
                        <Dialog.Content
                            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in"
                            onEscapeKeyDown={(event) => deleteMutation.isPending && event.preventDefault()}
                            onPointerDownOutside={(event) => deleteMutation.isPending && event.preventDefault()}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                    <AlertTriangle className="size-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <Dialog.Title className="text-lg font-semibold">Удалить аккаунт?</Dialog.Title>
                                    <Dialog.Description className="mt-1 text-sm leading-6 text-muted-foreground">
                                        Это действие скроет профиль и завершит все сеансы. В течение 30 дней аккаунт можно будет восстановить через привязанный OAuth-провайдер.
                                    </Dialog.Description>
                                </div>
                                <Dialog.Close asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Закрыть"
                                        disabled={deleteMutation.isPending}
                                    >
                                        <X />
                                    </Button>
                                </Dialog.Close>
                            </div>

                            <div className="mt-5 space-y-2">
                                <label htmlFor="delete-account-confirmation" className="text-sm font-medium">
                                    Для подтверждения введите <strong>{expectedConfirmation}</strong>
                                </label>
                                <input
                                    id="delete-account-confirmation"
                                    value={confirmation}
                                    onChange={(event) => setConfirmation(event.target.value)}
                                    autoComplete="off"
                                    autoFocus
                                    disabled={deleteMutation.isPending}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                                />
                            </div>

                            {deleteMutation.isError && (
                                <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {getDeleteErrorMessage(deleteMutation.error)}
                                </p>
                            )}

                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Dialog.Close asChild>
                                    <Button type="button" variant="outline" disabled={deleteMutation.isPending}>
                                        Отмена
                                    </Button>
                                </Dialog.Close>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={!isConfirmed || deleteMutation.isPending}
                                    onClick={() => deleteMutation.mutate()}
                                >
                                    {deleteMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                                    Подтвердить удаление
                                </Button>
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>
        </section>
    );
}
