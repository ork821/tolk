"use client";

import {Avatar, AvatarFallback, AvatarImage} from "~/components/ui/avatar";

interface UserAvatarProps {
    username: string;
    avatarUrl?: string | null;
    className?: string;
    fallbackClassName?: string;
    imageClassName?: string;
}

export function UserAvatar({
    username,
    avatarUrl,
    className,
    fallbackClassName,
    imageClassName,
}: UserAvatarProps) {
    return (
        <Avatar className={className}>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={username} className={imageClassName} />}
            <AvatarFallback className={fallbackClassName}>
                {username[0]?.toUpperCase()}
            </AvatarFallback>
        </Avatar>
    );
}
