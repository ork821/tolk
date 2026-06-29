"use client";

import {useQueryClient} from "@tanstack/react-query";
import {SubmitForm} from "@/components/input-form";
import {createPost} from "@/lib/api";

export default function Home() {
  const queryClient = useQueryClient();

  const handleCreatePost = async (content: string) => {
      await createPost({content});
      await queryClient.invalidateQueries({queryKey: ["posts"]});
  };

  return (
      <div className="flex flex-col w-full">
          <SubmitForm onSubmit={handleCreatePost} />

          {/*<PostFeed*/}
          {/*    queryKey={["posts", "feed", "home"]}*/}
          {/*    fetchFn={postsApi.getHomeFeed}*/}
          {/*/>*/}
    </div>
  );
}
