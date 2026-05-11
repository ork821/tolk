import {apiClient, createMockResponse} from "@/lib/api/client";
import {Comment, CommentsPageResponse, CreateCommentPayload, CreateReplyCommentPayload} from "@/lib/api/types";

export const commentsApi = {
    async getComments(postId: number, cursor?: string): Promise<CommentsPageResponse> {
        console.log(`[API] GET ${apiClient.defaults.baseURL}/posts/${postId}/comments?cursor=${cursor}`);

        return apiClient.get(`/v1/posts/${postId}/comments`, {
            params: {
                next_page_token: cursor
            }
        })
    },


    async getReplies(commentId: number, cursor?: string): Promise<CommentsPageResponse> {
        console.log(`[API] GET ${apiClient.defaults.baseURL}/comments/${commentId}/replies`);
        return apiClient.get(`/v1/comments/${commentId}/replies`, {
            params: {
                next_page_token: cursor
            }
        })
    },

    async createComment(payload: CreateCommentPayload): Promise<Comment> {
        console.log(`[API] POST ${apiClient.defaults.baseURL}/posts/${payload.postId}/comments`, payload);

        return apiClient.post(`/v1/posts/${payload.postId}/comment`, {
            content: payload.content,
            type: "Text",
        })
    },

    async createReplyComment(payload: CreateReplyCommentPayload): Promise<Comment> {
        console.log(`[API] POST ${apiClient.defaults.baseURL}/posts/${payload.commentId}/comments`, payload);

        return apiClient.post(`/v1/comments/${payload.commentId}/comment`, {
            content: payload.content,
            type: "Text"
        })
    },
};
