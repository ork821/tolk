import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet";
import {Menu} from "lucide-react";
import {Sidebar} from "./sidebar";
import {Button} from "@/components/ui/button";

export function MobileNav() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-70 p-0">
                <SheetHeader>
                    <SheetTitle className="p-4 font-bold border-b text-xl">Меню</SheetTitle>
                </SheetHeader>
                {/*<div className="p-4 font-bold border-b">Navigation</div>*/}
                <Sidebar />
            </SheetContent>
        </Sheet>
    );
}