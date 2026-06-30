"use client";

import React, {useEffect, useRef, useState} from "react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Smile} from "lucide-react";
import {useAuth} from "@/hooks/use-auth";
import {cn} from "@/lib/utils";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface SubmitFormProps {
    onSubmit?: (content: string) => Promise<void>; // Кастомная логика отправки (если нужна)
    onCancel?: () => void;                         // Наличие этой функции включает кнопку "Отмена"
    placeholder?: string;
    compact?: boolean;                             // Включает компактный режим для комментариев
    autoFocus?: boolean;
    isModal?: boolean;                             // Убирает рамки для модального окна
    submitLabel?: string;                          // Текст кнопки (Опубликовать / Ответить)
}

export function SubmitForm({
                                onSubmit,
                                onCancel,
                                placeholder = "Что у вас нового?",
                                compact = false,
                                autoFocus = false,
                                isModal = false,
                                submitLabel = "Опубликовать",
                            }: SubmitFormProps) {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Автофокус (полезно для инлайн-ответов и модалок)
    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    // Авто-ресайз текстового поля
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return;
        setIsSubmitting(true);

        try {
            if (onSubmit) {
                await onSubmit(content); // Вызываем внешнюю функцию, если передали
            } else {
                // await postsApi.createPost({content});
            }

            setContent("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
            // Если это был инлайн-ответ, закрываем форму после успеха
            onCancel?.();
        } catch (error) {
            console.error("Ошибка при публикации:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== "Enter" || e.shiftKey) return;

        e.preventDefault();
        void handleSubmit();
    };

    if (!user) return null;

    const insertEmoji = (emoji: any) => {
        setContent((prev) => prev + emoji.native);
        textareaRef.current?.focus();
    };

    return (
        <div className={cn(
            "flex",
            compact ? "gap-3 pt-3" : "gap-4",
            !compact && !isModal ? "p-4" : "", // Бордер снизу только для ленты
            isModal ? "p-0" : ""
        )}>
            {/* Аватарка (уменьшается в компактном режиме) */}
            <Avatar className={cn("shrink-0", compact ? "h-8 w-8" : "h-10 w-10")}>
                <AvatarFallback>{user.displayName[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 flex flex-col min-w-0">
        <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSubmitting}
            className={cn(
                "w-full bg-transparent resize-none outline-none leading-relaxed placeholder:text-muted-foreground overflow-y-auto disabled:opacity-50",
                // Мелкий шрифт и высота для комментов, крупный для постов
                compact ? "text-[15px] min-h-[32px] py-1" : "text-[19px] min-h-[48px] max-h-[60vh] py-2"
            )}
            rows={1}
        />

                <div className={cn(
                    "flex items-center justify-between pt-2 mt-1",
                    !compact && "border-t border-border/50" // Разделитель для больших постов
                )}>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon"
                                    className={cn("rounded-full text-primary", compact ? "h-8 w-8" : "h-9 w-9")}>
                                <Smile className={cn(compact ? "h-4 w-4" : "h-5 w-5")}/>
                            </Button>
                        </PopoverTrigger>
                        {/* w-auto и p-0 убирают рамки Popover'а, чтобы пикер смотрелся органично */}
                        <PopoverContent align="start" className="w-auto p-0 border-none shadow-none z-50">
                            <Picker
                                data={data}
                                onEmojiSelect={insertEmoji}
                                theme="dark" // Можно сделать динамическим (light/dark) через хук useTheme от next-themes
                                locale="ru" // Если хочешь, чтобы поиск эмодзи был на русском
                                previewPosition="none" // Убираем превью внизу пикера для компактности
                            />
                        </PopoverContent>
                    </Popover>

                    <div className="flex items-center gap-2">
                        {/* Кнопка отмены (рендерится только если передана функция onCancel) */}
                        {onCancel && (
                            <Button
                                variant="ghost"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className={cn("rounded-full font-medium hover:bg-destructive/10 hover:text-destructive", compact ? "h-8 text-xs px-3" : "px-4")}
                            >
                                Отмена
                            </Button>
                        )}

                        <Button
                            onClick={handleSubmit}
                            disabled={!content.trim() || isSubmitting}
                            className={cn("rounded-full font-bold transition-transform active:scale-95", compact ? "h-8 text-xs px-4" : "px-6")}
                        >
                            {isSubmitting ? "..." : submitLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
