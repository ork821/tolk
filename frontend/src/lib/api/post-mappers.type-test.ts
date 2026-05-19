import type {components} from "@/lib/api/v1";
import type {Post} from "@/lib/api/types";
import {mapPostDtoToPost, mapPostDtosToPosts} from "@/lib/api/post-mappers";

const postDto = {
    id: 42,
    title: "Thread title",
    content: "Thread body",
    parentPostId: 12,
    authorUsername: "alice",
    authorDisplayName: "Alice",
    isCommentsEnabled: true,
    commentsCount: 3,
    repliesCount: 1,
    createdAt: "2026-05-19T00:00:00.000Z",
} satisfies components["schemas"]["PostDto"];

const post: Post = mapPostDtoToPost(postDto);
const posts: Post[] = mapPostDtosToPosts([postDto]);

void post;
void posts;
