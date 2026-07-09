import createClient from "openapi-fetch";
import type {components, paths} from "@/lib/api/v1";

const accessTokenStorageKey = "tolk.accessToken";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
const retryableRequests = new WeakMap<Request, Request>();

export function getAccessToken() {
    if (accessToken) return accessToken;
    if (typeof window === "undefined") return null;

    accessToken = window.localStorage.getItem(accessTokenStorageKey);
    return accessToken;
}

export function setAccessToken(token: string) {
    accessToken = token;

    if (typeof window !== "undefined") {
        window.localStorage.setItem(accessTokenStorageKey, token);
    }
}

export function clearAccessToken() {
    accessToken = null;

    if (typeof window !== "undefined") {
        window.localStorage.removeItem(accessTokenStorageKey);
    }
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
export type CreateCommentBodyDto = ApiSchemas["CreateCommentBodyDto"];
export type CreatePostBodyDto = ApiSchemas["CreatePostBodyDto"];
export type CreateReplyCommentBodyDto = ApiSchemas["CreateReplyCommentBodyDto"];
export type CreateUpdateCommentDto = ApiSchemas["CreateUpdateCommentDto"];
export type CreateUpdatePostDto = ApiSchemas["CreateUpdatePostDto"];
export type GetReactionsDto = ApiSchemas["GetReactionsDto"];
export type GetUserByUsernameDto = ApiSchemas["GetUserByUsernameDto"];
export type GetUserFollowersDto = ApiSchemas["GetUserFollowersDto"];
export type GetUserFollowingGroupsDto = ApiSchemas["GetUserFollowingGroupsDto"];
export type GetUserFollowsDto = ApiSchemas["GetUserFollowsDto"];
export type OAuthLoginDto = ApiSchemas["OAuthLoginDto"];
export type OperationResultDto = ApiSchemas["OperationResultDto"];
export type PagedCommentsDto = ApiSchemas["PagedCommentsDto"];
export type PagedPostsDto = ApiSchemas["PagedPostsDto"];
export type PagedUserFollowersDto = ApiSchemas["PagedUserFollowersDto"];
export type PagedUserFollowsDto = ApiSchemas["PagedUserFollowsDto"];
export type PagedUserGroupFollowsDto = ApiSchemas["PagedUserGroupFollowsDto"];
export type PostMetadataDto = ApiSchemas["PostMetadataDto"];
export type PostPermissionsDto = ApiSchemas["PostPermissionsDto"];
export type PostDto = ApiSchemas["PostDto"];
export type ProblemDetails = ApiSchemas["ProblemDetails"];
export type ReactionTypeDto = ApiSchemas["ReactionTypeDto"];
export type UpdateCommentBodyDto = ApiSchemas["UpdateCommentBodyDto"];
export type UpdatePostBodyDto = ApiSchemas["UpdatePostBodyDto"];

export type AuthProvidersResponse = AuthProvidersDto;
export type LoginResponse = AuthTokenDto;
export type OAuthLoginPayload = OAuthLoginDto;
export type CreatePostPayload = CreatePostBodyDto;
export type CreatePostResponse = CreateUpdatePostDto;
export type CreateCommentPayload = CreateCommentBodyDto;
export type CreateReplyCommentPayload = CreateReplyCommentBodyDto;
export type User = GetUserByUsernameDto;
export type Post = PostDto;
export type Comment = CommentEntity;
export type PostsPageResponse = PagedPostsDto;
export type CommentsPageResponse = PagedCommentsDto;
export type PostMetadataByPostId = Record<string, PostMetadataDto>;
export type PostReactionsByPostId = Record<string, GetReactionsDto[]>;
export type FollowListUser = (GetUserFollowsDto | GetUserFollowersDto) & {
    isSubscribed?: boolean;
};

function createPostTitle(content: string) {
    const normalized = content.trim().replace(/\s+/g, " ");
    const title = normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;

    return title.length >= 10 ? title : title.padEnd(10, ".");
}

export async function createPost({
    content,
    title,
    parentPostId = null,
}: {
    content: string;
    title?: string;
    parentPostId?: string | null;
}): Promise<CreateUpdatePostDto> {
    const trimmedContent = content.trim();

    if (trimmedContent.length < 10 || trimmedContent.length > 500) {
        throw new Error("Post content length must be between 10 and 500 characters");
    }

    const body: CreatePostBodyDto = {
        title: title?.trim() || createPostTitle(trimmedContent),
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

    return data;
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
            postIds: uniquePostIds,
        },
    });

    if (error) {
        throw error;
    }

    return Object.fromEntries((data ?? []).map((item) => [item.id, item]));
}

export async function getUserFollows(
    username: string,
    {nextPageToken}: {nextPageToken: string | null}
): Promise<PagedUserFollowsDto> {
    const {data, error} = await client.GET("/v1/users/{username}/follows/users", {
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

export async function getUserFollowers(
    username: string,
    {nextPageToken}: {nextPageToken: string | null}
): Promise<PagedUserFollowersDto> {
    const {data, error} = await client.GET("/v1/users/{username}/followers", {
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
        ? await client.POST("/v1/users/{username}/follow", request)
        : await client.DELETE("/v1/users/{username}/follow", request);

    if (error) {
        throw error;
    }
}
