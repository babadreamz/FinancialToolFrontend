import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export function Dialog(props) {
    return <DialogPrimitive.Root {...props} />;
}

export function DialogTrigger(props) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogPortal(props) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

export function DialogClose(props) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export function DialogOverlay({ className, ...props }) {
    return (
        <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn(
                "fixed inset-0 z-50 bg-black/50",
                className
            )}
            {...props}
        />
    );
}

export function DialogContent({ children, className, ...props }) {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    "fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl",
                    className
                )}
                {...props}
            >
                {children}

                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPortal>
    );
}

export function DialogHeader({ className, ...props }) {
    return (
        <div
            data-slot="dialog-header"
            className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
            {...props}
        />
    );
}

export function DialogFooter({ className, ...props }) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
            {...props}
        />
    );
}

export function DialogTitle({ className, ...props }) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn("text-lg font-semibold leading-none", className)}
            {...props}
        />
    );
}

export function DialogDescription({ className, ...props }) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    );
}