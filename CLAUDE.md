# Photo-graphs Index

The gallery is a single file: `index.html` at the repo root. No build step, no dependencies.

## Adding a new project

Add a new `<article>` inside `<div class="grid">` in `index.html`. There are two templates:

### Shipped project (has photos, links to subfolder)
```html
<article class="project shipped">
  <a href="./FOLDER-NAME/">
    <div class="folder">
      <div class="folder-back">
        <div class="folder-tab"></div>
        <div class="folder-bg"></div>
      </div>
      <div class="photos">
        <img src="./FOLDER-NAME/thumbs/1.jpg" alt="">
        <img src="./FOLDER-NAME/thumbs/2.jpg" alt="">
        <img src="./FOLDER-NAME/thumbs/3.jpg" alt="">
      </div>
      <div class="folder-front"></div>
    </div>
    <p class="project-title">Short Title Here</p>
  </a>
</article>
```

### Not started (empty gray folder, no link)
```html
<article class="project empty">
  <div class="folder">
    <div class="folder-back">
      <div class="folder-tab"></div>
      <div class="folder-bg"></div>
    </div>
    <div class="folder-front"></div>
  </div>
  <p class="project-title">Short Title Here</p>
</article>
```

## Promoting a project from empty → shipped

1. Change `class="project empty"` to `class="project shipped"`
2. Wrap the contents in `<a href="./FOLDER-NAME/">…</a>`
3. Add the `.photos` div with 3 thumbnail images between `.folder-back` and `.folder-front`

## Thumbnails

Each shipped project needs a `thumbs/` folder inside its subfolder with exactly three images named `1.jpg`, `2.jpg`, `3.jpg`. These can be any aspect ratio — they render at their natural proportions.

## Editing a title

Change the text inside `<p class="project-title">` for that project's `<article>`.

## Project order

Projects appear in the grid in source order (left-to-right, top-to-bottom). Reorder the `<article>` blocks to change the display order.
