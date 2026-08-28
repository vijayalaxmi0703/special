# Teacher's Hug

You are an expert React + TypeScript frontend engineer, UX designer, and Framer Motion animation specialist.

I want you to BUILD the complete interactive Teacher's Day experience described below. Do not merely explain the code or give snippets. Provide ALL necessary project files fully written out (App.tsx, components, styles, tailwind configs, package.json, main.tsx) so I can paste them directly into VS Code and run them immediately.

---

## 🛠️ TECHNOLOGY STACK & CONSTRAINTS

Use:

* React (v18+)

* TypeScript

* Vite

* Tailwind CSS

* Framer Motion (`framer-motion`)

* Lucide React (`lucide-react`) for UI icons (mute/replay)

Do NOT use:

* Three.js / WebGL

* Blender / 3D models

* Mixamo

* Camera tracking / Webcam permissions

* Microphone input

The project must run locally with:

```bash

npm install

npm run dev📁 ASSETS & LAYER ARCHITECTURE

I already have these transparent PNG files inside my public/ directory:

Plaintext

public/

  body.png       <-- Bunny head, ears, torso, and legs (resting pose)

  left-arm.png   <-- Left arm (separate layer for animation)

  right-arm.png  <-- Right arm (separate layer for animation)

  crown.png      <-- Crown (separate layer for animation)

VERY IMPORTANT: BUNNY STRUCTURE & LAYERING

Do NOT treat the bunny as a single static image. Create a layered React component (src/components/Bunny.tsx) using absolute positioning:

TypeScript

<div className="relative width-and-height-container">

  {/* Crown Layer */}

  <motion.img src="/crown.png" className="absolute ..." />

  

  {/* Left Arm Layer */}

  <motion.img 

    src="/left-arm.png" 

    className="absolute origin-top-right ..." 

  />

  

  {/* Body Layer (Head + Torso + Feet) */}

  <img src="/body.png" className="relative z-10 ..." />

  

  {/* Right Arm Layer */}

  <motion.img 

    src="/right-arm.png" 

    className="absolute origin-top-left ..." 

  />

</div>

CRITICAL POSITIONING INSTRUCTIONS:

Define clear transformOrigin properties (top right for left arm, top left for right arm) so rotation pivots naturally at the shoulder joints without disconnecting from the body.

Ensure there are zero visible gaps between the body and arms.

Make sure the layer ordering (z-index) allows arms to move seamlessly both behind the body during idle state and in front of the viewport during the hug.

📱 VIEWPORT & RESPONSIVE DESIGN

Target: Mobile portrait priority (390×844, 393×852, 412×915, 430×932), but fully responsive on desktop centered viewports.

Use width: 100vw, height: 100dvh, overflow: hidden.

No scrollbars, headers, footers, or standard website UI.

Provide an overlay control bar with:

Soft background music toggle (Audio toggle button in the top-right corner).

Replay button (appears at the end of the film).

🌌 VISUAL ATMOSPHERE & BACKGROUND

Create a Background.tsx component:

Deep purple/navy night sky gradient (bg-gradient-to-b from-slate-950 via-purple-950 to-indigo-950).

Floating background twinkling stars using subtle Framer Motion loops.

Subtle glowing particles rising gently.

Soft cinematic lighting and radial glow behind the bunny.

🎬 SCENE BREAKDOWN & SEQUENCE STATE MACHINE

Manage the entire experience using a continuous state machine in App.tsx (e.g., currentScene enum/state from 1 to 8). Transitions between scenes must be automatic with proper timing delays. Include an option to tap screen to advance dialogue if the viewer wants to move faster.

SCENE 1 — NIGHT SKY (Duration: ~2s)

Display only the magical night sky and floating particles.

Automatically transition to Scene 2 after 2 seconds.

SCENE 2 — SHY SIDE PEEK (~6s)

Bunny is hidden beyond the LEFT edge of the screen (x: '-100%').

Peeks out slowly and cute:

Left ear appears from the left edge.

Right ear and top of head appear.

One eye peeks out, then both eyes.

Bunny looks around, quickly retracts slightly (shy), then peeks out again.

Use Framer Motion keyframes with smooth easeInOut cubic-beziers.

SCENE 3 — ENTER CENTER (~4s)

Bunny slides out completely from the left edge towards horizontal screen center (x: 0).

Add slight rotation tilt (rotate: [-5, 3, 0]) and a tiny, cute hop (y: [0, -25, 0]) as it settles into the center.

Idle breathing animation activates (gentle vertical scale [1, 1.02, 1] over 3 seconds).

SCENE 4 — DIALOGUE (~15s)

Subtitles appear below/above the bunny (NEVER overlapping the bunny's face).

Use a warm, soft typewriter or smooth blur-fade text transition for each line:

"Hi Mam... 😊"

"I came because someone was too shy to say all this properly herself."

"I just wanted to tell you something..."

"I've always admired you more than I probably ever managed to say."

"Not just because you're my teacher..."

"But because of the way you care about the people around you."

"You're incredibly dedicated to what you do."

"And somehow..."

"you made a very quiet student feel comfortable talking."

"So today..."

"I just wanted to say thank you."

"Thank you for being such a wonderful teacher, Mam. ❤️"

SCENE 5 — THE CROWN CEREMONY (Crucial Interaction) (~8s)

Do NOT instantly spawn the crown on top of the screen. Animate physical interaction:

Bunny turns slightly and looks behind itself (rotate: -10).

Crown floats down into bunny's paws/chest area.

Bunny turns forward, holds the crown, and steps forward toward the viewer (scale: 1.15).

Bunny raises both arms upward (left-arm rotate -45deg, right-arm rotate 45deg).

Crown smoothly lifts off the bunny's paws and travels to the TOP-CENTER of the screen (representing the teacher's head).

Crown pauses at top-center, emits a brilliant golden pulse/radial glow with sparkle particles.

Text appears: "Because every wonderful teacher deserves a crown. 👑"

SCENE 6 — THE 1ST-PERSON POV HUG (MOST IMPORTANT SCENE) (~8s)

The phone screen IS the viewer. The bunny must physically hug the viewer coming OUT of the phone:

Approach phase:

Bunny looks straight at the camera.

Bunny scales up continuously: scale: 1 ➔ 1.4 ➔ 2.2 ➔ 3.2+.

Bunny moves slightly downward while scaling so its face fills 70% of the screen.

Background blurs (backdrop-blur-md).

Arm Hug phase (Independent Arm Movement):

Both left-arm.png and right-arm.png open wide, move forward, and rotate outward toward the viewport's edges.

Left arm moves to the outer left border (x: -30vw, rotate: -35deg, scale: 1.4).

Right arm moves to the outer right border (x: 30vw, rotate: 35deg, scale: 1.4).

Arms extend partially past the screen boundaries to enclose the viewer in a 1st-person perspective hug.

Hug Ambience & Subtitles:

Add a warm golden light vignette around the screen edges.

Subtle screen pulse (heartbeat rhythm).

Floating red/pink mini-hearts.

Subtitles appear in soft text:

"Thank you..."

"...for being such a wonderful teacher. ❤️"

"I hope you always know how much you are appreciated."

Hold hug pose for 5 seconds.

SCENE 7 — RELEASE & STEP BACK (~5s)

Bunny slowly retracts arms back to body.

Bunny scales down back to standard center position (scale: 1).

Background unblurs.

Bunny waves its right arm (right-arm rotate loop [0, 20, 0, 20, 0]).

SCENE 8 — MAGICAL ENDING & MOON SCENE (~8s)

Moon reveals itself gently in the upper sky.

Bunny sits comfortably under the moon light.

Final message fades in with soft glowing text:

"Happy Teacher's Day, Mam. ❤️"

"Thank you for being you."

Replay button softly fades into the bottom right.

🏗️ PROJECT STRUCTURE TO GENERATE

Provide code for ALL of the following files:

package.json (including framer-motion, clsx, tailwind-merge, lucide-react, vite)

vite.config.ts

tailwind.config.js & src/index.css (with custom keyframes/utilities if needed)

src/main.tsx

src/types/scene.ts (State types for scenes)

src/components/Background.tsx (Starry night + particle canvas/motion elements)

src/components/Bunny.tsx (Multi-layered body + arms + crown with Framer Motion variants)

src/components/Dialogue.tsx (Text rendering with smooth transitions)

src/components/CrownGlow.tsx (Sparkle and lighting effects for scene 5)

src/App.tsx (Complete master controller orchestrating scenes 1 through 8)

Generate clean, robust, error-free TypeScript code ready to copy-paste.You are an expert React + TypeScript frontend engineer and Framer Motion animation designer.

I am building this project locally using Vite, React, TypeScript, Tailwind CSS, and Framer Motion. 

Please provide the COMPLETE code for EVERY required file. 

IMPORTANT FORMATTING RULE FOR YOUR RESPONSE:

Output each file in its own separate markdown code block. 

Above each code block, write the EXACT relative file path (e.g., `// File: src/components/Bunny.tsx`) so I can easily copy-paste each file directly into VS Code without guessing where it goes.

