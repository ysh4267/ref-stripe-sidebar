# Sidebar Toggle

A rebuild of the sidebar collapse handle from the Stripe dashboard, matched to the reference video.

Reference: [Design Spells — Animation when hovering on the sidebar toggle in Stripe](https://designspells.com/spells/animation-when-hovering-on-the-sidebar-toggle-in-stripe)

## Interaction

Hovering the handle nudges the sidebar edge in when expanded and out when collapsed, and the handle bar bends into a chevron that straightens again when the pointer leaves. A tooltip appears at once and fades out over 0.3s.

Clicking slides the sidebar closed or open over 0.3s. Labels fade out as it collapses and return once it is almost fully open; icons move up a row when collapsed. Only the sidebar is shown; the content area is left out.

## How it was made

- Positions, sizes, colors and timing were measured frame by frame from the video (1920x1080). The video is the real UI zoomed 3.2x, so the page draws it at real size (1/3.2) with the handle at the vertical middle of the window.
- Inter stands in for the macOS system font, sized so cap height and ink width match the video (`fitText`).
- Icons are redrawn line icons. No logos or trademarks are used.
- No build step: just `index.html`, `style.css` and `main.js`.

## URL options

- `?demo`: repeats hover and click without a pointer (for the gallery preview).
