"""Stickman rig, drawing primitives and character designs for «أنا أمزح معك فقط!»."""
import math
import skia

INK = 0xFF1C1B1A
PAPER = 0xFFF5EFE4


def clamp(v, a=0.0, b=1.0):
    return a if v < a else b if v > b else v


def lerp(a, b, u):
    return a + (b - a) * u


def ease(u):
    u = clamp(u)
    return u * u * (3 - 2 * u)


def seg(t, a, b):
    """normalised, eased progress of t between a and b"""
    if b <= a:
        return 1.0 if t >= b else 0.0
    return ease((t - a) / (b - a))


def argb(c, alpha=1.0):
    return skia.ColorSetARGB(int(255 * clamp(alpha)), (c >> 16) & 255, (c >> 8) & 255, c & 255)


def mix(c1, c2, u):
    r = int(lerp((c1 >> 16) & 255, (c2 >> 16) & 255, u))
    g = int(lerp((c1 >> 8) & 255, (c2 >> 8) & 255, u))
    b = int(lerp(c1 & 255, c2 & 255, u))
    return 0xFF000000 | (r << 16) | (g << 8) | b


def stroke(color=INK, w=6.0, alpha=1.0, cap=skia.Paint.kRound_Cap):
    return skia.Paint(AntiAlias=True, Color=argb(color, alpha), Style=skia.Paint.kStroke_Style,
                      StrokeWidth=w, StrokeCap=cap, StrokeJoin=skia.Paint.kRound_Join)


def fill(color, alpha=1.0):
    return skia.Paint(AntiAlias=True, Color=argb(color, alpha), Style=skia.Paint.kFill_Style)


def line(c, x1, y1, x2, y2, p):
    c.drawLine(x1, y1, x2, y2, p)


def poly(c, pts, p, close=False):
    path = skia.Path()
    path.moveTo(*pts[0])
    for q in pts[1:]:
        path.lineTo(*q)
    if close:
        path.close()
    c.drawPath(path, p)


# ---------------------------------------------------------------- characters
# Each design keeps its colour, hair and accessory in every scene.
DESIGNS = {
    'woman':  dict(shirt=0xFFD9644A, hair='long', hair_c=0xFF3A2A22, acc=None),
    'man':    dict(shirt=0xFF2F8F83, hair='short', hair_c=0xFF2B2B2B, acc='stubble'),
    'mocker': dict(shirt=0xFFE3A72F, hair='quiff', hair_c=0xFF1C1B1A, acc='brows'),
    'v1':     dict(shirt=0xFF5B7DB1, hair='side', hair_c=0xFF4A3B30, acc='glasses'),
    'v2':     dict(shirt=0xFF8E6BB0, hair='curly', hair_c=0xFF2E2230, acc=None),
    'v3':     dict(shirt=0xFF6E9A5A, hair='cap', hair_c=0xFF6E9A5A, acc=None),
    'c1':     dict(shirt=0xFFB9A58C, hair='bun', hair_c=0xFF5A4636, acc=None),
    'c2':     dict(shirt=0xFF8C9AA8, hair='bald', hair_c=0xFF1C1B1A, acc=None),
    'c3':     dict(shirt=0xFFC08A7A, hair='short', hair_c=0xFF6B5A4A, acc=None),
}

DEFAULT_POSE = dict(
    x=0.0, y=0.0, s=1.0, f=1, turn=None, lean=0.0, tilt=0.0, sit=0.0,
    ba1=-12.0, ba2=8.0, fa1=14.0, fa2=10.0,      # back / front arm (deg from down, + = forward)
    bl1=-4.0, bl2=2.0, fl1=6.0, fl2=-2.0,      # back / front leg
    mouth='smile', mopen=0.0, eyes='open', lookx=0.0, looky=0.0,
    brow=0.0, browy=0.0, blush=0.0, sweat=0.0, shrug=0.0, palms=0.0, alpha=1.0,
    hop=0.0,
)


