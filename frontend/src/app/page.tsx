"use client";

import {useQueryClient} from "@tanstack/react-query";
import {SubmitForm} from "@/components/input-form";
import {PostFeed} from "@/components/post-feed";
import {createPost, getFeed} from "@/lib/api";

export default function Home() {
  const queryClient = useQueryClient();
  const feedQueryKey = ["posts", "feed", "home"];

  const handleCreatePost = async (content: string) => {
      await createPost({content});
      await queryClient.invalidateQueries({queryKey: feedQueryKey});
  };

  return (
      <div className="flex flex-col w-full">
          <SubmitForm onSubmit={handleCreatePost} />

          <PostFeed
              queryKey={feedQueryKey}
              fetchFn={getFeed}
          />
    </div>
  );
}
