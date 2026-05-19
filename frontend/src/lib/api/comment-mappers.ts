import type {components} from "@/lib/api/v1";
import type {Comment} from "@/lib/api/types";

type CommentEntity = components["schemas"]["CommentEntity"];
type CommentsPageDto = components["schemas"]["PagedCommentsDto"];

export function mapCommentEntityToComment(comment: CommentEntity): Comment {
    return {
        id: comment.id ?? 0,
        authorUsername: comment.authorUsername ?? "",
        authorDisplayName: comment.authorDisplayName ?? comment.authorUsername ?? "",
        authorAvatar: undefined,
        content: comment.content ?? "",
        replyCount: comment.repliesCount ?? 0,
        createdAt: comment.createdAt ?? new Date(0).toISOString(),
    };
}

export function mapCommentsPageToComments(page: CommentsPageDto | undefined): Comment[] {
    return page?.comments?.map(mapCommentEntityToComment) ?? [];
}
