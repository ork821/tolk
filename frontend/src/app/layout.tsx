import type {Metadata} from "next";
import {Geist_Mono, Noto_Sans} from "next/font/google";
import "./globals.css";
import {Header} from "@/components/layout/header";
import {Sidebar} from "@/components/layout/sidebar";
import QueryProvider from "@/components/providers/query-provider";

const notoSans = Noto_Sans({
    subsets: ["latin", "cyrillic"],
    variable: "--font-sans",
    display: "swap",
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "ТОЛК",
    description: "Социальная лента ТОЛК",
    icons: {
        icon: "/icon_bg.svg",
        shortcut: "/icon_bg.svg",
        apple: "/icon_bg.svg",
    },
};

export default function RootLayout({children}: { children: React.ReactNode; }) {
    return (
        <html lang="ru" className="light">
        <body className={`${notoSans.variable} ${geistMono.variable} min-h-screen bg-background antialiased font-sans`}>
        <QueryProvider>
            <div className="relative flex min-h-screen flex-col">
                <Header/>
                <div
                    className="w-full flex-1 items-start md:grid md:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
                    {/* Левый сайдбар: скрыт на мобилках, прилипает при скролле на десктопе */}
                    <aside
                        className="fixed top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 border-r md:sticky md:block">
                        <Sidebar/>
                    </aside>

                    {/* Основной контент */}
                    <main className="flex w-full flex-col overflow-hidden">
                        <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8">
                            <div className="mx-auto w-full max-w-none lg:max-w-3xl 2xl:max-w-4xl">
                                {/* Wider feed on large screens, compact and fluid on smaller devices */}
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </QueryProvider>
        </body>
        </html>
    );
}
