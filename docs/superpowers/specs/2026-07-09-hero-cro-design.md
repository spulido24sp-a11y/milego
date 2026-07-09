# CRO Upgrade — MIleGo V6

## Goal
Increase conversion rate by adding social proof, carrier credibility, interactive 3D product view, TikTok-style video popup, and a reviews carousel with 30+ testimonials.

---

## 1. Hero Section — Trust & Interactivity

### HTML (`index.html` hero section)
- Star rating + review count in tag: `★ 4.9 | 2.150+ opiniones`
- Trust badges row below CTAs: guarantee, cash-on-delivery, nationwide shipping
- Carrier logos row: Servientrega, Interrapidísimo, Coordinadora, Envia, TCC
- Hero image stays as poster, clicking opens TikTok-style vertical video popup

### CSS (`css/components/hero.css`)
- `.hero-cta-pulse`: keyframe scale 1→1.04→1 with box-shadow glow, 2s infinite
- `.hero-trust`: flex row with glassmorphism badges
- `.hero-carriers`: flex row with styled carrier name badges
- Fade-up sequence: stagger `animation-delay` on hero children
- Mobile: stack trust/carriers vertically

### TikTok Popup (`css/components/video-popup.css`, `js/modules/videoPopup.js`)
- Fullscreen overlay with dark backdrop + blur
- Centered vertical video player (9:16 aspect ratio, max 70vh)
- Close button (X), click outside to close
- Autoplay on open, pause on close
- Video source configurable (placeholder URL from free stock video)
- No 3D tilt effect on image (replaced by video popup trigger)

### JS (`js/modules/videoPopup.js`)
- Click on `.hero-image-wrap` opens popup
- ESC key and backdrop click close
- Video element created dynamically, autoplays
- Imported in `js/app.js`

---

## 2. Reviews Carousel — Social Proof

### Data (`data/reviews.js`)
- 30 review objects: `{ id, name, city, date, stars, text, photo }`
- Placeholder data with realistic Colombian names, cities, dates
- Photos use generated CSS avatars (initials + gradient) as placeholder
- Real photo path convention: `assets/img/reviews/review-N.webp`

### HTML (`index.html`)
- New section after existing testimonials, before stats
- Header: "Lo que dicen nuestros clientes" + "Basado en 30 reseñas verificadas"
- Carousel container with track, prev/next buttons, dots

### CSS (`css/components/reviews-carousel.css`)
- Cards per view: 1 (mobile), 2 (≥768px), 3 (≥1024px)
- Card: avatar circle, name, city + date, stars, text
- Slide: `transform: translateX` with CSS transition
- Dots + arrows navigation

### JS (`js/modules/reviewsCarousel.js`)
- Vanilla JS carousel class
- Auto-play 4s, pause on hover
- Dots + arrows navigation
- Responsive: recalculates cards per view on resize
- Touch/swipe support for mobile

---

## 3. Files

| File | Action |
|------|--------|
| `index.html` | Modified — hero + reviews section |
| `css/components/hero.css` | Modified — pulse, trust, carriers, fade-up |
| `css/components/video-popup.css` | New |
| `css/components/reviews-carousel.css` | New |
| `css/main.css` | Modified — 2 new @imports |
| `js/modules/hero3d.js` | Removed (replaced by video popup) |
| `js/modules/videoPopup.js` | New |
| `js/modules/reviewsCarousel.js` | New |
| `data/reviews.js` | New |
| `js/app.js` | Modified — imports videoPopup + reviewsCarousel |