def P(**kw):
    p = dict(DEFAULT_POSE)
    p.update(kw)
    return p


def blend(p1, p2, u):
    out = {}
    for k, v in p1.items():
        w = p2.get(k, v)
        if isinstance(v, (int, float)) and isinstance(w, (int, float)) and not isinstance(v, bool) and k != 'f':
            out[k] = lerp(v, w, u)
        else:
            out[k] = w if u > 0.5 else v
    for k, w in p2.items():
        if k not in out:
            out[k] = w
    return out


def _dir(angle_deg, f):
    a = math.radians(angle_deg)
    return (f * math.sin(a), math.cos(a))


def draw_figure(c, who, p):
    d = DESIGNS[who]
    s = p['s']
    f = 1 if p['f'] >= 0 else -1
    turn = p['turn'] if p['turn'] is not None else 0.7 * f
    alpha = p['alpha']
    W = 7.0
    ink = stroke(INK, W, alpha)

    sit = clamp(p['sit'])
    x0, y0 = p['x'], p['y'] - p['hop']
    c.save()
    c.translate(x0, y0)
    c.scale(s, s)

    hip_y = lerp(-112, -62, sit)
    H = (0.0, hip_y)
    lean = p['lean']
    up = _dir(180 - lean, f)          # torso direction (pointing up)
    N = (H[0] + up[0] * 82, H[1] + up[1] * 82)
    S = (H[0] + up[0] * 72, H[1] + up[1] * 72 - p['shrug'])

    def leg(a1, a2):
        a1 = lerp(a1, 86, sit)
        a2 = lerp(a2, -86, sit)
        d1 = _dir(a1, f)
        K = (H[0] + d1[0] * 56, H[1] + d1[1] * 56)
        d2 = _dir(a1 + a2, f)
        F = (K[0] + d2[0] * 54, K[1] + d2[1] * 54)
        poly(c, [H, K, F], ink)
        line(c, F[0], F[1], F[0] + f * 12, F[1], ink)

    def arm(a1, a2, front):
        d1 = _dir(a1, f)
        E = (S[0] + d1[0] * 46, S[1] + d1[1] * 46)
        d2 = _dir(a1 + a2, f)
        Hd = (E[0] + d2[0] * 44, E[1] + d2[1] * 44)
        poly(c, [S, E, Hd], ink)
        c.drawCircle(Hd[0], Hd[1], 5.5, fill(INK, alpha))
        if p['palms'] > 0.05:
            pp = stroke(INK, 4, alpha * p['palms'])
            for k in (-30, 0, 30):
                dd = _dir(a1 + a2 + k, f)
                line(c, Hd[0], Hd[1], Hd[0] + dd[0] * 12, Hd[1] + dd[1] * 12, pp)

    leg(p['bl1'], p['bl2'])
    arm(p['ba1'], p['ba2'], False)
    # torso: ink outline + coloured shirt
    c.drawLine(H[0], H[1], N[0], N[1], stroke(INK, 30, alpha))
    c.drawLine(H[0] + up[0] * 6, H[1] + up[1] * 6, N[0] - up[0] * 6, N[1] - up[1] * 6, stroke(d['shirt'], 18, alpha))
    leg(p['fl1'], p['fl2'])

    # head
    R = 27
    hd = _dir(180 - lean - p['tilt'] * 0.4, f)
    Hc = (N[0] + hd[0] * (R + 6), N[1] + hd[1] * (R + 6))
    c.save()
    c.translate(*Hc)
    c.rotate(f * p['tilt'])
    draw_hair_back(c, d, turn, alpha)
    c.drawCircle(0, 0, R, fill(0xFFFFFFFF, alpha))
    c.drawCircle(0, 0, R, stroke(INK, 6, alpha))
    draw_face(c, d, p, turn, alpha)
    draw_hair_front(c, d, turn, alpha)
    c.restore()

    arm(p['fa1'], p['fa2'], True)
    c.restore()


