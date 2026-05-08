# brand

peek's visual identity is intentionally minimal. one mark, one color, one font.

## assets

| file | use |
|---|---|
| `icon.svg` | the eye glyph alone — favicons, social profile pictures, places where the wordmark won't fit |
| `logo.svg` | eye glyph + "peek" wordmark side-by-side — readme headers, slide titles, anywhere there's room |

## colors

| name | hex | use |
|---|---|---|
| accent (warm gold) | `#c9a96a` | the eye glyph, primary CTAs, brand mark |
| ink (warm off-white) | `#e8e6e1` | the wordmark when on a dark background |
| bg (warm dark) | `#262626` | recommended canvas behind the logo |

never pure black (`#000`). never pure white (`#fff`). the warmth matters.

## typography

the wordmark is **manrope**, weight 300, lowercase, with `-0.02em` letter-spacing.

if you need a high-fidelity wordmark in places where manrope isn't available, install manrope (https://fonts.google.com/specimen/Manrope) and convert the text to paths. the SVGs in this folder reference manrope by font-family with fallbacks, which works in most browsers.

## what not to do

- don't put the logo on a colored background other than `#262626` or true black
- don't add gradients, shadows, or animations to the mark
- don't change the proportions — the eye is always 4:2 (rx:ry) with a centered pupil
- don't use any other color for the eye (no neon, no purple — the warmth is the entire mood)
- don't add a tagline next to the mark unless it's the official "browser-only classroom screen sharing"

if in doubt: less is more. trust the whitespace.
