"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger> & {
    showIcon?: boolean;
    icon?: React.ReactNode;
  }
>(({ className, children, showIcon = true, icon, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleTrigger
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md px-2 transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
      className
    )}
    {...props}
  >
    {children}
    {showIcon && (
      icon || <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
    )}
  </CollapsiblePrimitive.CollapsibleTrigger>
));
CollapsibleTrigger.displayName = CollapsiblePrimitive.CollapsibleTrigger.displayName;

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  >
    <div className="pb-2">{children}</div>
  </CollapsiblePrimitive.CollapsibleContent>
));
CollapsibleContent.displayName = CollapsiblePrimitive.CollapsibleContent.displayName;

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  className,
  icon
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <div className={cn("space-y-2", className)}>
        <CollapsibleTrigger showIcon icon={icon} className="group">
          {title}
        </CollapsibleTrigger>
        <CollapsibleContent>
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface ResponsiveFilterProps {
  title: string;
  children: React.ReactNode;
  isMobile?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export function ResponsiveFilter({ 
  title, 
  children, 
  isMobile = false,
  defaultOpen = !isMobile,
  className
}: ResponsiveFilterProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (isMobile) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
        <div className={cn("border rounded-lg", className)}>
          <CollapsibleTrigger className="px-4 py-3 border-b group">
            <span className="font-medium">{title}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 space-y-4">
              {children}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };