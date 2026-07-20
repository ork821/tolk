"use client";

import React, {useEffect, useRef, useState} from "react";
import {Button} from "~/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "~/components/ui/popover";
import {Image, Smile} from "lucide-react";
import {cn} from "~/lib/utils";
import {UserAvatar} from "~/components/user-avatar";
import {EmojiPicker} from "~/components/emoji-picker";

// Добавь эти пропсы:
interface ReplyFormProps {
    user: {
        username: string
        displayName: string
        avatarUrl?: string | null
    };
    onCancel?: () => void; // Если передано, форма считается "встроенной" и покажет кнопку Отмена
    autoFocus?: boolean;   // Автоматически ставить курсор в поле
    placeholder?: string;
    compact?: boolean;
}

export function ReplyForm({
                              user,
                              onCancel,
                              autoFocus = false,
                              placeholder = "Опубликовать ответ...",
                              compact = false
                          }: ReplyFormProps) {
    const [text, setText] = useState("");
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Добавляем новый useEffect для автофокуса
    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    const insertEmoji = (emoji: any) => {
        setText((prev) => prev + emoji.native);
        textareaRef.current?.focus();
    };

    const handleSubmit = () => {
        if (!text.trim()) return;
        console.log("Отправка ответа:", text);
        setText(""); // Очистка после отправки
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== "Enter" || e.shiftKey) return;

        e.preventDefault();
        handleSubmit();
    };

    // @ts-ignore
    return (
        <div className={cn(
            "flex",
            compact ? "gap-3 pt-3" : "gap-4 p-4 border-b"
        )}>
            <UserAvatar
                username={user.username}
                avatarUrl={user.avatarUrl}
                className={cn("shrink-0", compact ? "h-8 w-8" : "h-10 w-10")}
            />

            <div className="flex-1 flex flex-col gap-2">
                <div className="flex-1 flex flex-col gap-1">
                    {/* 4. Уменьшаем шрифт и минимальную высоту textarea */}
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={cn(
                            "w-full bg-transparent resize-none outline-none leading-relaxed placeholder:text-muted-foreground py-1",
                            compact ? "text-[15px] min-h-[32px]" : "text-[19px] min-h-[40px]"
                        )}
                        rows={1}
                    />

                    <div className={cn(
                        "flex items-center justify-between pt-2",
                        compact ? "border-none" : "border-t" // Убираем верхнюю полоску над кнопками в ответах
                    )}>
                        <div className="flex items-center gap-1 -ml-2">

                            {/* 5. Уменьшаем кнопки иконок */}
                            <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon"
                                            className={cn("rounded-full text-primary", compact ? "h-8 w-8" : "h-9 w-9")}>
                                        <Smile className={cn(compact ? "h-4 w-4" : "h-5 w-5")}/>
                                    </Button>
                                </PopoverTrigger>
                                {/* w-auto и p-0 убирают рамки Popover'а, чтобы пикер смотрелся органично */}
                                <PopoverContent align="start" className="w-auto p-0 border-none shadow-none z-50">
                                    {isEmojiPickerOpen && <EmojiPicker onEmojiSelect={insertEmoji} />}
                                </PopoverContent>
                            </Popover>

                            <Button variant="ghost" size="icon"
                                    className={cn("rounded-full text-primary", compact ? "h-8 w-8" : "h-9 w-9")}>
                                <Image className={cn(compact ? "h-4 w-4" : "h-5 w-5")}/>
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            {onCancel && (
                                <Button
                                    variant="ghost"
                                    onClick={onCancel}
                                    // Уменьшаем кнопку отмены
                                    className={cn("rounded-full font-medium hover:bg-destructive/10 hover:text-destructive", compact ? "h-8 text-xs px-3" : "px-4")}
                                >
                                    Отмена
                                </Button>
                            )}

                            <Button
                                onClick={handleSubmit}
                                disabled={!text.trim()}
                                // Уменьшаем главную кнопку
                                className={cn("rounded-full font-bold", compact ? "h-8 text-xs px-4" : "px-5")}
                            >
                                Ответить
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
