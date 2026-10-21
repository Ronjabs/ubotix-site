# UBotix website

Website of **UBotix**, the robotics club of the Honor Society Organization, School of Information Technology, University of Baguio.

Live site: https://ubotix.netlify.app

It is a plain static site (HTML, CSS and JavaScript). There is no build step and nothing to install.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home: hero slides, services, how to order, stats, photos, FAQ |
| `about.html` | About the club, the 2025 Romania championship, team |
| `services.html` | Products and services |
| `estimate.html` | 3D print cost estimate: model upload and manual calculator |
| `gallery.html` | Photo gallery with enlarge view |
| `contact.html` | Join the club, message us, find us |

## Folder layout

```
index.html, about.html, ...   the pages (edit these directly)
styles.css                    all styling; colors and fonts are at the top
script.js                     menu, hero slides, tabs, loads content/*.json
estimate.js                   price formula for the estimate page
slicer.js                     3D model upload estimator (STL / OBJ)
content/                      data edited from /admin (see below)
  gallery.json                gallery photos and captions
  services.json               products and services cards
  updates.json                "Latest updates" news on the home page
  pricing.json                3D print rates
images/                       logos
images/gallery/               photos used on the site
admin/                        Decap CMS admin page (index.html + config.yml)
```

## Run it on your computer

From this folder:

```bash
python -m http.server 5173
```

Then open http://localhost:5173. Opening the files by double-clicking will not work, because the pages load their content with `fetch`.

## Editing content (no code)

Go to https://ubotix.netlify.app/admin/ and log in with GitHub. You can edit:

- **Latest updates**: news and events shown on the home page
- **Gallery photos**: upload a photo and write a caption
- **Products & services**: titles, descriptions and bullet points
- **3D print pricing**: cost per gram and per hour, design fee, markup, rounding

Press **Publish**. The change is saved to GitHub and the site updates in a minute or two.

Tips:
- Resize photos before uploading. Under about 1 MB each keeps the site fast.
- You need write access to this repository to log in (see below).

## Editing code

1. Clone the repository and make your change.
2. Test it locally with the command above.
3. Commit and `git push` to `main`. Netlify republishes automatically.

Things to know:
- **The HTML files are the source of truth.** Edit them directly.
- **The menu, top notice bar and footer are repeated in every page.** If you change one, change it in all six pages.
- Colors, fonts and spacing are in `styles.css` (see the variables at the top).
- Links to the Facebook page and the club registration form are written directly in the HTML. Search for `facebook.com` or `docs.google.com/forms` to change them.

## 3D print estimate

- **Rates** are in `content/pricing.json` and can be changed in `/admin`.
- **Formula** (`estimate.js`): `price = (grams x cost_per_gram + hours x cost_per_hour + design fee) x (1 + markup%)`, rounded up to the nearest 10 pesos. The design fee (per print hour) is only added when the visitor ticks "I need a model designed".
- **Model upload** (`slicer.js`) reads `.stl` and `.obj` files in the visitor's browser. Nothing is uploaded to a server. It measures the model's volume and surface area, then estimates plastic weight and print time from assumptions at the top of the file (wall thickness, flow rate, material density). It is a rough estimate, not a real slicer. Adjust the constants if your printers print faster or slower.

## Adding a contributor

1. Ask for their GitHub username.
2. Repository **Settings > Collaborators > Add people**, choose the **Write** role.
3. They accept the email invitation.

Collaborators can use `/admin` and push code. They do not need a Netlify account.

## Hosting setup (one time)

- **GitHub**: this repository, branch `main`.
- **Netlify**: site `ubotix`, connected to this repository. No build command. Publish directory is `.` (the repository root).
- **Admin login**: the admin signs in with GitHub through Netlify. This needs a GitHub OAuth app (callback URL `https://api.netlify.com/auth/done`) and its client ID and secret installed in Netlify under **Site configuration > Access & security > OAuth**. Never put the client secret in this repository.
- `admin/config.yml` points to the repository (`Ronjabs/ubotix-site`). Change it if the repository moves.

## Notes

- Full-size original photos are not stored in the repository (see `.gitignore`). Only the resized copies in `images/gallery/` are.
- Every publish goes live immediately and anyone with write access can change anything. GitHub keeps the history, so mistakes can be undone.
