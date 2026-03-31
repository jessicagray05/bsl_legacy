# BSL Space Portfolio

A clean one-page portfolio concept website built with HTML, CSS and JavaScript.

## What it does

This project uses a dark space style background, a floating live camera panel and browser-based hand tracking to recognise a few simple hand shapes. When a gesture is recognised, the background stars pull together into a word.

## Important note

This is a creative prototype and not a full British Sign Language translator. Real BSL recognition would need a much more advanced model, more movement analysis and more language data.

## How to run

### Option 1: Visual Studio Code
1. Open the folder in Visual Studio Code.
2. Install the Live Server extension.
3. Right click `index.html`.
4. Click **Open with Live Server**.
5. Allow camera access in your browser.

### Option 2: Python simple server
If you have Python installed, open a terminal in the folder and run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Files
- `index.html`
- `style.css`
- `script.js`
- `README.md`

## Demo gestures
- Open hand = Hello
- Fist = No
- Thumbs up = Thank you
- Pinch = Please
- Two fingers up = Yes
