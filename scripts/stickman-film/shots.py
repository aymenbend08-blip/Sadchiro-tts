"""Direction: which shots play over which audio line (index = line in timeline.json).

Line map (from the repo's parser):
 0 narrator title  | 1 W annoyed by mockers | 2 M "maybe they love joking" | 3 W montage (looks/speech/private)
 4 M "maybe no harm" | 5 W confronted him -> "I'm only joking!" | 6 M "ready-made excuse"
 7 W "earth swallow him" | 8 M "not everyone laughing is happy" | 9 W laugh with vs laugh at
10 M "too sensitive" | 11 W "joke, but not at their dignity" | 12 M "sharp tongue?"
13 W "poor manners, true wit" | 14 M "until someone answers back" | 15 W "words remembered for years"
16 M "learn to laugh without hurting" | 17 W "humour needs no insult" | 18 narrator moral
"""
import math
import skia
from rig import P, clamp, lerp, ease, seg, argb, mix, stroke, fill, line, draw_figure, INK, PAPER
from film import *  # noqa


# ---------------------------------------------------------------- conversation shots
def talk_shot(cam_a, cam_b=None, w=None, m=None, dusk=0.0, warm=0.0, cool=0.0, **kw):
    cam_b = cam_b or cam_a

    def shot(c, t, D, T, G):
        c.save()
        cam_move(c, t, D, cam_a, cam_b, T)
        ww = w(t, D) if callable(w) else w
        mm = m(t, D) if callable(m) else m
        talk_scene(c, T, G, ww, mm, dusk=dusk, **kw)
        c.restore()
        overlay(c, WARM, warm)
        overlay(c, COOL, cool)
        vignette(c, 0.3)
    return shot


def shot_title(c, t, D, T, G):
    # slow push from the window onto the two of them, title floats above
    c.save()
    cam_move(c, t, D, (500, 900, 1.25), CAM_TWO, T)
    talk_scene(c, T, G, w=dict(mouth='smile', lookx=1), m=dict(mouth='smile', lookx=1))
    c.restore()
    vignette(c, 0.3)
    a = seg(t, 0.15, 0.8) * (1 - seg(t, D - 0.5, D))
    G.title(c, a, 330 - 20 * ease(t / D))
    overlay(c, 0xFF1C1B1A, 1 - seg(t, 0, 0.5))


# ---------------------------------------------------------------- gathering shot factory
def g_shot(cam_a, cam_b, over_fn, warmth=0.5, warm=0.0, cool=0.0, hole_fn=None, fade_fn=None, front=None):
    def shot(c, t, D, T, G):
        c.save()
        cam_move(c, t, D, cam_a, cam_b, T)
        over = over_fn(t, D, T)
        hole = hole_fn(t, D) if hole_fn else None
        fade = fade_fn(t, D) if fade_fn else None
        gather_scene(c, T, over, warmth, fade=fade, hole=hole,
                     extra_front=(lambda cc: front(cc, t, D, T)) if front else None)
        c.restore()
        overlay(c, WARM, warm(t, D) if callable(warm) else warm)
        overlay(c, COOL, cool(t, D) if callable(cool) else cool)
        vignette(c, 0.35)
    return shot


# ---- line 1: the mocker interrupts v1 and imitates him; crowd laughs; v1 forces a smile
def l1_over(t, D, T):
    talk_end = D * 0.25
    o = {}
    if t < talk_end:   # v1 telling something, everyone listening
        o['v1'] = dict(mopen=chatter(T, 1.0), fa1=70 + 15 * osc(T, 0.8), palms=0.7, lookx=1)
        o['mocker'] = dict(f=-1, mouth='smile', lookx=-1)
    else:
        o['mocker'] = mocker_mimic(T, -1)
        frozen = seg(t, talk_end, talk_end + 0.25)
        forced = seg(t, D * 0.62, D * 0.72)
        o['v1'] = dict(mouth='forced' if forced > 0.5 else 'flat', eyes='open', fa1=lerp(70, 30, frozen),
                       brow=-0.6 * forced, blush=forced, lean=-6 * frozen, lookx=1)
        o.update(crowd_laugh(T, ['c1', 'c2', 'c3', 'v3'], 1.0, talk_end + 0.4))
        o['woman'] = dict(mouth='flat', brow=0.7, lookx=-1)
    return o


def shot_l1_close_w(c, t, D, T, G):
    talk_shot(CAM_WX, CAM_W, w=dict(brow=0.8, mouth='flat'), cool=0.03)(c, t, D, T, G)


