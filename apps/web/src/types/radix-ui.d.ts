declare module '@radix-ui/react-label' {
  import * as React from 'react';
  
  export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
  export const Root: React.ForwardRefExoticComponent<LabelProps & React.RefAttributes<HTMLLabelElement>>;
}

declare module '@radix-ui/react-checkbox' {
  import * as React from 'react';
  
  export interface CheckboxProps {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    value?: string;
  }
  export const Root: React.ForwardRefExoticComponent<CheckboxProps & React.RefAttributes<HTMLButtonElement>>;
  export const Indicator: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>>;
}

declare module '@radix-ui/react-switch' {
  import * as React from 'react';
  
  export interface SwitchProps {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    value?: string;
  }
  export const Root: React.ForwardRefExoticComponent<SwitchProps & React.RefAttributes<HTMLButtonElement>>;
  export const Thumb: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>>;
}

declare module '@radix-ui/react-icons' {
  import * as React from 'react';
  
  export const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>>;
  export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>>;
  export const ChevronUpIcon: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Cross2Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  export const MagnifyingGlassIcon: React.FC<React.SVGProps<SVGSVGElement>>;
}


declare module '@radix-ui/react-slider' {
  import * as React from 'react';
  
  export interface SliderProps {
    value?: number[];
    defaultValue?: number[];
    onValueChange?: (value: number[]) => void;
    max?: number;
    min?: number;
    step?: number;
    disabled?: boolean;
    orientation?: 'horizontal' | 'vertical';
  }
  
  export const Root: React.ForwardRefExoticComponent<SliderProps & React.RefAttributes<HTMLDivElement>>;
  export const Track: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Range: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
  export const Thumb: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>>;
}

declare module '@radix-ui/react-accordion' {
  import * as React from 'react';
  
  export interface AccordionProps {
    type?: 'single' | 'multiple';
    collapsible?: boolean;
    value?: string;
    onValueChange?: (value: string) => void;
  }
  
  export const Root: React.ForwardRefExoticComponent<AccordionProps & React.RefAttributes<HTMLDivElement>>;
  export const Item: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { value: string } & React.RefAttributes<HTMLDivElement>>;
  export const Trigger: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>>;
  export const Content: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
}

declare module '@radix-ui/react-popover' {
  import * as React from 'react';
  
  export interface PopoverProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
  
  export const Root: React.FC<PopoverProps>;
  export const Trigger: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>>;
  export const Content: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
}
