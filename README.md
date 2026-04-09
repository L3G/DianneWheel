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

1. In OBS, add a **Browser Source**
2. Set the URL to your deployed site with `?overlay=true` at the end:
   ```
   https://your-site-here.pages.dev/?overlay=true
   ```
3. Set width to **1920** and height to **1080**
4. The wheel appears with a transparent background over your stream

To trigger a spin from the overlay, use the on-screen button or call `window.spinWheel()` from an automation tool.

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
