declare namespace React {
  type ReactNode = unknown;
  type JSXElement = unknown;
}

declare module 'react' {
  export type ReactNode = unknown;
  export default React;
}

declare module 'react/jsx-runtime' {
  export namespace JSX {
    interface Element {}
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
  export function jsx(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export const Fragment: unique symbol;
}

declare module 'react/jsx-dev-runtime' {
  export namespace JSX {
    interface Element {}
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
  export function jsxDEV(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export const Fragment: unique symbol;
}

declare module 'next/head' {
  export default function Head(props: { children?: unknown }): JSX.Element;
}

declare module 'next/link' {
  export default function Link(props: Record<string, unknown>): unknown;
}

declare module 'next/image' {
  export default function Image(props: Record<string, unknown>): unknown;
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}
