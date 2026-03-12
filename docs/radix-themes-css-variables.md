# Radix Themes CSS Variables Cheat Sheet

All variables are scoped to the `.radix-themes` selector.

---

## Color

### Semantic / Global Colors

| Variable | Purpose |
|---|---|
| `--color-background` | Page/app background |
| `--color-surface` | Surface color for cards, inputs, etc. |
| `--color-overlay` | Overlay backdrop (modals, dialogs) |
| `--color-panel-solid` | Solid panel background |
| `--color-panel-translucent` | Translucent panel background |
| `--color-panel` | Resolved panel color (solid or translucent) |
| `--color-transparent` | Transparent color value |
| `--backdrop-filter-panel` | Backdrop filter for translucent panels |

### Accent Color Aliases (dynamic, maps to chosen accent)

| Variable | Purpose |
|---|---|
| `--accent-1` … `--accent-12` | 12-step accent scale |
| `--accent-a1` … `--accent-a12` | 12-step accent alpha variants |
| `--accent-contrast` | Text on accent-9 backgrounds |
| `--accent-surface` | Subtle accent surface |
| `--accent-indicator` | Checkbox/radio indicator |
| `--accent-track` | Slider/progress track |

### Gray Color Aliases (dynamic, maps to chosen gray)

| Variable | Purpose |
|---|---|
| `--gray-1` … `--gray-12` | 12-step gray scale |
| `--gray-a1` … `--gray-a12` | 12-step gray alpha variants |
| `--gray-contrast` | Text on gray-9 backgrounds |
| `--gray-surface` | Subtle gray surface |
| `--gray-indicator` | Gray indicator |
| `--gray-track` | Gray track |

### Focus Color Tokens

| Variable | Purpose |
|---|---|
| `--focus-1` … `--focus-12` | 12-step focus ring scale |
| `--focus-a1` … `--focus-a12` | 12-step focus ring alpha variants |

### Named Color Scales

31 colors available: `amber`, `blue`, `bronze`, `brown`, `crimson`, `cyan`, `gold`, `grass`, `green`, `indigo`, `iris`, `jade`, `lime`, `mint`, `orange`, `pink`, `plum`, `purple`, `red`, `ruby`, `sky`, `teal`, `tomato`, `violet`, `yellow`, `gray`, `mauve`, `olive`, `sage`, `sand`, `slate`

Each color provides **28 variables** following this pattern (replace `{color}`):

| Pattern | Count | Purpose |
|---|---|---|
| `--{color}-1` … `--{color}-12` | 12 | Solid color steps |
| `--{color}-a1` … `--{color}-a12` | 12 | Alpha/transparent variants |
| `--{color}-contrast` | 1 | Text on `{color}-9` backgrounds |
| `--{color}-surface` | 1 | Subtle tinted surface |
| `--{color}-indicator` | 1 | Indicator element color |
| `--{color}-track` | 1 | Track element color |

### 12-Step Scale Semantics

| Steps | Use |
|---|---|
| 1, 2 | Backgrounds |
| 3, 4, 5 | Interactive backgrounds (default, hover, active) |
| 6, 7, 8 | Borders and separators |
| 9, 10 | Solid colors (default, hover) |
| 11 | Low-contrast text |
| 12 | High-contrast text |

---

## Spacing

### Space Scale

| Variable | Default | ~px |
|---|---|---|
| `--space-1` | `calc(4px * var(--scaling))` | 4 |
| `--space-2` | `calc(8px * var(--scaling))` | 8 |
| `--space-3` | `calc(12px * var(--scaling))` | 12 |
| `--space-4` | `calc(16px * var(--scaling))` | 16 |
| `--space-5` | `calc(24px * var(--scaling))` | 24 |
| `--space-6` | `calc(32px * var(--scaling))` | 32 |
| `--space-7` | `calc(40px * var(--scaling))` | 40 |
| `--space-8` | `calc(48px * var(--scaling))` | 48 |
| `--space-9` | `calc(64px * var(--scaling))` | 64 |

Use `--space-*` for padding, margin, and gap — there are no separate `--padding-*` or `--margin-*` variables.

### Scaling Factor

| Variable | Default | Values |
|---|---|---|
| `--scaling` | `1` | `0.9`, `0.95`, `1`, `1.05`, `1.1` |

---

## Typography

### Font Family

| Variable | Purpose |
|---|---|
| `--default-font-family` | Body/general text |
| `--heading-font-family` | Headings |
| `--code-font-family` | Code |
| `--strong-font-family` | Strong/bold text |
| `--em-font-family` | Emphasis/italic text |
| `--quote-font-family` | Blockquotes |