def shot_l1_gathering(c, t, D, T, G):
    g_shot((330, 1250, 1.9), (450, 1200, 1.15), l1_over,
           warm=lambda t, D: 0.10 * seg(t, D * 0.3, D * 0.5))(c, t, D, T, G)


def shot_l1_v1_face(c, t, D, T, G):
    over = lambda t, D, T: dict(l1_over(D * 0.9, D, T), v1=dict(mouth='forced', brow=-0.7, blush=1, eyes='down',
                                                                 tilt=8, lookx=0.5, looky=1))
    g_shot(cam_on('v1', 3.6, 40), cam_on('v1', 4.2, 40), over, cool=0.12)(c, t, D, T, G)


# ---- line 2: man: maybe they just love joking -> mocker comments on v2's looks, slaps table
def l2_over(t, D, T):
    o = {}
    st = 0.35 * D
    if t < st:
        o['mocker'] = dict(f=1, mouth='grin', mopen=chatter(T, 2.0) * 0.6, fa1=80, fa2=20, lookx=1, eyes='open')
        o['v2'] = dict(mouth='smile', lookx=-1, mopen=0)
    else:
        o['mocker'] = mocker_slap(T)
        look = seg(t, st + 0.3, st + 0.9)
        around = seg(t, D * 0.7, D * 0.8)
        o['v2'] = dict(mouth='forced', looky=1.5 * look * (1 - around), lookx=-1 + 2 * around, tilt=10 * look,
                       brow=-0.6 * look, blush=look, fa1=lerp(50, 20, look), fa2=lerp(40, 110, look))
        o.update(crowd_laugh(T, ['c1', 'c2', 'c3'], 0.9, st + 0.2))
        o['v3'] = dict(mouth='forced', lookx=1)
    return o


def shot_l2_talk(c, t, D, T, G):
    talk_shot(CAM_TWO, (560, 1100, 1.15), m=dict(shrug=6, palms=0.6, mouth='smile'))(c, t, D, T, G)


def shot_l2_gather(c, t, D, T, G):
    g_shot((720, 1300, 1.7), (700, 1260, 1.45), l2_over,
           warm=0.12, cool=lambda t, D: 0.12 * seg(t, D * 0.6, D))(c, t, D, T, G)


# ---- line 3: three-beat montage
def shot_l3_w(c, t, D, T, G):
    talk_shot(CAM_W, CAM_WX, w=dict(brow=0.6, mouth='flat'), m=dict(mouth='flat', brow=-0.2))(c, t, D, T, G)


def m3a(t, D, T):   # v1 talks, mocker mimics his gestures
    o = {'v1': dict(mopen=chatter(T, 0.2) if t < D * 0.4 else 0, fa1=75 + 15 * osc(T, 1.0), palms=0.8,
                    mouth='flat' if t > D * 0.4 else 'smile', lookx=1 if t < D * 0.6 else 0.3, brow=-0.5 * seg(t, D * 0.5, D))}
    mm = mocker_mimic(T, -1)
    mm['fa1'] = 75 + 15 * osc(T, 1.0) + 20
    o['mocker'] = mm if t > D * 0.25 else dict(f=-1, mouth='smile')
    o.update(crowd_laugh(T, ['c1', 'c2'], 0.8, D * 0.45))
    return o


def m3b(t, D, T):   # v2 tries to join in, mocker points at her hair
    raise_hand = seg(t, 0, D * 0.25)
    o = {'v2': dict(fa1=lerp(50, 150, raise_hand * (1 - seg(t, D * 0.45, D * 0.6))), fa2=10, mopen=chatter(T, 1.1) * (t < D * 0.4),
                    mouth='smile' if t < D * 0.45 else 'forced', blush=seg(t, D * 0.5, D * 0.8),
                    tilt=10 * seg(t, D * 0.5, D), lookx=-1)}
    o['mocker'] = dict(mocker_point(T, 1, 0.8), lookx=1) if t > D * 0.35 else dict(f=1, mouth='grin')
    o.update(crowd_laugh(T, ['c3', 'c2'], 0.9, D * 0.45))
    return o


def m3c(t, D, T):   # v3 shares something personal, mocker turns it into a joke
    o = {'v3': dict(mopen=chatter(T, 2.1) * (t < D * 0.45), mouth='soft' if t < D * 0.45 else 'flat', tilt=-4,
                    fa1=60, fa2=60, lookx=1 if t < D * 0.5 else -0.5, looky=seg(t, D * 0.6, D),
                    brow=-0.7 * seg(t, D * 0.55, D))}
    o['mocker'] = dict(laughing(T, 1.1), f=-1, fa1=150, fa2=10, ba1=40, ba2=50) if t > D * 0.4 else dict(f=-1, mouth='smile', lookx=-1)
    o.update(crowd_laugh(T, ['c1', 'c2', 'c3'], 1.0, D * 0.5))
    o['woman'] = dict(mouth='frown', brow=0.6)
    return o


