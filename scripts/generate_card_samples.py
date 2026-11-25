"""Export the local T26/27 art collection, not game assets (Pillow, PyMuPDF, Windows fonts)."""

import json
import os
import subprocess
from collections import deque
from functools import lru_cache
from html import escape
from pathlib import Path
from string import Template
from xml.etree import ElementTree as ET

import pymupdf
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'muestras-cartas'
FONTS = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'
REFS = ROOT / 'references'
# Crop inside the actual opaque face, not the large transparent export canvas.
TRIM = (526, 693, 1134, 1567)
REF = {
    'COMMON': 'imagen-20250829-152324-24f996ae_5384.png',
    'RARE': 'imagen-20250910-215036-61331f30_6379.png',
    'EPIC': 'imagen-20250910-193424-e1c159e0_7961.png',
}
ALT_EPIC = 'imagen-20250829-210742-df882c99_4160.png'
# Official logo in black ink, used for cards whose own ink is not drawn yet.
# The underscore keeps it outside the slug alphabet of the catalogue.
DEFAULT_ART = '_por-defecto'
LABEL = {'COMMON': 'Comunes', 'RARE': 'Raras', 'EPIC': 'Épicas'}
ACCENT = {'COMMON': '#317241', 'RARE': '#146da1', 'EPIC': '#7b3da1'}
SECTION = {'COMMON': 'comunes', 'RARE': 'raras', 'EPIC': 'epicas'}
STAMP = {'COMMON': 'Rombo verde de facetas alternas, sin adornos.',
         'RARE': 'Rombo azul con hojas angulares en la base.',
         'EPIC': 'Rombo violeta con hojas en la base y corona.'}


def catalog():
    # Read the same typed catalogue as the seed without parsing TypeScript as text.
    command = "import { SEASON_CARDS as cards } from './packages/shared/src/season-cards.ts'; console.log(JSON.stringify(cards));"
    result = subprocess.check_output(['node', '--experimental-strip-types', '--input-type=module', '-e', command], cwd=ROOT)
    season = json.loads(result)
    cards = {card['slug']: card for card in season}
    if len(cards) != len(season) or any(c['rarity'] not in LABEL for c in season):
        raise ValueError('Duplicate slug or unknown rarity in season catalogue')
    return cards


def reference(filename):
    with Image.open(REFS / filename) as image:
        return image.crop(TRIM).convert('RGB')


