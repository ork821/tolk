"use client"; // Обязательно для работы хука useRouter

import {useRouter} from "next/navigation"; // Важно: импорт именно из next/navigation в App Router
import {Button} from "@/components/ui/button";
import {ArrowLeft} from "lucide-react";

export function BackButton() {
    const router = useRouter();

    return (
        <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.back()} // Нативная маршрутизация браузера "назад"
        >
            <ArrowLeft className="h-5 w-5" />
        </Button>
    );
}