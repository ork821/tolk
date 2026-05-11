import axios from "axios";

export const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);

export function createMockResponse<T>(data: T, delay = 600): Promise<T> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(data), delay);
    });
}
