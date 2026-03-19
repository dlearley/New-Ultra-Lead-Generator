declare module '@testing-library/react' {
  import * as React from 'react';
  
  export function render(ui: React.ReactElement, options?: any): {
    container: HTMLElement;
    baseElement: HTMLElement;
    debug: (element?: HTMLElement) => void;
    rerender: (ui: React.ReactElement) => void;
    unmount: () => void;
    findByText: (text: string) => Promise<HTMLElement>;
    findByRole: (role: string) => Promise<HTMLElement>;
    findByLabelText: (text: string) => Promise<HTMLElement>;
    findByTestId: (id: string) => Promise<HTMLElement>;
    findAllByText: (text: string) => Promise<HTMLElement[]>;
    getByText: (text: string) => HTMLElement;
    getByRole: (role: string) => HTMLElement;
    getByLabelText: (text: string) => HTMLElement;
    getByTestId: (id: string) => HTMLElement;
    queryByText: (text: string) => HTMLElement | null;
    queryByRole: (role: string) => HTMLElement | null;
    queryByLabelText: (text: string) => HTMLElement | null;
    queryByTestId: (id: string) => HTMLElement | null;
  };
  
  export const screen: {
    findByText: (text: string) => Promise<HTMLElement>;
    findByRole: (role: string) => Promise<HTMLElement>;
    findByLabelText: (text: string) => Promise<HTMLElement>;
    findByTestId: (id: string) => Promise<HTMLElement>;
    getByText: (text: string) => HTMLElement;
    getByRole: (role: string) => HTMLElement;
    getByLabelText: (text: string) => HTMLElement;
    getByTestId: (id: string) => HTMLElement;
    queryByText: (text: string) => HTMLElement | null;
    queryByRole: (role: string) => HTMLElement | null;
    queryByLabelText: (text: string) => HTMLElement | null;
    queryByTestId: (id: string) => HTMLElement | null;
  };
  
  export function waitFor(callback: () => void | Promise<void>, options?: any): Promise<void>;
  export function fireEvent(element: HTMLElement, event: Event): void;
  
  export namespace fireEvent {
    function click(element: HTMLElement): void;
    function change(element: HTMLElement, options?: { target: { value: string } }): void;
    function submit(element: HTMLElement): void;
    function keyDown(element: HTMLElement, options?: { key: string }): void;
    function keyUp(element: HTMLElement, options?: { key: string }): void;
  }
  
  export const userEvent: {
    click: (element: HTMLElement) => Promise<void>;
    type: (element: HTMLElement, text: string) => Promise<void>;
    clear: (element: HTMLElement) => Promise<void>;
    selectOptions: (element: HTMLElement, values: string[]) => Promise<void>;
    setup: () => any;
  };
}

declare module '@testing-library/jest-dom' {
  export const toBeInTheDocument: () => any;
  export const toHaveClass: (className: string) => any;
  export const toHaveTextContent: (text: string) => any;
  export const toBeVisible: () => any;
  export const toBeDisabled: () => any;
  export const toBeEnabled: () => any;
}

declare module 'vitest' {
  export const vi: {
    fn: () => jest.Mock;
    mock: (path: string, factory?: () => any) => void;
    clearAllMocks: () => void;
    resetAllMocks: () => void;
    restoreAllMocks: () => void;
  };
  
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(actual: any): {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledWith(...args: any[]): void;
    toHaveBeenCalledTimes(times: number): void;
    toContain(item: any): void;
    toContainEqual(item: any): void;
    toHaveLength(length: number): void;
    toThrow(error?: string | Error): void;
    toMatch(pattern: string | RegExp): void;
    toBeGreaterThan(value: number): void;
    toBeGreaterThanOrEqual(value: number): void;
    toBeLessThan(value: number): void;
    toBeLessThanOrEqual(value: number): void;
    toBeInstanceOf(constructor: any): void;
    toBeNaN(): void;
    toBeCloseTo(value: number, precision?: number): void;
    resolves: any;
    rejects: any;
  };
  
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
}

declare module 'vitest/config' {
  import { UserConfig } from 'vite';
  export function defineConfig(config: UserConfig): UserConfig;
}

declare module '@vitejs/plugin-react' {
  import { Plugin } from 'vite';
  export default function react(): Plugin;
}

declare global {
  const vi: typeof import('vitest')['vi'];
  const describe: typeof import('vitest')['describe'];
  const it: typeof import('vitest')['it'];
  const test: typeof import('vitest')['test'];
  const expect: typeof import('vitest')['expect'];
  const beforeEach: typeof import('vitest')['beforeEach'];
  const afterEach: typeof import('vitest')['afterEach'];
  const beforeAll: typeof import('vitest')['beforeAll'];
  const afterAll: typeof import('vitest')['afterAll'];
}

export {};
