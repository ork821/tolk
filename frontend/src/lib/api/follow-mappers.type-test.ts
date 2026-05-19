import type {components} from "@/lib/api/v1";
import type {FollowListUser} from "@/lib/api/types";
import {
    mapFollowerToFollowListUser,
    mapFollowersPageToFollowListUsers,
    mapFollowToFollowListUser,
    mapFollowsPageToFollowListUsers,
} from "@/lib/api/follow-mappers";

const follower = {
    username: "alice",
    displayName: "Alice",
    isSubscribed: true,
} satisfies components["schemas"]["GetUserFollowersDto"];

const follow = {
    username: "bob",
    displayName: "Bob",
} satisfies components["schemas"]["GetUserFollowsDto"];

const followerUser: FollowListUser = mapFollowerToFollowListUser(follower);
const followUser: FollowListUser = mapFollowToFollowListUser(follow);

const followerPageUsers: FollowListUser[] = mapFollowersPageToFollowListUsers({
    followers: [follower],
    nextPageToken: "next",
});

const followPageUsers: FollowListUser[] = mapFollowsPageToFollowListUsers({
    follows: [follow],
    nextPageToken: "next",
});

void followerUser;
void followUser;
void followerPageUsers;
void followPageUsers;