def shot_l3a(c, t, D, T, G):
    g_shot((360, 1300, 1.8), (380, 1300, 2.0), m3a, warm=0.1)(c, t, D, T, G)


def shot_l3b(c, t, D, T, G):
    g_shot((800, 1250, 2.2), (760, 1280, 1.8), m3b, warm=0.08,
           cool=lambda t, D: 0.15 * seg(t, D * 0.55, D))(c, t, D, T, G)


def shot_l3c(c, t, D, T, G):
    g_shot((430, 1000, 2.6), (520, 1150, 1.5), m3c, warm=lambda t, D: 0.12 * seg(t, D * 0.5, D * 0.7))(c, t, D, T, G)


# ---- line 4: man: maybe he didn't mean harm
def shot_l4_m(c, t, D, T, G):
    talk_shot(CAM_M, (740, 1090, 2.6), m=dict(fa1=120, fa2=150, tilt=-6, lookx=-0.5, looky=-0.5),
              w=dict(mouth='flat'))(c, t, D, T, G)


def l4_over(t, D, T):
    o = {'mocker': dict(laughing(T, 0.7), f=1, x=520, fa1=115, fa2=-50, lean=8)}
    o['v3'] = dict(mouth='forced', eyes='open', lean=-6, shrug=6, brow=-0.6, tilt=-8, lookx=-0.5)
    o.update(crowd_laugh(T, ['c1'], 0.5, 0.2))
    return o


def shot_l4_g(c, t, D, T, G):
    g_shot((470, 1050, 2.2), (470, 1080, 2.5), l4_over, cool=0.06)(c, t, D, T, G)


# ---- line 5: she confronts him -> "what's wrong? I'm only joking!"
def l5_over(t, D, T):
    o = {}
    stand = seg(t, 0, D * 0.3)
    o['woman'] = dict(sit=1 - stand, f=-1, lean=8 * stand, fa1=lerp(40, 90, stand), fa2=lerp(50, 5, stand),
                      brow=0.9, mouth='flat', mopen=chatter(T, 0.3) * 0.7 * (t < D * 0.4), lookx=-1)
    o['v1'] = dict(mouth='flat', eyes='down', blush=0.8, tilt=8, looky=1)
    shrug = seg(t, D * 0.38, D * 0.5)
    pointing = seg(t, D * 0.6, D * 0.7)
    o['mocker'] = dict(f=1 if pointing < 0.5 else -1, shrug=12 * shrug, palms=shrug * (1 - pointing),
                       fa1=lerp(lerp(14, 40, shrug), 88, pointing), fa2=lerp(lerp(10, 70, shrug), 4, pointing),
                       ba1=lerp(-12, 40, shrug), ba2=lerp(8, 70, shrug), mouth='grin',
                       eyes='open', brow=-0.8 * shrug, browy=shrug, tilt=8 * shrug,
                       mopen=chatter(T, 0.9) * 0.6 * (D * 0.38 < t < D * 0.75), lookx=1 if pointing < 0.5 else -1)
    for w in ['c1', 'c2', 'c3', 'v3']:
        o[w] = dict(mouth='flat', lookx=1 if w in ('c1', 'v3') else -1)
    return o


def shot_l5_wide(c, t, D, T, G):
    g_shot((660, 1200, 1.45), (560, 1300, 1.3), l5_over, cool=lambda t, D: 0.08)(c, t, D, T, G)


def shot_l5_v1(c, t, D, T, G):
    over = lambda t, D, T: dict(l5_over(D, D, T), v1=dict(mouth='forced', eyes='down', blush=1, tilt=10, brow=-0.8,
                                                         looky=1, shrug=6 + 3 * seg(t, D * 0.4, D * 0.6), sweat=1))
    g_shot(cam_on('v1', 3.0, 30), cam_on('v1', 4.0, 40), over, cool=0.2)(c, t, D, T, G)


# ---- line 6: man: it's become a ready excuse
def shot_l6(c, t, D, T, G):
    talk_shot((640, 1100, 1.6), CAM_M, m=dict(brow=0.6, mouth='flat', tilt=4 * osc(T, 0.8)), w=dict(mouth='flat', brow=0.3),
              m_style='both')(c, t, D, T, G)


