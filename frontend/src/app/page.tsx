"use client";

import {PostFeed} from "@/components/post-feed";
import {SubmitForm} from "@/components/input-form";
import {postsApi} from "@/lib/api";

export default function Home() {
  return (
      <div className="flex flex-col w-full">
          <SubmitForm />

          {/*<PostFeed*/}
          {/*    queryKey={["posts", "feed", "home"]}*/}
          {/*    fetchFn={postsApi.getHomeFeed}*/}
          {/*/>*/}
    </div>
  );
}
