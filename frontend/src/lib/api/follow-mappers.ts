import type {components} from "@/lib/api/v1";
import type {FollowListUser} from "@/lib/api/types";

type FollowerDto = components["schemas"]["GetUserFollowersDto"];
type FollowersPageDto = components["schemas"]["PagedUserFollowersDto"];
type FollowDto = components["schemas"]["GetUserFollowsDto"];
type FollowsPageDto = components["schemas"]["PagedUserFollowsDto"];

export function mapFollowerToFollowListUser(user: FollowerDto): FollowListUser {
    const username = user.username ?? "";

    return {
        username,
        displayName: user.displayName ?? username,
        avatarUrl: null,
        isSubscribed: user.isSubscribed,
    };
}

export function mapFollowToFollowListUser(user: FollowDto): FollowListUser {
    const username = user.username ?? "";

    return {
        username,
        displayName: user.displayName ?? username,
        avatarUrl: null,
    };
}

export function mapFollowersPageToFollowListUsers(page: FollowersPageDto | undefined): FollowListUser[] {
    return page?.followers?.map(mapFollowerToFollowListUser) ?? [];
}

export function mapFollowsPageToFollowListUsers(page: FollowsPageDto | undefined): FollowListUser[] {
    return page?.follows?.map(mapFollowToFollowListUser) ?? [];
}
