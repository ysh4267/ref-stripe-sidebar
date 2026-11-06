# Sidebar & Progress

Two references in one page: the sidebar collapse handle from the Stripe dashboard, with the project progress pie from Things in the content area.

References:
- [Design Spells — Animation when hovering on the sidebar toggle in Stripe](https://designspells.com/spells/animation-when-hovering-on-the-sidebar-toggle-in-stripe)
- [Design Spells — Progress indicator animation in Things](https://designspells.com/spells/progress-indicator-animation-in-things)

## Interaction

- Hovering the handle nudges the sidebar edge in when expanded and out when collapsed, and the handle bar bends into a chevron that straightens again when the pointer leaves. A tooltip appears at once and fades out over 0.3s.
- Clicking slides the sidebar edge closed or open over 0.3s, and the checklist moves with it. As in the reference, the items switch at once: collapsing hides the heading, names and chevrons and moves the icons up a row; expanding brings them back, revealed by the edge as it opens.
- Three projects (X, Y, Z) each have a circle next to the title. A locked project shows a dashed grey circle and dimmed to-dos that cannot be checked; pressing one only nudges the circle. Pressing the circle pops it like a checkbox and draws a solid blue ring clockwise from 12 o'clock as the dashes fade, which unlocks the to-dos. Pressing it again unwinds the ring and locks the project.
- Checking a to-do fills the project's pie clockwise from 12 o'clock in 0.09s; unchecking shrinks it in 0.1s. While pressed, the row highlights and the checkbox grows; on check, the fill grows over 0.17s, the check mark draws after 0.2s and the label dims after 0.33s.

## How it was made

- Positions, sizes, colors and timing were measured frame by frame from the two videos. Both are zoomed views of the real apps, so the page draws them at real size: the sidebar at 1/3.2 and the checklist at 0.42 of the video, with the handle at the vertical middle of the window.
- The checklist uses light colors to sit next to the light sidebar.
- Inter stands in for the macOS system font, sized so cap height and ink width match the videos (`fitText`).
- Icons are redrawn line icons. No logos or trademarks are used.
- No build step: `index.html`, `style.css`, `main.js` and `progress.js`.

## URL options

- `?demo`: tries a locked to-do, unlocks and checks projects, collapses and expands the sidebar, then puts everything back, on a loop (for the gallery preview).
