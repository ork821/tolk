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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-3 py-8 sm:px-4 md:px-6 lg:px-8">
        <section aria-labelledby="support-project" className="flex flex-col gap-5">
          <div className="max-w-xl">
            <h2 id="support-project" className="flex items-center gap-2 font-semibold">
              <Heart className="h-4 w-4" aria-hidden="true" />
              Помочь проекту
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Проект развивает один человек. Поддержка помогает оплачивать серверы и выпускать обновления быстрее.
            </p>
          </div>
          <div className="w-full max-w-md border bg-background p-4 shadow-sm sm:p-5">
            <form method="POST" action="https://yoomoney.ru/quickpay/confirm" className="space-y-4">
              <input type="hidden" name="receiver" value="410015095547680" />
              <input type="hidden" name="label" value={user?.id ?? ""} />
              <input type="hidden" name="quickpay-form" value="button" />

              <div>
                <label htmlFor="support-sum" className="mb-2 block text-sm font-medium">
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
                    className="h-11 w-full rounded-md border bg-background px-3 pr-10 text-base font-semibold tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-ring/30"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    ₽
                  </span>
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">Способ оплаты</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="cursor-pointer">
                    <input type="radio" name="paymentType" value="PC" className="peer sr-only" />
                    <span className="flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground peer-checked:border-foreground peer-checked:bg-accent peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      <img src="/io.svg" className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ЮMoney
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" name="paymentType" value="AC" defaultChecked className="peer sr-only" />
                    <span className="flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground peer-checked:border-foreground peer-checked:bg-accent peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Картой
                    </span>
                  </label>
                </div>
              </fieldset>

              <button
                type="submit"
                className="cursor-pointer inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Перейти к оплате
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="text-xs leading-5 text-muted-foreground">
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
