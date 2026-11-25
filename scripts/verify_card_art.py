"""Control de solo lectura del atlas. Ejecutar: python -B scripts/verify_card_art.py"""

import hashlib
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

sys.dont_write_bytecode = True
import generate_card_samples as export
import pymupdf
from PIL import Image, ImageChops, ImageOps, ImageStat


GROUPS = {'COMMON': (11, 'comunes'), 'RARE': (16, 'raras'), 'EPIC': (6, 'epicas')}
SHEETS = {'lamina.jpg', *(f'lamina-{key}.jpg' for _, key in GROUPS.values())}
FACE = (608, 874)
# Coordenadas sobre la cara recortada, no sobre el PNG transparente original.
STAMP = (13, 729, 111, 869)
CENTER = (84, 164, 524, 646)  # zona de ilustración, sin marco, sello ni leyenda
SVG = '{http://www.w3.org/2000/svg}'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def inventory(actual, expected):
    actual, expected = Counter(actual), Counter(expected)
    require(actual == expected, f'faltan {list((expected-actual).elements())}; '
                                f'sobran {list((actual-expected).elements())}')


def catalogue():
    cards = export.catalog()
    for slug, card in cards.items():
        require(re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) and card.get('slug') == slug,
                f'{slug}: slug inválido')
        require(isinstance(card.get('name'), str) and card['name'].strip(), f'{slug}: falta nombre')
        require(card.get('rarity') in GROUPS, f'{slug}: rareza {card.get("rarity")}')
    counts = Counter(card['rarity'] for card in cards.values())
    require(counts == {r: n for r, (n, _) in GROUPS.items()}, f'grupos del catálogo: {counts}')
    return cards


def local_css(text):
    require(not re.search(r'@import\b', text, re.I), 'hoja de estilo importada')
    for target in re.findall(r'url\s*\(([^)]*)\)', text, re.I):
        require(target.strip().strip('\"\'').startswith('#'), f'recurso no interno: {target}')


def ink(path):
    data = path.read_bytes()
    root = ET.fromstring(data)  # también rechaza una segunda raíz o XML truncado
    require(root.tag == SVG+'svg' and root.get('viewBox', '').split() == ['0', '0', '400', '420'],
            'raíz SVG o viewBox incorrecto')
    title = (root.findtext(SVG+'title') or '').strip()
    require(title, 'sin título SVG')
    require(not re.search(br'<!DOCTYPE|<\?xml-stylesheet', data, re.I), 'dependencia XML no permitida')
    for node in root.iter():
        require(node.tag not in (SVG+'script', SVG+'foreignObject'), 'contenido SVG activo')
        for key, value in node.attrib.items():
            if key.split('}')[-1] in ('href', 'src', 'base'):
                require(value.startswith('#'), f'recurso SVG no interno: {value}')
            local_css(value)
        if node.tag == SVG+'style':
            local_css(''.join(node.itertext()))

    with pymupdf.open(stream=data, filetype='svg') as doc:
        page = doc[0]
        matrix = pymupdf.Matrix(100 / page.rect.width, 105 / page.rect.height)
        pix = page.get_pixmap(matrix=matrix, colorspace=pymupdf.csRGB, alpha=False)
        require((pix.width, pix.height) == (100, 105), 'raster de origen distinto de 100×105')
        rgb = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    r, g, b = rgb.split()
    require(not ImageChops.difference(r, g).getbbox() and not ImageChops.difference(g, b).getbbox(),
            'cromatismo en el raster RGB de la tinta')
    bbox = ImageOps.invert(r).getbbox()
    require(bbox and r.getextrema()[0] != r.getextrema()[1], 'sin dibujo visible')
    left, top, right, bottom = bbox
    if left == 0 or top == 0 or right == rgb.width or bottom == rgb.height:
        print(f'AVISO {path.stem}: tinta toca borde; bbox={bbox}, raster={rgb.size}', file=sys.stderr)
    return (root.findtext(SVG+'desc') or title).strip()


def stamp_map(face, rarity):
    """Exceso del canal de tinta frente a ambos competidores; el papel cálido queda fuera."""
    r, g, b = face.crop(STAMP).convert('RGB').split()
    if rarity == 'COMMON':  # verde
        return ImageChops.subtract(g, ImageChops.lighter(r, b))
    if rarity == 'RARE':  # azul/cian: tanto azul como verde superan al rojo
        return ImageChops.subtract(ImageChops.darker(b, g), r)
    return ImageChops.subtract(ImageChops.darker(r, b), g)  # morado


