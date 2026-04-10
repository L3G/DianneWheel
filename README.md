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

### Step 1: Add the wheel to OBS

1. In OBS, add a **Browser Source**
2. Set the URL to:
   ```
   https://dianne-wheel.lumeabus.workers.dev/?overlay=true
   ```
3. Set width to **1920** and height to **1080**
4. The wheel appears with a transparent background over your stream

### Step 2: Open the remote control

1. Open this in your regular browser (Chrome, Firefox, etc.):
   ```
   https://dianne-wheel.lumeabus.workers.dev/control.html
   ```
2. Click the big **SPIN** button (or press Spacebar)
3. The wheel in OBS spins automatically

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

## Deploying to Cloudflare Workers

The app uses Cloudflare Workers with KV storage so the remote control can communicate with the OBS overlay.

### First-time setup

1. Install wrangler: `npm install -g wrangler`
2. Log in: `npx wrangler login`
3. Create the KV namespace:
   ```
   npx wrangler kv namespace create SPIN_SIGNALS
   ```
4. Copy the `id` from the output and paste it into `wrangler.toml`
5. Deploy: `npx wrangler deploy`

### After that

Just run `npx wrangler deploy` to push updates, or set up a GitHub Action to auto-deploy on push.
