import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {getCommentsMetadata} from "~/lib/api";

export function useCommentMetadataBatch(commentIds: string[]) {
    const uniqueCommentIds = useMemo(() => Array.from(new Set(commentIds)).filter(Boolean), [commentIds]);

    return useQuery({
        queryKey: ["comments", "metadata", "batch", uniqueCommentIds],
        queryFn: () => getCommentsMetadata(uniqueCommentIds),
        enabled: uniqueCommentIds.length > 0,
        staleTime: 15_000,
    });
}
