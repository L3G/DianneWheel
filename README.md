# DianneWheel 🎡

A spin wheel for Twitch channel point redemptions. Built for **spookydianne**.

---

## How to use

Open the app in your browser. You'll see the wheel on the right and an editor on the left.

### Adding options

1. Type an option name in the text box on the left
2. Click **Add** (or press Enter)
3. Repeat for each option you want on the wheel

### Spinning

Press the big **SPIN** button or hit **Spacebar** to spin the wheel. The winner pops up on screen when it stops.

### Editing options

- **Change the name**: click the text of any option and type a new name
- **Change the color**: click the colored square next to an option
- **Disable an option** (skip it without deleting): click the ✓ button to toggle it off
- **Remove an option**: click the × button
- **Reorder**: drag options up or down using the ⠿ handle

### Settings

Click the ⚙ gear icon in the top right to open settings:

- **Spin duration** — how long the wheel spins
- **Confetti** — celebration effect on/off
- **Sound effects** — on/off
- **Transparent background** — for use as a stream overlay
- **Show controls** — hide the editor and history panels
- **Export/Import JSON** — save or load your wheel options as a file

---

## Using in OBS as a stream overlay

You need **two browser tabs** open in the same browser (e.g. Chrome):

### Tab 1: The overlay (what viewers see)

1. Open your site with `?overlay=true` at the end:
   ```
   https://your-site-here.pages.dev/?overlay=true
   ```
2. This shows just the wheel with a transparent background — no controls.

### Tab 2: The remote control (what you use)

1. Open the control page:
   ```
   https://your-site-here.pages.dev/control.html
   ```
2. This has a big SPIN button and shows results.
3. When you click SPIN here, the wheel in Tab 1 spins automatically.

### Adding it to OBS

1. In OBS, add a **Window Capture** source
2. Select the browser window/tab that has the overlay open
3. Crop it to just the wheel area if needed
4. When you click SPIN on the control page, the captured wheel spins live on stream

**Alternatively**, you can add a **Browser Source** in OBS pointed at the `?overlay=true` URL, and spin it by right-clicking the source → **Interact** → clicking the SPIN button. The remote control method above is easier during a live stream.

---

## Multiple wheels

You can run separate wheels (with their own options and history) by adding `?wheel=` to the URL. For example:

| What | URL |
|------|-----|
| Main wheel | `your-site.pages.dev` |
| Main wheel overlay | `your-site.pages.dev/?overlay=true` |
| Main wheel remote | `your-site.pages.dev/control.html` |
| Val wheel | `your-site.pages.dev/?wheel=val` |
| Val wheel overlay | `your-site.pages.dev/?overlay=true&wheel=val` |
| Val wheel remote | `your-site.pages.dev/control.html?wheel=val` |

Each wheel saves its own options separately. You can have as many as you want — just change the name after `wheel=`.

---

## Deploying to Cloudflare Pages

1. Fork or push this repo to your GitHub account
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
3. Click **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
4. Select the **DianneWheel** repository
5. Leave **Build command** blank
6. Set **Build output directory** to `/`
7. Click **Save and Deploy**

Your site will be live at `something.pages.dev` within a minute. Every push to `main` auto-deploys.