def draw_hair_back(c, d, turn, alpha):
    h = d['hair']
    col = d['hair_c']
    if h == 'long':
        path = skia.Path()
        bx = -turn * 14
        path.moveTo(-26, -6)
        path.cubicTo(-34, 30, bx - 26, 54, bx - 6, 60)
        path.lineTo(bx + 14, 58)
        path.cubicTo(30, 40, 34, 10, 26, -6)
        path.close()
        c.drawPath(path, fill(col, alpha))
    elif h == 'curly':
        for i in range(9):
            a = math.radians(-200 + i * 27)
            c.drawCircle(math.cos(a) * 27 - turn * 3, math.sin(a) * 27 - 2, 11, fill(col, alpha))
    elif h == 'bun':
        c.drawCircle(-turn * 22, -26, 11, fill(col, alpha))


def draw_hair_front(c, d, turn, alpha):
    h = d['hair']
    col = d['hair_c']
    pc = fill(col, alpha)
    if h in ('long', 'short', 'side', 'bun', 'curly'):
        path = skia.Path()
        r = skia.Rect(-29, -30, 29, 28)
        if h == 'curly':
            path.addArc(r, 185, 170)
            c.drawPath(path, stroke(col, 12, alpha))
            return
        sweep0 = 190 if h != 'side' else 185
        path.moveTo(-28, -2)
        path.arcTo(r, sweep0, 160, False)
        # fringe line
        tip = turn * 18
        path.quadTo(tip + 6, -12, -tip * 0.2 - 4, -16)
        path.quadTo(-turn * 18 - 10, -10, -28, -2)
        path.close()
        c.drawPath(path, pc)
    elif h == 'quiff':
        path = skia.Path()
        path.moveTo(-26, -10)
        path.quadTo(-20, -30, 0, -31)
        for i, (dx, dy) in enumerate([(10, -46), (16, -33), (24, -44), (27, -26)]):
            path.lineTo(dx * (1 if turn >= 0 else -1) + turn * 6, dy)
        path.quadTo(18, -18, -26, -10)
        path.close()
        c.drawPath(path, pc)
    elif h == 'cap':
        path = skia.Path()
        path.addArc(skia.Rect(-29, -32, 29, 26), 180, 180)
        path.close()
        c.drawPath(path, fill(col, alpha))
        c.drawPath(path, stroke(INK, 5, alpha))
        sgn = 1 if turn >= 0 else -1
        line(c, 0, -4, sgn * 44, -2, stroke(INK, 7, alpha))
    if d['acc'] == 'stubble':
        p = stroke(INK, 2.5, alpha * 0.55)
        for i in range(5):
            xx = turn * 9 - 10 + i * 5
            line(c, xx, 20, xx + 1, 23, p)


