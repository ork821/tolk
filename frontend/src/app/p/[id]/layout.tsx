import type {ReactNode} from "react";

export function generateStaticParams() {
    return [{id: "__spa__"}];
}

export const dynamicParams = false;

export default function PostRouteLayout({children}: {children: ReactNode}) {
    return children;
}
