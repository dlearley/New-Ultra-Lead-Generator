import '@testing-library/jest-dom'

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(className: string): R
      toBeVisible(): R
      toBeDisabled(): R
    }
  }
}