"""Scenes, shots and direction for the stickman film «أنا أمزح معك فقط!».

Every audio line of timeline.json is mapped to a list of shots (weight, shot function).
A shot function draws one frame: shot(c, t, D, T, G)
    t = seconds since the shot started, D = shot duration, T = global time, G = audio helper.
"""
import math
import random
import skia
from rig import (INK, PAPER, P, blend, clamp, lerp, ease, seg, argb, mix, stroke, fill, line, poly,
                 draw_figure)

W_, H_ = 1080, 1920
WARM = 0xFFFFB347
COOL = 0xFF4A6FA5


# ------------------------------------------------------------------ helpers
def osc(T, freq, phase=0.0):
    return math.sin(T * freq * 2 * math.pi + phase)


CAM = {'cx': 540.0, 'cy': 960.0, 'z': 1.0}


def camera(c, cx, cy, z, T=0.0, drift=1.0):
    cx += osc(T, 0.07) * 6 * drift
    cy += osc(T, 0.05, 1.3) * 5 * drift
    CAM.update(cx=cx, cy=cy, z=z)
    c.translate(W_ / 2, H_ / 2)
    c.scale(z, z)
    c.translate(-cx, -cy)


def cam_move(c, t, D, a, b, T, ease_all=True):
    u = ease(t / D) if ease_all else clamp(t / D)
    camera(c, lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u), T)


def overlay(c, color, alpha):
    if alpha > 0.003:
        c.drawRect(skia.Rect(0, 0, W_, H_), fill(color, alpha))


def vignette(c, strength=0.35):
    sh = skia.GradientShader.MakeRadial((W_ / 2, H_ / 2), 1150,
                                        [argb(0x000000, 0), argb(0x1A1410, strength)], [0.55, 1.0])
    c.drawRect(skia.Rect(0, 0, W_, H_), skia.Paint(Shader=sh))


def glow(c, x, y, r, color, a):
    sh = skia.GradientShader.MakeRadial((x, y), r, [argb(color, a), argb(color, 0)])
    c.drawCircle(x, y, r, skia.Paint(Shader=sh, AntiAlias=True))


def blur_layer(c, sigma):
    """open a layer whose content is blurred (depth of field); returns True if a layer was opened"""
    if sigma < 0.6:
        return False
    c.saveLayer(paint=skia.Paint(ImageFilter=skia.ImageFilters.Blur(sigma, sigma)))
    return True


def dof_sigma(start=1.5, k=3.2):
    return max(0.0, (CAM['z'] - start) * k)


def light_cone(c, x, y, w_top, x0, x1, y1, color=0xFFFFD27A, a=0.16):
    path = skia.Path()
    path.moveTo(x - w_top, y)
    path.lineTo(x + w_top, y)
    path.lineTo(x1, y1)
    path.lineTo(x0, y1)
    path.close()
    sh = skia.GradientShader.MakeLinear([(x, y), (x, y1)], [argb(color, a), argb(color, 0)])
    p = skia.Paint(AntiAlias=True, Shader=sh)
    p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 14))
    c.drawPath(path, p)


def dust(c, T, x0, y0, x1, y1, n=36, seed=1, a=0.5):
    """slow motes floating in the light"""
    rnd = random.Random(seed)
    for i in range(n):
        px, py, sp, ph = rnd.random(), rnd.random(), 0.2 + rnd.random() * 0.6, rnd.random() * 6.28
        x = x0 + (px * (x1 - x0) + 18 * math.sin(T * sp + ph)) % (x1 - x0)
        y = y1 - ((py * (y1 - y0) + T * 9 * sp) % (y1 - y0))
        tw = 0.5 + 0.5 * math.sin(T * 1.7 * sp + ph * 2)
        c.drawCircle(x, y, 1.6 + 1.6 * sp, fill(0xFFFFF1C8, a * tw))


