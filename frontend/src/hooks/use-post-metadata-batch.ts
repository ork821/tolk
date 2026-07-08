import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {getPostsMetadata} from "@/lib/api";

export function usePostMetadataBatch(postIds: string[]) {
    const uniquePostIds = useMemo(() => Array.from(new Set(postIds)).filter(Boolean), [postIds]);

    return useQuery({
        queryKey: ["posts", "metadata", "batch", uniquePostIds],
        queryFn: () => getPostsMetadata(uniquePostIds),
        enabled: uniquePostIds.length > 0,
        staleTime: 15_000,
    });
}
