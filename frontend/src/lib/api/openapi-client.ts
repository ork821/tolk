import createClient from "openapi-fetch";
import type {ClientPathsWithMethod, MethodResponse} from "openapi-fetch";

import type {paths} from "@/lib/api/v1";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export const api = createClient<paths>({
    baseUrl: apiBaseUrl,
    credentials: "include",
});

export type ApiPaths = paths;
export type ApiResponse<
    Method extends "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace",
    Path extends ClientPathsWithMethod<typeof api, Method>,
> = MethodResponse<typeof api, Method, Path>;