def foreground_leaves(c, T, shift, alpha=1.0):
    """out-of-focus foreground plant in screen space; parallax via shift"""
    if alpha <= 0.02:
        return
    p = skia.Paint(AntiAlias=True, Color=argb(0x1F2A22, 0.85 * alpha))
    p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 14))
    for k, (bx, by, ang, ln) in enumerate([(-30, 1990, -60, 520), (40, 2010, -40, 600), (120, 2000, -25, 460),
                                            (1120, 2000, -130, 480), (1060, 2030, -150, 560)]):
        a = math.radians(ang + 3 * math.sin(T * 0.6 + k))
        tx, ty = bx + shift + math.cos(a) * ln, by + math.sin(a) * ln
        path = skia.Path()
        path.moveTo(bx + shift, by)
        nx, ny = -math.sin(a) * 70, math.cos(a) * 70
        mx, my = (bx + shift + tx) / 2, (by + ty) / 2
        path.quadTo(mx + nx, my + ny, tx, ty)
        path.quadTo(mx - nx, my - ny, bx + shift, by)
        c.drawPath(path, p)


def blink(T, seed):
    return ((T * 0.37 + seed * 0.71) % 3.3) < 0.11


def idle(p, T, seed, amount=1.0):
    p = dict(p)
    p['lean'] = p['lean'] + osc(T, 0.25, seed) * 1.5 * amount
    p['shrug'] = p['shrug'] + (osc(T, 0.3, seed * 2) * 1.5 + 1.5) * amount
    p['tilt'] = p['tilt'] + osc(T, 0.13, seed * 3) * 2 * amount
    if p['eyes'] == 'open' and blink(T, seed):
        p['eyes'] = 'closed'
    return p


def laughing(T, amp=1.0, seed=0.0):
    b = abs(osc(T, 3.2, seed))
    return dict(mouth='laugh', eyes='happy', mopen=0.4 + 0.5 * b, lean=8 * amp + 6 * amp * b,
                shrug=5 * amp * b, tilt=-6 * amp, brow=-0.3)


def chatter(T, seed=0.0, rate=5.0):
    v = 0.5 + 0.5 * osc(T, rate, seed) * osc(T, 1.3, seed * 2)
    return clamp(v * 1.2) if v > 0.15 else 0.0


def walk(T, speed=1.6, amp=1.0):
    s = osc(T, speed)
    return dict(fl1=24 * s * amp, fl2=-10 * amp * max(0, -s) - 4, bl1=-24 * s * amp, bl2=-10 * amp * max(0, s) - 4,
                fa1=-18 * s * amp + 6, ba1=18 * s * amp - 6, hop=abs(s) * 5 * amp)


# ------------------------------------------------------------------ scene: the conversation (café)
def talk_bg(c, T, dusk=0.0):
    c.clear(argb(PAPER))
    # wall texture stripes
    for i in range(0, W_, 90):
        c.drawRect(skia.Rect(i, 0, i + 45, 1390), fill(0xFFEDE4D4, 0.5))
    # window with dusk sky
    top = mix(0xFFF6C28B, 0xFF6F7FA8, dusk)
    bot = mix(0xFFF8E3C0, 0xFFE9A97A, dusk)
    sh = skia.GradientShader.MakeLinear([(0, 360), (0, 940)], [argb(top), argb(bot)])
    r = skia.Rect(110, 360, 520, 940)
    c.drawRect(r, skia.Paint(Shader=sh))
    sun_y = lerp(640, 900, dusk)
    c.drawCircle(400, sun_y, 46, fill(0xFFFFE6B0, 0.9))
    for i, (x, h) in enumerate([(110, 120), (170, 190), (240, 140), (300, 230), (370, 160), (430, 200), (480, 120)]):
        c.drawRect(skia.Rect(x, 940 - h, x + 52, 940), fill(mix(0xFF9C8C88, 0xFF4E5670, dusk), 0.85))
    c.drawRect(r, stroke(INK, 9))
    line(c, 315, 360, 315, 940, stroke(INK, 6))
    line(c, 110, 650, 520, 650, stroke(INK, 6))
    line(c, 90, 950, 540, 950, stroke(INK, 10))
    # picture frame
    c.drawRect(skia.Rect(700, 760, 960, 960), fill(0xFFFFFFFF, 0.8))
    c.drawRect(skia.Rect(700, 760, 960, 960), stroke(INK, 6))
    poly(c, [(720, 940), (790, 850), (835, 900), (880, 820), (940, 940)], stroke(INK, 5))
    # hanging lamp
    line(c, 760, 0, 760, 520, stroke(INK, 4))
    glow(c, 760, 600, 420, 0xFFFFD27A, 0.35)
    poly(c, [(700, 590), (820, 590), (790, 520), (730, 520)], fill(0xFFE3A72F), close=True)
    poly(c, [(700, 590), (820, 590), (790, 520), (730, 520)], stroke(INK, 6), close=True)
    # floor
    c.drawRect(skia.Rect(0, 1390, W_, H_), fill(0xFFE5D8C3))
    line(c, 0, 1390, W_, 1390, stroke(INK, 8))
    for i in range(-400, W_ + 400, 160):
        line(c, i, 1390, i - 260, H_, stroke(0xFFCDBEA6, 3))
    c.drawOval(skia.Rect(320, 1360, 1200, 1460), fill(0xFFFFD27A, 0.18))
    # window light falling on the floor
    light_cone(c, 315, 650, 205, 420, 900, 1600, 0xFFFFE2B0, 0.10 * (1 - dusk * 0.6))