# ---- line 7: everyone laughs while he wishes the earth would swallow him
def l7_over(t, D, T):
    o = crowd_laugh(T, ['c1', 'c2', 'c3', 'v3'], 1.0, 0)
    o['mocker'] = dict(mocker_point(T, -1, 1.0))
    o['v2'] = laughing(T, 0.4, 2)
    o['woman'] = dict(mouth='frown', brow=0.5, lookx=-1)
    sink = seg(t, D * 0.55, D * 0.7) * (1 - seg(t, D * 0.88, D))
    o['v1'] = dict(mouth='forced', eyes='down', blush=1, tilt=14, looky=1, shrug=8, y=GATHER['v1']['y'] + 30 * sink,
                   fa1=20, fa2=100, ba1=20, ba2=100)
    return o


def shot_l7(c, t, D, T, G):
    hole_fn = lambda t, D: (GATHER['v1']['x'] + 25, GATHER['v1']['y'] + 4,
                            70 * seg(t, D * 0.5, D * 0.65) * (1 - seg(t, D * 0.85, D * 0.97)))
    fade_fn = lambda t, D: {w: 1 - 0.65 * seg(t, D * 0.5, D * 0.62) * (1 - seg(t, D * 0.86, D))
                            for w in ['c1', 'c2', 'c3', 'v3', 'woman', 'v2', 'mocker']}
    g_shot(CAM_GWIDE, cam_on('v1', 2.4, 120), l7_over, warmth=0.8,
           warm=lambda t, D: 0.14 * (1 - seg(t, D * 0.4, D * 0.6)),
           cool=lambda t, D: 0.30 * seg(t, D * 0.45, D * 0.62) * (1 - seg(t, D * 0.86, D)),
           hole_fn=hole_fn, fade_fn=fade_fn)(c, t, D, T, G)


# ---- line 8: not everyone laughing in front of you is happy
def shot_l8_m(c, t, D, T, G):
    talk_shot(CAM_MX, CAM_M, m=dict(mouth='soft', brow=-0.3, tilt=-5, looky=0.6), w=dict(mouth='soft'))(c, t, D, T, G)


def l8_over(t, D, T):
    fall = seg(t, D * 0.45, D * 0.65)
    o = {'c3': dict(laughing(T, 1 - fall), mouth='laugh' if fall < 0.5 else 'flat', eyes='happy' if fall < 0.5 else 'down',
                    brow=-0.6 * fall, tilt=10 * fall)}
    o['mocker'] = dict(laughing(T, 0.8), f=1 if t < D * 0.4 else -1)
    o['v2'] = dict(mouth='forced' if fall < 0.5 else 'flat', eyes='open' if fall < 0.5 else 'down', looky=fall, tilt=8 * fall)
    o['woman'] = dict(mouth='flat', lookx=1, brow=0.4)
    return o


def shot_l8_g(c, t, D, T, G):
    g_shot((900, 1000, 2.3), (940, 980, 3.0), l8_over, warm=lambda t, D: 0.1 * (1 - seg(t, D * 0.45, D * 0.6)),
           cool=lambda t, D: 0.15 * seg(t, D * 0.45, D * 0.65))(c, t, D, T, G)


# ---- line 9: laughing WITH vs laughing AT (split screen)
def shot_l9_w(c, t, D, T, G):
    talk_shot(CAM_W, (360, 1100, 2.0), w=dict(mouth='smile', brow=0.2))(c, t, D, T, G)


def split_with(c, t, D, T):
    """top: c1 tells a funny story about herself, everybody laughs - her included"""
    c.save()
    camera(c, 540, 1080, 1.9, T)
    gather_bg(c, T, 0.9)
    trip = seg(t, D * 0.15, D * 0.35)
    figs = [('v3', P(x=330, y=1230, s=1.2, f=1, sit=1)), ('c2', P(x=700, y=1230, s=1.2, f=-1, sit=1)),
            ('v2', P(x=790, y=1230, s=1.2, f=-1, sit=1))]
    for i, (w, p) in enumerate(figs):
        p = idle(p, T, i)
        if t > D * 0.35:
            p.update(laughing(T, 1.0, i))
        draw_figure(c, w, p)
    p = P(x=540, y=1240, s=1.3, f=1, lean=-25 * trip * (1 - seg(t, D * 0.35, D * 0.45)), fa1=120 * trip, fa2=20,
          ba1=150 * trip, mopen=chatter(T, 0.3) * (t < D * 0.35))
    if t > D * 0.35:
        p.update(laughing(T, 1.1, 3))
        p['fa1'] = 40
    draw_figure(c, 'c1', p)
    c.restore()
    overlay(c, WARM, 0.12)


