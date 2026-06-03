"""Generate an Apple-style app icon for XDeck (1024x1024 PNG)."""
from PIL import Image, ImageDraw

S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

# --- Vertical blue gradient ---
top = (74, 156, 255)     # #4A9CFF
bot = (0, 96, 223)       # #0060DF
grad = Image.new("RGBA", (S, S))
gd = grad.load()
for y in range(S):
    t = y / (S - 1)
    r = round(top[0] + (bot[0] - top[0]) * t)
    g = round(top[1] + (bot[1] - top[1]) * t)
    b = round(top[2] + (bot[2] - top[2]) * t)
    for x in range(S):
        gd[x, y] = (r, g, b, 255)

# --- Rounded-square (squircle-ish) mask, Apple icon grid ---
margin = 86
radius = 228
mask = Image.new("L", (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([margin, margin, S - margin, S - margin],
                     radius=radius, fill=255)
img.paste(grad, (0, 0), mask)

draw = ImageDraw.Draw(img)

# --- Three white "feed columns" ---
inner_l, inner_r = 262, S - 262          # content band
top_y, bot_y = 286, S - 286
gap = 34
col_w = (inner_r - inner_l - 2 * gap) / 3
col_radius = 30
row_radius = 12

for i in range(3):
    cx = inner_l + i * (col_w + gap)
    # column card — slightly translucent white, front one brightest
    alpha = [235, 255, 235][i]
    draw.rounded_rectangle([cx, top_y, cx + col_w, bot_y],
                           radius=col_radius, fill=(255, 255, 255, alpha))
    # faint "tweet rows" inside each column
    pad = 26
    rx0, rx1 = cx + pad, cx + col_w - pad
    ry = top_y + 40
    row_h = 26
    row_gap = 34
    while ry + row_h < bot_y - 30 and (ry - top_y) < 360:
        w = rx1 if (ry - top_y) % 68 < 34 else rx0 + (rx1 - rx0) * 0.62
        draw.rounded_rectangle([rx0, ry, w, ry + row_h],
                               radius=row_radius, fill=(0, 113, 227, 38))
        ry += row_h + row_gap

img.save("build/icon.png")
print("wrote build/icon.png", img.size)
