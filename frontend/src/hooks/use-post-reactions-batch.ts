import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {getPostReactionsBatch} from "@/lib/api";

export function usePostReactionsBatch(postIds: string[]) {
    const uniquePostIds = useMemo(() => Array.from(new Set(postIds)).filter(Boolean), [postIds]);

    return useQuery({
        queryKey: ["posts", "reactions", "batch", uniquePostIds],
        queryFn: () => getPostReactionsBatch(uniquePostIds),
        enabled: uniquePostIds.length > 0,
        staleTime: 15_000,
    });
}
