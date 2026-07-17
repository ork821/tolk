"use client";

import {useNavigate} from "react-router";
import {Button} from "~/components/ui/button";
import {ArrowLeft} from "lucide-react";

export function BackButton() {
    const navigate = useNavigate();

    return (
        <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(-1)} // Нативная маршрутизация браузера "назад"
        >
            <ArrowLeft className="h-5 w-5" />
        </Button>
    );
}
