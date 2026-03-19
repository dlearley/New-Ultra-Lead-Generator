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
