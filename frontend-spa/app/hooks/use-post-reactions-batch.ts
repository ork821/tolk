import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {getPostsMetadata} from "~/lib/api";

export function usePostReactionsBatch(postIds: string[]) {
    const uniquePostIds = useMemo(() => Array.from(new Set(postIds)).filter(Boolean), [postIds]);

    return useQuery({
        queryKey: ["posts", "reactions", "batch", uniquePostIds],
        queryFn: async () => {
            const metadata = await getPostsMetadata(uniquePostIds);
            return Object.fromEntries(
                Object.entries(metadata).map(([postId, item]) => [postId, item.reactions])
            );
        },
        enabled: uniquePostIds.length > 0,
        staleTime: 15_000,
    });
}