def draw_face(c, d, p, turn, alpha):
    ex = turn * 9
    ink = fill(INK, alpha)
    lx, ly = p['lookx'] * 3, p['looky'] * 3
    eyes = p['eyes']
    sp = 9.5
    for k in (-1, 1):
        xx = ex + k * sp + lx
        yy = -3 + ly
        if eyes == 'open':
            c.drawCircle(xx, yy, 3.4, ink)
        elif eyes == 'wide':
            c.drawCircle(xx, yy, 5, stroke(INK, 2.5, alpha))
            c.drawCircle(xx, yy, 2.4, ink)
        elif eyes == 'happy':
            path = skia.Path()
            path.addArc(skia.Rect(xx - 5, yy - 3, xx + 5, yy + 5), 200, 140)
            c.drawPath(path, stroke(INK, 3, alpha))
        elif eyes == 'closed':
            line(c, xx - 4, yy + 1, xx + 4, yy + 1, stroke(INK, 3, alpha))
        elif eyes == 'down':
            path = skia.Path()
            path.addArc(skia.Rect(xx - 5, yy - 4, xx + 5, yy + 4), 20, 140)
            c.drawPath(path, stroke(INK, 3, alpha))
    if d['acc'] == 'glasses':
        g = stroke(INK, 2.5, alpha)
        for k in (-1, 1):
            c.drawCircle(ex + k * sp, -3, 8, g)
        line(c, ex - 1.5, -3, ex + 1.5, -3, g)
    # brows
    bw = 4.0 if d['acc'] == 'brows' else 2.6
    br = p['brow']
    by = -13 - p['browy'] * 4 + ly * 0.5
    for k in (-1, 1):
        cx = ex + k * sp + lx
        inner = -k  # inner end direction
        dy = br * 3.2
        line(c, cx - 5, by + (dy if inner < 0 else -dy) * 0.5, cx + 5, by + (dy if inner > 0 else -dy) * 0.5,
             stroke(INK, bw, alpha))
    # mouth
    mx, my = turn * 8, 13
    m = p['mouth']
    o = clamp(p['mopen'])
    st = stroke(INK, 3.2, alpha)
    if o > 0.08 and m not in ('laugh', 'grin'):
        h = 2 + o * 9
        w = 7 + o * 2
        c.drawOval(skia.Rect(mx - w, my - h * 0.5, mx + w, my + h * 0.7), fill(0xFF3B1F1F, alpha))
        c.drawOval(skia.Rect(mx - w, my - h * 0.5, mx + w, my + h * 0.7), st)
    elif m == 'smile':
        path = skia.Path()
        path.addArc(skia.Rect(mx - 8, my - 7, mx + 8, my + 4), 20, 140)
        c.drawPath(path, st)
    elif m == 'soft':
        path = skia.Path()
        path.addArc(skia.Rect(mx - 6, my - 4, mx + 6, my + 2), 25, 130)
        c.drawPath(path, st)
    elif m == 'grin':
        path = skia.Path()
        path.moveTo(mx - 13, my - 3)
        path.quadTo(mx, my - 1, mx + 13, my - 3)
        path.quadTo(mx, my + 14 + o * 4, mx - 13, my - 3)
        path.close()
        c.drawPath(path, fill(0xFFFFFFFF, alpha))
        c.drawPath(path, st)
    elif m == 'laugh':
        path = skia.Path()
        path.moveTo(mx - 11, my - 3)
        path.quadTo(mx, my - 1, mx + 11, my - 3)
        path.quadTo(mx, my + 13 + o * 5, mx - 11, my - 3)
        path.close()
        c.drawPath(path, fill(0xFF3B1F1F, alpha))
        c.drawPath(path, st)
    elif m == 'frown':
        path = skia.Path()
        path.addArc(skia.Rect(mx - 7, my + 1, mx + 7, my + 10), 200, 140)
        c.drawPath(path, st)
    elif m == 'flat':
        line(c, mx - 6, my + 2, mx + 6, my + 2, st)
    elif m == 'forced':  # tight wobbly smile
        path = skia.Path()
        path.moveTo(mx - 9, my)
        path.cubicTo(mx - 4, my + 4, mx - 1, my - 1, mx + 2, my + 3)
        path.cubicTo(mx + 5, my + 5, mx + 7, my + 1, mx + 9, my - 1)
        c.drawPath(path, st)
    elif m == 'o':
        c.drawCircle(mx, my + 2, 4, st)
    if p['blush'] > 0.02:
        bp = fill(0xFFE07A6A, alpha * 0.55 * p['blush'])
        for k in (-1, 1):
            c.drawOval(skia.Rect(ex + k * 15 - 6, 4, ex + k * 15 + 6, 10), bp)
    if p['sweat'] > 0.02:
        sx = ex - 22 if turn >= 0 else ex + 22
        path = skia.Path()
        path.moveTo(sx, -14)
        path.quadTo(sx + 6, -2, sx, 0)
        path.quadTo(sx - 6, -2, sx, -14)
        c.drawPath(path, fill(0xFF8FC1E3, alpha * p['sweat']))
        c.drawPath(path, stroke(INK, 2, alpha * p['sweat']))
