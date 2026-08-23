import {ArrowUpRight, CreditCard, Heart, WalletCards} from "lucide-react";
import {Link} from "react-router";
import {useAuth} from "~/hooks/use-auth";

const FOOTER_LINKS = [
  {label: "О нас", to: "/about"},
  {label: "Конфиденциальность", to: "/privacy"},
  {label: "Условия использования", to: "/terms"},
  {label: "Правила сообщества", to: "/rules"},
] as const;

export function Footer() {
  const {user} = useAuth();

  return (
    <footer className="mt-auto border-t bg-muted/20">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-3 py-6 sm:px-4 md:px-6 lg:px-8">
        <section aria-labelledby="support-project" className="grid items-center gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)] md:gap-6">
          <div className="max-w-md">
            <h2 id="support-project" className="flex items-center gap-2 font-semibold">
              <Heart className="h-4 w-4" aria-hidden="true" />
              Помочь проекту
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Проект развивает один человек. Поддержка помогает оплачивать серверы и выпускать обновления быстрее.
            </p>
          </div>
          <div className="w-full rounded-lg border bg-background p-3 shadow-sm">
            <form method="POST" action="https://yoomoney.ru/quickpay/confirm" className="grid items-end gap-3 sm:grid-cols-[7rem_minmax(12rem,1fr)] lg:grid-cols-[7rem_minmax(12rem,1fr)_9.5rem]">
              <input type="hidden" name="receiver" value="410015095547680" />
              <input type="hidden" name="label" value={user?.id ?? ""} />
              <input type="hidden" name="quickpay-form" value="button" />

              <div>
                <label htmlFor="support-sum" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Сумма поддержки
                </label>
                <div className="relative">
                  <input
                    id="support-sum"
                    type="number"
                    name="sum"
                    defaultValue="100"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    required
                    data-type="number"
                    className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm font-semibold tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-ring/30"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    ₽
                  </span>
                </div>
              </div>

              <fieldset>
                <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Способ оплаты</legend>
                <div className="grid grid-cols-2 rounded-md border bg-muted/40 p-1">
                  <label className="cursor-pointer">
                    <input type="radio" name="paymentType" value="PC" className="peer sr-only" />
                    <span className="flex h-8 items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      <img src="/io.svg" className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ЮMoney
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" name="paymentType" value="AC" defaultChecked className="peer sr-only" />
                    <span className="flex h-8 items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Картой
                    </span>
                  </label>
                </div>
              </fieldset>

              <button
                type="submit"
                className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:col-span-2 lg:col-span-1"
              >
                Помочь
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="text-xs leading-4 text-muted-foreground sm:col-span-2 lg:col-span-3">
                Оплата откроется на защищённой странице ЮMoney.
              </p>
            </form>
          </div>
        </section>

        <div
            className="flex flex-col gap-4 border-t pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Служебные ссылки" className="flex flex-wrap gap-x-5 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="shrink-0">© {new Date().getFullYear()} ТОЛК</p>
        </div>
      </div>
    </footer>
  );
}