def split_at(c, t, D, T):
    """bottom: the mocker in the centre of attention, one person shrinking in the middle"""
    c.save()
    camera(c, 540, 1080, 1.9, T)
    gather_bg(c, T, 0.3)
    ring = [('c1', 300, 1), ('c2', 400, 1), ('c3', 790, -1), ('v3', 690, -1)]
    for i, (w, x, f) in enumerate(ring):
        p = idle(P(x=x, y=1230, s=1.15, f=f, sit=1), T, i + 4)
        p.update(laughing(T, 0.9, i))
        draw_figure(c, w, p)
    pv = P(x=540, y=1260, s=1.15, f=1, sit=1, mouth='flat', eyes='down', tilt=16, looky=1, shrug=8,
           fa1=20, fa2=110, ba1=20, ba2=110, blush=1)
    draw_figure(c, 'v1', pv)
    pm = P(x=640, y=1320, s=1.3, f=-1)
    pm.update(mocker_point(T, -1, 1.0))
    draw_figure(c, 'mocker', pm)
    c.restore()
    overlay(c, COOL, 0.22)


def shot_l9_split(c, t, D, T, G):
    c.clear(argb(PAPER))
    slide = ease(t / 0.5)
    for (fn, y0, from_x) in [(split_with, 0, -W_), (split_at, H_ / 2, W_)]:
        c.save()
        c.clipRect(skia.Rect(0, y0, W_, y0 + H_ / 2))
        c.translate(from_x * (1 - slide), y0 - H_ / 4)
        fn(c, t, D, T)
        c.restore()
    line(c, 0, H_ / 2, W_, H_ / 2, stroke(PAPER, 18))
    line(c, 0, H_ / 2, W_, H_ / 2, stroke(INK, 6))
    vignette(c, 0.3)


# ---- line 10: man: some people are too sensitive -> v2 tries to answer, backs down
def shot_l10_m(c, t, D, T, G):
    talk_shot(CAM_TWO, (620, 1090, 1.5), m=dict(lean=-8, fa1=30, fa2=120, ba1=30, ba2=120, mouth='smile', brow=-0.2),
              w=dict(brow=0.4, mouth='flat'))(c, t, D, T, G)


def l10_over(t, D, T):
    o = {'mocker': dict(laughing(T, 0.9), f=1, fa1=90, fa2=30, mopen=chatter(T, 1.4))}
    try_ = seg(t, D * 0.25, D * 0.4)
    back = seg(t, D * 0.55, D * 0.75)
    o['v2'] = dict(lean=10 * try_ * (1 - back) - 4 * back, fa1=lerp(50, 95, try_ * (1 - back)), fa2=lerp(40, 10, try_ * (1 - back)),
                   mouth='o' if try_ > 0.5 and back < 0.5 else ('flat' if back > 0.5 else 'forced'),
                   lookx=-1 + 2 * seg(t, D * 0.42, D * 0.5) - 2 * back, looky=back, tilt=10 * back, blush=back, shrug=6 * back)
    watch = seg(t, D * 0.4, D * 0.5)
    for w in ['c1', 'c2', 'c3', 'v3', 'v1']:
        o[w] = dict(mouth='flat' if watch > 0.5 else 'laugh', eyes='open', lookx=1 if w in ('c1', 'v3', 'v1') else -1)
        if watch < 0.5:
            o[w].update(laughing(T, 0.6))
    return o


def shot_l10_g(c, t, D, T, G):
    g_shot((760, 1250, 1.8), (800, 1250, 2.2), l10_over, cool=lambda t, D: 0.16 * seg(t, D * 0.4, D))(c, t, D, T, G)


# ---- line 11: "joke, spread joy - but not at the price of someone's dignity" (chaos -> calm)
def shot_l11_w(c, t, D, T, G):
    talk_shot(CAM_W, CAM_TWO, w=dict(mouth='soft', brow=0.1), m=dict(mouth='flat', lookx=-1), w_style='both')(c, t, D, T, G)


def l11_over(t, D, T):
    calm = seg(t, D * 0.3, D * 0.8)
    o = {}
    for i, w in enumerate(['c1', 'c2', 'c3', 'mocker']):
        lp = laughing(T * (1 - 0.7 * calm), 1 - calm, i)
        lp['mouth'] = 'laugh' if calm < 0.6 else 'soft'
        lp['eyes'] = 'happy' if calm < 0.6 else 'open'
        o[w] = lp
    o['mocker'].update(f=-1)
    o['v3'] = dict(mouth='flat', eyes='down', tilt=10, looky=1, brow=-0.6)
    o['v1'] = dict(laughing(T, 0.5 * (1 - calm), 2), mouth='forced' if calm < 0.5 else 'frown', eyes='open' if calm < 0.5 else 'down',
                   tilt=10 * calm)
    return o


