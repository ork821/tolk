import {Heart, MessageCircle, Share2} from "lucide-react";
import {Link} from "react-router";
import {StaticPage} from "~/components/static-page";

const SUPPORT_OPTIONS = [
  {icon: MessageCircle, title: "Оставить обратную связь", text: "Расскажите, чего не хватает и где платформа работает неудобно."},
  {icon: Share2, title: "Рассказать о ТОЛК", text: "Пригласите людей, с которыми вам действительно интересно общаться."},
  {icon: Heart, title: "Поддержать активностью", text: "Публикуйте посты, отвечайте авторам и помогайте новым обсуждениям начаться."},
] as const;

export default function SupportPage() {
  return (
    <StaticPage
      title="Помочь проекту"
      description="ТОЛК развивает один человек. Даже небольшое участие напрямую влияет на будущее платформы."
    >
      <title>Помочь проекту | ТОЛК</title>
      <meta name="description" content="Способы поддержать развитие платформы ТОЛК." />

      <div className="grid gap-6 sm:grid-cols-3">
        {SUPPORT_OPTIONS.map(({icon: Icon, title, text}) => (
          <section key={title} className="border-t pt-4">
            <Icon className="mb-3 h-5 w-5" aria-hidden="true" />
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>

      <section className="border-t pt-6">
        <h2>Финансовая поддержка</h2>
        <p>Безопасный способ финансовой поддержки появится после подключения платёжного сервиса. Реквизиты не будут собираться через личные сообщения или формы платформы.</p>
      </section>

      <Link to="/" className="inline-flex h-10 w-fit items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
        Перейти к обсуждениям
      </Link>
    </StaticPage>
  );
}