def check_stamp(face, rarity, refs):
    # Comparar forma, posición y color. El sello ausente es otro candidato:
    # no basta con que un píxel aislado tenga el tono esperado.
    scores = {}
    blank = 0
    for r, ref in refs.items():
        observed = stamp_map(face, r)
        mass = ImageStat.Stat(observed).sum[0]
        blank += mass
        scores[r] = ImageStat.Stat(ImageChops.difference(observed, ref)).sum[0] - mass
    distances = {r: int(blank + delta) for r, delta in scores.items()}
    distances['sin sello'] = int(blank)
    require(all(distances[rarity] < d for r, d in distances.items() if r != rarity),
            f'sello esperado {rarity}, distancias a referencias en {STAMP}: {distances}')


def unique(seen, data, slug, label):
    digest = hashlib.sha256(data).digest()
    require(digest not in seen, f'{label} duplicado de {seen.get(digest)}')
    seen[digest] = slug


def check_face(path, rarity, refs, faces, centers):
    with Image.open(path) as im:
        require(im.format == 'WEBP' and im.size == FACE and im.n_frames == 1,
                f'WEBP estático esperado de {FACE}, recibido {im.format} {im.size}')
        im.load()
        if 'A' in im.getbands():
            require(im.getchannel('A').getextrema() == (255, 255), 'anverso no opaco')
        face = im.convert('RGB')
    unique(faces, face.tobytes(), path.stem, 'anverso')
    # Huella de ocupación local (Otsu por imagen), no del papel ni de la tipografía.
    center = face.crop(CENTER).convert('L')
    require(center.getextrema()[0] < center.getextrema()[1], 'centro uniforme')
    mask = center.point(otsu_lut(center))
    signature = mask.convert('L').resize((16, 16), Image.Resampling.BOX).convert('1', dither=Image.Dither.NONE)
    if centers is not None:  # las cartas con tinta por defecto comparten motivo a propósito
        unique(centers, signature.tobytes(), path.stem, 'motivo central')
    check_stamp(face, rarity, refs)


def otsu_lut(image):
    hist = image.histogram()
    total, moment = sum(hist), sum(i * n for i, n in enumerate(hist))
    weight = partial = 0
    best, split = -1, 0
    for i, n in enumerate(hist):
        weight += n
        partial += i * n
        if 0 < weight < total:
            score = (partial * total - moment * weight)**2 / (weight * (total - weight))
            if score > best:
                best, split = score, i
    return [255 if i > split else 0 for i in range(256)]


class Gallery(HTMLParser):
    """Árbol de la galería estática; HTMLParser resuelve entidades en texto y atributos."""

    void = set('area base br col embed hr img input link meta param source track wbr'.split())

    def __init__(self):
        super().__init__()
        self.root = ET.Element('document')
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = ET.SubElement(self.stack[-1], tag, dict(attrs))
        if tag not in self.void:
            self.stack.append(node)

    def handle_endtag(self, tag):
        require(self.stack[-1].tag == tag, f'cierre HTML inesperado: {tag}')
        self.stack.pop()

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.void:
            self.handle_endtag(tag)

    def handle_data(self, data):
        node = self.stack[-1]
        if len(node):
            node[-1].tail = (node[-1].tail or '') + data
        else:
            node.text = (node.text or '') + data


