export interface User {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string;
}

export interface PostAuthor {
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

export interface PostStats {
    comments: number;
    likes: number;
    reposts: number;
}

export interface Post {
    authorAvatar: string | undefined;
    id: number;
    title: string;
    parentPostId: number;
    authorUsername: string;
    authorDisplayName: string;
    content: string;
    commentsEnabled: boolean;
    commentsCount: number;
    repliesCount: number;
    createdAt: string;
}

export interface PostsPageResponse {
    posts: Post[];
    nextCursor: number | null;
}

export type PostThreadResponse = Post[];

export interface SearchPostsResponse {
    posts: Post[];
}

export interface ProfileUser {
    displayName: string;
    username: string;
    description: string;
    stats: {
        following: number;
        followers: number;
    };
    avatarUrl?: string;
    coverUrl?: string;
    isSubscribed?: boolean;
}

export interface FollowListUser {
    displayName: string;
    username: string;
    avatarUrl: string | null;
    isSubscribed?: boolean;
}

export interface FollowListPageResponse {
    users: FollowListUser[];
    nextCursor: number | null;
}

export type ConnectionType = "followers" | "following";

export interface ToggleSubscriptionResponse {
    username: string;
    isSubscribed: boolean;
}

export interface Comment {
    id: number;
    authorUsername: string;
    authorDisplayName: string;
    authorAvatar: string | undefined;
    content: string;
    replyCount: number;
    createdAt: string;
}

export interface CommentsPageResponse {
    comments: Comment[];
    nextPageToken: string | undefined;
}

export interface CreatePostPayload {
    content: string;
}

export interface CreateCommentPayload {
    postId: number;
    content: string;
}

export interface CreateReplyCommentPayload {
    commentId: number;
    content: string;
}
