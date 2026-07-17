import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type {Route} from "./+types/root";
import {Header} from "~/components/layout/header";
import {Sidebar} from "~/components/layout/sidebar";
import QueryProvider from "~/components/providers/query-provider";
import "./app.css";

export const links: Route.LinksFunction = () => [
  {rel: "icon", href: "/icon_bg.svg"},
  {rel: "shortcut icon", href: "/icon_bg.svg"},
  {rel: "apple-touch-icon", href: "/icon_bg.svg"},
];

export function meta() {
  return [
    {title: "ТОЛК"},
    {name: "description", content: "Социальная платформа для постов, ответов и обсуждений."},
  ];
}

export function Layout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ru" className="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <div className="w-full flex-1 items-start md:grid md:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="fixed top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 border-r md:sticky md:block">
                <Sidebar />
              </aside>
              <main className="flex w-full flex-col overflow-hidden">
                <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8">
                  <div className="mx-auto w-full max-w-none lg:max-w-3xl 2xl:max-w-4xl">
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </QueryProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({error}: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }

  const details = isRouteErrorResponse(error)
    ? error.statusText || "Произошла непредвиденная ошибка."
    : import.meta.env.DEV && error instanceof Error
      ? error.message
      : "Произошла непредвиденная ошибка.";

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-3xl font-black">Ошибка</h1>
      <p className="mt-2 text-muted-foreground">{details}</p>
    </main>
  );
}

function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-8 h-32 w-32">
        <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black text-primary">404</span>
        </div>
      </div>
      <h1 className="mb-4 text-4xl font-black tracking-tight">Страница не найдена</h1>
      <p className="mb-10 max-w-md text-muted-foreground">
        Возможно, адрес устарел или такой страницы больше нет.
      </p>
      <Link
        to="/"
        className="inline-flex h-12 items-center rounded-full bg-primary px-8 font-bold text-primary-foreground shadow-lg transition-transform hover:shadow-primary/20 active:scale-95"
      >
        Вернуться на главную
      </Link>
    </main>
  );
}
