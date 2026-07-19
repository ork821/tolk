import {lazy, Suspense, useEffect, useState} from "react";

type EmojiSelection = {native?: string};

const LazyPicker = lazy(async () => {
  const module = await import("@emoji-mart/react");
  return {default: module.default};
});

export function EmojiPicker({onEmojiSelect}: {onEmojiSelect: (emoji: EmojiSelection) => void}) {
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    void import("@emoji-mart/data").then((module) => {
      if (active) setData(module.default);
    });
    return () => { active = false; };
  }, []);

  if (!data) {
    return <div className="flex h-96 w-80 items-center justify-center text-sm text-muted-foreground">Загрузка эмодзи...</div>;
  }

  return (
    <Suspense fallback={<div className="flex h-96 w-80 items-center justify-center text-sm text-muted-foreground">Загрузка...</div>}>
      <LazyPicker data={data} onEmojiSelect={onEmojiSelect} theme="dark" locale="ru" previewPosition="none" />
    </Suspense>
  );
}
