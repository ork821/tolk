"use client";

export default function TrendsPage() {
    return (
        <div className="flex w-full flex-col gap-6 pb-20">
            <section className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight">Тренды</h1>
                <p className="text-muted-foreground">
                    Горячие обсуждения и авторы, на которых сейчас стоит обратить внимание.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold">Популярные посты</h2>
                    <span className="text-sm font-medium text-muted-foreground">Сегодня</span>
                </div>
                <div className="rounded-3xl border border-dashed bg-muted/10 p-10 text-center text-muted-foreground">
                    Тренды появятся здесь.
                </div>
            </section>

            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold">Авторы в тренде</h2>
                    <span className="text-sm font-medium text-muted-foreground">Рекомендации</span>
                </div>
                <div className="rounded-3xl border border-dashed bg-muted/10 p-10 text-center text-muted-foreground">
                    Рекомендации появятся здесь.
                </div>
            </section>
        </div>
    );
}