def shot_l11_g(c, t, D, T, G):
    fade_fn = lambda t, D: {w: 1 - 0.5 * seg(t, D * 0.4, D * 0.85) for w in ['c1', 'c2', 'c3', 'mocker', 'woman', 'v2']}
    g_shot((540, 1200, 1.1), (330, 1120, 1.9), l11_over, warm=lambda t, D: 0.12 * (1 - seg(t, 0, D * 0.6)),
           cool=lambda t, D: 0.12 * seg(t, D * 0.3, D), fade_fn=fade_fn)(c, t, D, T, G)


# ---- line 12: man: so strength isn't a sharp tongue?
def shot_l12(c, t, D, T, G):
    talk_shot(CAM_M, CAM_MX, m=dict(brow=-0.4, browy=1, mouth='o', tilt=-6, palms=0.6, lean=6), w=dict(mouth='soft'))(c, t, D, T, G)


# ---- line 13: the room cools around the mocker
def l13_over(t, D, T):
    cool = seg(t, D * 0.35, D * 0.7)
    o = {'mocker': dict(mocker_point(T, -1, 1.0 * (1 - cool * 0.6)), mopen=chatter(T, 2) * 0.5)}
    o['v3'] = dict(mopen=chatter(T, 1) * (1 - seg(t, D * 0.2, D * 0.3)), mouth='flat', eyes='down' if cool > 0.3 else 'open', looky=cool)
    o['c1'] = dict(laughing(T, 0.8 * (1 - cool)), lookx=1 if cool < 0.5 else 1, mouth='laugh' if cool < 0.4 else 'flat',
                   eyes='happy' if cool < 0.4 else 'open')
    o['c2'] = dict(laughing(T, 0.8 * (1 - cool)), lookx=-1 if cool < 0.5 else 1, mouth='laugh' if cool < 0.4 else 'flat',
                   eyes='happy' if cool < 0.4 else 'open', brow=0.4 * cool)
    o['c3'] = dict(mouth='flat', lookx=-1, brow=0.5 * cool, f=-1)
    o['woman'] = dict(mouth='flat', lookx=-1 + 2 * cool * osc(T, 0.3) * 0.5)
    o['v2'] = dict(mouth='flat', lookx=-1 if cool < 0.5 else 1)
    return o


def shot_l13_g(c, t, D, T, G):
    g_shot((540, 1260, 1.35), (520, 1200, 1.6), l13_over, warm=lambda t, D: 0.1 * (1 - seg(t, 0, D * 0.6)),
           cool=lambda t, D: 0.1 * seg(t, D * 0.4, D))(c, t, D, T, G)


def shot_l13_w(c, t, D, T, G):
    # counting on fingers: what to say, when, and boundaries
    def w(t, D):
        k = int(3 * t / D)
        return dict(fa1=95, fa2=60 + 10 * k, palms=0.3 * (k + 1), mouth='soft', brow=0.2)
    talk_shot(CAM_W, CAM_WX, w=w, m=dict(mouth='flat', lookx=-1))(c, t, D, T, G)


# ---- line 14: man realises; someone answers the mocker back
def shot_l14_m(c, t, D, T, G):
    def m(t, D):
        u = seg(t, 0, D)
        return dict(lean=lerp(-6, 12, u), fa1=lerp(30, 90, u), fa2=lerp(120, 40, u), tilt=4 * osc(t, 0.5), mouth='flat')
    talk_shot((620, 1100, 1.6), CAM_M, m=m, w=dict(mouth='soft'))(c, t, D, T, G)


def l14_over(t, D, T):
    back = seg(t, D * 0.2, D * 0.35)
    falter = seg(t, D * 0.4, D * 0.55)
    o = {'c3': dict(f=-1, lean=8 * back, fa1=88 * back, fa2=4, mouth='grin' if back > 0.5 else 'flat',
                    mopen=chatter(T, 3) * 0.6 * (D * 0.2 < t < D * 0.45), brow=0.3)}
    o['mocker'] = dict(f=1, x=700, mouth='grin' if falter < 0.5 else 'forced', eyes='open' if falter < 0.5 else 'wide',
                       blush=falter, sweat=falter, brow=-0.6 * falter, lean=-8 * falter, shrug=6 * falter)
    o.update(crowd_laugh(T, ['c1', 'c2'], 0.6, D * 0.45))
    return o


def shot_l14_g(c, t, D, T, G):
    g_shot((800, 1150, 1.7), (760, 1130, 2.1), l14_over)(c, t, D, T, G)


# ---- line 15: the word that stays
def shot_l15_w(c, t, D, T, G):
    talk_shot(CAM_WX, CAM_W, w=dict(mouth='soft', brow=0.3, tilt=4))(c, t, D, T, G)


