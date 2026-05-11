import Link from "next/link";
import {Button} from "@/components/ui/button";
import {Compass} from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            {/* Custom Spinning Loader with Icon */}
            <div className="relative w-32 h-32 mb-8">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 border-4 border-primary/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                
                {/* Inner pulsing ring (reverse spin) */}
                <div className="absolute inset-4 border-2 border-muted-foreground/20 rounded-full animate-[spin_3s_linear_infinite_reverse]">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                </div>

                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Compass className="w-12 h-12 text-primary animate-pulse" />
                </div>
            </div>

            <h1 className="text-4xl font-black tracking-tight mb-4">404 — Потеряшки!</h1>
            
            <div className="max-w-md space-y-4 mb-10">
                <p className="text-xl text-foreground font-medium">
                    Упс! Кажется, эта страница ушла в астрал и забыла дорогу назад. 
                </p>
                <p className="text-muted-foreground">
                    Мы честно пытались её найти, но обнаружили только этот очень важный крутящийся круг и заблудившийся компас. 
                    Возможно, её съел очень голодный баг или она просто решила взять отпуск.
                </p>
            </div>

            <Button asChild size="lg" className="rounded-full px-8 font-bold h-12 shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
                <Link href="/">Вернуться на главную</Link>
            </Button>
        </div>
    );
}
