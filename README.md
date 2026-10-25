# Prince Rathod – portfolio site

A static, single-page portfolio with a light 3D look (light blue `#E9F1FA`, bright blue `#00ABE4`, white).
No build step: open `index.html` through any static web server.

## What's inside

| File | Purpose |
| --- | --- |
| `index.html` | All content (edit text here) |
| `css/style.css` | Design: colours are variables at the top |
| `js/loader.js` | Intro: count-up with rising blue liquid and pipeline checklist |
| `js/main.js` | Hero intro, camera moves along the career path as you scroll |
| `js/silk.js` | Hero "liquid silk" 3D wave (Three.js shader) |
| `js/route.js` | 3D career path: rising pillars, floating objects, path that builds as you scroll |
| `js/ui.js` | Nav glider, reveals, counters, deployment filter, 3D skills carousel, copy-email |

Three.js 0.160 and GSAP 3.12.5 load from the jsDelivr CDN through the import map in `index.html`.
Without WebGL the page still works (flat backgrounds); with reduced motion it renders still frames.

## Run locally

```bash
cd prince-site
python3 -m http.server 8080
# open http://localhost:8080
```
(Opening the file directly with file:// won't load the ES modules.)

## Publish on GitHub Pages

1. Create a repo named `princerathod23.github.io` on the GitHub account `princerathod23`.
2. Put these files at the repo root and push:
   ```bash
   git init
   git add .
   git commit -m "Portfolio site"
   git branch -M main
   git remote add origin https://github.com/princerathod23/princerathod23.github.io.git
   git push -u origin main
   ```
3. In the repo: Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
4. The site goes live at https://princerathod23.github.io within a minute or two.

## Editing tips

- Change colours in `:root` at the top of `css/style.css`.
- Each journey step's `data-stop` (0–5) matches a stop in `STOPS` at the top of `js/route.js` (year, label, shape).
- Deployment cards use `data-cat="prod" | "cicd" | "more"` to match the filter tabs.
