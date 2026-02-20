# PMODE1 Editor

## For static serving, clone the branch named 'dist', instead of 'main'.

This code was written by Google Gemini 3 Pro,
at the direction of Henry Strickland (Strick Yak):

https://ai.studio/apps/drive/1y4nlkFjtHjSwGlRVNIHbR9J3HVFmF2DM

## -----------------------------------------------------------

Hints for rebuilding and redeployment.

```
[root]
    apt install npm
    apt install esbuild

[coco]
    npm install react

[laptop]
    rsync -av pmode1-editor/ root@64.23.204.205:/home/coco/pmode1-editor/

[coco]
    esbuild --bundle index.tsx --outdir=dist --sourcemap

[laptop]
    rsync -a  root@64.23.204.205:/home/coco/pmode1-editor/dist/ dist/
```


## -----------------------------------------------------------

The following is what Google AIStudio writes, but I haven't even tried it,
and I won't, because I use static serving.

## -----------------------------------------------------------

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1y4nlkFjtHjSwGlRVNIHbR9J3HVFmF2DM

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
