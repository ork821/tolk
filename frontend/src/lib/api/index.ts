import createClient from "openapi-fetch";
import type {components, paths} from "@/lib/api/v1";

const accessTokenStorageKey = "tolk.accessToken";
let accessToken: string | null = null;

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
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
    credentials: "include",
});

client.use({
    onRequest({request}) {
        const token = getAccessToken();

        if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
        }

        return request;
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
export type PostDto = ApiSchemas["PostDto"];
export type ProblemDetails = ApiSchemas["ProblemDetails"];
export type ReactionTypeDto = ApiSchemas["ReactionTypeDto"];
export type UpdateCommentBodyDto = ApiSchemas["UpdateCommentBodyDto"];
export type UpdatePostBodyDto = ApiSchemas["UpdatePostBodyDto"];

export type AuthProvidersResponse = AuthProvidersDto;
export type LoginResponse = AuthTokenDto;
export type OAuthLoginPayload = OAuthLoginDto;
export type CreatePostPayload = CreatePostBodyDto;
export type CreateCommentPayload = CreateCommentBodyDto;
export type CreateReplyCommentPayload = CreateReplyCommentBodyDto;
export type User = GetUserByUsernameDto;
export type Post = PostDto;
export type Comment = CommentEntity;
export type PostsPageResponse = PagedPostsDto;
export type CommentsPageResponse = PagedCommentsDto;
export type FollowListUser = (GetUserFollowsDto | GetUserFollowersDto) & {
    isSubscribed?: boolean;
};

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
