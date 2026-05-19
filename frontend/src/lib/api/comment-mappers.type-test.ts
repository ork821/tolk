import type {components} from "@/lib/api/v1";
import type {Comment} from "@/lib/api/types";
import {mapCommentEntityToComment, mapCommentsPageToComments} from "@/lib/api/comment-mappers";

const commentEntity = {
    id: 7,
    authorUsername: "alice",
    authorDisplayName: "Alice",
    content: "Comment body",
    repliesCount: 2,
    createdAt: "2026-05-19T00:00:00.000Z",
} satisfies components["schemas"]["CommentEntity"];

const comment: Comment = mapCommentEntityToComment(commentEntity);
const comments: Comment[] = mapCommentsPageToComments({
    comments: [commentEntity],
    nextPageToken: "next",
});
const emptyComments: Comment[] = mapCommentsPageToComments(undefined);

void comment;
void comments;
void emptyComments;
