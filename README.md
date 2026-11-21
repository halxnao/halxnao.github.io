# HALXNAO website

A simple static site: HTML, CSS and a little vanilla JavaScript. No build step, no dependencies.

## Run it locally (VS Code)

1. Open the `halxnao` folder in VS Code (File > Open Folder).
2. Install the **Live Server** extension, right-click `index.html`, choose **Open with Live Server**.
   Or from a terminal in the folder: `python3 -m http.server 8000` then open http://localhost:8000

## Folder map

```
index.html          homepage (intro, apps, contact)
apps/               one page per app
terms/              Terms of Service: one page per app (give each app's URL to Google Play) plus an index
css/style.css       shared: colours, header, buttons, labels, footer
css/pages.css       homepage hero, app cards, app-page layout, pixel-canvas fading
js/main.js          mobile menu, footer year, scroll reveal, full-size screenshot viewer
js/pixels.js        the pixel animations (equalizer, file transfer, twinkle)
js/cube.js          the homepage logo: a puzzle cube that scrambles and solves into HAL / X / NAO
images/<app>/       put YOUR icons and screenshots here
fonts/              Press Start 2P (pixel font for titles only, OFL licence included)
favicon.svg, favicon-32.png, apple-touch-icon.png   tab / home-screen icons (the logo cube)
brand/              logo icon (1024 and 512), Google Play header (4096x2304), YouTube banner (2560x1440). Not used by the site; delete the folder if you do not want it public
```

## How the pixel animations work

Each animation is a `<canvas>` that `pixels.js` fills with small squares:

```html
<canvas class="pixels tone-green" data-mode="eq" data-cell="10" aria-hidden="true"></canvas>
```

- `data-mode`: `twinkle` (homepage: calm grid, colours from `data-palette`), `wave`, `eq` (music), `player` (video screen, sound waves and progress bar, used by Hibiki) or `transfer` (files moving between devices)
- `data-cell`: size of one square in pixels (bigger = chunkier)
- `tone-green` / `tone-cyan` / `tone-blue`: the colour (set in `pages.css`)

They blend into the page because `pages.css` puts a **CSS mask** on each canvas that fades it to transparent at the
edges (search for `mask-image`). Change those numbers to move or soften the fade.