def chair(c, x, floor, f, s=1.75):
    ink = stroke(INK, 8)
    seat = floor - 60 * s
    line(c, x - 34 * s, seat, x + 34 * s, seat, ink)
    line(c, x - 30 * s, seat, x - 34 * s, floor, ink)
    line(c, x + 30 * s, seat, x + 34 * s, floor, ink)
    bx = x - f * 34 * s
    line(c, bx, seat, bx - f * 6 * s, seat - 85 * s, ink)


def table(c, x, top, floor, w=150, cups=True):
    line(c, x, top, x, floor, stroke(INK, 10))
    line(c, x - 70, floor, x + 70, floor, stroke(INK, 10))
    c.drawRoundRect(skia.Rect(x - w, top - 14, x + w, top + 6), 10, 10, fill(0xFFB98B5E))
    c.drawRoundRect(skia.Rect(x - w, top - 14, x + w, top + 6), 10, 10, stroke(INK, 7))
    if cups:
        for cx in (x - 70, x + 70):
            c.drawRoundRect(skia.Rect(cx - 18, top - 52, cx + 18, top - 14), 6, 6, fill(0xFFFFFFFF))
            c.drawRoundRect(skia.Rect(cx - 18, top - 52, cx + 18, top - 14), 6, 6, stroke(INK, 5))
        for k, cx in enumerate((x - 70, x + 70)):
            path = skia.Path()
            path.moveTo(cx - 4, top - 60)
            path.quadTo(cx + 10, top - 80, cx - 2, top - 100)
            c.drawPath(path, stroke(0xFFB9AFA3, 3, 0.6))


TALK_W = P(x=300, y=1390, s=1.75, f=1, sit=1, fa1=62, fa2=38, ba1=18, ba2=46)
TALK_M = P(x=780, y=1390, s=1.75, f=-1, sit=1, fa1=62, fa2=38, ba1=18, ba2=46)


def gesture(base, T, e, seed, style='open'):
    """speech driven gesturing for the current speaker"""
    p = dict(base)
    g = clamp(e * 1.3)
    if style == 'open':
        p['fa1'] = lerp(base['fa1'], 78 + 14 * osc(T, 0.6, seed), g)
        p['fa2'] = lerp(base['fa2'], 30 + 30 * osc(T, 0.45, seed + 1), g)
        p['palms'] = max(p.get('palms', 0), g * 0.8)
    elif style == 'point':
        p['fa1'] = lerp(base['fa1'], 92, g)
        p['fa2'] = lerp(base['fa2'], 4 + 10 * osc(T, 1.2, seed), g)
    elif style == 'both':
        p['fa1'] = lerp(base['fa1'], 70 + 10 * osc(T, 0.5, seed), g)
        p['ba1'] = lerp(base['ba1'], 60 + 10 * osc(T, 0.5, seed + 2), g)
        p['fa2'] = lerp(base['fa2'], 50, g)
        p['ba2'] = lerp(base['ba2'], 60, g)
        p['palms'] = g
    p['tilt'] = p['tilt'] + 4 * e * osc(T, 0.9, seed)
    p['lean'] = p['lean'] + 4 * g
    p['mopen'] = e
    return p


