# ReqBot design system

This app uses CSS custom properties in `src/styles.css` as the shared design token layer.

## Tokens

- Colors: `--color-primary-*`, `--color-neutral-*`, semantic danger/accent, surface and border.
- Typography: `--font-sans`, `--font-mono`, `--text-*`.
- Spacing: `--space-*`, based on a 4px/8px rhythm.
- Radius: `--radius-sm` through `--radius-xl`.
- Shadow: `--shadow-sm` through `--shadow-lg`.
- Motion: `--duration-*` and `--ease-standard`.

## Component usage

Prefer tokens over hardcoded values in component CSS:

```css
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
}
```

Interactive controls should keep a minimum 44px target height, visible focus states, and WCAG AA contrast for text.

## Login surface

The login screen is the first consumer of the token layer. It uses the same primary/accent palette as the rest of ReqBot while separating admin and chatbot user entry points.
