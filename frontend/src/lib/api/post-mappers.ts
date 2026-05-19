import type {components} from "@/lib/api/v1";
import type {Post} from "@/lib/api/types";

type PostDto = components["schemas"]["PostDto"];

export function mapPostDtoToPost(post: PostDto): Post {
    return {
        authorAvatar: undefined,
        id: post.id ?? 0,
        title: post.title ?? "",
        parentPostId: post.parentPostId ?? 0,
        authorUsername: post.authorUsername ?? "",
        authorDisplayName: post.authorDisplayName ?? post.authorUsername ?? "",
        content: post.content ?? "",
        commentsEnabled: post.isCommentsEnabled ?? true,
        commentsCount: post.commentsCount ?? 0,
        repliesCount: post.repliesCount ?? 0,
        createdAt: post.createdAt ?? new Date(0).toISOString(),
    };
}

export function mapPostDtosToPosts(posts: PostDto[] | undefined): Post[] {
    return posts?.map(mapPostDtoToPost) ?? [];
}
