"""
make_arch.py — Generates fig_architecture.png using Pillow only (no matplotlib).
Run: python3 make_arch.py
"""

from PIL import Image, ImageDraw, ImageFont
import os, sys

# ── Canvas ─────────────────────────────────────────────────────────────────────
W, H = 1560, 980
img  = Image.new("RGB", (W, H), "#ffffff")
draw = ImageDraw.Draw(img)

# ── Font loader ────────────────────────────────────────────────────────────────
def get_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSText.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    ]
    bold_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    ]
    paths = bold_candidates if bold else candidates
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

F_BOLD  = get_font(22, bold=True)
F_REG   = get_font(18)
F_SM    = get_font(15)
F_TINY  = get_font(13)
F_HEAD  = get_font(28, bold=True)
F_TIER  = get_font(20, bold=True)

# ── Colour palette ─────────────────────────────────────────────────────────────
TIER1_BG   = "#dbeafe"
TIER2_BG   = "#fef9c3"
TIER3_BG   = "#dcfce7"
TIER1_EDGE = "#2563eb"
TIER2_EDGE = "#d97706"
TIER3_EDGE = "#16a34a"
ALERT_EDGE = "#dc2626"
ALERT_BG   = "#fee2e2"
SQLITE_BG  = "#fef3c7"
SQLITE_EDG = "#b45309"
PIPE_BG    = "#fffbeb"
ARROW_C    = "#475569"
TEXT_DARK  = "#1e293b"
TEXT_MED   = "#475569"
BAR_BG     = "#bfdbfe"
TG_BG      = "#fecaca"
FE_ITEM_BG = "#f0fdf4"

# ── Helper: rounded rectangle ──────────────────────────────────────────────────
def rrect(draw, x0, y0, x1, y1, radius=14, fill="#fff", outline="#aaa", width=2):
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius,
                            fill=fill, outline=outline, width=width)

# ── Helper: centred text (single or two lines) ─────────────────────────────────
def ctext(draw, cx, cy, lines, fonts, colors=None):
    if isinstance(lines, str):
        lines = [lines]
    if colors is None:
        colors = [TEXT_DARK] * len(lines)
    total_h = sum(f.size + 3 for f in fonts)
    y = cy - total_h // 2
    for line, font, color in zip(lines, fonts, colors):
        bbox  = font.getbbox(line)
        tw    = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, y), line, font=font, fill=color)
        y += font.size + 4

# ── Helper: arrow ──────────────────────────────────────────────────────────────
def arrow(draw, x1, y1, x2, y2, color=ARROW_C, width=2):
    draw.line([(x1, y1), (x2, y2)], fill=color, width=width)
    # Arrowhead
    import math
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1
    ux, uy = dx / length, dy / length
    arrow_len, arrow_w = 12, 6
    bx  = x2 - ux * arrow_len
    by  = y2 - uy * arrow_len
    px  = -uy * arrow_w
    py  = ux  * arrow_w
    draw.polygon([(x2, y2),
                  (int(bx + px), int(by + py)),
                  (int(bx - px), int(by - py))],
                 fill=color)