def talk_figures(T, G, w=None, m=None, w_style='open', m_style='open'):
    """poses for the two speakers with speech-driven mouth and gesture; overrides as dicts"""
    ew, em = G.env('woman', T), G.env('man', T)
    pw = blend(TALK_W, dict(TALK_W, **(w or {})), 1)
    pm = blend(TALK_M, dict(TALK_M, **(m or {})), 1)
    pw = idle(pw, T, 0.3)
    pm = idle(pm, T, 1.7)
    if G.speaking('woman', T):
        pw = gesture(pw, T, G.smooth('woman', T), 0.2, w_style)
        pw['mopen'] = ew
        pm['tilt'] += 3 * osc(T, 0.35)  # listening nods
    if G.speaking('man', T):
        pm = gesture(pm, T, G.smooth('man', T), 0.9, m_style)
        pm['mopen'] = em
        pw['tilt'] += 3 * osc(T, 0.3, 1)
    return pw, pm


def talk_scene(c, T, G, w=None, m=None, dusk=0.0, **kw):
    opened = blur_layer(c, dof_sigma(1.5, 3.0))
    talk_bg(c, T, dusk)
    if opened:
        c.restore()
    light_cone(c, 760, 590, 60, 470, 1050, 1390, 0xFFFFD27A, 0.20)
    dust(c, T, 500, 600, 1020, 1380, 40, 3, 0.45)
    chair(c, TALK_W['x'] - 6, 1390, 1)
    chair(c, TALK_M['x'] + 6, 1390, -1)
    pw, pm = talk_figures(T, G, w, m, **kw)
    draw_figure(c, 'woman', pw)
    draw_figure(c, 'man', pm)
    table(c, 540, 1215, 1390)


CAM_TWO = (540, 1080, 1.0)
CAM_W = (330, 1110, 2.3)
CAM_M = (760, 1110, 2.3)
CAM_WX = (310, 1060, 3.4)   # extreme close-up
CAM_MX = (770, 1060, 3.4)


# ------------------------------------------------------------------ scene: the gathering
G_FLOOR_BACK = 1200
G_FLOOR_FRONT = 1580
GATHER = {
    'c1':     P(x=250, y=G_FLOOR_BACK, s=1.1, f=1, sit=1, fa1=40, fa2=50),
    'v3':     P(x=430, y=G_FLOOR_BACK, s=1.1, f=1, sit=1, fa1=40, fa2=50),
    'c2':     P(x=640, y=G_FLOOR_BACK, s=1.1, f=-1, sit=1, fa1=40, fa2=50),
    'woman':  P(x=830, y=G_FLOOR_BACK, s=1.1, f=-1, sit=1, fa1=40, fa2=50),
    'c3':     P(x=960, y=G_FLOOR_BACK + 40, s=1.15, f=-1, sit=1, fa1=40, fa2=50),
    'v1':     P(x=200, y=G_FLOOR_FRONT, s=1.4, f=1, sit=1, fa1=50, fa2=40),
    'v2':     P(x=880, y=G_FLOOR_FRONT, s=1.4, f=-1, sit=1, fa1=50, fa2=40),
    'mocker': P(x=560, y=G_FLOOR_FRONT + 40, s=1.45, f=-1, mouth='grin'),
}
SEEDS = {k: i * 1.37 for i, k in enumerate(GATHER)}