Do NOT shorten any code, do NOT use placeholders like `// ... rest of code`, and do NOT omit any imports or styles. Give me 100% production-ready, runnable code.

---

## 🛠️ STACK & RULES

* React + TypeScript + Vite + Tailwind CSS + Framer Motion (`framer-motion`) + Lucide Icons (`lucide-react`)

* DO NOT use Three.js, WebGL, 3D models, or camera/microphone APIs.

* Everything is a 1st-person screen-space animation designed to feel like a magical short film.

---

## 📁 ASSETS IN `/public`

The following assets are already placed in `public/`:

* `/public/body.png` (Head, ears, body, legs resting pose)

* `/public/left-arm.png` (Separate transparent layer)

* `/public/right-arm.png` (Separate transparent layer)

* `/public/crown.png` (Separate transparent layer)

---

## 🧩 FILES TO GENERATE SEPARATELY

Please generate complete code for each of the following files:

1. `package.json`

2. `vite.config.ts`

3. `tailwind.config.js`

4. `src/index.css` (Tailwind imports + custom body/viewport styles)

5. `src/main.tsx`

6. `src/types/scene.ts` (Enum/type definition for Scenes 1 to 8)

7. `src/components/Background.tsx` (Starry night, floating light particles, soft gradients)

8. `src/components/Bunny.tsx` (Layered component with absolute positioning for body, left-arm, right-arm, and crown. Must handle precise transform-origins so arms rotate from shoulders during idle, crown placement, and hug pose)

