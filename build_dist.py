import os
import shutil


ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")

FILES = [
    "index.html",
    "app.js",
    "data.js",
    "style.css",
]


def copy_file(name):
    shutil.copy2(os.path.join(ROOT, name), os.path.join(DIST, name))


def build_dist():
    os.makedirs(DIST, exist_ok=True)

    for name in FILES:
        copy_file(name)

    src_images = os.path.join(ROOT, "images")
    dst_images = os.path.join(DIST, "images")
    if os.path.exists(dst_images):
        shutil.rmtree(dst_images)
    if os.path.isdir(src_images):
        shutil.copytree(src_images, dst_images)


if __name__ == "__main__":
    build_dist()
