// UI Components Library
export const version = '0.0.1';

export interface ComponentProps {
  className?: string;
}

export const Button = (props: ComponentProps) => ({
  ...props,
  component: 'Button',
});

export const Input = (props: ComponentProps) => ({
  ...props,
  component: 'Input',
});

export const Card = (props: ComponentProps) => ({
  ...props,
  component: 'Card',
});
