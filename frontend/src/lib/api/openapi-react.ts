"use client";

import createQueryClient from "openapi-react-query";

import {api} from "@/lib/api/openapi-client";

export const apiQuery = createQueryClient(api);
