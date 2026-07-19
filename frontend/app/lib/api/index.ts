import createClient from "openapi-fetch";
import type {components, paths} from "~/lib/api/v1";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
const retryableRequests = new WeakMap<Request, Request>();

export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token: string) {
    accessToken = token;
}

export function clearAccessToken() {
    accessToken = null;
}

export const client = createClient<paths>({
    baseUrl: apiBaseUrl,
    credentials: "include",
});

async function refreshAccessToken() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const response = await fetch(`${apiBaseUrl}/v1/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });

        if (!response.ok) {
            clearAccessToken();
            return null;
        }

        const authToken = (await response.json()) as AuthTokenDto;
        setAccessToken(authToken.accessToken);

        return authToken.accessToken;
    })().finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

client.use({
    onRequest({request}) {
        const token = getAccessToken();

        if (token && !request.headers.has("Authorization")) {
            request.headers.set("Authorization", `Bearer ${token}`);
        }

        if (!new URL(request.url).pathname.endsWith("/v1/auth/refresh")) {
            retryableRequests.set(request, request.clone());
        }

        return request;
    },
    async onResponse({request, response}) {
        const retryRequest = retryableRequests.get(request);
        retryableRequests.delete(request);

        if (response.status !== 401 || !retryRequest || new URL(request.url).pathname.endsWith("/v1/auth/refresh")) {
            return response;
        }

        const token = await refreshAccessToken();
        if (!token) {
            return response;
        }

        const retryHeaders = new Headers(retryRequest.headers);
        retryHeaders.set("Authorization", `Bearer ${token}`);

        return fetch(new Request(retryRequest, {headers: retryHeaders}));
    },
});

export type ApiPaths = paths;
export type ApiSchemas = components["schemas"];

export type AuthProvidersDto = ApiSchemas["AuthProvidersDto"];
export type AuthTokenDto = ApiSchemas["AuthTokenDto"];
export type CommentEntity = ApiSchemas["CommentEntity"];
export type CommentMetadataDto = ApiSchemas["CommentMetadataDto"];
export type CreateCommentBodyDto = ApiSchemas["CreateCommentBodyDto"];
export type CreatePostBodyDto = ApiSchemas["CreatePostBodyDto"];
export type CreateReplyCommentBodyDto = ApiSchemas["CreateReplyCommentBodyDto"];
export type CreateUpdateCommentDto = ApiSchemas["CreateUpdateCommentDto"];
export type CreateUpdatePostDto = ApiSchemas["CreateUpdatePostDto"];
export type GetReactionsDto = ApiSchemas["GetReactionsDto"];
export type GetUserByUsernameDto = ApiSchemas["GetUserByUsernameDto"];
export type GetUserSubscribersDto = ApiSchemas["GetUserSubscribersDto"];
export type GetUserSubscribesDto = ApiSchemas["GetUserSubscribesDto"];
export type OAuthLoginDto = ApiSchemas["OAuthLoginDto"];
export type OperationResultDto = ApiSchemas["OperationResultDto"];
export type PagedCommentsDto = ApiSchemas["PagedCommentsDto"];
export type PagedPostsDto = ApiSchemas["PagedPostsDto"];
export type PagedUserSubscribersDto = ApiSchemas["PagedUserSubscribersDto"];
export type PagedUserSubscribesDto = ApiSchemas["PagedUserSubscribesDto"];
export type PostMetadataDto = ApiSchemas["PostMetadataDto"];
export type PostPermissionsDto = ApiSchemas["PostPermissionsDto"];
export type PostDto = ApiSchemas["PostDto"];
export type ProblemDetails = ApiSchemas["ProblemDetails"];
export type ReactionTypeDto = ApiSchemas["ReactionTypeDto"];
export type UpdateCommentBodyDto = ApiSchemas["UpdateCommentBodyDto"];
export type UpdatePostBodyDto = ApiSchemas["UpdatePostBodyDto"];
export type UpdateProfileInfoBodyDto = ApiSchemas["UpdateProfileInfoBodyDto"];
export type UpdateProfileInfoDto = ApiSchemas["UpdateProfileInfoDto"];

export type AuthProvidersResponse = AuthProvidersDto;
export type LoginResponse = AuthTokenDto;
export type OAuthLoginPayload = OAuthLoginDto;
export type CreatePostPayload = CreatePostBodyDto;
export type CreatePostResponse = CreateUpdatePostDto;
export type CreateCommentPayload = CreateCommentBodyDto;
export type CreateCommentResponse = CreateUpdateCommentDto;
export type CreateReplyCommentPayload = CreateReplyCommentBodyDto;
export type User = GetUserByUsernameDto;
export type Post = PostDto;
export type Comment = CommentEntity;
export type SearchUser = {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    subscribersCount: number;
    isSubscribed: boolean;
    isMe: boolean;
};
export type PostsPageResponse = PagedPostsDto;
export type CommentsPageResponse = PagedCommentsDto;
export type PostMetadataByPostId = Record<string, PostMetadataDto>;
export type CommentMetadataByCommentId = Record<string, CommentMetadataDto>;
export type PostReactionsByPostId = Record<string, GetReactionsDto[]>;
export type FollowListUser = (GetUserSubscribesDto | GetUserSubscribersDto) & {
    isSubscribed?: boolean;
};

export async function updateProfileInfo(body: UpdateProfileInfoBodyDto): Promise<UpdateProfileInfoDto> {
    const {data, error} = await client.PATCH("/v1/profile", {
        params: {
            path: {
                version: "1",
            },
        },
        body,
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to update profile");
    }

    return data;
}



export async function createPost({
    content,
    parentPostId = null,
}: {
    content: string;
    parentPostId?: string | null;
}): Promise<CreateUpdatePostDto> {
    const trimmedContent = content.trim();

    if (trimmedContent.length < 10 || trimmedContent.length > 500) {
        throw new Error("Post content length must be between 10 and 500 characters");
    }

    const body: CreatePostBodyDto = {
        type: 0,
        content: trimmedContent,
    };

    let requestObject = {
        params: {
            path: {
                version: "1",
            },
        },
        body,
    };

    const {data, error} = parentPostId ?
        await client.POST("/v1/posts/{post}", {
            params: {
                path: {
                    version: "1",
                    post: parentPostId
                },
            },
            body,
        }) :
        await client.POST("/v1/posts", requestObject);

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to create post");
    }

    return data ?? {};
}

export async function createComment({
    postId,
    content
}: {
    postId: string;
    content: string;
    parentCommentId?: string | null;
}): Promise<CreateUpdateCommentDto> {
    const trimmedContent = content.trim();

    if (trimmedContent.length === 0 || trimmedContent.length > 500) {
        throw new Error("Comment content length must be between 1 and 500 characters");
    }

    const {data, error} = await client.POST("/v1/posts/{post}/comments", {
        params: {
            path: {
                post: postId,
                version: "1",
            },
        },
        body: {
            type: 0,
            content: trimmedContent,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to create comment");
    }

    return data ?? {};
}

export async function createReplyComment({
    commentId,
    content,
}: {
    commentId: string;
    content: string;
}): Promise<CreateUpdateCommentDto> {
    const trimmedContent = content.trim();

    if (trimmedContent.length === 0 || trimmedContent.length > 500) {
        throw new Error("Comment content length must be between 1 and 500 characters");
    }

    const {data, error} = await client.POST("/v1/comments/{comment}/replies", {
        params: {
            path: {
                comment: commentId,
                version: "1",
            },
        },
        body: {
            type: 0,
            content: trimmedContent,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to create reply");
    }

    return data;
}

export async function getCommentReplies(
    commentId: string,
    {nextPageToken}: {nextPageToken: string | null}
): Promise<CommentsPageResponse> {
    const {data, error} = await client.GET("/v1/comments/{comment}/replies", {
        params: {
            path: {
                comment: commentId,
                version: "1",
            },
            query: nextPageToken ? {next_page_token: nextPageToken} : undefined,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to load comment replies");
    }

    return data;
}

export async function getCommentReactions(commentId: string): Promise<GetReactionsDto[]> {
    const {data, error} = await client.GET("/v1/comments/{comment}/reactions", {
        params: {
            path: {
                comment: commentId,
                version: "1",
            },
        },
    });

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function deleteComment(commentId: string): Promise<void> {
    const {error} = await client.DELETE("/v1/comments/{comment}", {
        params: {
            path: {
                comment: commentId,
                version: "1",
            },
        },
    });

    if (error) {
        throw error;
    }
}

export async function getCommentsMetadata(commentIds: string[]): Promise<CommentMetadataByCommentId> {
    const uniqueCommentIds = Array.from(new Set(commentIds)).filter(Boolean);
    if (uniqueCommentIds.length === 0) {
        return {};
    }

    const {data, error} = await client.POST("/v1/comments/metadata", {
        params: {
            path: {
                version: "1",
            },
        },
        body: {
            ids: uniqueCommentIds,
        },
    });

    if (error) {
        throw error;
    }

    return data;
}

export async function setCommentReaction(commentId: string, reaction: string, shouldSelect: boolean) {
    const request = {
        params: {
            path: {
                comment: commentId,
                reaction,
                version: "1",
            },
        },
    };

    const {error} = shouldSelect
        ? await client.PUT("/v1/comments/{comment}/reactions/{reaction}", request)
        : await client.DELETE("/v1/comments/{comment}/reactions/{reaction}", request);

    if (error) {
        throw error;
    }
}

export async function getUserPosts(
    username: string,
    {nextPageToken}: {nextPageToken: string | null}
): Promise<PagedPostsDto> {
    const {data, error} = await client.GET("/v1/users/{username}/posts", {
        params: {
            path: {
                username,
                version: "1",
            },
            query: nextPageToken ? {next_page_token: nextPageToken} : undefined,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to load user posts");
    }

    return data;
}

export async function getFeed(
    {nextPageToken}: {nextPageToken: string | null}
): Promise<PagedPostsDto> {
    const {data, error} = await client.GET("/v1/feed", {
        params: {
            path: {
                version: "1",
            },
            query: nextPageToken ? {next_page_token: nextPageToken} : undefined,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to load feed");
    }

    return data;
}

export async function getUserReplies(
    username: string,
    {nextPageToken}: {nextPageToken: string | null}
): Promise<PagedPostsDto> {
    const {data, error} = await client.GET("/v1/users/{username}/replies", {
        params: {
            path: {
                username,
                version: "1",
            },
            query: nextPageToken ? {next_page_token: nextPageToken} : undefined,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to load user posts");
    }

    return data;
}

export async function getUserReactedPosts(
    username: string,
    {nextPageToken}: {nextPageToken: string | null}
): Promise<PagedPostsDto> {
    const {data, error} = await client.GET("/v1/users/{username}/reacts", {
        params: {
            path: {
                username,
                version: "1",
            },
            query: nextPageToken ? {next_page_token: nextPageToken} : undefined,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to load user posts");
    }

    return data;
}

export async function getPostsMetadata(postIds: string[]): Promise<PostMetadataByPostId> {
    const uniquePostIds = Array.from(new Set(postIds)).filter(Boolean);
    if (uniquePostIds.length === 0) {
        return {};
    }

    const {data, error} = await client.POST("/v1/posts/metadata", {
        params: {
            path: {
                version: "1",
            },
        },
        body: {
            ids: uniquePostIds,
        },
    });

    if (error) {
        throw error;
    }

    return data;
}

export async function getUserSubscribes(
    username: string,
    {nextPageToken}: {nextPageToken: string | null}
): Promise<PagedUserSubscribesDto> {
    const {data, error} = await client.GET("/v1/users/{username}/subscribes/users", {
        params: {
            path: {
                username,
                version: "1",
            },
            query: nextPageToken ? {next_page_token: nextPageToken} : undefined,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to load user follows");
    }

    return data;
}

export async function getUserSubscribers(
    username: string,
    {nextPageToken}: {nextPageToken: string | null}
): Promise<PagedUserSubscribersDto> {
    const {data, error} = await client.GET("/v1/users/{username}/subscribers", {
        params: {
            path: {
                username,
                version: "1",
            },
            query: nextPageToken ? {next_page_token: nextPageToken} : undefined,
        },
    });

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Failed to load user followers");
    }

    return data;
}

export async function setUserFollow(username: string, shouldFollow: boolean) {
    const request = {
        params: {
            path: {
                username,
                version: "1",
            },
        },
    };
    const {error} = shouldFollow
        ? await client.POST("/v1/users/{username}/subscribe", request)
        : await client.DELETE("/v1/users/{username}/subscribe", request);

    if (error) {
        throw error;
    }
}

export async function searchUsers(query: string): Promise<SearchUser[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
        return [];
    }

    const searchParams = new URLSearchParams({
        q: normalizedQuery,
    });

    const response = await fetch(`${apiBaseUrl}/v1/users/search?${searchParams.toString()}`, {
        credentials: "include",
        headers: getAccessToken()
            ? {Authorization: `Bearer ${getAccessToken()}`}
            : undefined,
    });

    if (!response.ok) {
        throw new Error("Failed to search users");
    }

    return await response.json() as SearchUser[];
}
