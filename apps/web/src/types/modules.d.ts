declare module 'class-variance-authority' {
  import * as React from 'react';
  
  export type VariantProps<T> = T extends (props: infer P) => any ? P : never;
  
  export function cva(
    base?: string,
    config?: {
      variants?: Record<string, Record<string, string>>;
      defaultVariants?: Record<string, string>;
      compoundVariants?: Array<Record<string, any> & { className?: string }>;
    }
  ): (props?: Record<string, any>) => string;
}

declare module 'tailwind-merge' {
  export function twMerge(...classNames: (string | undefined | null)[]): string;
  export function twJoin(...classNames: (string | undefined | null)[]): string;
}

declare module 'zustand' {
  export interface StoreApi<T> {
    getState: () => T;
    setState: (fn: (state: T) => T | Partial<T>) => void;
    subscribe: (listener: (state: T) => void) => () => void;
  }
  
  export function create<T>(
    fn: (set: (fn: (state: T) => T | Partial<T>) => void, get: () => T) => T
  ): StoreApi<T>;
}

declare module 'jose' {
  export function sign(payload: any, secret: Uint8Array | string): Promise<string>;
  export function verify(token: string, secret: Uint8Array | string): Promise<any>;
  export function jwtVerify(token: string, secret: Uint8Array | string): Promise<{ payload: any }>;
}

declare module 'speakeasy' {
  export function generateSecret(options?: { length?: number; name?: string }): { base32: string; otpauth_url?: string };
  export function totp({ secret: string, encoding: string }): { verify({ token: string, secret: string, encoding: string }): boolean };
}

declare module 'leaflet' {
  export * from 'leaflet';
}

declare module '@prisma/client' {
  export class PrismaClient {
    constructor();
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }
}

declare module '@radix-ui/react-dialog' {
  import * as React from 'react';
  
  export const Root: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void; children?: React.ReactNode }>;
  export const Trigger: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean } & React.RefAttributes<HTMLButtonElement>>;
  export const Portal: React.FC<{ children?: React.ReactNode }>;
  export const Overlay: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Content: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Header: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const Footer: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const Title: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>>;
  export const Description: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>;
  export const Close: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean } & React.RefAttributes<HTMLButtonElement>>;
}

declare module '@radix-ui/react-dropdown-menu' {
  import * as React from 'react';
  
  export const Root: React.FC<{ children?: React.ReactNode }>;
  export const Trigger: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean } & React.RefAttributes<HTMLButtonElement>>;
  export const Portal: React.FC<{ children?: React.ReactNode }>;
  export const Content: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { align?: string; sideOffset?: number } & React.RefAttributes<HTMLDivElement>>;
  export const Item: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const CheckboxItem: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { checked?: boolean } & React.RefAttributes<HTMLDivElement>>;
  export const RadioItem: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { value: string } & React.RefAttributes<HTMLDivElement>>;
  export const Label: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Separator: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Sub: React.FC<{ children?: React.ReactNode }>;
  export const SubTrigger: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const SubContent: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const RadioGroup: React.FC<{ value?: string; onValueChange?: (value: string) => void; children?: React.ReactNode }>;
  export const Group: React.FC<{ children?: React.ReactNode }>;
}

declare module '@radix-ui/react-tabs' {
  import * as React from 'react';
  
  export const Root: React.FC<{ value?: string; onValueChange?: (value: string) => void; defaultValue?: string; children?: React.ReactNode }>;
  export const List: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Trigger: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLButtonElement> & { value: string } & React.RefAttributes<HTMLButtonElement>>;
  export const Content: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { value: string } & React.RefAttributes<HTMLDivElement>>;
}
