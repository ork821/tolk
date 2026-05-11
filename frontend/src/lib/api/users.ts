import {apiClient, createMockResponse} from "@/lib/api/client";
import {
    ConnectionType,
    FollowListPageResponse,
    FollowListUser,
    ProfileUser,
    ToggleSubscriptionResponse,
    User,
} from "@/lib/api/types";

const CURRENT_USER: User = {
    id: "user_123",
    displayName: "Frontend Ninja",
    username: "react_ninja",
    avatarUrl: "https://github.com/shadcn.png",
};

const MOCK_USERS: FollowListUser[] = [
    {
        displayName: "Design Notes",
        username: "design_notes",
        avatarUrl: "https://github.com/radix-ui.png",
        isSubscribed: true,
    },
    {
        displayName: "Product Hunt RU",
        username: "product_ru",
        avatarUrl: "https://github.com/shadcn.png",
        isSubscribed: false,
    },
    {
        displayName: "Web Platform",
        username: "web_platform",
        avatarUrl: "https://github.com/vercel.png",
        isSubscribed: true,
    },
    {
        displayName: "Анна Морозова",
        username: "anna_m",
        avatarUrl: "https://github.com/leerob.png",
        isSubscribed: false,
    },
    {
        displayName: "Илья Код",
        username: "ilya_code",
        avatarUrl: "https://github.com/rauchg.png",
        isSubscribed: true,
    },
];

export const usersApi = {
    async getSession(): Promise<User | null> {
        console.log(`[API] GET ${apiClient.defaults.baseURL}/auth/session`);
        return createMockResponse(CURRENT_USER, 500);
    },

    async socialLogin(provider: string): Promise<User> {
        const type = provider.toLowerCase();
        const endpointByProvider: Record<string, string> = {
            yandex: "/auth/callback/yandex",
            vk: "/auth/callback/vk",
        };

        console.log(`[API] GET ${apiClient.defaults.baseURL}${endpointByProvider[type] ?? "/auth"}`);

        return createMockResponse({
            id: `user_${type}_${Math.floor(Math.random() * 1000)}`,
            displayName: `${type === "vk" ? "VK" : "Yandex"} User`,
            username: `${type}_ninja`,
            avatarUrl: "https://github.com/shadcn.png",
        }, 1200);
    },

    async getProfile(username: string): Promise<ProfileUser> {
        console.log(`[API] GET ${apiClient.defaults.baseURL}/users/${username}`);

        return createMockResponse({
            displayName: username === CURRENT_USER.username ? CURRENT_USER.displayName : "Frontend Ninja",
            username,
            avatarUrl: "https://github.com/shadcn.png",
            description: "Пишу код, пью кофе. Учу людей делать красивые и быстрые интерфейсы на Next.js.\n\nСтарший разработчик в @AcmeCorp",
            stats: {
                following: 142,
                followers: 1042,
            },
            isSubscribed: username !== CURRENT_USER.username,
        }, 400);
    },

    getFollows(username: string) {
        console.log(`[API] GET ${username}/follows/users`);
        return apiClient.get<FollowListUser[]>(`/v1/users/${username}/follows/users`);
    },


    getFollowers(username: string) {
        console.log(`[API] GET ${username}/followers`);
        return apiClient.get<FollowListUser[]>(`/v1/users/${username}/followers`);
    },

    async toggleSubscription(username: string, shouldSubscribe: boolean): Promise<ToggleSubscriptionResponse> {
        console.log(`[API] ${shouldSubscribe ? "POST" : "DELETE"} ${apiClient.defaults.baseURL}/users/${username}/subscription`);
        return createMockResponse({username, isSubscribed: shouldSubscribe}, 350);
    },

    async getTrendingAuthors(): Promise<FollowListUser[]> {
        console.log(`[API] GET ${apiClient.defaults.baseURL}/trends/authors`);
        return createMockResponse(MOCK_USERS.slice(0, 3), 500);
    },
};