def gather_bg(c, T, warmth=0.5):
    wall = mix(0xFFEFE2CF, 0xFFF3D9B5, warmth)
    c.clear(argb(wall))
    for i in range(0, W_, 70):
        c.drawRect(skia.Rect(i, 0, i + 6, 1240), fill(0xFFD9C6AA, 0.6))
    # window (night)
    r = skia.Rect(640, 300, 960, 720)
    c.drawRect(r, fill(0xFF33415E))
    for (sx, sy) in [(700, 360), (860, 420), (780, 520), (910, 600), (690, 640)]:
        c.drawCircle(sx, sy, 3, fill(0xFFFFF4D0, 0.9))
    c.drawCircle(860, 380, 28, fill(0xFFF5EBC8))
    c.drawCircle(872, 372, 26, fill(0xFF33415E))
    c.drawRect(r, stroke(INK, 9))
    line(c, 800, 300, 800, 720, stroke(INK, 6))
    # framed pictures
    for (x, y, w, h) in [(150, 420, 150, 190), (330, 500, 120, 120)]:
        c.drawRect(skia.Rect(x, y, x + w, y + h), fill(0xFFFFFFFF, 0.7))
        c.drawRect(skia.Rect(x, y, x + w, y + h), stroke(INK, 6))
    c.drawCircle(225, 500, 30, stroke(INK, 4))
    poly(c, [(345, 600), (390, 540), (435, 600)], stroke(INK, 4))
    # floor lamp
    line(c, 70, 1250, 70, 760, stroke(INK, 6))
    glow(c, 70, 760, 520, 0xFFFFC56B, 0.30 + 0.25 * warmth)
    poly(c, [(20, 760), (120, 760), (100, 680), (40, 680)], fill(0xFFE3A72F), close=True)
    poly(c, [(20, 760), (120, 760), (100, 680), (40, 680)], stroke(INK, 6), close=True)
    # floor + rug
    c.drawRect(skia.Rect(0, 1240, W_, H_), fill(0xFFD9C4A3))
    line(c, 0, 1240, W_, 1240, stroke(INK, 8))
    c.drawOval(skia.Rect(80, 1330, 1000, 1700), fill(0xFFC0634D, 0.35))
    c.drawOval(skia.Rect(80, 1330, 1000, 1700), stroke(INK, 4, 0.5))
    # sofa
    c.drawRoundRect(skia.Rect(140, 980, 1010, 1150), 40, 40, fill(0xFF7A9A8E))
    c.drawRoundRect(skia.Rect(140, 980, 1010, 1150), 40, 40, stroke(INK, 8))
    c.drawRoundRect(skia.Rect(150, 1110, 1000, 1200), 20, 20, fill(0xFF6A8A7E))
    c.drawRoundRect(skia.Rect(150, 1110, 1000, 1200), 20, 20, stroke(INK, 8))


def gather_front_props(c):
    # coffee table
    c.drawRoundRect(skia.Rect(370, 1400, 720, 1430), 10, 10, fill(0xFFA9774C))
    c.drawRoundRect(skia.Rect(370, 1400, 720, 1430), 10, 10, stroke(INK, 7))
    for x in (395, 695):
        line(c, x, 1430, x, 1480, stroke(INK, 8))
    for (x, col) in [(430, 0xFFFFFFFF), (480, 0xFFFFFFFF), (640, 0xFFFFFFFF)]:
        c.drawRoundRect(skia.Rect(x - 13, 1372, x + 13, 1400), 5, 5, fill(col))
        c.drawRoundRect(skia.Rect(x - 13, 1372, x + 13, 1400), 5, 5, stroke(INK, 4))
    c.drawOval(skia.Rect(530, 1385, 610, 1402), fill(0xFFE9D7B5))
    c.drawOval(skia.Rect(530, 1385, 610, 1402), stroke(INK, 4))
    # front chairs
    chair(c, GATHER['v1']['x'] - 6, G_FLOOR_FRONT, 1, 1.4)
    chair(c, GATHER['v2']['x'] + 6, G_FLOOR_FRONT, -1, 1.4)