def shot_l15_word(c, t, D, T, G):
    c.save()
    camera(c, 690, 1230, 1.7 + 0.15 * t / D, T)
    void_bg(c)
    pm = P(x=520, y=1500, s=1.4, f=1)
    pm.update(laughing(T, 0.5))
    pm.update(mouth='grin', mopen=0.6 if t < D * 0.35 else 0.1, fa1=88, fa2=4)
    draw_figure(c, 'mocker', pm)
    pv = P(x=880, y=1500, s=1.4, f=-1, sit=0, mouth='flat' if t < D * 0.6 else 'frown', eyes='open' if t < D * 0.6 else 'down',
           tilt=12 * seg(t, D * 0.55, D * 0.75), shrug=6 * seg(t, D * 0.55, D * 0.75), blush=seg(t, D * 0.6, D))
    draw_figure(c, 'v2', pv)
    # the word: a sharp black line flying from mouth to head
    mx, my = 520 + 28 * 1.4, 1500 - 222 * 1.4 + 18
    vx, vy = 880 - 10, 1500 - 222 * 1.4 - 10
    u = seg(t, D * 0.15, D * 0.6)
    if 0 < u < 1:
        hx = lerp(mx, vx, u)
        hy = lerp(my, vy, u) - 60 * math.sin(u * math.pi)
        tail = max(0.0, u - 0.25)
        tx = lerp(mx, vx, tail)
        ty = lerp(my, vy, tail) - 60 * math.sin(tail * math.pi)
        c.drawPath(jag_path(tx, ty, hx, hy, n=7, amp=12 * (1 - u) + 4, seed=int(T * 12) % 5), stroke(INK, 9))
        poly(c, [(hx, hy), (hx - 18, hy - 10), (hx - 14, hy + 12)], fill(INK), close=True)
    thorn(c, vx + 36, vy - 40, 1.1, seg(t, D * 0.58, D * 0.7))
    c.restore()


def shot_l15_home(c, t, D, T, G):
    c.save()
    camera(c, lerp(560, 660, ease(t / D)), lerp(1120, 1060, ease(t / D)), lerp(1.55, 1.85, ease(t / D)), T)
    home_bg(c, T)
    # chair by window
    chair(c, 660, 1330, 1, 1.4)
    walk_end = D * 0.3
    if t < walk_end:   # comes home, walks to the chair
        u = t / walk_end
        p = P(x=lerp(180, 660, u), y=1330, s=1.4, f=1, mouth='flat', eyes='down', looky=1, tilt=8)
        p.update(walk(T, 1.4, 0.8))
    else:
        situ = seg(t, walk_end, walk_end + 0.6)
        lookup = seg(t, D * 0.82, D * 0.95)
        p = P(x=660, y=1330, s=1.4, f=1, sit=situ, mouth='flat' if lookup < 0.5 else 'soft', eyes='down' if lookup < 0.5 else 'open',
              looky=1 - lookup, tilt=lerp(14, 2, lookup), fa1=lerp(14, 40, situ), fa2=lerp(10, 90, situ), shrug=4,
              lookx=lookup)
    p = idle(p, T, 4.0, 0.6)
    draw_figure(c, 'v2', p)
    hx, hy = p['x'], p['y'] - (62 if p['sit'] > 0.5 else 112) * 1.4 - 115 * 1.4
    thorn(c, hx - 50, hy - 40, 1.0, 1.0 - 0.3 * seg(t, D * 0.85, D))
    c.restore()
    # the memory floats up behind, then dissolves
    a = seg(t, D * 0.42, D * 0.52) * (1 - seg(t, D * 0.72, D * 0.84))
    mini_memory(c, 520, 380 - 40 * seg(t, D * 0.42, D * 0.84), 480, 330, a, T)
    overlay(c, COOL, 0.1)
    vignette(c, 0.4)


# ---- line 16: man: we should learn to make people laugh without hurting
def shot_l16(c, t, D, T, G):
    talk_shot((560, 1080, 1.3), CAM_TWO, m=dict(mouth='smile', brow=-0.1, lean=4), w=dict(mouth='smile', eyes='open'),
              dusk=0.3)(c, t, D, T, G)


# ---- line 17: she agrees; the mocker is about to joke, notices her face, smiles instead
def shot_l17_w(c, t, D, T, G):
    talk_shot(CAM_TWO, CAM_W, w=dict(mouth='smile', brow=0), m=dict(mouth='smile'), dusk=0.4)(c, t, D, T, G)


