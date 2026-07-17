import type {ReactNode} from "react";

export function generateStaticParams() {
    return [{username: "__spa__"}];
}

export const dynamicParams = false;

export default function UserRouteLayout({children}: {children: ReactNode}) {
    return children;
}
