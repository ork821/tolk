import {Card, CardContent, CardFooter, CardHeader} from "~/components/ui/card";
import {Skeleton} from "~/components/ui/skeleton";

export function PostCardSkeleton() {
    return (
        // Те же классы, что и в PostCard (границы, скругления)
        <Card className="w-full border-x-0 border-t-0 sm:border-x sm:border-t rounded-none sm:rounded-xl bg-transparent shadow-none sm:shadow-sm">
            <CardHeader className="flex flex-row items-start space-x-4 p-4 pb-2">
                {/* Аватарка */}
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        {/* Имя и Username */}
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>

                    <CardContent className="p-0 mt-2 space-y-2">
                        {/* Строки текста */}
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[60%]" />
                    </CardContent>

                    <CardFooter className="p-0 mt-4 flex justify-between max-w-md">
                        {/* Кнопки действий (4 кружочка) */}
                        <Skeleton className="h-8 w-12 rounded-full" />
                        <Skeleton className="h-8 w-12 rounded-full" />
                        <Skeleton className="h-8 w-12 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </CardFooter>
                </div>
            </CardHeader>
        </Card>
    );
}