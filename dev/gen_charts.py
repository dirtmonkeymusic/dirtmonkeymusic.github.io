"""Write the four placeholder charts for js/beatmap.js, following the synth arrangement in js/rhythm.js."""
import os, re, sys

# Sections in beats: countin 0-4, intro 4-20, build 20-36, drop 36-68, break 68-84, drop2 84-116, outro 116-124
PATTERNS = [[0, 1, 2, 3], [3, 2, 1, 0], [0, 2, 1, 3], [3, 1, 2, 0], [1, 0, 2, 3], [2, 3, 1, 0], [0, 1, 3, 2], [3, 2, 0, 1]]


class Chart:
    def __init__(self, name):
        self.name = name
        self.notes = []
        self.hold_until = [-1.0] * 4
        self.last = -1
        self.pat = 0
        self.step = 0

    def free(self, beat, lane):
        return self.hold_until[lane] < beat - 0.01

    def next_lane(self, beat, avoid=()):
        pat = PATTERNS[self.pat % len(PATTERNS)]
        for i in range(4):
            lane = pat[(self.step + i) % 4]
            if lane in avoid or not self.free(beat, lane) or (lane == self.last and i < 3):
                continue
            self.step += i + 1
            return lane
        for lane in range(4):
            if lane not in avoid and self.free(beat, lane):
                return lane
        return None

    def tap(self, beat, lane=None, avoid=()):
        if lane is None or not self.free(beat, lane):
            lane = self.next_lane(beat, avoid)
        if lane is None:
            return None
        self.notes.append([beat, lane])
        self.last = lane
        return lane

    def jump(self, beat, lanes=None):
        if lanes is None:
            a = self.next_lane(beat)
            b = self.next_lane(beat, avoid=(a,))
            lanes = (a, b)
        out = []
        for lane in lanes:
            if lane is not None and self.free(beat, lane):
                self.notes.append([beat, lane])
                out.append(lane)
        self.last = out[-1] if out else self.last
        return out

    def hold(self, beat, length, lane=None):
        if lane is None or not self.free(beat, lane):
            lane = self.next_lane(beat)
        if lane is None:
            return None
        self.notes.append([beat, lane, length])
        self.hold_until[lane] = beat + length + 0.25
        self.last = lane
        return lane

    def new_bar(self):
        self.pat += 1
        self.step = 0


def easy():
    c = Chart("easy")
    for bar in range(4):  # intro
        s = 4 + bar * 4
        c.new_bar()
        for b in (0, 2) if bar < 2 else (0, 1, 2, 3):
            c.tap(s + b)
    for bar in range(4):  # build
        s = 20 + bar * 4
        c.new_bar()
        beats = (0, 1, 2, 3) if bar < 3 else (0, 0.5, 1, 1.5, 2, 2.5)
        for b in beats:
            c.tap(s + b)
    for d0, last_bar in ((36, 7), (84, 7)):
        for bar in range(8):
            s = d0 + bar * 4
            c.new_bar()
            beats = (0, 2, 3) if bar % 2 == 0 else (0, 1.5, 2, 3)
            if bar == last_bar:
                beats = (0, 2, 2.5, 3, 3.5)
            for b in beats:
                c.tap(s + b)
        if d0 == 36:
            for bar in range(4):  # break
                s = 68 + bar * 4
                c.new_bar()
                beats = (0, 2) if bar < 3 else (0, 1, 2, 2.5, 3)
                for b in beats:
                    c.tap(s + b)
    c.tap(116)
    return c


def normal():
    c = Chart("normal")
    for bar in range(4):
        s = 4 + bar * 4
        c.new_bar()
        beats = (0, 1, 2, 3) if bar % 2 == 0 else (0, 1, 2, 2.5, 3, 3.5)
        for b in beats:
            c.tap(s + b)
    for bar in range(4):
        s = 20 + bar * 4
        c.new_bar()
        beats = (0, 1, 2, 3) if bar == 0 else [i * 0.5 for i in range(8)] if bar < 3 else [i * 0.5 for i in range(7)]
        for b in beats:
            c.tap(s + b)
    for d0 in (36, 84):
        for bar in range(8):
            s = d0 + bar * 4
            c.new_bar()
            if bar == 0:
                c.jump(s)
            else:
                c.tap(s)
            beats = (1, 1.5, 2, 3, 3.5) if bar < 7 else (1.5, 2, 2.5, 3, 3.5)
            if d0 == 84 and bar % 2 and bar < 7:
                beats = (1, 1.5, 2, 2.5, 3, 3.5)
            for b in beats:
                c.tap(s + b)
        if d0 == 36:
            for bar in range(4):
                s = 68 + bar * 4
                c.new_bar()
                beats = (0, 1, 2, 3) if bar < 3 else [i * 0.5 for i in range(7)]
                for b in beats:
                    c.tap(s + b)
    c.jump(116, (0, 3))
    return c