def gather_scene(c, T, over=None, warmth=0.5, fade=None, hole=None, extra_front=None):
    """over: dict who -> dict of pose overrides (or callable(T) -> dict)
    fade: dict who -> alpha;  hole: (x, y, r) black hole drawn under a character"""
    over = over or {}
    fade = fade or {}
    opened = blur_layer(c, dof_sigma(1.3, 3.0))
    gather_bg(c, T, warmth)
    if opened:
        c.restore()
    light_cone(c, 70, 760, 50, -200, 520, 1500, 0xFFFFC56B, 0.13 + 0.08 * warmth)
    dust(c, T, 0, 760, 480, 1450, 30, 7, 0.4)
    order = ['c1', 'v3', 'c2', 'woman', 'c3']
    front_focus = CAM['cy'] > 1270 and CAM['z'] > 1.6
    opened = blur_layer(c, dof_sigma(1.6, 2.6) if front_focus else 0)
    for who in order:
        _draw_g(c, who, T, over, fade)
    if opened:
        c.restore()
    if hole:
        hx, hy, hr = hole
        if hr > 1:
            c.drawOval(skia.Rect(hx - hr * 1.6, hy - hr * 0.35, hx + hr * 1.6, hy + hr * 0.35), fill(0xFF0D0D12))
            c.drawOval(skia.Rect(hx - hr * 1.6, hy - hr * 0.35, hx + hr * 1.6, hy + hr * 0.35), stroke(INK, 5))
    gather_front_props(c)
    for who in ['v1', 'v2', 'mocker']:
        _draw_g(c, who, T, over, fade)
    if extra_front:
        extra_front(c)


def _draw_g(c, who, T, over, fade):
    if over.get(who) == 'hide':
        return
    p = dict(GATHER[who])
    o = over.get(who, {})
    if callable(o):
        o = o(T)
    p.update(o)
    p = idle(p, T, SEEDS[who], 0.8 if who != 'mocker' else 1.3)
    if who in fade:
        p['alpha'] = fade[who]
    draw_figure(c, who, p)


CAM_GWIDE = (540, 1290, 1.2)
CAM_GFRONT = (540, 1330, 1.35)


def head_of(who, over=None):
    p = dict(GATHER[who])
    if over:
        p.update(over)
    s = p['s']
    hy = p['y'] - (62 if p['sit'] > 0.5 else 112) * s - 115 * s
    return p['x'], hy


def cam_on(who, z, dy=60):
    x, y = head_of(who)
    return (x, y + dy, z)


# --------------------------------------------------------- recurring acting blocks
def mocker_mimic(T, toward=-1):
    """the mocker imitates someone's way of talking: wobbling head, flapping hand"""
    return dict(f=toward, mouth='o', eyes='wide', mopen=chatter(T, 0.4, 6.0) * 0.9,
                tilt=12 * osc(T, 2.2), lean=6 + 6 * osc(T, 1.1), fa1=95 + 25 * osc(T, 3.0), fa2=40 + 30 * osc(T, 3.0, 1),
                ba1=20 + 15 * osc(T, 1.5), palms=1, brow=-0.8, browy=1)


def mocker_point(T, toward=-1, laugh=0.6):
    d = dict(f=toward, fa1=88, fa2=6, ba1=-10, ba2=60)
    d.update(laughing(T, laugh, 0.5))
    d['fa1'] = 88
    return d


def mocker_slap(T):
    d = dict(f=1, lean=24 + 8 * abs(osc(T, 2.4)), fa1=50 + 30 * abs(osc(T, 2.4)), fa2=20, ba1=-30, ba2=90)
    d.update({k: v for k, v in laughing(T, 1.3).items() if k not in ('lean',)})
    return d


def crowd_laugh(T, who_list, amp=1.0, start=0.0):
    out = {}
    for i, w in enumerate(who_list):
        a = amp * seg(T, start + i * 0.12, start + i * 0.12 + 0.3)
        if a <= 0:
            continue
        lp = laughing(T, a, i * 1.3)
        lp['mouth'] = 'laugh' if a > 0.4 else 'smile'
        lp['eyes'] = 'happy' if a > 0.4 else 'open'
        out[w] = lp
    return out


# ------------------------------------------------------------------ symbolic & home scenes
def void_bg(c, col=0xFF27303F, col2=0xFF3C4A60):
    sh = skia.GradientShader.MakeRadial((W_ / 2, H_ * 0.55), 1300, [argb(col2), argb(col)])
    c.drawRect(skia.Rect(0, 0, W_, H_), skia.Paint(Shader=sh))