def paper_plate():
    """Rebuild the common paper in register, without reflecting a tile across the face."""
    stock = reference(REF['COMMON'])
    for other in [REF['RARE'], REF['EPIC'], ALT_EPIC]:
        stock = ImageChops.lighter(stock, reference(other))
    # Where all four originals are printed, borrow a nearby clean patch as a
    # whole. It keeps the local grain, unlike blurring letters or mirroring stock.
    gray = stock.convert('L')
    holes = gray.point(lambda v: 255 if v < 184 else 0).filter(ImageFilter.MaxFilter(5))
    regions = [(74, 83, 452, 670), (452, 164, 538, 670), (69, 670, 538, 801)]
    mask = Image.new('L', stock.size)
    for box in regions:
        mask.paste(holes.crop(box), box[:2])
    result = stock.copy()
    # Find connected components of overlapping ink. Pixels at x=0 cannot be in the mask.
    w = stock.width
    todo = bytearray(mask.tobytes())
    for seed in range(len(todo)):
        if not todo[seed]:
            continue
        queue, pixels = deque([seed]), []
        todo[seed] = 0
        while queue:
            i = queue.popleft()
            pixels.append(i)
            for j in (i-w, i+w, i-1, i+1):
                if todo[j]:
                    todo[j] = 0
                    queue.append(j)
        xs, ys = zip(*((i % w, i // w) for i in pixels))
        box = min(xs), min(ys), max(xs)+1, max(ys)+1
        bw, bh = box[2]-box[0], box[3]-box[1]
        # Prefer the nearest clean swatch to preserve the large-scale shading.
        candidates = []
        for dy in range(-96, 97, 8):
            for dx in range(-112, 113, 8):
                x,y = box[0]+dx, box[1]+dy
                if x < 73 or y < 78 or x+bw > 537 or y+bh > 798 or (x+bw > 451 and y < 165):
                    continue
                donor = (x, y, x+bw, y+bh)
                if holes.crop(donor).getbbox() is None:
                    candidates.append((dx*dx+dy*dy, donor))
        if not candidates:
            raise ValueError(f'No clean paper patch for {box}')
        donor = min(candidates)[1]
        patch_mask = Image.new('L', (bw,bh))
        mark = ImageDraw.Draw(patch_mask)
        mark.point([(i%w-box[0], i//w-box[1]) for i in pixels], fill=255)
        result.paste(stock.crop(donor), box[:2], patch_mask)
    return result


def template(rarity, paper):
    face = paper.copy()
    # The four sheets share exactly the same underlying paper, frame and king.
    # Reinsert the entire registered corner, including faint edges of the crown.
    corner = (0, 729, 111, 874)
    face.paste(reference(REF[rarity]).crop(corner), corner[:2])
    return face


@lru_cache(maxsize=64)
def typeface(fontfile, size):
    return ImageFont.truetype(str(FONTS / fontfile), size * 3)


def text_width(text, fontfile, size):
    return typeface(fontfile, size).getlength(text) / 3


def fitted_text(face, text, fontfile, size, center_y, max_width):
    # Typeset at the intended proportions. Decrease the point size, never the x scale.
    while text_width(text, fontfile, size) > max_width and size > 15:
        size -= 1
    font = typeface(fontfile, size)
    left, top, right, bottom = font.getbbox(text)
    mask = Image.new('L', (right - left, bottom - top))
    ImageDraw.Draw(mask).text((-left, -top), text, font=font, fill=255)
    width = round(mask.width / 3)
    mask = mask.resize((width, round(mask.height / 3)), Image.Resampling.LANCZOS)
    face.paste('#100e0e', ((face.width - width) // 2, center_y - mask.height // 2), mask)


def split_label(text, font):
    words = text.split()
    pairs = [(' '.join(words[:i]), ' '.join(words[i:])) for i in range(1, len(words))]
    return min(pairs, key=lambda pair: max(font.getlength(line) for line in pair))


def lettering(face, card):
    name, nickname = card['name'], card['nickname']
    font = 'impact.ttf'
    if text_width(name, font, 47) > 454:
        first, last = split_label(name, typeface(font, 45))
        for line, y in zip((first, last), (681, 727) if nickname else (701, 749)):
            fitted_text(face, line, font, 46, y, 404)
    else:
        fitted_text(face, name, font, 52, 704 if nickname else 727, 454 if nickname else 429)
    if nickname:
        text = '(' + nickname + ')'
        nick = 'ARIALNB.TTF'
        if text_width(text, nick, 29) > 395:
            for line, y in zip(split_label(text, typeface(nick, 29)), (748, 779)):
                fitted_text(face, line, nick, 29, y, 386)
        else:
            fitted_text(face, text, nick, 32, 771, 390)


def make_face(card, base, art_path):
    face = base.copy()
    with pymupdf.open(art_path) as doc:
        pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(4, 4), colorspace=pymupdf.csGRAY, alpha=False)
    ink = ImageOps.invert(Image.frombytes('L', (pix.width, pix.height), pix.samples))
    ink = ImageOps.contain(ink.crop(ink.getbbox()), (457, 519), Image.Resampling.LANCZOS)
    # Account for asymmetric masses without moving a fingertip into the frame.
    def offset(axis, span, limit):
        weights = list(ink.resize((span,1) if axis == 'x' else (1,span), Image.Resampling.BOX).get_flattened_data())
        moment = sum((i+.5)*mass for i,mass in enumerate(weights)) / sum(weights)
        return round(max(-limit, min(limit, .32 * (span/2-moment))))
    # Test the actual silhouette against the king rather than shrinking every
    # portrait to fit a rectangle. Never trade a crown collision for a title collision.
    while True:
        x = (face.width-ink.width)//2 + offset('x', ink.width, 5)
        y = 387-ink.height//2 + offset('y', ink.height, 13)
        if x+ink.width > 452:
            flank = ink.crop((max(0,452-x),0,ink.width,ink.height)).getbbox()
            if flank:
                y = max(y, 164-flank[1])
        if y + ink.height <= 646:
            break
        ink = ImageOps.contain(ink, (ink.width-5, ink.height-6), Image.Resampling.LANCZOS)
    face.paste('#100f0e', (x,y), ink)
    lettering(face, card)
    return face


def contact_sheet(groups, faces, filename, title, columns, width):
    margin, gap = 48, 20
    height = round(width * 874 / 608)
    rows = sum((len(slugs) + columns - 1) // columns for slugs in groups.values())
    sheet = Image.new('RGB', (margin*2 + columns*width + (columns-1)*gap,
                              160 + len(groups)*62 + rows*(height+gap) + margin), '#eee9dd')
    pen = ImageDraw.Draw(sheet)
    def text(y, value, fontfile, size, color):
        pen.text((margin, y), value, font=ImageFont.truetype(str(FONTS / fontfile), size), fill=color, anchor='lt')
    text(35, 'MUNCHINKING LEAGUE   /   T26–27', 'consolab.ttf', 20, '#6c3045')
    text(78, title, 'georgiab.ttf', 50, '#302322')
    y = 160
    for rarity, slugs in groups.items():
        pen.line((margin, y, sheet.width-margin, y), fill='#ad9e90', width=2)
        text(y+15, f'{LABEL[rarity].upper()}   /   {len(slugs):02} CARTAS', 'consolab.ttf', 22, ACCENT[rarity])
        y += 62
        for i, slug in enumerate(slugs):
            x = margin + (i % columns) * (width+gap)
            top = y + (i // columns) * (height+gap)
            sheet.paste(faces[slug].resize((width, height), Image.Resampling.LANCZOS), (x, top))
            pen.rectangle((x-1, top-1, x+width, top+height), outline='#b5a897')
        y += ((len(slugs) + columns - 1) // columns) * (height+gap)
    sheet.save(OUT / filename, quality=93, subsampling=0, optimize=True)


def gallery(cards, groups, art_titles):
    nav, sections = [], []
    for rarity, slugs in groups.items():
        key, label = SECTION[rarity], LABEL[rarity]
        nav.append(f'<a href="#{key}">{label} · {len(slugs)}</a>')
        figures = []
        for slug in slugs:
            card = cards[slug]
            name = escape(card['name'])
            img = f'cartas/{escape(slug, quote=True)}.webp'
            alt = escape(art_titles[slug], quote=True)
            figures.append(f'    <figure id="{slug}"><a href="{img}" aria-label="Ampliar: {name}">'
                           f'<img width="608" height="874" src="{img}" alt="{alt}"></a>'
                           f'<figcaption><b>{name}</b><span>{escape(card["description"])}</span></figcaption></figure>')
        sections.append(f'  <section class="tipo {key}" aria-labelledby="{key}">\n'
                        f'    <div class="cabecera"><h2 id="{key}">{label}</h2>'
                        f'<span class="count">{len(slugs):02} CARTAS</span>'
                        f'<p>{STAMP[rarity]} <a href="lamina-{key}.jpg">Ver lámina de {label.lower()} ↗</a></p></div>\n'
                        '    <div class="cartas">\n' + '\n'.join(figures) + '\n    </div>\n  </section>')
    page = Template((ROOT / 'scripts/templates/card-gallery.html').read_text(encoding='utf-8'))
    (OUT / 'index.html').write_text(page.substitute(total=len(cards), nav=''.join(nav), sections='\n'.join(sections)),
                                    encoding='utf-8', newline='\n')


def main():
    cards = catalog()
    art = {path.stem: path for path in (OUT / 'tintas').glob('*.svg')}
    default = art.pop(DEFAULT_ART, None)
    if default is None:
        raise ValueError(f'Missing default art: tintas/{DEFAULT_ART}.svg')
    if art.keys() - cards.keys():
        raise ValueError(f'Unknown art: {sorted(art.keys()-cards.keys())}')
    pending = sorted(cards.keys() - art.keys())
    art = {slug: art.get(slug, default) for slug in cards}
    art_titles = {}
    for slug, path in art.items():
        root = ET.parse(path).getroot()
        title = (root.findtext('{*}title') or '').strip()
        art_titles[slug] = (root.findtext('{*}desc') or title).strip() if title else ''
    if not all(art_titles.values()):
        raise ValueError('Each illustration needs a descriptive title')
    groups = {r: [slug for slug, card in cards.items() if card['rarity'] == r] for r in LABEL}
    paper = paper_plate()
    (OUT / 'cartas').mkdir(exist_ok=True)
    faces = {}
    for rarity, slugs in groups.items():
        base = template(rarity, paper)
        for slug in slugs:
            faces[slug] = make_face(cards[slug], base, art[slug])
            faces[slug].save(OUT / 'cartas' / (slug + '.webp'), quality=94, method=6)
        contact_sheet({rarity: slugs}, faces, f'lamina-{SECTION[rarity]}.jpg', f'Cartas {LABEL[rarity].lower()}',
                      3 if len(slugs) <= 6 else 4, 285)
    contact_sheet(groups, faces, 'lamina.jpg', 'El mazo de la liga', 6, 210)
    gallery(cards, groups, art_titles)
    print(f'{len(faces)} anversos · {len(groups)+1} láminas · galería HTML')
    if pending:
        print(f'Con tinta por defecto ({len(pending)}): {", ".join(pending)}')


if __name__ == '__main__':
    main()