# CSS Customization Guide

## Quick Reference: CSS Variables

All colors, spacing, and sizing are controlled via CSS custom properties. You can easily customize the design by changing these values.

### Color Tokens

```css
:root {
  /* Primary Warm (Main Accent) */
  --primary-warm: #d97757;
  --primary-warm-dark: #c25c42;
  --primary-warm-light: #e89472;
  
  /* Accent Exploration (Secondary) */
  --accent-exploration: #2d8a6b;
  --accent-exploration-light: #4fa88d;
  
  /* Backgrounds */
  --bg-primary: #faf9f7;      /* Page background */
  --bg-secondary: #ffffff;     /* Cards, modals */
  --bg-tertiary: #f5f3f0;      /* Subtle backgrounds */
  
  /* Text */
  --text-primary: #2c2622;
  --text-secondary: #6b6561;
  --text-muted: #9d9691;
  
  /* Status Colors */
  --success: #3ba76a;
  --warning: #e67e22;
  --danger: #e63946;
  --info: #3498db;
}
```

### Spacing Scale

```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

### Border Radius

```css
:root {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

### Layout Dimensions

```css
:root {
  --navbar-height: 64px;
  --sidebar-width: 340px;
}
```

### Animation Timing

```css
:root {
  --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);      /* Standard transitions */
  --transition-fast: 0.15s ease-out;                     /* Micro-interactions */
}
```

---

## Common Customizations

### Change Primary Brand Color

Simply update `--primary-warm` and its related values:

```css
:root {
  --primary-warm: #FF6B6B;           /* New primary */
  --primary-warm-dark: #EE5A52;      /* Darker shade */
  --primary-warm-light: #FF8E8E;     /* Lighter shade */
}
```

This automatically updates:
- Primary buttons
- Active category buttons
- Map FAB
- Form focus states
- Links and accents

### Change Secondary Accent Color

Update `--accent-exploration`:

```css
:root {
  --accent-exploration: #1A73E8;        /* New accent */
  --accent-exploration-light: #5B9CF7;  /* Light variant */
}
```

This affects:
- Directional elements
- Success states
- Secondary highlights

### Change Background Colors for Dark Theme

Add a `[data-theme="dark"]` section or modify the existing one:

```css
[data-theme="dark"] {
  --bg-primary: #121212;
  --bg-secondary: #1E1E1E;
  --bg-tertiary: #2C2C2C;
  --text-primary: #FFFFFF;
  --text-secondary: #BDBDBD;
}
```

### Increase/Decrease Spacing

Change the base spacing values:

```css
:root {
  /* More spacious */
  --spacing-md: 20px;   /* was 16px */
  --spacing-lg: 32px;   /* was 24px */
  --spacing-xl: 40px;   /* was 32px */
}
```

### Adjust Border Radius (Make Corners More/Less Rounded)

```css
:root {
  --radius-sm: 8px;    /* was 6px - more rounded */
  --radius-md: 12px;   /* was 10px */
  --radius-lg: 20px;   /* was 16px */
}
```

### Change Navbar Height

```css
:root {
  --navbar-height: 56px;  /* Make it smaller */
  /* or */
  --navbar-height: 72px;  /* Make it larger */
}
```

### Change Sidebar Width

```css
:root {
  --sidebar-width: 380px;  /* was 340px - wider */
  /* or */
  --sidebar-width: 300px;  /* was 340px - narrower */
}
```

### Speed Up/Slow Down Animations

```css
:root {
  --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);      /* Faster */
  --transition-fast: 0.1s ease-out;                      /* Faster micro */
}
```

---

## Component-Specific Customization

### Button Styling

**Primary Button**
```css
.btn-primary {
  background: var(--primary-warm);
  /* To change, modify --primary-warm */
}
```

**Small Icon Button**
```css
.btn-icon-sm {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
}
```

To customize icon buttons on hover:
```css
.btn-icon-sm:hover {
  background: var(--primary-warm);
  /* Change to your preferred hover color */
}
```

### Input Fields

**Default state**
```css
.input-wrapper input {
  border: 2px solid var(--border-light);
  background: var(--bg-secondary);
  color: var(--text-primary);
}
```

**Focus state**
```css
.input-wrapper input:focus {
  border-color: var(--primary-warm);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1);
}
```

To customize focus appearance:
```css
.input-wrapper input:focus {
  border-color: YOUR_COLOR;
  box-shadow: 0 0 0 3px rgba(R, G, B, 0.1);
}
```

### Cards and Containers

**Default card background**
```css
.place-card {
  background: var(--bg-tertiary);
}
```

**Hover card effect**
```css
.place-card:hover {
  border-color: var(--primary-warm);
  background: rgba(217, 119, 87, 0.05);
  transform: translateX(4px);
}
```

### Modal Styling

**Modal background**
```css
.modal-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
}
```

To make modals have a background color:
```css
.modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);  /* Add border */
}
```

### Badges and Labels

**Results badge**
```css
.results-badge {
  background: var(--primary-warm);
  color: #fff;
}
```

**Category badge (modal)**
```css
.modal-category-badge {
  background: rgba(45, 138, 107, 0.1);
  color: var(--accent-exploration);
}
```

---

## Advanced Customizations

### Custom Color Scheme Example

Here's a complete custom theme for a "night mode" variant:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Deep space theme */
    --primary-warm: #FF6B35;
    --primary-warm-dark: #E55A28;
    --primary-warm-light: #FF8A50;
    
    --accent-exploration: #00D9FF;
    --accent-exploration-light: #33E5FF;
    
    --bg-primary: #0A0A0A;
    --bg-secondary: #1A1A1A;
    --bg-tertiary: #2A2A2A;
    
    --text-primary: #FFFFFF;
    --text-secondary: #CCCCCC;
    --text-muted: #999999;
    
    --border-light: #333333;
    --border-mid: #444444;
  }
}
```

### Custom Animations

**Fade-in entrance animation** (replace slideUp):

```css
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-card {
  animation: fadeInScale 0.2s ease-out;
}
```

**Gentle shake on error**:

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.auth-error {
  animation: shake 0.3s ease-out;
}
```

