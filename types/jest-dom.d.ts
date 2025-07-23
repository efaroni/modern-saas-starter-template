import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toBeEmpty(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toContainElement(element: Element | null): R;
      toContainHTML(html: string): R;
      toHaveAttribute(attr: string, value?: string | RegExp | null): R;
      toHaveClass(...classNames: string[]): R;
      toHaveFocus(): R;
      toHaveFormValues(values: {
        [name: string]: string | string[] | number | boolean | null;
      }): R;
      toHaveStyle(css: string | { [property: string]: string | number }): R;
      toHaveTextContent(
        text: string | RegExp,
        options?: { normalizeWhitespace: boolean },
      ): R;
      toHaveValue(value: string | string[] | number): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
      toBeChecked(): R;
      toBePartiallyChecked(): R;
      toHaveErrorMessage(text: string | RegExp): R;
    }
  }
}