def jag_path(x1, y1, x2, y2, n=9, amp=16, seed=3):
    rnd = random.Random(seed)
    path = skia.Path()
    path.moveTo(x1, y1)
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    for i in range(1, n):
        u = i / n
        a = amp * (1 if i % 2 else -1) * (0.6 + 0.4 * rnd.random())
        path.lineTo(x1 + dx * u + nx * a, y1 + dy * u + ny * a)
    path.lineTo(x2, y2)
    return path


def thorn(c, x, y, size, alpha):
    """the small invisible wound the word leaves behind"""
    if alpha <= 0.01:
        return
    p = stroke(INK, 4 * size, alpha)
    path = jag_path(x - 16 * size, y, x + 16 * size, y, n=5, amp=7 * size, seed=11)
    c.drawPath(path, p)
    c.drawCircle(x + 18 * size, y, 3 * size, fill(0xFFB33A3A, alpha))


def home_bg(c, T, night=1.0):
    wall = mix(0xFFE4DCCF, 0xFFB8C2D0, night)
    c.clear(argb(wall))
    # window with night sky
    r = skia.Rect(560, 420, 940, 900)
    c.drawRect(r, fill(mix(0xFFF2C38D, 0xFF2D3B57, night)))
    c.drawCircle(820, 520, 34, fill(0xFFF5EBC8, night))
    c.drawRect(r, stroke(INK, 9))
    line(c, 750, 420, 750, 900, stroke(INK, 6))
    # door
    c.drawRect(skia.Rect(60, 760, 300, 1330), fill(0xFF9C7A5C))
    c.drawRect(skia.Rect(60, 760, 300, 1330), stroke(INK, 8))
    c.drawCircle(270, 1060, 8, fill(INK))
    # floor
    c.drawRect(skia.Rect(0, 1330, W_, H_), fill(mix(0xFFD6C6AE, 0xFF8E98A8, night * 0.7)))
    line(c, 0, 1330, W_, 1330, stroke(INK, 8))
    # small desk lamp + table
    line(c, 900, 1330, 900, 1150, stroke(INK, 9))
    c.drawRoundRect(skia.Rect(800, 1135, 1000, 1160), 8, 8, fill(0xFFA9774C))
    c.drawRoundRect(skia.Rect(800, 1135, 1000, 1160), 8, 8, stroke(INK, 6))
    glow(c, 930, 1060, 300, 0xFFFFC56B, 0.45)
    poly(c, [(895, 1080), (965, 1080), (950, 1030), (910, 1030)], fill(0xFFE3A72F), close=True)
    poly(c, [(895, 1080), (965, 1080), (950, 1030), (910, 1030)], stroke(INK, 5), close=True)
    line(c, 930, 1080, 930, 1135, stroke(INK, 5))


def mini_memory(c, x, y, w, h, alpha, T):
    """a floating memory frame showing the moment of the insult"""
    if alpha <= 0.01:
        return
    c.save()
    rect = skia.Rect(x, y, x + w, y + h)
    c.saveLayerAlpha(None, int(255 * alpha))
    c.drawRoundRect(rect, 18, 18, fill(0xFFFFFFFF))
    c.clipRRect(skia.RRect.MakeRectXY(rect, 18, 18), doAntiAlias=True)
    c.translate(x, y)
    sc = w / 600
    c.scale(sc, sc)
    c.translate(-430, -1170)
    gather_bg(c, T, 0.4)
    gather_front_props(c)
    draw_figure(c, 'v2', dict(GATHER['v2'], mouth='forced', eyes='down', tilt=12))
    mk = dict(GATHER['mocker'], f=1)
    mk.update(mocker_point(T, 1))
    draw_figure(c, 'mocker', mk)
    c.restore()
    c.drawRoundRect(rect, 18, 18, stroke(INK, 6, alpha))
    c.restore()
    # desaturate feeling: cool veil over the memory
    c.drawRoundRect(rect, 18, 18, fill(COOL, 0.25 * alpha))