def check_gallery(cards, titles):
    parser = Gallery()
    parser.feed((export.OUT / 'index.html').read_text(encoding='utf-8'))
    parser.close()
    require(len(parser.stack) == 1, 'galería truncada')
    root = parser.root
    paths = [f'cartas/{s}.webp' for s in cards]
    sections = [key for _, key in GROUPS.values()]
    links = [*paths, *SHEETS, '#inicio', *('#'+key for key in sections)]
    inventory((n.get('href') for n in root.iter('a')), links)
    inventory((n.get('src') for f in root.iter('figure') for n in f.iter('img')), paths)
    inventory((n.get('src') for n in root.iter('script')), ['visor.js'])
    require((export.OUT / 'visor.js').is_file(), 'falta el visor local')
    inventory((n.get('id') for n in root.iter('figure')), cards.keys())
    for n in root.iter():
        require(n.tag not in ('base', 'iframe', 'object', 'embed'), f'elemento no autónomo: {n.tag}')
        for key, value in n.attrib.items():
            if key in ('src', 'href', 'srcset', 'poster', 'data'):
                require((n.tag, key) in {('a', 'href'), ('img', 'src'), ('script', 'src')}, f'recurso inesperado: {value}')
        local_css(n.get('style', ''))
        if n.tag == 'style':
            local_css(''.join(n.itertext()))
    ids = [n.get('id') for n in root.iter() if 'id' in n.attrib]
    for link in links:
        if link.startswith('#'):
            require(ids.count(link[1:]) == 1, f'destino ambiguo o ausente: {link}')
    stale_titles = []
    for rarity, (_, key) in GROUPS.items():
        group = [f for sec in root.iter('section') if sec.get('aria-labelledby') == key for f in sec.iter('figure')]
        inventory((f.get('id') for f in group), (s for s, c in cards.items() if c['rarity'] == rarity))
        for f in group:
            slug = f.get('id')
            path = f'cartas/{slug}.webp'
            anchor = f.find('.//a')
            img = anchor.find('.//img') if anchor is not None else None
            require(img is not None and anchor.get('href') == img.get('src') == path, f'{slug}: enlace/imagen')
            name = f.find('.//figcaption/b')
            require(name is not None and ''.join(name.itertext()) == cards[slug]['name'], f'{slug}: nombre de galería')
            if slug in titles and img.get('alt') != titles[slug]:
                stale_titles.append(slug)
    require(not stale_titles, f'alt distinto de la descripción de tinta: {", ".join(stale_titles)}')


def check_sheet(path):
    with Image.open(path) as im:
        require(im.format == 'JPEG', f'es {im.format}, no JPEG')
        im.load()


def verify():
    errors = []

    def check(label, fn, *args):
        try:
            return fn(*args)
        except Exception as exc:  # límite de artefacto: seguir si otro fichero está en edición
            errors.append(f'{label}: {exc}')
            return None

    cards = check('catálogo', catalogue)
    if cards is None:
        raise ValueError('\n'.join(errors))
    inks = {p.stem for p in (export.OUT / 'tintas').glob('*.svg')}
    check('tintas', require, export.DEFAULT_ART in inks, f'falta la tinta por defecto {export.DEFAULT_ART}.svg')
    check('tintas', require, inks - {export.DEFAULT_ART} <= cards.keys(),
          f'tintas sin carta: {sorted(inks - {export.DEFAULT_ART} - cards.keys())}')
    default_title = check('tinta por defecto (SVG)', ink, export.OUT / 'tintas' / (export.DEFAULT_ART+'.svg'))
    check('cartas', inventory, (p.name for p in (export.OUT / 'cartas').glob('*.webp')),
          (f'{s}.webp' for s in cards))
    refs = {r: check(f'referencia {r}', lambda rarity: stamp_map(export.reference(export.REF[rarity]), rarity), r)
            for r in GROUPS}
    require(all(refs.values()), '\n'.join(errors))
    titles, faces, centers = {}, {}, {}
    for slug, card in cards.items():
        own = slug in inks
        title = check(f'{slug} (SVG)', ink, export.OUT / 'tintas' / (slug+'.svg')) if own else default_title
        if title:
            titles[slug] = title
        check(f'{slug} (WEBP)', check_face, export.OUT / 'cartas' / (slug+'.webp'), card['rarity'], refs, faces,
              centers if own else None)
    check('galería', check_gallery, cards, titles)
    check('láminas', inventory, (p.name for p in export.OUT.glob('lamina*.jpg')), SHEETS)
    for name in sorted(SHEETS):
        check(name, check_sheet, export.OUT / name)
    if errors:
        raise ValueError('\n'.join(errors))
    pending = len(cards.keys() - inks)
    print(f'OK: {len(cards)} anversos (11/16/6), {len(cards)-pending} tintas propias, {pending} con tinta por defecto, '
          f'galería y {len(SHEETS)} láminas.')


if __name__ == '__main__':
    try:
        verify()
    except ValueError as error:
        sys.exit(f'Atlas no válido:\n{error}')