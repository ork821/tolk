"use client";

import {Avatar, AvatarFallback, AvatarImage} from "~/components/ui/avatar";
import {UserRoundX} from "lucide-react";

export const deletedAuthorLabel = "Удалённый пользователь";

export function getAuthorDisplayName(author: {displayName: string; isDeleted: boolean}) {
    return author.isDeleted ? deletedAuthorLabel : author.displayName;
}

interface UserAvatarProps {
    username: string;
    avatarUrl?: string | null;
    isDeleted?: boolean;
    className?: string;
    fallbackClassName?: string;
    imageClassName?: string;
}

export function UserAvatar({
    username,
    avatarUrl,
    isDeleted = false,
    className,
    fallbackClassName,
    imageClassName,
}: UserAvatarProps) {
    return (
        <Avatar className={className}>
            {!isDeleted && avatarUrl && <AvatarImage src={avatarUrl} alt={username} className={imageClassName} />}
            <AvatarFallback className={fallbackClassName}>
                {isDeleted ? <UserRoundX className="size-1/2 text-muted-foreground" /> : username[0]?.toUpperCase()}
            </AvatarFallback>
        </Avatar>
    );
}