### Custom Typography Scale

Change font sizes globally:

```css
html {
  font-size: 18px;  /* was 16px - makes everything larger */
}
```

Or for specific elements:

```css
.modal-place-name {
  font-size: 1.8rem;  /* was 1.6rem - larger titles */
  font-weight: 700;   /* heavier weight */
  letter-spacing: -0.8px;  /* tighter */
}
```

### Shadow Customization

**Increase shadow depth**:

```css
:root {
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.12);    /* more prominent */
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.16);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.20);
}
```

**Softer shadows**:

```css
:root {
  --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);
}
```

---

## Responsive Breakpoint Customization

The main breakpoints are:
- `768px` — Tablet breakpoint
- `480px` — Mobile breakpoint

To adjust responsive behavior for a 1024px breakpoint:

```css
@media (max-width: 1024px) {
  :root {
    --sidebar-width: 280px;  /* Narrower on smaller desktops */
  }
}
```

---

## Testing Your Changes

After modifying CSS variables, test these scenarios:

1. **Light Mode**
   - Open app with theme set to light
   - Verify all text is readable
   - Check all buttons and links are visible

2. **Dark Mode**
   - Toggle to dark mode
   - Verify contrast still meets WCAG AA (4.5:1)
   - Check hover states are visible

3. **All Interactive Elements**
   - Button hover states
   - Input focus states
   - Card hover effects
   - Modal animations

4. **Responsive**
   - Desktop (1920px)
   - Tablet (768px)
   - Mobile (375px)
   - Check all text is readable at each size

5. **Animations**
   - Verify animations are smooth
   - Test with `prefers-reduced-motion` enabled
   - Check performance on mobile devices

---

## Color Contrast Checker

When changing colors, ensure text is readable. The WCAG AA standard requires:
- **4.5:1** for regular text (< 18px)
- **3:1** for large text (≥ 18px or ≥ 14px bold)

Use a contrast checker at:
- https://webaim.org/resources/contrastchecker/
- https://coolors.co/

---

## Common Issues & Solutions

### Text is Too Dark on Custom Background
**Problem:** You changed `--text-primary` but text is hard to read

**Solution:** Check the contrast ratio is at least 4.5:1
```css
/* Light text on dark background */
--bg-primary: #1A1A1A;
--text-primary: #F5F5F5;  /* High contrast */
```

### Buttons Don't Stand Out
**Problem:** Primary button color blends with background

**Solution:** Ensure 3:1 contrast between button and background
```css
/* If bg is light */
--primary-warm: #B8340A;  /* Darker button */

/* If bg is dark */
--primary-warm: #FF8A50;  /* Brighter button */
```

### Animations Feel Sluggish
**Problem:** Transitions are too slow

**Solution:** Reduce duration:
```css
:root {
  --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);  /* was 0.3s */
  --transition-fast: 0.1s ease-out;                  /* was 0.15s */
}
```

### Animations Feel Jerky
**Problem:** Easing function isn't smooth

**Solution:** Try different easing:
```css
:root {
  /* Smooth ease-in-out */
  --transition: 0.3s ease-in-out;
  
  /* Or for mobile-like feel */
  --transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Need More Help?

The CSS is organized in sections:
1. **Color Tokens** — Change colors here
2. **Global Resets** — Base styling
3. **Auth Pages** — Login/register styling
4. **App Layout** — Navbar, sidebar, map
5. **Components** — Buttons, cards, modals
6. **Responsive** — Mobile/tablet styles

Each section is clearly commented. Start there if you need to find what to modify.