# ══════════════════════════════════════════════════════════════════════════════
# TITLE
# ══════════════════════════════════════════════════════════════════════════════
title = "SentinelCore — Three-Tier Architecture"
tb    = F_HEAD.getbbox(title)
tw    = tb[2] - tb[0]
draw.text((W // 2 - tw // 2, 18), title, font=F_HEAD, fill=TEXT_DARK)

# ══════════════════════════════════════════════════════════════════════════════
# TIER 1 — COLLECTION
# ══════════════════════════════════════════════════════════════════════════════
T1_Y0, T1_Y1 = 62, 240
rrect(draw, 30, T1_Y0, W - 30, T1_Y1, radius=18, fill=TIER1_BG,
      outline=TIER1_EDGE, width=2)
draw.text((50, T1_Y0 + 8), "TIER 1 — COLLECTION",
          font=F_TIER, fill=TIER1_EDGE)

# Three agents
agent_xs = [260, 780, 1300]
for ax_c, label in zip(agent_xs, ["Windows Host", "Linux Host", "macOS Host"]):
    rrect(draw, ax_c - 195, T1_Y0 + 28, ax_c + 195, T1_Y1 - 18,
          radius=12, fill="#eff6ff", outline=TIER1_EDGE, width=2)
    ctext(draw, ax_c, T1_Y0 + 80,
          ["Endpoint Agent", "Python · psutil"],
          [F_BOLD, F_SM], [TIER1_EDGE, TEXT_MED])
    ctext(draw, ax_c, T1_Y1 - 30,
          [label], [F_TINY], ["#3b82f6"])

# POST /ingest bar
BAR_Y0, BAR_Y1 = 254, 300
rrect(draw, 60, BAR_Y0, W - 60, BAR_Y1, radius=10,
      fill=BAR_BG, outline=TIER1_EDGE, width=2)
msg = "POST /ingest   ·   JSON payload   ·   X-API-Key  or  JWT Bearer (HS256)"
mb  = F_REG.getbbox(msg)
draw.text((W // 2 - (mb[2] - mb[0]) // 2, BAR_Y0 + 10),
          msg, font=F_REG, fill=TIER1_EDGE)

# Arrows: agents → bar
for ax_c in agent_xs:
    arrow(draw, ax_c, T1_Y1 - 18, ax_c, BAR_Y0, color=TIER1_EDGE, width=3)

# ══════════════════════════════════════════════════════════════════════════════
# TIER 2 — ANALYSIS & PERSISTENCE
# ══════════════════════════════════════════════════════════════════════════════
T2_Y0, T2_Y1 = 316, 760
rrect(draw, 30, T2_Y0, W - 30, T2_Y1, radius=18, fill=TIER2_BG,
      outline=TIER2_EDGE, width=2)
draw.text((50, T2_Y0 + 8), "TIER 2 — ANALYSIS & PERSISTENCE",
          font=F_TIER, fill=TIER2_EDGE)

# Pipeline step definitions:  (centre-x, width, label1, label2)
PIPE_CY = 450
steps = [
    (155,  260, "MITRE Mapper",      "37 rules · 35 IDs"),
    (450,  260, "Feature Extract.",  "21 features"),
    (750,  280, "Isolation Forest",  "n=200, cont.=0.08"),
    (1065, 280, "Score Calibration", "sigmoid + boosts"),
    (1370, 250, "Severity Assign.",  "5 tiers, τ=0.12"),
]
step_boxes = []
for cx, bw, l1, l2 in steps:
    x0, x1 = cx - bw // 2, cx + bw // 2
    rrect(draw, x0, PIPE_CY - 52, x1, PIPE_CY + 52,
          radius=12, fill=PIPE_BG, outline=TIER2_EDGE, width=2)
    ctext(draw, cx, PIPE_CY,
          [l1, l2], [F_BOLD, F_SM], [TIER2_EDGE, TEXT_MED])
    step_boxes.append((cx, bw))

# Arrow from /ingest bar to MITRE
arrow(draw, 155, BAR_Y1, 155, PIPE_CY - 52, color=TIER2_EDGE, width=3)

# Arrows between steps
for i in range(len(step_boxes) - 1):
    cx1, bw1 = step_boxes[i]
    cx2, bw2 = step_boxes[i + 1]
    arrow(draw, cx1 + bw1 // 2, PIPE_CY,
          cx2 - bw2 // 2, PIPE_CY,
          color=TIER2_EDGE, width=3)

# ── SQLite ─────────────────────────────────────────────────────────────────────
DB_CX, DB_CY = 600, 620
rrect(draw, DB_CX - 160, DB_CY - 52, DB_CX + 160, DB_CY + 52,
      radius=12, fill=SQLITE_BG, outline=SQLITE_EDG, width=2)
ctext(draw, DB_CX, DB_CY,
      ["SQLite (soc.db)", "SQLAlchemy ORM"],
      [F_BOLD, F_SM], [SQLITE_EDG, TEXT_MED])

# Arrow: Severity → SQLite (bent)
sv_cx, _ = step_boxes[-1]
draw.line([(sv_cx, PIPE_CY + 52), (sv_cx, DB_CY),
           (DB_CX + 160, DB_CY)], fill=SQLITE_EDG, width=3)
arrow(draw, DB_CX + 160, DB_CY, DB_CX + 162, DB_CY,
      color=SQLITE_EDG, width=3)  # tiny cap to end line

# Actually draw proper bent arrow
draw.line([(sv_cx, PIPE_CY + 52), (sv_cx, DB_CY)],
          fill=SQLITE_EDG, width=3)
arrow(draw, sv_cx, DB_CY, DB_CX + 160, DB_CY, color=SQLITE_EDG, width=3)

# ── Alert Dispatcher ───────────────────────────────────────────────────────────
AL_CX, AL_CY = 1150, 620
rrect(draw, AL_CX - 160, AL_CY - 52, AL_CX + 160, AL_CY + 52,
      radius=12, fill=ALERT_BG, outline=ALERT_EDGE, width=2)
ctext(draw, AL_CX, AL_CY,
      ["Alert Dispatcher", "BackgroundTask"],
      [F_BOLD, F_SM], [ALERT_EDGE, TEXT_MED])

# Arrow: Severity → Alert Dispatcher
draw.line([(sv_cx, PIPE_CY + 52), (sv_cx, AL_CY)],
          fill=ALERT_EDGE, width=3)
arrow(draw, sv_cx, AL_CY, AL_CX - 160, AL_CY, color=ALERT_EDGE, width=3)

# ── Telegram ────────────────────────────────────────────────────────────────────
TG_CX, TG_CY = 1150, 730
rrect(draw, TG_CX - 155, TG_CY - 45, TG_CX + 155, TG_CY + 45,
      radius=12, fill=TG_BG, outline=ALERT_EDGE, width=2)
ctext(draw, TG_CX, TG_CY,
      ["Telegram Bot API", "high / critical only"],
      [F_BOLD, F_SM], [ALERT_EDGE, TEXT_MED])
arrow(draw, AL_CX, AL_CY + 52, TG_CX, TG_CY - 45, color=ALERT_EDGE, width=3)

# REST API label
REST_Y = 700
draw.line([(DB_CX, DB_CY + 52), (DB_CX, REST_Y)], fill=SQLITE_EDG, width=3)
arrow(draw, DB_CX, REST_Y, DB_CX, REST_Y + 2, color=SQLITE_EDG, width=3)
rest_msg = "REST API  ·  GET /events, /stats  ·  poll every 15 s"
rb = F_SM.getbbox(rest_msg)
draw.text((DB_CX - (rb[2] - rb[0]) // 2, REST_Y + 4),
          rest_msg, font=F_SM, fill=SQLITE_EDG)

# ══════════════════════════════════════════════════════════════════════════════
# TIER 3 — PRESENTATION
# ══════════════════════════════════════════════════════════════════════════════
T3_Y0, T3_Y1 = 776, 960
rrect(draw, 30, T3_Y0, W - 30, T3_Y1, radius=18, fill=TIER3_BG,
      outline=TIER3_EDGE, width=2)
draw.text((50, T3_Y0 + 8), "TIER 3 — PRESENTATION  ·  Next.js · React · Recharts",
          font=F_TIER, fill=TIER3_EDGE)

fe_items = [
    ("Dashboard",  "KPI · Charts"),
    ("Events",     "Filter · ACK"),
    ("Analytics",  "ML Metrics"),
    ("Agents",     "Deploy Guide"),
    ("Settings",   "Telegram · RBAC"),
]
spacing = (W - 120) // len(fe_items)
for i, (l1, l2) in enumerate(fe_items):
    fx = 80 + spacing * i + spacing // 2
    rrect(draw, fx - 130, T3_Y0 + 36, fx + 130, T3_Y1 - 12,
          radius=10, fill=FE_ITEM_BG, outline=TIER3_EDGE, width=2)
    ctext(draw, fx, T3_Y0 + 85,
          [l1, l2], [F_BOLD, F_SM], [TIER3_EDGE, TEXT_MED])

# Arrow: REST → Tier 3
arrow(draw, DB_CX, REST_Y + 28, DB_CX, T3_Y0, color=TIER3_EDGE, width=3)
# Fan to all FE boxes
fe_tops_y = T3_Y0 + 36
dist_y    = REST_Y + 28
for i in range(len(fe_items)):
    fx = 80 + spacing * i + spacing // 2
    draw.line([(DB_CX, T3_Y0), (fx, T3_Y0)], fill=TIER3_EDGE, width=2)
    arrow(draw, fx, T3_Y0, fx, fe_tops_y, color=TIER3_EDGE, width=2)

# ══════════════════════════════════════════════════════════════════════════════
# LEGEND
# ══════════════════════════════════════════════════════════════════════════════
legend = [
    (TIER1_EDGE, "Collection (agents)"),
    (TIER2_EDGE, "Analysis pipeline"),
    (SQLITE_EDG, "Persistence / REST"),
    (ALERT_EDGE, "Alert path (high/critical)"),
    (TIER3_EDGE, "Presentation (dashboard)"),
]
lx, ly = 1200, T2_Y0 + 36
for color, lbl in legend:
    draw.rectangle([lx, ly, lx + 22, ly + 22], fill=color, outline=color)
    draw.text((lx + 30, ly + 2), lbl, font=F_TINY, fill=TEXT_DARK)
    ly += 30

# ── Save ────────────────────────────────────────────────────────────────────────
out = "/Users/onege/Desktop/thesis-latex/figures/fig_architecture.png"
img.save(out, dpi=(180, 180))
print(f"Saved → {out}")