### Font Size Scale

| Variable | Purpose |
|---|---|
| `--font-size-1` … `--font-size-9` | 9-step type size scale |

### Font Weight

| Variable | Purpose |
|---|---|
| `--font-weight-light` | Light |
| `--font-weight-regular` | Regular |
| `--font-weight-medium` | Medium |
| `--font-weight-bold` | Bold |

### Line Height

| Variable | Purpose |
|---|---|
| `--line-height-1` … `--line-height-9` | Line heights for each font size step |
| `--heading-line-height-1` … `--heading-line-height-9` | Tighter line heights for headings |

### Letter Spacing

| Variable | Purpose |
|---|---|
| `--letter-spacing-1` … `--letter-spacing-9` | Letter spacing for each font size step |

### Default Text Configuration

| Variable | Purpose |
|---|---|
| `--default-font-size` | Base font size |
| `--default-font-style` | Base font style |
| `--default-font-weight` | Base font weight |
| `--default-line-height` | Base line height |
| `--default-letter-spacing` | Base letter spacing |
| `--default-leading-trim-start` | Leading trim top |
| `--default-leading-trim-end` | Leading trim bottom |

### Heading Configuration

| Variable | Purpose |
|---|---|
| `--heading-font-size-adjust` | Size multiplier for headings |
| `--heading-font-style` | Heading style |
| `--heading-leading-trim-start` | Heading trim top |
| `--heading-leading-trim-end` | Heading trim bottom |
| `--heading-letter-spacing` | Heading letter spacing |

### Code Configuration

| Variable | Purpose |
|---|---|
| `--code-font-size-adjust` | Size multiplier for code |
| `--code-font-style` | Code style |
| `--code-font-weight` | Code weight |
| `--code-letter-spacing` | Code letter spacing |
| `--code-padding-top` | Inline code padding top |
| `--code-padding-bottom` | Inline code padding bottom |
| `--code-padding-left` | Inline code padding left |
| `--code-padding-right` | Inline code padding right |

### Strong / Em / Quote Configuration

Each follows the same pattern with `--{element}-font-family`, `--{element}-font-size-adjust`, `--{element}-font-style`, `--{element}-font-weight`, `--{element}-letter-spacing`.

### Tab Typography

| Variable | Purpose |
|---|---|
| `--tab-active-letter-spacing` | Active tab letter spacing |
| `--tab-active-word-spacing` | Active tab word spacing |
| `--tab-inactive-letter-spacing` | Inactive tab letter spacing |
| `--tab-inactive-word-spacing` | Inactive tab word spacing |

---

## Radius

| Variable | Purpose |
|---|---|
| `--radius-1` | Smallest (small buttons) |
| `--radius-2` | Small |
| `--radius-3` | Medium |
| `--radius-4` | Large |
| `--radius-5` | Larger |
| `--radius-6` | Largest |
| `--radius-factor` | Overall radius multiplier |
| `--radius-full` | Fully rounded elements |
| `--radius-thumb` | Thumb element radius |

---

## Shadows

| Variable | Purpose |
|---|---|
| `--shadow-1` | Inset shadow (subtle depth) |
| `--shadow-2` | Card shadow (`variant="classic"`) |
| `--shadow-3` | Elevated card shadow |
| `--shadow-4` | Small overlay (Hover Card, Popover) |
| `--shadow-5` | Medium overlay |
| `--shadow-6` | Large overlay (Dialog) |

---

## Cursors

| Variable | Default | Purpose |
|---|---|---|
| `--cursor-button` | `default` | Buttons |
| `--cursor-checkbox` | `default` | Checkboxes |
| `--cursor-disabled` | `not-allowed` | Disabled elements |
| `--cursor-link` | `default` | Links |
| `--cursor-menu-item` | `default` | Menu items |
| `--cursor-radio` | `default` | Radio buttons |
| `--cursor-slider-thumb` | `default` | Slider thumbs |
| `--cursor-slider-thumb-active` | `default` | Active slider thumbs |
| `--cursor-switch` | `default` | Switch toggles |

---

## Sources

- [Color](https://www.radix-ui.com/themes/docs/theme/color) | [Typography](https://www.radix-ui.com/themes/docs/theme/typography) | [Spacing](https://www.radix-ui.com/themes/docs/theme/spacing) | [Styling](https://www.radix-ui.com/themes/docs/overview/styling)
- [Radix Colors Aliasing](https://www.radix-ui.com/colors/docs/overview/aliasing)
- [Token source files](https://github.com/radix-ui/themes/tree/main/packages/radix-ui-themes/src/styles/tokens)
