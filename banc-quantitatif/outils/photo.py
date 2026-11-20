# Transforme les pages d'un devis en « photos de téléphone » : de travers, floues, ombrées, compressées.
import sys, glob, os, hashlib, random
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
out, cid = sys.argv[1], sys.argv[2]
rnd = random.Random(int(hashlib.sha1(cid.encode()).hexdigest(), 16) % 10**8)
for i, p in enumerate(sorted(glob.glob(os.path.join(out, "page*.png"))), 1):
    im = Image.open(p).convert("RGB")
    w, h = im.size
    fond = Image.new("RGB", (int(w * 1.12), int(h * 1.10)), (92, 74, 58))
    fond.paste(im, (int(w * 0.06), int(h * 0.05)))
    im = fond.rotate(rnd.uniform(1.2, 3.2) * rnd.choice([-1, 1]), resample=Image.BICUBIC, fillcolor=(92, 74, 58))
    W, H = im.size
    k = rnd.uniform(0.03, 0.06)
    im = im.transform((W, H), Image.QUAD, (0, 0, int(W * k), H, int(W * (1 - k)), H, W, 0), resample=Image.BICUBIC)
    ombre = Image.new("L", (W, H), 0); d = ImageDraw.Draw(ombre)
    for x in range(W):
        d.line([(x, 0), (x, H)], fill=int(70 * (x / W) ** 2))
    im = Image.composite(Image.new("RGB", (W, H), (30, 28, 26)), im, ombre.point(lambda v: v))
    im = ImageEnhance.Contrast(im).enhance(0.88)
    im = ImageEnhance.Color(im).enhance(0.85)
    im = im.filter(ImageFilter.GaussianBlur(0.7))
    bruit = Image.effect_noise((W, H), 14).convert("RGB")
    im = Image.blend(im, bruit, 0.06)
    im.save(os.path.join(out, f"photo-{i}.jpg"), quality=58)
    os.remove(p)