def l17_over(t, D, T):
    wind = seg(t, D * 0.05, D * 0.3)
    notice = seg(t, D * 0.38, D * 0.48)
    choose = seg(t, D * 0.6, D * 0.75)
    m = dict(f=1, x=650, lean=10 * wind * (1 - notice), fa1=lerp(14, 88, wind * (1 - choose)), fa2=4,
             mouth='grin' if choose < 0.5 else 'smile', mopen=0.5 * wind * (1 - notice), eyes='open',
             brow=lerp(0, -0.5, notice) * (1 - choose), browy=notice * (1 - choose), lookx=1)
    v = dict(mouth='flat' if choose < 0.6 else 'soft', eyes='open', tilt=6 * (1 - choose), shrug=5 * (1 - choose),
             lookx=-1, brow=-0.5 * (1 - choose))
    return {'mocker': m, 'v2': v, 'c2': dict(mouth='flat', lookx=-1), 'woman': dict(mouth='soft', lookx=-1)}


def shot_l17_g(c, t, D, T, G):
    g_shot((780, 1210, 1.9), (770, 1200, 2.3), l17_over, warmth=0.7)(c, t, D, T, G)


# ---- line 18: narrator moral - respect & relief, then a calm empty frame
def shot_l18_pair(c, t, D, T, G):
    def over(t, D, T):
        relief = seg(t, D * 0.25, D * 0.85)
        m = dict(f=1, x=650, mouth='smile', eyes='open', lookx=1, tilt=-4, lean=-4, fa1=20 + 10 * relief, fa2=40)
        v = dict(mouth='soft' if relief < 0.5 else 'smile', eyes='open', lookx=-1, tilt=lerp(6, -2, relief),
                 shrug=lerp(5, 0, relief), lean=lerp(-4, 4, relief), fa1=lerp(30, 50, relief))
        return {'mocker': m, 'v2': v, 'c2': dict(mouth='soft', lookx=-1), 'woman': dict(mouth='smile', lookx=-1),
                'c3': dict(mouth='soft', lookx=-1)}

    def thorn_front(cc, t, D, T):
        x, y = GATHER['v2']['x'], GATHER['v2']['y'] - 62 * 1.4 - 115 * 1.4
        thorn(cc, x + 50, y - 40, 0.9, 0.7 * (1 - seg(t, D * 0.2, D * 0.7)))
    g_shot((770, 1230, 2.1), (770, 1200, 1.6), over, warmth=0.9, warm=lambda t, D: 0.12 * seg(t, 0, D),
           front=thorn_front)(c, t, D, T, G)


def shot_l18_end(c, t, D, T, G):
    c.save()
    u = ease(t / D)
    camera(c, lerp(540, 330, u), lerp(1080, 700, u), lerp(1.0, 1.25, u), T, drift=0.5)
    talk_scene(c, T, G, w=dict(mouth='smile', lookx=1), m=dict(mouth='smile', lookx=-1), dusk=0.6 + 0.3 * u)
    c.restore()
    overlay(c, WARM, 0.06)
    vignette(c, 0.3)
    overlay(c, PAPER, seg(t, D - 1.2, D) * 0.9)


# ---------------------------------------------------------------- the direction table
DIRECTION = {
    0: [(1, shot_title)],
    1: [(0.32, shot_l1_close_w), (0.48, shot_l1_gathering), (0.20, shot_l1_v1_face)],
    2: [(0.38, shot_l2_talk), (0.62, shot_l2_gather)],
    3: [(0.16, shot_l3_w), (0.28, shot_l3a), (0.28, shot_l3b), (0.28, shot_l3c)],
    4: [(0.5, shot_l4_m), (0.5, shot_l4_g)],
    5: [(0.72, shot_l5_wide), (0.28, shot_l5_v1)],
    6: [(1, shot_l6)],
    7: [(1, shot_l7)],
    8: [(0.45, shot_l8_m), (0.55, shot_l8_g)],
    9: [(0.25, shot_l9_w), (0.75, shot_l9_split)],
    10: [(0.38, shot_l10_m), (0.62, shot_l10_g)],
    11: [(0.42, shot_l11_w), (0.58, shot_l11_g)],
    12: [(1, shot_l12)],
    13: [(0.55, shot_l13_g), (0.45, shot_l13_w)],
    14: [(0.45, shot_l14_m), (0.55, shot_l14_g)],
    15: [(0.2, shot_l15_w), (0.27, shot_l15_word), (0.53, shot_l15_home)],
    16: [(1, shot_l16)],
    17: [(0.4, shot_l17_w), (0.6, shot_l17_g)],
    18: [(0.62, shot_l18_pair), (0.38, shot_l18_end)],
}
