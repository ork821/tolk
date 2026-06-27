"use client";

import {SubmitForm} from "@/components/input-form";

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
