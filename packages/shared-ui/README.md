# `@mana/shared-ui`

Vereins-UI-Komponenten — Svelte 5, strikte 12-Token-Disziplin nach
[`mana/docs/THEMING.md`](../../docs/THEMING.md). Konsumiert von allen
mana-e.V.-Apps (managarten, zitare, nutriphi, wordeck, manawald, …).

> **Stand:** v1.0.0 (2026-05-21). Konsolidiert aus `shared-ui@0.1.x` +
> `shared-ui-2@0.1.x`. Ehemalige Doppel-Bibliothek ist Geschichte —
> eine UI-Foundation, ein Disziplin-Set, ein Verzeichnis.

## Disziplin

1. **Styles ausschließlich in `<style>`-Block.** Keine
   Tailwind-Utility-Klassen für Farben (`bg-card`, `text-foreground`).
   Layout-Klassen (`flex`, `gap-2`) sind okay, wenn der Konsument
   Tailwind nutzt.
2. **Nur die 12 Tokens** aus `THEMING.md`:
   `background, foreground, surface, surface-hover, muted,
   muted-foreground, border, primary, primary-foreground, error,
   success, warning`. Kein 13. Token. Sub-Tokens werden via
   `color-mix(in srgb, var(--color-surface) 95%, var(--color-foreground))`
   oder Alpha-Modifier (`hsl(var(--color-primary) / 0.12)`) gelöst.
3. **`hsl()`-Wrap immer.** `color: hsl(var(--color-foreground))`,
   nie bare `var(--color-X)`.
4. **Keine Hex-Farben** außer in der `--brand-*`-Schicht (für
   App-Brand-Identität, NICHT für Theme-Tokens).
5. **Phosphor-Icons sind raus.** `DynamicIcon` (40+ Inline-SVGs, 16×16,
   currentColor, stroke 1.4-1.6) ersetzt die phosphor-svelte-Peer-Dep.
   Komponenten die in v0.x noch `icon: Component` hatten, akzeptieren
   in v1.0.0 nur noch `iconSvg: string`.
6. **A11y-Pflichten:** ARIA-Labels für Icon-Buttons, semantisches HTML,
   `:focus-visible` mit sichtbarem Outline, keyboard-Navigation.
7. **Storybook + Lost-Pixel** für die Komponenten, die diese Disziplin
   schon mit Stories+Baseline belegt haben (siehe
   [`PORTING_PLAN.md`](./PORTING_PLAN.md), Status ✅ vs 🚧).

## Installation

```bash
pnpm add @mana/shared-ui
```

Voraussetzung: 12 Tokens aus
[`@mana/themes`](../themes/README.md) (oder eigene Variant) im
`<html data-theme="...">`-Kontext aktiv.

## Nutzung

```svelte
<script>
  import { Button, Card, Badge } from '@mana/shared-ui/atoms';
  import { PillTabGroup, PillDropdown } from '@mana/shared-ui/navigation';
  import { Modal, ContextMenu, NotificationBar } from '@mana/shared-ui/organisms';
  import { dragSource, dropTarget } from '@mana/shared-ui/dnd';
</script>
```

## Tests

```bash
pnpm validate         # Disziplin-Validator (12-Token-Allowlist, hsl-wrap-Pflicht)
pnpm storybook        # Storybook auf :6006
pnpm test:visual      # Lost-Pixel-Run gegen Baseline
pnpm test:visual:update  # Baseline aktualisieren (nach bewusster Änderung)
```

## Vorgeschichte

v0.1.1 (alt, organisch über 3 Jahre gewachsen) und v0.1.0 als
`shared-ui-2` (Greenfield-Refactor seit 2026-05-09) liefen 12 Tage
parallel. Konsolidierung am 2026-05-21: alle 12 zusätzlich benötigten
Komponenten portiert, AppSlider als tot identifiziert, alte v1
vollständig durch v2-Code ersetzt, Paket-Name zurück auf
`@mana/shared-ui`. Details: Phasen-Log in
[`PORTING_PLAN.md`](./PORTING_PLAN.md).
