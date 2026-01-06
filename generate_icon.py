#!/usr/bin/env python3
"""
Generate a GitHub notification-style bell icon for the PR Reminder app.
This creates a 1024x1024 PNG that electron-builder can use to generate .icns and .ico files.
"""

from PIL import Image, ImageDraw
import os

def create_notification_bell_icon(size=1024, output_path="resources/icon.png"):
    """Create a notification bell icon similar to GitHub's notifications."""

    # Create a new image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded rectangle (blue)
    corner_radius = size // 5
    bg_color = (59, 130, 246, 255)  # #3B82F6
    draw.rounded_rectangle([(0, 0), (size, size)], corner_radius, fill=bg_color)

    # Calculate bell dimensions (centered)
    center_x = size // 2
    center_y = size // 2
    bell_width = size // 3
    bell_height = size // 3

    # Bell body (simplified bell shape using polygon)
    bell_top_y = center_y - bell_height // 2
    bell_bottom_y = center_y + bell_height // 4
    bell_left_x = center_x - bell_width // 2
    bell_right_x = center_x + bell_width // 2

    # Draw bell body as a trapezoid-like shape
    bell_points = [
        (center_x - bell_width // 3, bell_top_y),  # Top left
        (center_x + bell_width // 3, bell_top_y),  # Top right
        (bell_right_x, bell_bottom_y),              # Bottom right
        (bell_left_x, bell_bottom_y),               # Bottom left
    ]
    draw.polygon(bell_points, fill='white')

    # Bell handle (small rectangle at top)
    handle_width = bell_width // 6
    handle_height = bell_height // 6
    handle_y = bell_top_y - handle_height
    draw.rectangle([
        (center_x - handle_width // 2, handle_y),
        (center_x + handle_width // 2, bell_top_y)
    ], fill='white')

    # Bell rim (horizontal line at bottom of bell)
    rim_height = bell_height // 15
    draw.rectangle([
        (bell_left_x, bell_bottom_y),
        (bell_right_x, bell_bottom_y + rim_height)
    ], fill='white')

    # Bell clapper (small circle below bell)
    clapper_radius = bell_width // 8
    clapper_y = bell_bottom_y + clapper_radius + rim_height * 2
    draw.ellipse([
        (center_x - clapper_radius, clapper_y - clapper_radius),
        (center_x + clapper_radius, clapper_y + clapper_radius)
    ], fill='white')

    # Notification dot (red circle in top-right)
    dot_radius = size // 12
    dot_x = center_x + bell_width // 2 + dot_radius // 2
    dot_y = center_y - bell_height // 2 - dot_radius // 2
    dot_color = (239, 68, 68, 255)  # #EF4444 (red)
    draw.ellipse([
        (dot_x - dot_radius, dot_y - dot_radius),
        (dot_x + dot_radius, dot_y + dot_radius)
    ], fill=dot_color)

    # Save the image
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'PNG')
    print(f"Icon generated: {output_path}")
    print(f"Size: {size}x{size} pixels")

if __name__ == "__main__":
    create_notification_bell_icon()
