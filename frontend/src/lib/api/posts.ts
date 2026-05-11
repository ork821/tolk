import {apiClient, createMockResponse} from "@/lib/api/client";
import {Comment, CreatePostPayload, Post, PostsPageResponse, PostThreadResponse, SearchPostsResponse} from "@/lib/api/types";


export interface FeedQuery {
    pageParam?: number;
}

export const postsApi = {
    // async getHomeFeed({pageParam = 0}: FeedQuery): Promise<PostsPageResponse> {
    //     console.log(`[API] GET ${apiClient.defaults.baseURL}/feed?cursor=${pageParam}`);
    //
    //     const posts = Array.from({length: 10}).map((_, index) => ({
    //         ...BASE_POST,
    //         id: pageParam * 10 + index + 1,
    //     }));
    //
    //     return createMockResponse({
    //         posts,
    //         nextCursor: pageParam < 5 ? pageParam + 1 : null,
    //     }, 1000);
    // },

    async getMyPosts({pageParam = 0}: FeedQuery): Promise<PostsPageResponse> {
        console.log(`[API] GET ${apiClient.defaults.baseURL}/me/posts?cursor=${pageParam}`);
        return createMockResponse({posts: [], nextCursor: null}, 700);
    },

    async getUserPosts(username: string, {pageParam = 0}: FeedQuery): Promise<PostsPageResponse> {
        console.log(`[API] GET ${apiClient.defaults.baseURL}/users/${username}/posts?cursor=${pageParam}`);
        return createMockResponse({posts: [], nextCursor: null}, 700);
    },
    //
    // async searchPosts(query: string): Promise<SearchPostsResponse> {
    //     console.log(`[API] GET ${apiClient.defaults.baseURL}/search/posts?query=${query}`);
    //
    //     if (!query.trim()) {
    //         return createMockResponse({posts: []}, 200);
    //     }
    //
    //     const posts = Array.from({length: 8}).map((_, index) => ({
    //         id: Date.now() + index,
    //         author: {
    //             displayName: `Результат поиска ${index + 1}`,
    //             username: `search_hit_${index + 1}`,
    //             avatarUrl: "https://github.com/shadcn.png",
    //         },
    //         content: `Контент, найденный по запросу "${query}". Это пример поста, который мы отображаем на странице поиска.`,
    //         createdAt: new Date().toISOString(),
    //         stats: {
    //             comments: Math.floor(Math.random() * 20),
    //             likes: Math.floor(Math.random() * 200),
    //             reposts: Math.floor(Math.random() * 10),
    //         },
    //     }));
    //
    //     return createMockResponse({posts}, 800);
    // },
    //
    // async getTrendingPosts(): Promise<Post[]> {
    //     console.log(`[API] GET ${apiClient.defaults.baseURL}/trends/posts`);
    //     return createMockResponse(TRENDING_POSTS, 500);
    // },

    async getPostThread(postId: number): Promise<PostThreadResponse> {
        console.log(`[API] GET ${apiClient.defaults.baseURL}/posts/${postId}/thread`);

        return apiClient.get(`/v1/posts/${postId}/thread`);
    },

    // async createPost(payload: CreatePostPayload): Promise<Post> {
    //     console.log(`[API] POST ${apiClient.defaults.baseURL}/posts`, payload);
    //
    //     return createMockResponse({
    //         ...BASE_POST,
    //         content: payload.content,
    //         createdAt: new Date().toISOString(),
    //         stats: {
    //             comments: 0,
    //             likes: 0,
    //             reposts: 0,
    //         },
    //     }, 500);
    // },

    async setPostReaction(postId: number, isLiked: boolean): Promise<{postId: number; isLiked: boolean}> {
        console.log(`[API] ${isLiked ? "POST" : "DELETE"} ${apiClient.defaults.baseURL}/posts/${postId}/reaction`);
        return createMockResponse({postId, isLiked}, 250);
    },
};
