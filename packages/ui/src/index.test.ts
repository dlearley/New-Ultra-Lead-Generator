import { describe, it, expect } from 'vitest';
import { version, Button, Input, Card } from './index';

describe('@monorepo/ui', () => {
  it('should export version', () => {
    expect(version).toBe('0.0.1');
  });

  it('should create Button component', () => {
    const button = Button({ className: 'primary' });
    expect(button.component).toBe('Button');
    expect(button.className).toBe('primary');
  });

  it('should create Input component', () => {
    const input = Input({ className: 'text-input' });
    expect(input.component).toBe('Input');
  });

  it('should create Card component', () => {
    const card = Card({ className: 'card-default' });
    expect(card.component).toBe('Card');
  });
});
