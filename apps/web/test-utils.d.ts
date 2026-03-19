declare module '@testing-library/react' {
  import * as React from 'react';
  
  export function render(ui: React.ReactElement, options?: any): any;
  export const screen: any;
  export function waitFor(callback: () => void | Promise<void>, options?: any): Promise<void>;
  export function fireEvent(element: HTMLElement, event: Event): void;
  export namespace fireEvent {
    function click(element: HTMLElement): void;
    function change(element: HTMLElement, options?: { target: { value: string } }): void;
  }
}