def hard():
    c = Chart("hard")
    for bar in range(4):
        s = 4 + bar * 4
        c.new_bar()
        if bar % 2 == 0:
            h = c.hold(s, 3)
            for b in (1, 2, 2.5, 3.5) if bar else (1, 2, 3, 3.5):
                c.tap(s + b, avoid=(h,))
        else:
            for b in (0, 0.5, 1, 2, 2.5, 3, 3.5):
                c.tap(s + b)
    for bar in range(4):
        s = 20 + bar * 4
        c.new_bar()
        beats = [i * 0.5 for i in range(8)] if bar < 2 else [i * 0.5 for i in range(8)] if bar == 2 else [i * 0.25 for i in range(14)]
        for b in beats:
            if bar == 2 and b % 1 == 0 and b > 0:
                c.jump(s + b)
            else:
                c.tap(s + b)
    for d0 in (36, 84):
        for bar in range(8):
            s = d0 + bar * 4
            c.new_bar()
            if bar < 7:
                h = c.hold(s, 1)
                c.tap(s + 1.5, avoid=(h,))
                c.jump(s + 2)
                beats = (2.5, 3, 3.5) if bar % 2 == 0 else (2.75, 3, 3.25, 3.5, 3.75)
                if d0 == 84:
                    beats = (2.5, 2.75, 3, 3.5, 3.75) if bar % 2 == 0 else (2.5, 2.75, 3, 3.25, 3.5, 3.75)
                for b in beats:
                    c.tap(s + b)
            else:
                c.jump(s)
                for b in (1, 1.5, 2, 2.5, 3, 3.25, 3.5, 3.75):
                    c.tap(s + b)
        if d0 == 36:
            for bar in range(4):
                s = 68 + bar * 4
                c.new_bar()
                if bar < 3:
                    h = c.hold(s, 3 if bar % 2 == 0 else 2)
                    for b in (1, 2, 3, 3.5) if bar % 2 == 0 else (1, 1.5, 2.5, 3, 3.5):
                        c.tap(s + b, avoid=(h,))
                else:
                    for b in [i * 0.25 for i in range(14)]:
                        c.tap(s + b)
    c.hold(116, 4, 0)
    c.tap(116, 3)
    return c


def wild():
    c = Chart("wild")
    for bar in range(4):
        s = 4 + bar * 4
        c.new_bar()
        if bar % 2 == 0:
            h = c.hold(s, 3)
            for b in (0.5, 1, 1.5, 2, 2.5, 3, 3.5):
                c.tap(s + b, avoid=(h,))
        else:
            c.jump(s)
            for b in (0.5, 1, 1.5, 2, 2.5, 2.75, 3, 3.5, 3.75):
                c.tap(s + b)
    for bar in range(4):
        s = 20 + bar * 4
        c.new_bar()
        beats = [i * 0.5 for i in range(8)] if bar == 0 else [i * 0.25 for i in range(16)] if bar < 3 else [i * 0.25 for i in range(14)]
        for b in beats:
            if b % 1 == 0 and bar > 0:
                c.jump(s + b)
            else:
                c.tap(s + b)
    for d0 in (36, 84):
        for bar in range(8):
            s = d0 + bar * 4
            c.new_bar()
            if bar < 7:
                c.jump(s)
                h = c.hold(s + 0.5, 1)
                for b in (0.75, 1, 1.25):
                    c.tap(s + b, avoid=(h,))
                c.tap(s + 1.5)
                c.jump(s + 2)
                for b in (2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75):
                    c.tap(s + b)
            else:
                c.jump(s)
                for b in (0.5, 1, 1.5):
                    c.tap(s + b)
                for b in (2, 2.5, 3, 3.5):
                    c.jump(s + b)
                c.tap(s + 3.75)
        if d0 == 36:
            for bar in range(4):
                s = 68 + bar * 4
                c.new_bar()
                if bar < 3:
                    h = c.hold(s, 3)
                    for b in (0.5, 1, 1.5, 2, 2.5, 2.75, 3, 3.5):
                        c.tap(s + b, avoid=(h,))
                else:
                    for b in [i * 0.25 for i in range(14)]:
                        if b % 1 == 0:
                            c.jump(s + b)
                        else:
                            c.tap(s + b)
    c.hold(116, 4, 0)
    c.hold(116, 4, 3)
    return c


def fmt(n):
    return "[" + ", ".join(str(int(v)) if float(v).is_integer() else str(v) for v in n) + "]"


def lines(chart, indent):
    bars = {}
    for n in sorted(chart.notes, key=lambda n: (n[0], n[1])):
        bars.setdefault(int(n[0] // 4), []).append(fmt(n))
    keys = sorted(bars)
    out = []
    for i, b in enumerate(keys):
        out.append(f"{indent}// bar {b + 1}")
        out.append(indent + ", ".join(bars[b]) + ("," if i < len(keys) - 1 else ""))
    return out


def check(chart):
    taken = {}
    for n in chart.notes:
        key = (n[0], n[1])
        assert key not in taken, (chart.name, key)
        taken[key] = 1
    for h in [n for n in chart.notes if len(n) > 2]:
        for n in chart.notes:
            if n is not h and n[1] == h[1] and h[0] <= n[0] <= h[0] + h[2] + 0.2:
                raise AssertionError((chart.name, "note inside hold", h, n))


charts = [easy(), normal(), hard(), wild()]
block = ["    charts: {"]
for i, ch in enumerate(charts):
    check(ch)
    holds = sum(1 for n in ch.notes if len(n) > 2)
    print(ch.name, len(ch.notes), "notes", holds, "holds", file=sys.stderr)
    block.append(f"      {ch.name}: [")
    block += lines(ch, "        ")
    block.append("      ]" + ("," if i < len(charts) - 1 else ""))
block.append("    }")

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "js", "beatmap.js")
src = open(path).read()
start = src.index("    charts: {", src.index("placeholder:"))
end = src.index("\n    }", start) + len("\n    }")
src = src[:start] + "\n".join(block) + src[end:]
open(path, "w").write(src)
