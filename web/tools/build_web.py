#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the offline Web data dictionary and single-file SaveTool.html.

Reads only text/numeric tables from the local reverse-engineering output
(item names, weapon/character/module stats, default modules). It does not
read sprites, icons, audio, or any other art asset, so the final HTML stays
self-contained and small.
"""

import argparse
import datetime
import json
from pathlib import Path

LANGS = ["en", "ru", "zh", "ko"]


def unwrap(value):
    """The il2cpp_dump files wrap arrays as {type, element, length, items}."""
    if isinstance(value, dict) and "items" in value:
        return value["items"]
    return value


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_data(assets_dir):
    wpn = load_json(assets_dir / "il2cpp_dump" / "WpnData.json")
    char = load_json(assets_dir / "il2cpp_dump" / "CharData.json")
    mod_root = load_json(assets_dir / "il2cpp_dump_recursive" / "ModulData.json")
    resolved_mod_path = assets_dir / "il2cpp_dump_recursive" / "ModulData_resolved.json"
    mod_active_root = load_json(resolved_mod_path) if resolved_mod_path.exists() else mod_root
    item_names = load_json(assets_dir / "item_names.json")

    weapon_prefix = unwrap(wpn["wpn_prefix"])
    weapon_count = len(weapon_prefix)

    def wpn_arr(key):
        return unwrap(wpn[key])

    default_mods = [
        [wpn_arr("ag_inv_wpn_modul_id_{}".format(n))[i] for n in range(1, 14)]
        for i in range(weapon_count)
    ]

    char_prefix = unwrap(char["char_prefix"])
    char_count = len(char_prefix)

    def char_arr(key):
        return unwrap(char[key])

    mods = mod_root["mod"]
    mod_active_list = mod_active_root["mod"]
    module_count = len(mods)

    web_data = {
        "version": 1,
        "generated": datetime.date.today().isoformat(),
        "weapon": {
            "prefix": weapon_prefix,
            "type": wpn_arr("wpn_type"),
            "damage": wpn_arr("wpn_damage"),
            "cost": wpn_arr("wpn_cost"),
            "defaultMods": default_mods,
        },
        "character": {
            "prefix": char_prefix,
            "class": char_arr("char_class"),
            "hp": char_arr("char_hp"),
            "cost": char_arr("char_cost"),
        },
        "module": {
            "prefix": [m.get("prefix") or "" for m in mods],
            "active": [bool(m.get("active")) for m in mod_active_list],
        },
        "names": {
            "weapon": _empty_names(weapon_count),
            "character": _empty_names(char_count),
            "module": _empty_names(module_count),
        },
    }

    for entry in item_names:
        item_type = entry.get("item_type")
        if item_type not in web_data["names"]:
            continue
        item_id = entry.get("item_id")
        lang = entry.get("lang")
        display = entry.get("display") or ""
        if item_id is None or lang not in LANGS:
            continue
        if 0 <= item_id < len(web_data["names"][item_type][lang]):
            web_data["names"][item_type][lang][item_id] = display

    return web_data


def _empty_names(size):
    return {lang: [""] * size for lang in LANGS}


def build(assets_dir, write_data_file=True):
    web_dir = Path(__file__).resolve().parent.parent
    src_dir = web_dir / "src"
    out_html = web_dir / "SaveTool.html"
    out_data = web_dir / "web_data.json"

    web_data = build_data(assets_dir)
    data_json = json.dumps(web_data, ensure_ascii=False, separators=(",", ":"))
    safe_json = data_json.replace("</", "<\\/")

    template = (src_dir / "template.html").read_text(encoding="utf-8")
    css = (src_dir / "styles.css").read_text(encoding="utf-8")
    app_js = (src_dir / "app.js").read_text(encoding="utf-8")

    html = (
        template.replace("__WEB_DATA_JSON__", safe_json)
        .replace("__CSS__", css)
        .replace("__APP_JS__", app_js)
    )

    for marker in ("__WEB_DATA_JSON__", "__CSS__", "__APP_JS__"):
        if marker in html:
            raise RuntimeError("Unreplaced marker in output: " + marker)

    out_html.write_text(html, encoding="utf-8")
    if write_data_file:
        out_data.write_text(data_json, encoding="utf-8")

    wpn = web_data["weapon"]
    ch = web_data["character"]
    mod = web_data["module"]
    print("assets:        {}".format(assets_dir))
    print("weapons:       {} entries".format(len(wpn["prefix"])))
    print("characters:    {} entries".format(len(ch["prefix"])))
    print("modules:       {} entries".format(len(mod["prefix"])))
    print("names:         {} entries".format(
        sum(len(web_data["names"][kind]["en"]) for kind in ("weapon", "character", "module"))
    ))
    print("web_data.json: {} bytes".format(len(data_json.encode("utf-8"))))
    print("SaveTool.html: {} bytes".format(out_html.stat().st_size))
    print("output:        {}".format(out_html))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", type=Path, default=None, help="D:\\POW\\assets directory")
    parser.add_argument("--no-data-file", action="store_true", help="Do not write web_data.json")
    args = parser.parse_args()

    default_assets = Path(__file__).resolve().parents[3] / "assets"
    assets_dir = args.assets or default_assets
    if not (assets_dir / "item_names.json").exists():
        raise SystemExit("Asset data not found at " + str(assets_dir))

    build(assets_dir, write_data_file=not args.no_data_file)


if __name__ == "__main__":
    main()
