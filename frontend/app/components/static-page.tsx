import type {ReactNode} from "react";

type StaticPageProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function StaticPage({title, description, children}: StaticPageProps) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-12">
      <header className="border-b pb-6">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
      </header>
      <div className="space-y-8 text-[16px] leading-7 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-muted-foreground">
        {children}
      </div>
    </article>
  );
}