9. `src/components/Dialogue.tsx` (Subtitle engine displaying text line-by-line below the bunny with smooth fade/typewriter effect)

10. `src/components/CrownGlow.tsx` (Magical golden aura and sparkle effects for Scene 5)

11. `src/App.tsx` (Main state machine managing seamless automatic timing transitions from Scene 1 to Scene 8, with tap-to-skip text and audio toggle controls)

---

## 🎬 SCENE SEQUENCE SUMMARY

* **Scene 1 (Night Sky):** 2s atmosphere intro.

* **Scene 2 (Shy Side Peek):** Bunny peeks ears/eyes out slowly from the left edge of screen twice before stepping out.

* **Scene 3 (Enter Center):** Bunny walks to center with slight rotation and a cute hop.

* **Scene 4 (Dialogue):** 12 warm lines dedicated to "Mam" appear sequentially.

* **Scene 5 (Crown Placement):** Bunny holds crown, walks forward, raises arms, and crown floats smoothly to TOP-CENTER of viewport (onto viewer's head) with a golden sparkle effect.

* **Scene 6 (1st-Person POV Hug):** Bunny approaches screen (`scale: 1` -> `3.5`), background blurs, left & right arms open wide independently towards left & right viewport borders (`-30vw` & `+30vw`) to enclose the viewer's screen. Hold hug for 5s.

* **Scene 7 (Release):** Bunny steps back, arms retract, waves goodbye.

* **Scene 8 (Ending):** Moon appears, bunny sits under moonlight, final message: *"Happy Teacher's Day, Mam. ❤️"* + Replay button.

Please generate all 11 files step-by-step in separate, clearly labeled code blocks now.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/da465a78-e79c-4771-bd51-ca40bb4a22e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