Good to know: animation runs at 12 frames per second (that's what makes it feel pixel-like), pauses when scrolled
out of view, and shows a still picture for visitors who prefer reduced motion. If JavaScript is off the page is
simply clean with no animation.

Only the wordmark and page titles use the pixel font. Everything else is the system font so text stays readable.

## The logo cube (`js/cube.js`)

A real 3D puzzle cube (26 small cubes, rotation matrices, simple perspective) drawn on a small canvas that CSS scales up
with hard pixel edges. It scrambles with 8 random face turns, remembers them, then plays them backwards to solve itself.
The solved front face spells H A L / _ X _ / N A O. The code is commented step by step.
Easy things to change: sticker colours (`COLORS`), letters (`LETTERS`), speeds and hold time (`SCRAMBLE_MS`, `SOLVE_MS`,
`HOLD_MS`), number of scramble turns (`SCRAMBLE_COUNT`), camera angles (`ANGLED`, `FRONT`).
With reduced motion on, visitors just see the solved logo.

## Motion and the full-size viewer

- **Transitions** (end of `css/pages.css`): page fade-in, card lift on hover, tile slide, button press. All are plain CSS.
- **Scroll reveal** (`main.js`, part 4): items get class `reveal` and fade up when they scroll into view. It is skipped
  entirely for visitors who prefer reduced motion, so nothing is ever hidden for them.
- **Full-size viewer** (`main.js`, part 5): every `.shot img` is wrapped in a button at load time. Clicking opens a
  native `<dialog>`. Esc closes, arrow keys or the side buttons move between images, swipe works on phones.
  You do not write any markup for it: any new `<figure class="shot">` gets it automatically. Without JS the images just show normally.
- Credits: add `data-credit="Video by Name" data-credit-url="https://..."` to a `<figure class="shot">` and the viewer shows it as a link under the image (see the Hibiki page).
- The viewer never enlarges an image beyond its real pixel size, so low-resolution screenshots stay sharp.

## Per-app bullets and colours

Each app page sets a class on `<body>` (`theme-beatzyy`, `theme-free`, `theme-swiftx`). That class picks the bullet
shape and colour used for the list items and the section titles: a music note, equalizer bars, or a file icon.
The bullets are tiny pixel-art SVGs defined at the top of `css/style.css` (`--b-note`, `--b-bars`, `--b-file`, `--b-arrow`)
and drawn as a mask, so one shape can take any colour. To add a new one, draw it as `<path d="M x y h1 v1 h-1z ...">`
cells in a small `viewBox` and set `--cw` / `--ch` (width and height in cells) in the theme class.

## Layout

Everything is centred on one axis (header, intro, section titles, cards, footer), so left and right mirror each other.
Section titles get the bullet on both sides, with the right one flipped.

## Things YOU need to fill in (search the project for `TODO`)

| What | Where |
| --- | --- |
| Download links | Each app page has a Download section: official link first, then mirrors. Replace every `https://YOUR_..._LINK` in `apps/*.html` (search for `YOUR_`). Until replaced, the button shows greyed out as "Coming soon" (done by `main.js`, part 6). To switch a finished link off again, add `data-soon` to the `<a>`. When Beatzyy Free is public on Play, delete `data-soon` from its Google Play button; when SwiftX is on Play, put its link in and delete `data-soon` |
| SwiftX Android release | Same idea: when it is public, remove the "Android: coming soon" labels and wording in `apps/swiftx.html` and `index.html`, and switch on the Android download buttons |
| Terms of Service | Done, one page per app in `terms/`. Add a short governing-law line if you want one (the pages have none). Have them checked by a lawyer if you need legal certainty. When an app's price or store changes, update its page and the date at the top |
| Social links | Instagram and GitHub are set. YouTube and LinkedIn are placeholders (`YOUR_YOUTUBE_LINK`, `YOUR_LINKEDIN_LINK`) in the footer of every page; they stay hidden until you replace them. Tip: VS Code Find in Files (Ctrl+Shift+F) and Replace All |
| App icons | Done: `images/<app>/icon.png` (192x192). To replace one, overwrite the file and keep the name |
| Screenshots (Beatzyy paid) | Done: 7 in `images/beatzyy/`. To add one, copy an `<li>` in `apps/beatzyy.html` (keep `width`/`height` real). Rows of 4; a shorter last row centres itself |
| Screenshots (Beatzyy Free) | Done: 7 in `images/beatzyy-free/`. To add one, copy an `<li>` in `apps/beatzyy-free.html`. Rows of 4; a shorter last row centres itself |
| Screenshots (SwiftX) | Done: 2 desktop + 2 Android in `images/swiftx/`. To add more, copy a `<li>` inside the Desktop or Android group in `apps/swiftx.html` |
| Hibiki icon | Done: `images/hibiki/icon.png` (192x192, final). To replace it, overwrite the file and keep the name |
| Beatzyy (paid) Google Play link | Done (`apps/beatzyy.html`) |
| Beatzyy Free Google Play link | Closed testing for now, so the button is disabled. When it is public, in `apps/beatzyy-free.html` replace the `<span>` with the `<a>` in the TODO comment (your URL is already in it), change the "Upcoming" labels there and on the homepage card, move the card from the Upcoming section into the Apps grid in `index.html` (and set the breadcrumb on its page back to Apps), and update the Store row |

## Images

- Icons: PNG. Screenshots: WebP, compressed (aim for under about 150 KB each).
- Keep `width` and `height` on every `<img>` and `loading="lazy"` on images below the first screen.

## Deploy to Cloudflare Pages

1. Push the folder to a GitHub repository.
2. In Cloudflare: Workers & Pages > Create > Pages > connect the repository.
3. Framework preset: **None**. Build command: leave empty. Output directory: `/`.
4. Deploy. File names are case-sensitive on the host, so keep them lowercase.

Before going live: open every page, click every link, check the browser console, and test at phone width (DevTools device toolbar).
