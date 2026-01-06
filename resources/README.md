# Application Icons

This directory contains the application icons for the PR Reminder app.

## Files

- `icon.svg` - Source SVG icon (1024x1024) with GitHub notification bell design
- `icon.png` - Generated PNG icon (1024x1024) used by electron-builder
- `trayTemplate.svg` / `trayTemplate.png` / `trayTemplate@2x.png` - System tray icons

## Generating Icons

The main application icon (`icon.png`) should be generated from `icon.svg` before building the application.

### Method 1: Using the Python script (Recommended)

```bash
python3 generate_icon.py
```

This will generate a 1024x1024 PNG icon from the design specification.

### Method 2: Using ImageMagick/rsvg-convert

If you have ImageMagick or rsvg-convert installed:

```bash
# Using rsvg-convert
rsvg-convert -w 1024 -h 1024 resources/icon.svg -o resources/icon.png

# Or using ImageMagick
convert -background none -resize 1024x1024 resources/icon.svg resources/icon.png
```

## Platform-Specific Icons

Electron Builder automatically generates platform-specific icons from `icon.png`:

- **macOS**: `icon.icns` (generated during build)
- **Windows**: `icon.ico` (generated during build)
- **Linux**: Uses `icon.png` directly

These files are generated automatically when you run:
- `pnpm run build:mac`
- `pnpm run build:win`
- `pnpm run build:linux`

## Icon Design

The icon features a white notification bell with a red notification dot on a blue rounded square background, inspired by GitHub's notification icon.
