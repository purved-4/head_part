# 🎨 CRM / Dashboard Themes – README

Is README me **ab tak ke saare color themes** same format me diye gaye hain.
Har theme **ready-to-use `:host {}` block** ke form me hai.

---

## 1️⃣ Purple / Violet Theme (Modern SaaS)

```css
:host {
  --color-primary: #8B5CF6;
  --color-primary-light: #C4B5FD;
  --color-primary-dark: #6D28D9;

  --color-secondary: #C4B5FD;
  --color-accent: #7C3AED;

  --color-bg: #FAF5FF;
  --color-surface: #FFFFFF;

  --color-font: #1F2937;
  --color-muted: #6B7280;

  --color-border: #DDD6FE;
  --color-hover: #EDE9FE;
}
```

---

## 2️⃣ Soft Green Theme (97A87A Palette)

```css
:host {
  --color-primary: #90AB8B;
  --color-primary-light: #C5D89D;
  --color-primary-dark: #5A7863;

  --color-secondary: #97A87A;
  --color-accent: #5A7863;

  --color-bg: #F3F7EF;
  --color-surface: #FFFFFF;

  --color-font: #1F2937;
  --color-muted: #5F6B63;

  --color-border: #D6E2C9;
  --color-hover: #E8F0DF;
}
```

---

## 3️⃣ Dark Green Professional CRM

```css
:host {
  --color-primary: #5A7863;
  --color-primary-light: #90AB8B;
  --color-primary-dark: #3F5F4E;

  --color-secondary: #97A87A;
  --color-accent: #4E6F5A;

  --color-bg: #EEF2EC;
  --color-surface: #FFFFFF;

  --color-font: #1F2937;
  --color-muted: #5F6B63;

  --color-border: #C2D0BE;
  --color-hover: #DCE6D8;
}
```

---

## 4️⃣ Black Text + Yellow Accent

```css
:host {
  --color-primary: #F2C94C;
  --color-primary-light: #FFE08A;
  --color-primary-dark: #D4A017;

  --color-secondary: #F2C94C;
  --color-accent: #F2C94C;

  --color-bg: #F4F6F2;
  --color-surface: #FFFFFF;

  --color-font: #000000;
  --color-muted: #4B5563;

  --color-border: #D1D5DB;
  --color-hover: #FFF4CC;
}
```

---

## 5️⃣ Teal / Enterprise Theme (#154474)

```css
:host {
  --color-primary: #154474;
  --color-primary-light: #1E5D99;
  --color-primary-dark: #0F2F4F;

  --color-secondary: #DCE7EF;
  --color-accent: #154474;

  --color-bg: #F4F6F8;
  --color-surface: #FFFFFF;

  --color-font: #000000;
  --color-muted: #4B5563;

  --color-border: #CBD5E1;
  --color-hover: #E6F0F7;
}
```

---

## 6️⃣ Warm Luxury Theme (B77466 Palette)

```css
:host {
  --color-primary: #B77466;
  --color-primary-light: #E2B59A;
  --color-primary-dark: #957C62;

  --color-secondary: #FFE1AF;
  --color-accent: #B77466;

  --color-bg: #FBF7F3;
  --color-surface: #FFFFFF;

  --color-font: #000000;
  --color-muted: #4B5563;

  --color-border: #E7D3C4;
  --color-hover: #FFF1D6;
}
```

---

## 7️⃣ Dark Warm Luxury (Executive CRM – Final)

```css
:host {
  --color-primary: #9C5E52;
  --color-primary-light: #E2B59A;
  --color-primary-dark: #7A5C46;

  --color-secondary: #D9B48C;
  --color-accent: #9C5E52;

  --color-bg: #F2ECE6;
  --color-surface: #FFFFFF;

  --color-font: #000000;
  --color-muted: #3F3F46;

  --color-border: #CDB8A8;
  --color-hover: #EAD8C5;
}
```

## 7️⃣ Other
```css
/* Status colors (muted, professional) */
  --color-success: #4E6F5A;
  --color-warning: #C58B3A;
  --color-danger: #C93636;
  --color-info: #3F6E5A;

  /* Shadows (darker, tighter) */
  --shadow-sm: 0 1px 2px 0 rgba(63, 95, 78, 0.12);
  --shadow-md:
    0 4px 6px -1px rgba(63, 95, 78, 0.18),
    0 2px 4px -1px rgba(63, 95, 78, 0.12);
  --shadow-lg:
    0 10px 15px -3px rgba(63, 95, 78, 0.18),
    0 4px 6px -2px rgba(63, 95, 78, 0.10);
  --shadow-xl:
    0 20px 25px -5px rgba(63, 95, 78, 0.20),
    0 10px 10px -5px rgba(63, 95, 78, 0.12);

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
```

---

## ✅ How to Use

* Ek theme choose karo
* Uska `:host {}` block copy karo
* Global styles ya component root me paste karo

---

🎯 Ye README **single source of truth** hai for all CRM / Dashboard color themes.
