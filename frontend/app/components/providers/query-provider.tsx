"use client";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {lazy, Suspense, useState} from "react";

const ReactQueryDevtools = import.meta.env.DEV
    ? lazy(async () => {
        const module = await import("@tanstack/react-query-devtools");
        return {default: module.ReactQueryDevtools};
    })
    : null;

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    // Создаем QueryClient внутри useState, чтобы он не пересоздавался при ререндерах
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // Данные считаются свежими 1 минуту
                        retry: 1,            // В случае ошибки пробуем еще 1 раз
                        refetchOnWindowFocus: false, // Не спамим запросами при переключении вкладок
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* Инструменты разработчика — мастхэв для отладки кэша */}
            {ReactQueryDevtools && (
                <Suspense fallback={null}>
                    <ReactQueryDevtools initialIsOpen={false} />
                </Suspense>
            )}
        </QueryClientProvider>
    );
}
