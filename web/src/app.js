"use strict";

const SAVE_MAGIC = "POWSAVE1";
const MIGRATION_MAGIC = "POWMIGR1";
const MASTER = hexToBytes("71A42C19D3588EB14FC625906D33FA07C25BE841169D74AB38F063CE8512D74A");
const MAX_HISTORY = 40;
const PAGE_SIZE = 100;
const INVENTORY_LEN = 1000;
const LANGS = ["en", "ru", "zh", "ko"];

const TYPE_LABELS = {
  ar: "突击步枪",
  smg: "冲锋枪",
  sg: "霰弹枪",
  mg: "机枪",
  dmr: "精确射手步枪",
  sr: "狙击枪",
  pistol: "手枪",
  launcher: "火箭筒",
  melee: "近战",
  special: "特殊",
  null: "空"
};

const DATA = typeof WEB_DATA !== "undefined" ? WEB_DATA : null;

const FILTERS = {
  characters: [
    ["nonempty", "非空"],
    ["all", "全部"],
    ["locked", "已锁定"],
    ["unlocked", "未锁定"]
  ],
  weapons: [
    ["nonempty", "非空"],
    ["all", "全部"],
    ["locked", "已锁定"],
    ["unlocked", "未锁定"]
  ],
  modules: [
    ["selectable", "可选"],
    ["hidden", "隐藏"],
    ["all", "全部"]
  ]
};

const DEFAULT_FILTER = { characters: "nonempty", weapons: "nonempty", modules: "selectable" };

const TEXT_KEYS = new Set([
  "ag_inv_char_name",
  "ag_inv_char_class",
  "ag_inv_char_head",
  "ag_inv_char_hair",
  "ag_inv_char_body",
  "ag_inv_char_haracter",
  "ag_inv_char_unical_anim_trigger"
]);

const BOOL_KEYS = new Set([
  "ag_inv_char_lock",
  "ag_inv_wpn_lock"
]);

const CHAR_COPY_KEYS = [
  "ag_inv_char_id", "ag_inv_char_hp", "ag_inv_char_eva", "ag_inv_char_action",
  "ag_inv_char_max_hp", "ag_inv_char_first_weapon", "ag_inv_char_slot_card_class",
  "ag_inv_char_class", "ag_inv_char_haracter", "ag_inv_hair_color",
  "ag_inv_char_head", "ag_inv_char_hair", "ag_inv_char_body",
  "ag_inv_char_unical_anim_trigger", "ag_inv_char_slot_head", "ag_inv_char_slot_cloth",
  "ag_inv_char_slot_armor", "ag_inv_char_slot_special", "ag_inv_char_weight",
  "ag_inv_char_usability", "ag_inv_char_name", "ag_inv_defend_time",
  "ag_inv_defend_reload_time", "ag_inv_char_like_wpn", "ag_inv_char_num_formation",
  "ag_inv_char_lock", "ag_inv_char_slot_action", "ag_inv_char_exp",
  "ag_inv_char_kills", "ag_inv_char_love", "ag_inv_char_lvl", "ag_inv_char_need_exp"
];

const WEAPON_COPY_KEYS = [
  "ag_inv_wpn_id", "ag_inv_wpn_to_char", "ag_inv_wpn_lock",
  "ag_inv_wpn_slot_card_atack_1", "ag_inv_wpn_slot_card_atack_2",
  "ag_inv_wpn_mod_1", "ag_inv_wpn_mod_2", "ag_inv_wpn_mod_3", "ag_inv_wpn_mod_4",
  "ag_inv_wpn_mod_5", "ag_inv_wpn_mod_6", "ag_inv_wpn_mod_7", "ag_inv_wpn_mod_8",
  "ag_inv_wpn_mod_9", "ag_inv_wpn_mod_10", "ag_inv_wpn_mod_11", "ag_inv_wpn_mod_12",
  "ag_inv_wpn_mod_13", "ag_inv_wpn_lvl", "ag_inv_wpn_need_exp", "ag_inv_wpn_exp"
];

const CHAR_FIELDS = [
  { key: "ag_inv_char_id", label: "ID", type: "int" },
  { key: "ag_inv_char_name", label: "名称", type: "text" },
  { key: "ag_inv_char_class", label: "兵种", type: "text" },
  { key: "ag_inv_char_lvl", label: "等级", type: "int" },
  { key: "ag_inv_char_exp", label: "经验", type: "int" },
  { key: "ag_inv_char_need_exp", label: "升级所需经验", type: "int" },
  { key: "ag_inv_char_hp", label: "当前 HP", type: "int" },
  { key: "ag_inv_char_max_hp", label: "最大 HP", type: "int" },
  { key: "ag_inv_char_eva", label: "闪避", type: "int" },
  { key: "ag_inv_char_action", label: "行动点", type: "int" },
  { key: "ag_inv_char_first_weapon", label: "主武器槽", type: "int" },
  { key: "ag_inv_char_slot_card_class", label: "兵种卡槽", type: "int" },
  { key: "ag_inv_char_num_formation", label: "编队", type: "int" },
  { key: "ag_inv_char_lock", label: "锁定", type: "bool" },
  { key: "ag_inv_char_slot_head", label: "头饰槽", type: "int" },
  { key: "ag_inv_char_slot_cloth", label: "服装槽", type: "int" },
  { key: "ag_inv_char_slot_armor", label: "护甲槽", type: "int" },
  { key: "ag_inv_char_slot_special", label: "特殊槽", type: "int" },
  { key: "ag_inv_char_slot_action", label: "动作槽", type: "int" },
  { key: "ag_inv_char_weight", label: "负重", type: "int" },
  { key: "ag_inv_char_usability", label: "状态", type: "int" },
  { key: "ag_inv_char_kills", label: "击杀", type: "int" },
  { key: "ag_inv_char_love", label: "好感", type: "int" },
  { key: "ag_inv_defend_time", label: "防守时间", type: "int" },
  { key: "ag_inv_defend_reload_time", label: "防守装填时间", type: "int" },
  { key: "ag_inv_char_like_wpn", label: "喜好武器", type: "int" },
  { key: "ag_inv_hair_color", label: "头发颜色", type: "vec4" },
  { key: "ag_inv_char_head", label: "头部模型", type: "text" },
  { key: "ag_inv_char_hair", label: "头发模型", type: "text" },
  { key: "ag_inv_char_body", label: "身体模型", type: "text" },
  { key: "ag_inv_char_haracter", label: "角色模型", type: "text" },
  { key: "ag_inv_char_unical_anim_trigger", label: "动画触发器", type: "text" }
];

const WEAPON_FIELDS = [
  { key: "ag_inv_wpn_id", label: "ID", type: "int" },
  { key: "ag_inv_wpn_to_char", label: "装备角色槽", type: "int" },
  { key: "ag_inv_wpn_lock", label: "锁定", type: "bool" },
  { key: "ag_inv_wpn_slot_card_atack_1", label: "攻击卡 1", type: "int" },
  { key: "ag_inv_wpn_slot_card_atack_2", label: "攻击卡 2", type: "int" },
  { key: "ag_inv_wpn_lvl", label: "等级", type: "int" },
  { key: "ag_inv_wpn_exp", label: "经验", type: "int" },
  { key: "ag_inv_wpn_need_exp", label: "升级所需经验", type: "int" }
];

const KIND_FIELDS = {
  characters: CHAR_FIELDS,
  weapons: WEAPON_FIELDS,
  modules: [{ key: "count", label: "数量", type: "int" }]
};

const OVERVIEW_FIELDS = [
  { key: "ag_username", label: "玩家名", type: "text" },
  { key: "ag_language", label: "语言 ID", type: "int" },
  { key: "ag_user_lvl", label: "用户等级", type: "int" },
  { key: "ag_fullscreen", label: "全屏", type: "bool" },
  { key: "ag_vsync", label: "垂直同步", type: "bool" },
  { key: "ag_vol_music", label: "音乐音量", type: "float" },
  { key: "ag_vol_sfx", label: "音效音量", type: "float" },
  { key: "ag_vol_ui", label: "UI 音量", type: "float" },
  { key: "ag_new_game", label: "新游戏", type: "bool" },
  { key: "ag_version_past", label: "存档版本", type: "int" },
  { key: "ag_dubl_save_date", label: "存档日期", type: "int" },
  { key: "ag_all_skip_conf_actions", label: "跳过确认", type: "bool" },
  { key: "ag_hide_weapon_noclass", label: "隐藏无兵种武器", type: "bool" },
  { key: "ag_show_ai", label: "显示 AI", type: "bool" },
  { key: "ag_point_pawn_everyturn", label: "每回合行动点", type: "bool" },
  { key: "ag_battle_autobattle", label: "自动战斗", type: "bool" },
  { key: "ag_battle_skip_scene", label: "跳过战斗场景", type: "bool" },
  { key: "ag_battle_speed", label: "战斗速度", type: "int" },
  { key: "ag_battle_nvg", label: "夜视", type: "bool" },
  { key: "ag_battle_time", label: "战斗时间", type: "int" }
];

const BATCH_ACTIONS = {
  characters: [
    ["id", "设置 ID"],
    ["lvl", "设置等级"],
    ["lock", "批量锁定"],
    ["unlock", "批量解锁"],
    ["clear", "清空筛选结果"]
  ],
  weapons: [
    ["id", "设置 ID"],
    ["lvl", "设置等级"],
    ["lock", "批量锁定"],
    ["unlock", "批量解锁"],
    ["clear", "清空筛选结果"]
  ],
  modules: [
    ["count", "设置数量"],
    ["clear", "清空筛选结果"]
  ]
};

const MISSION_KEYS = [
  ["ag_player_compl_missions", "任务", "mission"],
  ["ag_player_achive", "成就", "achievement"],
  ["ag_player_open_campaigns", "战役", "campaign"],
  ["ag_player_redemn_code", "兑换码", "patch"]
];

const MISC_KEYS = [
  ["ag_formation_preset_num", "编队预设", ""],
  ["ag_formation_live2d", "Live2D 编队", ""],
  ["ag_raid_reload_maps", "突袭重载地图", ""],
  ["ag_drop_count_char", "角色掉落计数", ""],
  ["ag_drop_count_wpn", "武器掉落计数", ""],
  ["ag_drop_count_modul", "模块掉落计数", ""]
];

const RESOURCE_SCALAR_FIELDS = [
  { key: "ag_player_daily_activity", label: "每日活跃日期", type: "int" },
  { key: "ag_player_daily_boss_day", label: "每日首领日期", type: "int" },
  { key: "ag_player_daily_boss_id", label: "每日首领 ID", type: "int" },
  { key: "ag_player_daily_shop", label: "商店日期", type: "int" },
  { key: "ag_player_orange_day", label: "橙色计数日期", type: "int" },
  { key: "ag_player_orange_count", label: "橙色计数", type: "int" },
  { key: "ag_raid_status", label: "突袭状态", type: "int" },
  { key: "ag_battle_raidid", label: "战斗突袭 ID", type: "int" },
  { key: "ag_raid_count_points", label: "突袭点数", type: "int" }
];

const COMPARE_CHAR_KEYS = [
  "ag_inv_char_id", "ag_inv_char_name", "ag_inv_char_class", "ag_inv_char_lvl",
  "ag_inv_char_exp", "ag_inv_char_hp", "ag_inv_char_max_hp", "ag_inv_char_eva",
  "ag_inv_char_first_weapon", "ag_inv_char_lock", "ag_inv_char_slot_head",
  "ag_inv_char_slot_cloth", "ag_inv_char_slot_armor", "ag_inv_char_slot_special",
  "ag_inv_char_slot_action", "ag_inv_char_num_formation", "ag_inv_char_kills",
  "ag_inv_char_love", "ag_inv_char_need_exp", "ag_inv_char_usability", "ag_inv_char_weight"
];

const COMPARE_WEAPON_KEYS = [
  "ag_inv_wpn_id", "ag_inv_wpn_to_char", "ag_inv_wpn_lock",
  "ag_inv_wpn_slot_card_atack_1", "ag_inv_wpn_slot_card_atack_2",
  "ag_inv_wpn_mod_1", "ag_inv_wpn_mod_2", "ag_inv_wpn_mod_3", "ag_inv_wpn_mod_4",
  "ag_inv_wpn_mod_5", "ag_inv_wpn_mod_6", "ag_inv_wpn_mod_7", "ag_inv_wpn_mod_8",
  "ag_inv_wpn_mod_9", "ag_inv_wpn_mod_10", "ag_inv_wpn_mod_11", "ag_inv_wpn_mod_12",
  "ag_inv_wpn_mod_13", "ag_inv_wpn_lvl", "ag_inv_wpn_need_exp", "ag_inv_wpn_exp"
];

const PRESET_KEY = "pow_loadout_presets";

let root = null;
let originalBytes = null;
let originalJson = "";
let currentFileName = "";
let currentMode = "save";
let undoStack = [];
let redoStack = [];
let selected = { kind: "characters", slot: -1 };
let activeTab = "overview";
let listKind = "characters";
let currentLang = "zh";
let searchText = "";
let filter = DEFAULT_FILTER.characters;
let page = 0;
let compareRoot = null;
let compareName = "";
let compareKind = "characters";
let fieldTab = "cards";
let missionKey = "ag_player_compl_missions";
let miscKey = "ag_formation_preset_num";

const $ = (id) => document.getElementById(id);

const fileInput = $("fileInput");
const btnOpen = $("btnOpen");
const btnBackup = $("btnBackup");
const btnRestore = $("btnRestore");
const btnUndo = $("btnUndo");
const btnRedo = $("btnRedo");
const btnPack = $("btnPack");
const statusEl = $("status");
const statsEl = $("stats");
const searchInput = $("searchInput");
const langSelect = $("langSelect");
const filterSelect = $("filterSelect");
const batchAction = $("batchAction");
const batchInput = $("batchInput");
const btnResetMods = $("btnResetMods");
const btnBatchSet = $("btnBatchSet");

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function bytesToAscii(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function concatBytes() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) total += arguments[i].length;
  const out = new Uint8Array(total);
  let off = 0;
  for (let i = 0; i < arguments.length; i++) {
    out.set(arguments[i], off);
    off += arguments[i].length;
  }
  return out;
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = kind === "ok" ? "ok" : (kind === "err" ? "err" : "");
}

async function importHmacKey(bytes) {
  return crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function hmacBytes(key, data) {
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
}

async function deriveKey(purpose) {
  const key = await importHmacKey(MASTER);
  return hmacBytes(key, new TextEncoder().encode(purpose));
}

async function aesDecrypt(ct, iv, keyBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["decrypt"]);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ct));
}

async function aesEncrypt(pt, iv, keyBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["encrypt"]);
  return new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, pt));
}

function downloadBytes(bytes, name) {
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

async function decryptBytes(bytes) {
  const magic = bytesToAscii(bytes.slice(0, 8));
  const isMigration = magic === MIGRATION_MAGIC;
  if (magic !== SAVE_MAGIC && !isMigration) throw new Error("无法识别的魔数：" + magic);
  if (bytes.length < 62) throw new Error("文件太小，不是有效的加密存档。");

  const aesPurpose = isMigration ? "POW_MIGRATION_AES_KEY" : "POW_SAVE_AES_KEY";
  const hmacPurpose = isMigration ? "POW_MIGRATION_HMAC_KEY" : "POW_SAVE_HMAC_KEY";
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const payloadLen = dv.getUint32(10, true);
  if (payloadLen !== bytes.length - 62) throw new Error("头部长度与文件大小不匹配。");

  const iv = bytes.slice(14, 30);
  const ct = bytes.slice(30, 30 + payloadLen);
  const storedHmac = bytes.slice(bytes.length - 32);
  const aesKey = await deriveKey(aesPurpose);
  const hmacKey = await deriveKey(hmacPurpose);
  const computedHmac = await hmacBytes(await importHmacKey(hmacKey), bytes.slice(0, bytes.length - 32));
  if (!equalBytes(computedHmac, storedHmac)) throw new Error("HMAC 校验失败，文件可能损坏或被修改。");

  const plain = await aesDecrypt(ct, iv, aesKey);
  return new TextDecoder().decode(plain);
}

async function openFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let json;
  const magic = bytesToAscii(bytes.slice(0, 8));
  if (magic === SAVE_MAGIC || magic === MIGRATION_MAGIC) {
    json = await decryptBytes(bytes);
    currentMode = magic === MIGRATION_MAGIC ? "migration" : "save";
    originalBytes = bytes;
  } else {
    json = new TextDecoder().decode(bytes);
    JSON.parse(json);
    currentMode = "save";
    originalBytes = null;
  }

  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("存档 JSON 必须是对象。");
  }
  root = parsed;
  originalJson = canonicalJson();
  currentFileName = file.name;
  undoStack = [];
  redoStack = [];
  page = 0;
  selected = { kind: "characters", slot: -1 };

  const v = validateSave(root);
  renderAll();
  setStatus(
    "已打开 " + file.name + "（" + file.size + " 字节）。" +
    (v.errors.length || v.warnings.length
      ? " 校验：" + v.errors.length + " 个错误，" + v.warnings.length + " 个警告。"
      : " 校验通过。"),
    v.errors.length ? "err" : "ok"
  );
}

async function packSave() {
  if (!root) return;
  const v = validateSave(root);
  if (v.errors.length) {
    const ok = window.confirm(
      "存在 " + v.errors.length + " 个校验错误，仍要回包？\n\n" + v.errors.slice(0, 5).join("\n")
    );
    if (!ok) {
      setStatus("已取消回包。", "err");
      return;
    }
  }

  const json = canonicalJson();
  JSON.parse(json);
  const outMode = $("outMode").value;
  const migration = outMode === "migration" || (outMode === "auto" && currentMode === "migration");
  const magic = migration ? MIGRATION_MAGIC : SAVE_MAGIC;
  const aesPurpose = migration ? "POW_MIGRATION_AES_KEY" : "POW_SAVE_AES_KEY";
  const hmacPurpose = migration ? "POW_MIGRATION_HMAC_KEY" : "POW_SAVE_HMAC_KEY";

  const plain = new TextEncoder().encode(json);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await deriveKey(aesPurpose);
  const hmacKey = await deriveKey(hmacPurpose);
  const ct = await aesEncrypt(plain, iv, aesKey);

  const header = new Uint8Array(14);
  for (let i = 0; i < 8; i++) header[i] = magic.charCodeAt(i);
  header[8] = 1;
  header[9] = 0x10;
  new DataView(header.buffer).setUint32(10, ct.length, true);

  const body = concatBytes(header, iv, ct);
  const sig = await hmacBytes(await importHmacKey(hmacKey), body);
  const out = concatBytes(body, sig);
  const name = migration ? "render_cache.dat" : "save_file";
  downloadBytes(out, name);
  setStatus(
    "回包成功：" + name + "（" + out.length + " 字节）。" +
    (v.warnings.length ? " 警告：" + v.warnings.length + " 项。" : ""),
    "ok"
  );
}

function downloadBackup() {
  if (!originalBytes && !root) return;
  const base = (currentFileName || "save_file").replace(/\.(bak|dat|json)$/i, "");
  let bytes;
  let name;
  if (originalBytes) {
    bytes = originalBytes;
    name = base + ".bak";
  } else {
    bytes = new TextEncoder().encode(originalJson);
    name = base + ".bak.json";
  }
  downloadBytes(bytes, name);
  setStatus("已下载备份：" + name, "ok");
}

function restoreOriginal() {
  if (!root || !originalJson) return;
  if (!window.confirm("恢复为打开时的原始 JSON？当前未保存的修改会进入撤销栈。")) return;
  pushHistory("恢复原始");
  root = JSON.parse(originalJson);
  renderAll();
  setStatus("已恢复原始内容。", "ok");
}

function canonicalJson() {
  return JSON.stringify(root);
}

function pushHistory(label) {
  if (!root) return;
  undoStack.push({ label: label || "编辑", json: canonicalJson() });
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  updateHistoryButtons();
}

function applyJson(json) {
  root = JSON.parse(json);
  selected = { kind: listKind, slot: -1 };
  page = 0;
  renderAll();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push({ label: "撤销", json: canonicalJson() });
  const s = undoStack.pop();
  applyJson(s.json);
  setStatus("已撤销：" + s.label, "ok");
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push({ label: "重做", json: canonicalJson() });
  const s = redoStack.pop();
  applyJson(s.json);
  setStatus("已重做：" + s.label, "ok");
}

function getArr(key) {
  return root && Array.isArray(root[key]) ? root[key] : null;
}

function getVal(key, i) {
  const arr = getArr(key);
  return arr && i >= 0 && i < arr.length ? arr[i] : undefined;
}

function defaultValueFor(key) {
  if (TEXT_KEYS.has(key)) return "";
  if (BOOL_KEYS.has(key)) return false;
  if (key === "ag_inv_hair_color") return { x: 0, y: 0, z: 0, w: 1 };
  return 0;
}

function defaultForArr(key, arr) {
  if (Array.isArray(arr) && arr.length) {
    const first = arr[0];
    if (typeof first === "string") return "";
    if (typeof first === "boolean") return false;
    if (first && typeof first === "object") return { x: 0, y: 0, z: 0, w: 1 };
  }
  return defaultValueFor(key);
}

function setArrVal(key, i, v, len) {
  const isNew = !Array.isArray(root[key]);
  let arr = root[key];
  if (isNew) arr = root[key] = [];
  const target = Math.max(i + 1, arr.length, isNew && len ? len : 0);
  while (arr.length < target) arr.push(defaultForArr(key, arr));
  arr[i] = v;
}

function nameOf(kind, id, lang) {
  if (!DATA) return "";
  const names = DATA.names && DATA.names[kind] && DATA.names[kind][lang];
  if (names && names[id]) return names[id];
  const prefix = DATA[kind] && DATA[kind].prefix && DATA[kind].prefix[id];
  return prefix && prefix !== "null" && prefix !== "" ? prefix : "";
}

function weaponInfo(id) {
  if (!DATA || !DATA.weapon) return null;
  return {
    prefix: DATA.weapon.prefix[id] || "",
    type: DATA.weapon.type[id] || "",
    damage: DATA.weapon.damage[id] || 0,
    cost: DATA.weapon.cost[id] || 0,
    defaultMods: DATA.weapon.defaultMods[id] || []
  };
}

function charInfo(id) {
  if (!DATA || !DATA.character) return null;
  return {
    prefix: DATA.character.prefix[id] || "",
    cls: DATA.character.class[id] || "",
    hp: DATA.character.hp[id] || 0,
    cost: DATA.character.cost[id] || 0
  };
}

function moduleInfo(id) {
  if (!DATA || !DATA.module) return null;
  return {
    prefix: DATA.module.prefix[id] || "",
    active: !!DATA.module.active[id]
  };
}

function rowId(kind, slot) {
  if (kind === "modules") return slot;
  const key = kind === "characters" ? "ag_inv_char_id" : "ag_inv_wpn_id";
  return getVal(key, slot) || 0;
}

function charNameAt(slot) {
  const id = getVal("ag_inv_char_id", slot);
  if (!id) return "-";
  return nameOf("character", id, currentLang) || "#" + id;
}

function weaponNameAt(slot) {
  const id = getVal("ag_inv_wpn_id", slot);
  if (!id) return "-";
  return nameOf("weapon", id, currentLang) || "#" + id;
}

function buildRows(kind) {
  const rows = [];
  const arrLen = (getArr("ag_inv_char_id") || []).length || INVENTORY_LEN;
  const len = kind === "modules" && DATA && DATA.module
    ? Math.min(arrLen, DATA.module.prefix.length)
    : arrLen;
  for (let i = 0; i < len; i++) {
    if (kind === "characters") {
      const id = rowId(kind, i);
      const info = charInfo(id);
      rows.push({
        slot: i,
        id,
        name: nameOf("character", id, currentLang) || (info ? info.prefix : "") || "",
        internal: info ? info.prefix : "",
        cls: getVal("ag_inv_char_class", i) || (info ? info.cls : "") || "",
        lvl: getVal("ag_inv_char_lvl", i) || 0,
        exp: getVal("ag_inv_char_exp", i) || 0,
        hp: getVal("ag_inv_char_hp", i) || 0,
        firstWeapon: getVal("ag_inv_char_first_weapon", i) || 0,
        lock: !!getVal("ag_inv_char_lock", i)
      });
    } else if (kind === "weapons") {
      const id = rowId(kind, i);
      const info = weaponInfo(id);
      rows.push({
        slot: i,
        id,
        name: nameOf("weapon", id, currentLang) || (info ? info.prefix : "") || "",
        internal: info ? info.prefix : "",
        type: info ? info.type : "",
        damage: info ? info.damage : 0,
        cost: info ? info.cost : 0,
        lvl: getVal("ag_inv_wpn_lvl", i) || 0,
        exp: getVal("ag_inv_wpn_exp", i) || 0,
        toChar: getVal("ag_inv_wpn_to_char", i) || 0,
        lock: !!getVal("ag_inv_wpn_lock", i)
      });
    } else {
      const info = moduleInfo(i);
      rows.push({
        slot: i,
        id: i,
        name: nameOf("module", i, currentLang) || (info ? info.prefix : "") || "模块 " + i,
        internal: info ? info.prefix : "",
        active: info ? info.active : false,
        count: getVal("ag_inv_modul_count", i) || 0
      });
    }
  }
  return rows;
}

function matchesFilter(row) {
  const q = searchText.trim().toLowerCase();
  if (q) {
    const hay = [
      String(row.slot), String(row.id), String(row.name || ""),
      String(row.internal || ""), String(row.cls || ""), String(row.type || ""),
      String(row.count != null ? row.count : "")
    ].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filter === "nonempty") return row.id !== 0 && row.id !== "";
  if (filter === "locked") return row.lock === true;
  if (filter === "unlocked") return row.lock === false;
  if (filter === "selectable") return row.active === true;
  if (filter === "hidden") return row.active === false;
  return true;
}

const TABLE_COLS = {
  characters: [
    { label: "槽", render: (r) => r.slot },
    { label: "ID", render: (r) => r.id },
    { label: "名称", render: (r) => esc(r.name || "空") },
    { label: "兵种", render: (r) => esc(r.cls || "-") },
    { label: "等级", render: (r) => r.lvl },
    { label: "经验", render: (r) => r.exp },
    { label: "HP", render: (r) => r.hp },
    { label: "武器", render: (r) => esc(charWeaponName(r)) },
    { label: "锁定", render: (r) => (r.lock ? "是" : "否") }
  ],
  weapons: [
    { label: "槽", render: (r) => r.slot },
    { label: "ID", render: (r) => r.id },
    { label: "名称", render: (r) => esc(r.name || "空") },
    { label: "类型", render: (r) => esc(TYPE_LABELS[r.type] || r.type || "-") },
    { label: "伤害", render: (r) => r.damage },
    { label: "价格", render: (r) => r.cost },
    { label: "等级", render: (r) => r.lvl },
    { label: "装备角色", render: (r) => esc(charNameAt(r.toChar)) },
    { label: "锁定", render: (r) => (r.lock ? "是" : "否") }
  ],
  modules: [
    { label: "ID", render: (r) => r.slot },
    { label: "名称", render: (r) => esc(r.name || "模块 " + r.slot) },
    { label: "数量", render: (r) => r.count },
    { label: "状态", render: (r) => (r.active ? "可用" : "禁用") }
  ]
};

function charWeaponName(row) {
  if (!row.firstWeapon) return "-";
  const id = getVal("ag_inv_wpn_id", row.firstWeapon);
  if (!id) return "-";
  return nameOf("weapon", id, currentLang) || "#" + id;
}

function renderListToolbar() {
  langSelect.value = currentLang;
  filterSelect.innerHTML = FILTERS[listKind].map(([v, label]) =>
    `<option value="${v}" ${v === filter ? "selected" : ""}>${label}</option>`
  ).join("");
  batchAction.innerHTML = BATCH_ACTIONS[listKind].map(([v, label]) =>
    `<option value="${v}">${label}</option>`
  ).join("");
  batchAction.hidden = false;
  $("listTitle").textContent = listKind === "characters" ? "角色" : listKind === "weapons" ? "武器" : "模块";
  btnResetMods.hidden = listKind !== "weapons";
  btnBatchSet.hidden = false;
  btnBatchSet.textContent = "执行批量操作";
  batchInput.hidden = batchAction.value === "clear";
  $("listHint").textContent = listKind === "characters" || listKind === "weapons"
    ? "选择行后可在下方编辑详情。"
    : "模块 ID 即数组下标；可选 / 隐藏 / 全部三种查看模式。";
}

function renderTable() {
  const head = $("itemHead");
  const body = $("itemBody");
  if (!root) {
    head.innerHTML = "";
    body.innerHTML = `<tr><td class="empty">请先打开存档。</td></tr>`;
    return;
  }
  const cols = TABLE_COLS[listKind];
  head.innerHTML = "<tr>" + cols.map((c) => `<th>${c.label}</th>`).join("") + "</tr>";
  const all = buildRows(listKind).filter(matchesFilter);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  if (page >= totalPages) page = totalPages - 1;
  const slice = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  body.innerHTML = slice.map((row) => {
    const sel = selected.kind === listKind && selected.slot === row.slot ? ' class="selected"' : "";
    return `<tr data-slot="${row.slot}"${sel}>` +
      cols.map((c) => `<td>${c.render(row)}</td>`).join("") +
      "</tr>";
  }).join("") || `<tr><td class="empty" colspan="${cols.length}">没有匹配的条目。</td></tr>`;
  const start = all.length ? page * PAGE_SIZE + 1 : 0;
  const end = Math.min(all.length, (page + 1) * PAGE_SIZE);
  $("pageInfo").textContent = start + "-" + end + " / " + all.length;
}

function inputHtml(f, val) {
  if (f.type === "bool") {
    return `<input type="checkbox" data-field="${f.key}" ${val ? "checked" : ""}>`;
  }
  if (f.type === "vec4") {
    const v = val && typeof val === "object" ? val : { x: 0, y: 0, z: 0, w: 1 };
    return `<span class="vec4">${["x", "y", "z", "w"].map((k) =>
      `<input type="number" step="any" data-field="${f.key}.${k}" value="${esc(v[k])}" title="${k}">`
    ).join("")}</span>`;
  }
  const step = f.type === "float" ? "any" : "1";
  const inputType = f.type === "text" ? "text" : "number";
  return `<input type="${inputType}" step="${step}" data-field="${f.key}" value="${esc(val)}">`;
}

function renderDetail() {
  const el = $("detailPanel");
  if (!root || selected.slot < 0 || !["characters", "weapons", "modules"].includes(selected.kind)) {
    el.innerHTML = `<div class="detail-empty">请先选择一个条目。</div>`;
    return;
  }
  const kind = listKind;
  const slot = selected.slot;
  const row = buildRows(kind).find((r) => r.slot === slot);
  if (!row) {
    el.innerHTML = `<div class="detail-empty">该槽位超出数组范围。</div>`;
    return;
  }

  let html = `<div class="detail-head"><h3>${esc(row.name || "空")}<span class="slot-tag">槽位 ${slot}</span></h3>`;
  if (kind === "weapons") html += `<button type="button" class="mini" data-action="reset-mods">恢复默认配件</button>`;
  html += `</div><form id="detailForm" class="form-grid">`;

  for (const f of KIND_FIELDS[kind]) {
    let val;
    if (kind === "modules") {
      val = getVal("ag_inv_modul_count", slot) || 0;
    } else {
      val = getVal(f.key, slot);
    }
    html += `<label class="field${f.type === "vec4" ? " field-wide" : ""}"><span>${f.label}</span>${inputHtml(f, val)}</label>`;
  }

  if (kind === "weapons") {
    for (let n = 1; n <= 13; n++) {
      const modId = getVal("ag_inv_wpn_mod_" + n, slot) || 0;
      const options = [`<option value="0">空</option>`];
      if (DATA && DATA.module) {
        for (let m = 1; m < DATA.module.prefix.length; m++) {
          const name = nameOf("module", m, currentLang) || DATA.module.prefix[m];
          options.push(`<option value="${m}" ${m === modId ? "selected" : ""}>${m} - ${esc(name)}</option>`);
        }
      }
      html += `<label class="field field-wide"><span>配件槽 ${n}</span><select data-mod="${n}">${options.join("")}</select></label>`;
    }
  }

  html += `</form><div class="detail-actions"><button data-action="apply-detail">应用修改</button>` +
    `<button data-action="reset-detail-form">重置表单</button></div>`;
  if (kind === "weapons") {
    html += `<div class="loadout-box"><div class="detail-actions">` +
      `<button data-action="save-loadout">保存预设</button>` +
      `<button data-action="export-loadout">导出文件</button>` +
      `<button data-action="import-loadout">导入文件</button>` +
      `</div><div id="loadoutPresets"></div></div>`;
  }
  el.innerHTML = html;
  if (kind === "weapons") renderLoadoutPresets();
}

function renderOverview() {
  const form = $("overviewForm");
  if (!root) {
    form.innerHTML = "";
    $("overviewFile").textContent = "";
    return;
  }
  form.innerHTML = OVERVIEW_FIELDS.map((f) => {
    const val = root[f.key];
    return `<label class="field"><span>${f.label}</span>${inputHtml(f, val)}</label>`;
  }).join("");
  $("overviewFile").textContent = currentFileName ? "已打开：" + currentFileName : "";
}

function updateStats() {
  if (!root) {
    $("statChars").textContent = "0";
    $("statWeapons").textContent = "0";
    $("statModules").textContent = "0";
    $("statErrors").textContent = "0";
    statsEl.textContent = "";
    return;
  }
  const chars = (getArr("ag_inv_char_id") || []).filter((v) => v).length;
  const weapons = (getArr("ag_inv_wpn_id") || []).filter((v) => v).length;
  const modules = (getArr("ag_inv_modul_count") || []).filter((v) => v > 0).length;
  const v = validateSave(root);
  $("statChars").textContent = chars;
  $("statWeapons").textContent = weapons;
  $("statModules").textContent = modules;
  $("statErrors").textContent = v.errors.length + v.warnings.length;
  statsEl.textContent = "角色 " + chars + " · 武器 " + weapons + " · 模块 " + modules;
}

function renderIssues() {
  const el = $("issues");
  if (!root) {
    el.innerHTML = "";
    return;
  }
  const v = validateSave(root);
  const items = [
    ...v.errors.map((s) => ({ s, cls: "err" })),
    ...v.warnings.map((s) => ({ s, cls: "warn" }))
  ];
  el.innerHTML = items.length
    ? `<h3>校验结果（${v.errors.length} 错误 / ${v.warnings.length} 警告）</h3><ul>` +
      items.map((i) => `<li class="${i.cls}">${esc(i.s)}</li>`).join("") + "</ul>"
    : `<div class="ok-line">校验通过，未发现结构问题。</div>`;
}

function updateHistoryButtons() {
  btnUndo.disabled = !undoStack.length;
  btnRedo.disabled = !redoStack.length;
}

function updateToolbar() {
  const has = !!root;
  btnBackup.disabled = !has;
  btnRestore.disabled = !has;
  btnPack.disabled = !has;
  updateHistoryButtons();
}

function renderAll() {
  updateStats();
  renderIssues();
  if (activeTab === "overview") {
    renderOverview();
  } else if (activeTab === "raw") {
    $("rawArea").value = root ? canonicalJson() : "";
  } else if (activeTab === "compare") {
    renderCompare();
  } else if (activeTab === "fields") {
    renderFieldTab();
  } else {
    renderListToolbar();
    renderTable();
    renderDetail();
  }
  updateToolbar();
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
  $("panel-overview").classList.toggle("active", tab === "overview");
  $("panel-list").classList.toggle("active", ["characters", "weapons", "modules"].includes(tab));
  $("panel-compare").classList.toggle("active", tab === "compare");
  $("panel-fields").classList.toggle("active", tab === "fields");
  $("panel-raw").classList.toggle("active", tab === "raw");

  if (["characters", "weapons", "modules"].includes(tab)) {
    listKind = tab;
    filter = DEFAULT_FILTER[tab];
    page = 0;
    selected = { kind: tab, slot: -1 };
    renderListToolbar();
    renderTable();
    renderDetail();
  } else if (tab === "raw") {
    $("rawArea").value = root ? canonicalJson() : "";
  } else if (tab === "compare") {
    renderCompare();
  } else if (tab === "fields") {
    renderFieldTab();
  } else {
    renderOverview();
  }
}

function validateSave(rootObj) {
  const errors = [];
  const warnings = [];
  if (!rootObj || typeof rootObj !== "object" || Array.isArray(rootObj)) {
    errors.push("存档不是 JSON 对象。");
    return { errors, warnings };
  }

  const required = ["ag_inv_char_id", "ag_inv_wpn_id", "ag_inv_modul_count"];
  for (const k of required) {
    if (!Array.isArray(rootObj[k])) errors.push("缺少数组 " + k);
  }
  if (errors.length) return { errors, warnings };

  const baseLen = rootObj.ag_inv_char_id.length;
  for (const k of required) {
    if (rootObj[k].length !== baseLen) {
      warnings.push(k + " 长度为 " + rootObj[k].length + "，与角色数组长度 " + baseLen + " 不一致。");
    }
  }
  if (baseLen !== INVENTORY_LEN) {
    warnings.push("存档数组长度为 " + baseLen + "，常见版本为 " + INVENTORY_LEN + "。");
  }

  if (DATA) {
    const wMax = DATA.weapon.prefix.length - 1;
    const cMax = DATA.character.prefix.length - 1;
    const mMax = DATA.module.prefix.length - 1;
    rootObj.ag_inv_wpn_id.forEach((v, i) => {
      if (typeof v === "number" && v > wMax) {
        errors.push("武器槽 " + i + ": ID " + v + " 超出数据表范围 0.." + wMax + "。");
      }
    });
    rootObj.ag_inv_char_id.forEach((v, i) => {
      if (typeof v === "number" && v > cMax) {
        errors.push("角色槽 " + i + ": ID " + v + " 超出数据表范围 0.." + cMax + "。");
      }
    });
    rootObj.ag_inv_modul_count.forEach((v, i) => {
      if (typeof v === "number" && v < 0) {
        errors.push("模块 " + i + ": 数量不能为负数。");
      }
    });
    for (let n = 1; n <= 13; n++) {
      const arr = rootObj["ag_inv_wpn_mod_" + n];
      if (!Array.isArray(arr)) continue;
      arr.forEach((v, i) => {
        if (typeof v === "number" && (v < 0 || v > mMax)) {
          errors.push("武器槽 " + i + " 配件槽 " + n + ": ID " + v + " 超出范围 0.." + mMax + "。");
        }
      });
    }
  }

  const charLen = rootObj.ag_inv_char_id.length;
  const wpnLen = rootObj.ag_inv_wpn_id.length;
  if (Array.isArray(rootObj.ag_inv_wpn_to_char)) {
    rootObj.ag_inv_wpn_to_char.forEach((to, i) => {
      if (to && (to < 0 || to >= charLen)) {
        errors.push("武器槽 " + i + ": 装备角色槽 " + to + " 超出范围 0.." + (charLen - 1) + "。");
      }
    });
  }
  if (Array.isArray(rootObj.ag_inv_char_first_weapon)) {
    rootObj.ag_inv_char_first_weapon.forEach((fw, i) => {
      if (fw && (fw < 0 || fw >= wpnLen)) {
        errors.push("角色槽 " + i + ": 主武器槽 " + fw + " 超出范围 0.." + (wpnLen - 1) + "。");
      }
    });
  }
  if (Array.isArray(rootObj.ag_inv_wpn_to_char) && Array.isArray(rootObj.ag_inv_char_first_weapon)) {
    rootObj.ag_inv_wpn_to_char.forEach((to, i) => {
      if (to && rootObj.ag_inv_char_first_weapon[to] !== i) {
        warnings.push("武器槽 " + i + " 装备到角色槽 " + to + "，但该角色主武器不是 " + i + "。");
      }
    });
    rootObj.ag_inv_char_first_weapon.forEach((fw, i) => {
      if (fw && rootObj.ag_inv_wpn_to_char[fw] !== i) {
        warnings.push("角色槽 " + i + " 主武器为 " + fw + "，但该武器未装备到角色 " + i + "。");
      }
    });
  }
  return { errors, warnings };
}

function findEmptySlot(kind) {
  const key = kind === "characters" ? "ag_inv_char_id" : "ag_inv_wpn_id";
  const arr = getArr(key) || [];
  for (let i = 0; i < arr.length; i++) if (!arr[i]) return i;
  return -1;
}

function copyRow() {
  if (!root || selected.slot < 0 || listKind === "modules") return;
  const src = selected.slot;
  const id = rowId(listKind, src);
  if (!id) {
    setStatus("所选槽位为空，无法复制。", "err");
    return;
  }
  const dst = findEmptySlot(listKind);
  if (dst < 0) {
    setStatus("没有空槽位可用于复制。", "err");
    return;
  }
  if (!window.confirm("将 " + (listKind === "characters" ? "角色" : "武器") + " 槽 " + src + " 复制到空槽 " + dst + "？")) return;

  pushHistory("复制槽位 " + src + " 到 " + dst);
  const keys = listKind === "characters" ? CHAR_COPY_KEYS : WEAPON_COPY_KEYS;
  for (const key of keys) {
    const arr = root[key];
    if (!Array.isArray(arr) || src >= arr.length) continue;
    setArrVal(key, dst, arr[src], Math.max(arr.length, INVENTORY_LEN));
  }
  if (listKind === "weapons") setArrVal("ag_inv_wpn_to_char", dst, 0, INVENTORY_LEN);
  if (listKind === "characters") setArrVal("ag_inv_char_first_weapon", dst, 0, INVENTORY_LEN);
  selected = { kind: listKind, slot: dst };
  renderAll();
  setStatus("已复制到槽位 " + dst + "。", "ok");
}

function clearRow() {
  if (!root || selected.slot < 0) return;
  const slot = selected.slot;
  const label = listKind === "characters" ? "角色" : listKind === "weapons" ? "武器" : "模块";
  if (!window.confirm("确定清空" + label + "槽 " + slot + "？该操作可撤销。")) return;
  pushHistory("清空" + label + "槽 " + slot);
  clearSlotValues(listKind, slot);
  renderAll();
  setStatus("已清空" + label + "槽 " + slot + "。", "ok");
}

function clearSlotValues(kind, slot) {
  if (kind === "modules") {
    setArrVal("ag_inv_modul_count", slot, 0, INVENTORY_LEN);
    return;
  }
  const keys = kind === "characters" ? CHAR_COPY_KEYS : WEAPON_COPY_KEYS;
  for (const key of keys) {
    const arr = root[key];
    if (!Array.isArray(arr) || slot >= arr.length) continue;
    arr[slot] = defaultForArr(key, arr);
  }
  if (kind === "characters" && Array.isArray(root.ag_inv_wpn_to_char)) {
    root.ag_inv_wpn_to_char.forEach((to, i) => {
      if (to === slot) root.ag_inv_wpn_to_char[i] = 0;
    });
  }
  if (kind === "weapons" && Array.isArray(root.ag_inv_char_first_weapon)) {
    root.ag_inv_char_first_weapon.forEach((fw, i) => {
      if (fw === slot) root.ag_inv_char_first_weapon[i] = 0;
    });
  }
}

function resetMods() {
  if (!root || listKind !== "weapons" || selected.slot < 0) return;
  const id = rowId("weapons", selected.slot);
  const info = weaponInfo(id);
  const defaults = info && info.defaultMods ? info.defaultMods : new Array(13).fill(0);
  if (!defaults.length) {
    setStatus("数据字典中缺少该武器的默认配件。", "err");
    return;
  }
  pushHistory("恢复武器默认配件 " + selected.slot);
  for (let n = 1; n <= 13; n++) {
    setArrVal("ag_inv_wpn_mod_" + n, selected.slot, defaults[n - 1] || 0, INVENTORY_LEN);
  }
  renderAll();
  setStatus("已恢复武器槽 " + selected.slot + " 的默认配件。", "ok");
}

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function savePresets(list) {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(list));
  } catch (e) {
    setStatus("预设库保存失败：" + e.message, "err");
  }
}

function validatePreset(p) {
  return p && typeof p === "object" &&
    Array.isArray(p.mods) && p.mods.length === 13 &&
    p.mods.every((v) => Number.isFinite(v));
}

function currentLoadout() {
  const mods = [];
  for (let n = 1; n <= 13; n++) mods.push(getVal("ag_inv_wpn_mod_" + n, selected.slot) || 0);
  return {
    type: "weapon-loadout",
    version: 1,
    weaponId: rowId("weapons", selected.slot),
    weaponName: nameOf("weapon", rowId("weapons", selected.slot), currentLang) || "",
    mods
  };
}

function renderLoadoutPresets() {
  const el = $("loadoutPresets");
  if (!el) return;
  const presets = loadPresets();
  el.innerHTML = presets.length
    ? `<div class="preset-title">预设库</div>` + presets.map((p, i) =>
        `<div class="preset-row"><span>${esc(p.name || p.weaponName || "预设 " + (i + 1))}</span>` +
        `<button class="mini" data-action="use-preset" data-index="${i}">应用</button>` +
        `<button class="mini danger" data-action="delete-preset" data-index="${i}">删除</button></div>`
      ).join("")
    : `<div class="muted">暂无预设，可先保存当前武器配件。</div>`;
}

function saveLoadout() {
  if (!root || listKind !== "weapons" || selected.slot < 0) return;
  const preset = currentLoadout();
  const name = window.prompt("预设名称：", preset.weaponName || "武器 " + selected.slot);
  if (name === null) return;
  preset.name = name.trim() || ("武器 " + selected.slot);
  const list = loadPresets();
  list.push(preset);
  savePresets(list);
  renderLoadoutPresets();
  setStatus("已保存预设：" + preset.name, "ok");
}

function usePreset(index) {
  if (!root || listKind !== "weapons" || selected.slot < 0) return;
  const presets = loadPresets();
  const p = presets[index];
  if (!p || !validatePreset(p)) {
    setStatus("预设数据无效。", "err");
    return;
  }
  pushHistory("应用预设 " + (p.name || index));
  for (let n = 1; n <= 13; n++) {
    setArrVal("ag_inv_wpn_mod_" + n, selected.slot, p.mods[n - 1] || 0, INVENTORY_LEN);
  }
  renderAll();
  setStatus("已应用预设到武器槽 " + selected.slot + "。", "ok");
}

function deletePreset(index) {
  const presets = loadPresets();
  const p = presets[index];
  if (!p) return;
  if (!window.confirm("删除预设：" + (p.name || "预设 " + (index + 1)) + "？")) return;
  presets.splice(index, 1);
  savePresets(presets);
  renderLoadoutPresets();
  setStatus("已删除预设。", "ok");
}

function exportLoadout() {
  if (!root || listKind !== "weapons" || selected.slot < 0) return;
  const preset = currentLoadout();
  preset.name = preset.weaponName || "武器 " + selected.slot;
  const json = JSON.stringify(preset, null, 2);
  downloadBytes(new TextEncoder().encode(json), "weapon_loadout_" + preset.weaponId + ".json");
  setStatus("已导出武器配件预设文件。", "ok");
}

async function importLoadoutFile(file) {
  try {
    const p = JSON.parse(await file.text());
    if (!validatePreset(p)) throw new Error("预设需要包含 13 个配件 ID 的 mods 数组。");
    const list = loadPresets();
    list.push(p);
    savePresets(list);
    if (listKind === "weapons" && selected.slot >= 0) {
      pushHistory("导入预设");
      for (let n = 1; n <= 13; n++) {
        setArrVal("ag_inv_wpn_mod_" + n, selected.slot, p.mods[n - 1] || 0, INVENTORY_LEN);
      }
      renderAll();
    } else {
      renderLoadoutPresets();
    }
    setStatus("已导入预设：" + (p.name || p.weaponName || file.name), "ok");
  } catch (e) {
    setStatus("导入预设失败：" + e.message, "err");
  }
}

function batchSet() {
  if (!root) return;
  const action = batchAction.value;
  const rows = buildRows(listKind).filter(matchesFilter);
  if (!rows.length) {
    setStatus("当前筛选条件下没有条目。", "err");
    return;
  }

  let value = null;
  if (!["clear", "lock", "unlock"].includes(action)) {
    const raw = batchInput.value.trim();
    if (raw === "" || !Number.isInteger(Number(raw)) || Number(raw) < 0) {
      setStatus("批量值必须是大于等于 0 的整数。", "err");
      return;
    }
    value = Number(raw);
  }

  const label = listKind === "characters" ? "角色" : listKind === "weapons" ? "武器" : "模块";
  if (!window.confirm("将对筛选出的 " + rows.length + " 个" + label + "执行“" + action + "”操作？")) return;
  pushHistory("批量操作 " + label);

  if (action === "clear") {
    for (const r of rows) clearSlotValues(listKind, r.slot);
  } else if (action === "count") {
    for (const r of rows) setArrVal("ag_inv_modul_count", r.slot, value, INVENTORY_LEN);
  } else if (action === "id") {
    const key = listKind === "characters" ? "ag_inv_char_id" : "ag_inv_wpn_id";
    for (const r of rows) setArrVal(key, r.slot, value, INVENTORY_LEN);
  } else if (action === "lvl") {
    const key = listKind === "characters" ? "ag_inv_char_lvl" : "ag_inv_wpn_lvl";
    for (const r of rows) setArrVal(key, r.slot, value, INVENTORY_LEN);
  } else if (action === "lock") {
    const key = listKind === "characters" ? "ag_inv_char_lock" : "ag_inv_wpn_lock";
    for (const r of rows) setArrVal(key, r.slot, true, INVENTORY_LEN);
  } else if (action === "unlock") {
    const key = listKind === "characters" ? "ag_inv_char_lock" : "ag_inv_wpn_lock";
    for (const r of rows) setArrVal(key, r.slot, false, INVENTORY_LEN);
  }
  renderAll();
  setStatus("已对 " + rows.length + " 个" + label + "执行批量操作。", "ok");
}

function changePage(delta) {
  page = Math.max(0, page + delta);
  renderTable();
}

function applyDetail() {
  const form = $("detailForm");
  if (!form || !root || selected.slot < 0) return;
  const kind = listKind;
  const slot = selected.slot;
  const errors = [];
  const values = {};

  const readNum = (key) => {
    const el = form.querySelector(`[data-field="${key}"]`);
    if (!el) return undefined;
    const s = el.value.trim();
    if (s === "") return 0;
    const n = Number(s);
    if (!Number.isFinite(n)) errors.push(key + " 不是有效数字。");
    return n;
  };
  const readText = (key) => {
    const el = form.querySelector(`[data-field="${key}"]`);
    return el ? el.value : "";
  };
  const readBool = (key) => {
    const el = form.querySelector(`[data-field="${key}"]`);
    return el ? el.checked : false;
  };

  if (kind === "modules") {
    values.count = readNum("count");
  } else if (kind === "characters") {
    for (const f of CHAR_FIELDS) {
      if (f.type === "bool") values[f.key] = readBool(f.key);
      else if (f.type === "text") values[f.key] = readText(f.key);
      else if (f.type === "vec4") {
        values[f.key] = {
          x: readNum(f.key + ".x"),
          y: readNum(f.key + ".y"),
          z: readNum(f.key + ".z"),
          w: readNum(f.key + ".w")
        };
      } else values[f.key] = readNum(f.key);
    }
  } else if (kind === "weapons") {
    for (const f of WEAPON_FIELDS) {
      if (f.type === "bool") values[f.key] = readBool(f.key);
      else values[f.key] = readNum(f.key);
    }
    for (let n = 1; n <= 13; n++) {
      const el = form.querySelector(`[data-mod="${n}"]`);
      values["ag_inv_wpn_mod_" + n] = el ? Number(el.value) : 0;
    }
  }

  if (errors.length) {
    setStatus("无法应用：" + errors.join(" "), "err");
    return;
  }

  const label = kind === "characters" ? "角色" : kind === "weapons" ? "武器" : "模块";
  pushHistory("编辑" + label + "槽 " + slot);
  if (kind === "modules") {
    setArrVal("ag_inv_modul_count", slot, values.count, INVENTORY_LEN);
  } else {
    const keys = kind === "characters" ? CHAR_FIELDS : WEAPON_FIELDS;
    for (const f of keys) setArrVal(f.key, slot, values[f.key], INVENTORY_LEN);
    if (kind === "weapons") {
      for (let n = 1; n <= 13; n++) {
        setArrVal("ag_inv_wpn_mod_" + n, slot, values["ag_inv_wpn_mod_" + n], INVENTORY_LEN);
      }
    }
  }
  renderAll();
  setStatus("已应用修改到" + label + "槽 " + slot + "。", "ok");
}

function resetDetailForm() {
  renderDetail();
}

function applyOverview() {
  if (!root) return;
  const form = $("overviewForm");
  const errors = [];
  const next = {};
  for (const f of OVERVIEW_FIELDS) {
    const el = form.querySelector(`[data-field="${f.key}"]`);
    if (!el) continue;
    if (f.type === "bool") {
      next[f.key] = el.checked;
    } else if (f.type === "text") {
      next[f.key] = el.value;
    } else {
      const s = el.value.trim();
      const n = s === "" ? 0 : Number(s);
      if (!Number.isFinite(n)) {
        errors.push(f.key + " 不是有效数字。");
        continue;
      }
      next[f.key] = n;
    }
  }
  if (errors.length) {
    setStatus("无法应用设置：" + errors.join(" "), "err");
    return;
  }
  pushHistory("编辑玩家设置");
  Object.assign(root, next);
  renderAll();
  setStatus("已应用玩家设置。", "ok");
}

function parseRaw() {
  try {
    const parsed = JSON.parse($("rawArea").value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("必须是一个 JSON 对象。");
    }
    pushHistory("导入原始 JSON");
    root = parsed;
    renderAll();
    setStatus("已从原始 JSON 重新解析。", "ok");
  } catch (e) {
    setStatus("解析失败：" + e.message, "err");
  }
}

function syncRaw() {
  if (!root) return;
  $("rawArea").value = canonicalJson();
  setStatus("已把结构化内容同步到 JSON 文本。", "ok");
}

function formatRaw() {
  try {
    $("rawArea").value = JSON.stringify(JSON.parse($("rawArea").value), null, 2);
    setStatus("已格式化 JSON。", "ok");
  } catch (e) {
    setStatus("格式化失败：" + e.message, "err");
  }
}

function getArrIn(rootObj, key) {
  return rootObj && Array.isArray(rootObj[key]) ? rootObj[key] : null;
}

async function loadCompareFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let json;
  const magic = bytesToAscii(bytes.slice(0, 8));
  if (magic === SAVE_MAGIC || magic === MIGRATION_MAGIC) {
    json = await decryptBytes(bytes);
  } else {
    json = new TextDecoder().decode(bytes);
    JSON.parse(json);
  }
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("对比存档 JSON 必须是对象。");
  }
  compareRoot = parsed;
  compareName = file.name;
  compareKind = "characters";
  renderCompare();
  setStatus("已加载对比存档：" + file.name, "ok");
}

function clearCompare() {
  compareRoot = null;
  compareName = "";
  renderCompare();
  setStatus("已清除对比存档。", "ok");
}

function arrDiffForKey(key, a, b) {
  const arrA = getArrIn(a, key) || [];
  const arrB = getArrIn(b, key) || [];
  const len = Math.max(arrA.length, arrB.length);
  const out = [];
  for (let i = 0; i < len; i++) {
    const va = arrA[i] == null ? "0" : JSON.stringify(arrA[i]);
    const vb = arrB[i] == null ? "0" : JSON.stringify(arrB[i]);
    if (va !== vb) out.push(i);
  }
  return out;
}

function compareSaveSummary() {
  const out = { chars: [], weapons: [], modules: [], settings: 0 };
  if (!root || !compareRoot) return out;
  const charSet = new Set();
  for (const k of COMPARE_CHAR_KEYS) {
    arrDiffForKey(k, root, compareRoot).forEach((i) => charSet.add(i));
  }
  out.chars = [...charSet].sort((a, b) => a - b);
  const wpnSet = new Set();
  for (const k of COMPARE_WEAPON_KEYS) {
    arrDiffForKey(k, root, compareRoot).forEach((i) => wpnSet.add(i));
  }
  out.weapons = [...wpnSet].sort((a, b) => a - b);
  out.modules = arrDiffForKey("ag_inv_modul_count", root, compareRoot);
  let settings = 0;
  for (const f of OVERVIEW_FIELDS) {
    const a = JSON.stringify(root[f.key] == null ? null : root[f.key]);
    const b = JSON.stringify(compareRoot[f.key] == null ? null : compareRoot[f.key]);
    if (a !== b) settings++;
  }
  out.settings = settings;
  return out;
}

function fmtCompareChar(obj, slot) {
  const id = getArrIn(obj, "ag_inv_char_id") && getArrIn(obj, "ag_inv_char_id")[slot] || 0;
  if (!id) return "空";
  const name = nameOf("character", id, currentLang) || (DATA && DATA.character.prefix[id]) || "";
  const lvl = getArrIn(obj, "ag_inv_char_lvl") && getArrIn(obj, "ag_inv_char_lvl")[slot] || 0;
  const hp = getArrIn(obj, "ag_inv_char_hp") && getArrIn(obj, "ag_inv_char_hp")[slot] || 0;
  return id + " " + name + " Lv" + lvl + " HP" + hp;
}

function fmtCompareWeapon(obj, slot) {
  const id = getArrIn(obj, "ag_inv_wpn_id") && getArrIn(obj, "ag_inv_wpn_id")[slot] || 0;
  if (!id) return "空";
  const name = nameOf("weapon", id, currentLang) || (DATA && DATA.weapon.prefix[id]) || "";
  const lvl = getArrIn(obj, "ag_inv_wpn_lvl") && getArrIn(obj, "ag_inv_wpn_lvl")[slot] || 0;
  const mods = [];
  for (let n = 1; n <= 13; n++) {
    const arr = getArrIn(obj, "ag_inv_wpn_mod_" + n);
    mods.push(arr && arr[slot] || 0);
  }
  return id + " " + name + " Lv" + lvl + " [" + mods.join(",") + "]";
}

function renderCompare() {
  const s = compareSaveSummary();
  $("cmpChars").textContent = s.chars.length;
  $("cmpWeapons").textContent = s.weapons.length;
  $("cmpModules").textContent = s.modules.length;
  $("cmpSettings").textContent = s.settings;
  $("compareName").textContent = compareName ? "对比存档：" + compareName : "未加载对比存档";
  $("btnClearCompare").disabled = !compareRoot;
  document.querySelectorAll(".cmp-tab").forEach((b) =>
    b.classList.toggle("active", b.dataset.cmp === compareKind)
  );
  renderCompareTable();
}

function renderCompareTable() {
  const head = document.querySelector("#compareTable thead");
  const body = document.querySelector("#compareTable tbody");
  if (!root || !compareRoot) {
    head.innerHTML = "<tr><th>槽</th><th>当前存档</th><th>对比存档</th></tr>";
    body.innerHTML = `<tr><td class="empty" colspan="3">请先打开主存档并加载对比存档。</td></tr>`;
    return;
  }
  const s = compareSaveSummary();
  let rows = [];
  if (compareKind === "characters") {
    rows = s.chars.map((slot) => ({ slot, a: fmtCompareChar(root, slot), b: fmtCompareChar(compareRoot, slot) }));
  } else if (compareKind === "weapons") {
    rows = s.weapons.map((slot) => ({ slot, a: fmtCompareWeapon(root, slot), b: fmtCompareWeapon(compareRoot, slot) }));
  } else {
    rows = s.modules.map((slot) => ({
      slot,
      a: getArrIn(root, "ag_inv_modul_count") && getArrIn(root, "ag_inv_modul_count")[slot] || 0,
      b: getArrIn(compareRoot, "ag_inv_modul_count") && getArrIn(compareRoot, "ag_inv_modul_count")[slot] || 0
    }));
  }
  head.innerHTML = "<tr><th>槽</th><th>当前存档</th><th>对比存档</th></tr>";
  if (!rows.length) {
    body.innerHTML = `<tr><td class="empty" colspan="3">该分类没有差异。</td></tr>`;
    return;
  }
  const slice = rows.slice(0, 500);
  body.innerHTML = slice.map((r) =>
    `<tr><td>${r.slot}</td><td>${esc(r.a)}</td><td>${esc(r.b)}</td></tr>`
  ).join("") + (rows.length > 500
    ? `<tr><td class="empty" colspan="3">仅显示前 500 条，共 ${rows.length} 条。</td></tr>`
    : "");
}

function collectArrayRows(key, search, nameType) {
  const arr = getArr(key) || [];
  const q = search.trim().toLowerCase();
  const rows = [];
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    const name = nameType ? nameOf(nameType, i, currentLang) : "";
    const hay = [String(i), String(v), name].join(" ").toLowerCase();
    if ((v !== 0 && v !== "" && v !== false) || (q && hay.includes(q))) {
      rows.push({ i, v, name });
    }
    if (rows.length >= 500) break;
  }
  return rows;
}

function renderIntArrayRows(tableId, key, search, nameType) {
  const tbody = document.querySelector("#" + tableId + " tbody");
  if (!root) {
    tbody.innerHTML = `<tr><td class="empty" colspan="3">请先打开存档。</td></tr>`;
    return;
  }
  const rows = collectArrayRows(key, search, nameType);
  tbody.innerHTML = rows.map((r) =>
    `<tr><td>${r.i}</td><td>${esc(r.name || "-")}</td>` +
    `<td><input class="arr-edit" data-idx="${r.i}" type="number" step="1" value="${esc(r.v)}"></td></tr>`
  ).join("") || `<tr><td class="empty" colspan="3">没有匹配的条目。</td></tr>`;
}

function renderIntArraySimple(tableId, key, search) {
  const tbody = document.querySelector("#" + tableId + " tbody");
  if (!root) {
    tbody.innerHTML = `<tr><td class="empty" colspan="2">请先打开存档。</td></tr>`;
    return;
  }
  const rows = collectArrayRows(key, search, "");
  tbody.innerHTML = rows.map((r) =>
    `<tr><td>${r.i}</td>` +
    `<td><input class="arr-edit" data-idx="${r.i}" type="number" step="1" value="${esc(r.v)}"></td></tr>`
  ).join("") || `<tr><td class="empty" colspan="2">没有匹配的条目。</td></tr>`;
}

function applyArrayEdits(tableId, key) {
  const inputs = document.querySelectorAll("#" + tableId + " .arr-edit");
  if (!inputs.length) {
    setStatus("当前没有可应用的条目。", "err");
    return;
  }
  const vals = [];
  for (const input of inputs) {
    const idx = Number(input.dataset.idx);
    const s = input.value.trim();
    const v = s === "" ? 0 : Number(s);
    if (!Number.isInteger(v)) {
      setStatus("数组值必须是整数。", "err");
      return;
    }
    vals.push({ idx, v });
  }
  pushHistory("编辑数组 " + key);
  for (const item of vals) setArrVal(key, item.idx, item.v, INVENTORY_LEN);
  renderFieldTab();
  setStatus("已应用数组修改：" + key, "ok");
}

function missionNameType(key) {
  for (const [k, , type] of MISSION_KEYS) if (k === key) return type;
  return "";
}

function renderMissionTab() {
  const sel = $("missionKey");
  sel.innerHTML = MISSION_KEYS.map(([k, label]) =>
    `<option value="${k}" ${k === missionKey ? "selected" : ""}>${label}</option>`
  ).join("");
  renderIntArrayRows("missionTable", missionKey, $("missionSearch").value, missionNameType(missionKey));
}

function missionBatch() {
  if (!root) return;
  const raw = $("missionBatch").value.trim();
  if (raw === "" || !Number.isInteger(Number(raw)) || Number(raw) < 0) {
    setStatus("批量值必须是大于等于 0 的整数。", "err");
    return;
  }
  const value = Number(raw);
  const rows = collectArrayRows(missionKey, $("missionSearch").value, missionNameType(missionKey));
  if (!rows.length) {
    setStatus("当前没有匹配的条目。", "err");
    return;
  }
  if (!window.confirm("将 " + rows.length + " 个条目的值设置为 " + value + "？")) return;
  pushHistory("批量设置 " + missionKey);
  for (const r of rows) setArrVal(missionKey, r.i, value, INVENTORY_LEN);
  renderFieldTab();
  setStatus("已批量设置 " + rows.length + " 个条目。", "ok");
}

function renderCards() {
  const tbody = document.querySelector("#cardTable tbody");
  if (!root) {
    tbody.innerHTML = `<tr><td class="empty" colspan="4">请先打开存档。</td></tr>`;
    return;
  }
  const own = getArr("ag_inv_card_own") || [];
  const use = getArr("ag_inv_card_card_count_use") || [];
  const names = DATA && DATA.names && DATA.names.card
    ? (DATA.names.card[currentLang] || DATA.names.card.en || [])
    : [];
  const len = Math.min(Math.max(own.length, use.length), names.length || 64, 1000);
  const q = $("cardSearch").value.trim().toLowerCase();
  const rows = [];
  for (let i = 0; i < len; i++) {
    const name = names[i] || "";
    const hay = [String(i), name].join(" ").toLowerCase();
    if (q && !hay.includes(q)) continue;
    rows.push({ i, name, own: own[i] || 0, use: use[i] || 0 });
  }
  tbody.innerHTML = rows.map((r) =>
    `<tr><td>${r.i}</td><td>${esc(r.name || "-")}</td>` +
    `<td><input class="card-own" data-idx="${r.i}" type="number" min="0" step="1" value="${r.own}"></td>` +
    `<td><input class="card-count" data-idx="${r.i}" type="number" min="0" step="1" value="${r.use}"></td></tr>`
  ).join("") || `<tr><td class="empty" colspan="4">没有匹配的卡牌。</td></tr>`;
}

function applyCards() {
  if (!root) return;
  const ownInputs = document.querySelectorAll("#cardTable .card-own");
  const useInputs = document.querySelectorAll("#cardTable .card-count");
  const vals = [];
  for (const input of ownInputs) {
    const idx = Number(input.dataset.idx);
    const s = input.value.trim();
    const v = s === "" ? 0 : Number(s);
    if (!Number.isInteger(v) || v < 0) {
      setStatus("卡牌拥有值必须是整数。", "err");
      return;
    }
    vals.push({ idx, own: v });
  }
  for (const input of useInputs) {
    const idx = Number(input.dataset.idx);
    const s = input.value.trim();
    const v = s === "" ? 0 : Number(s);
    if (!Number.isInteger(v) || v < 0) {
      setStatus("卡牌使用次数必须是整数。", "err");
      return;
    }
    const item = vals.find((x) => x.idx === idx);
    if (item) item.use = v;
  }
  pushHistory("编辑卡牌");
  for (const item of vals) {
    setArrVal("ag_inv_card_own", item.idx, item.own, INVENTORY_LEN);
    setArrVal("ag_inv_card_card_count_use", item.idx, item.use || 0, INVENTORY_LEN);
  }
  renderFieldTab();
  setStatus("已应用卡牌修改。", "ok");
}

function renderPlayerValuesForm() {
  const form = $("playerValuesForm");
  const arr = getArr("ag_player_values") || [];
  form.innerHTML = arr.map((v, i) =>
    `<label class="field"><span>value[${i}]</span>` +
    `<input type="number" step="1" data-pv="${i}" value="${esc(v)}"></label>`
  ).join("") || `<div class="muted">存档中没有 ag_player_values。</div>`;
}

function applyPlayerValues() {
  if (!root) return;
  const inputs = document.querySelectorAll("#playerValuesForm input[data-pv]");
  const vals = [];
  for (const input of inputs) {
    const idx = Number(input.dataset.pv);
    const s = input.value.trim();
    const v = s === "" ? 0 : Number(s);
    if (!Number.isFinite(v)) {
      setStatus("玩家数值必须是数字。", "err");
      return;
    }
    vals.push({ idx, v });
  }
  pushHistory("编辑玩家数值");
  for (const item of vals) setArrVal("ag_player_values", item.idx, item.v, 0);
  renderFieldTab();
  setStatus("已应用玩家数值。", "ok");
}

function renderResourceScalars() {
  const form = $("resourceScalarForm");
  if (!root) {
    form.innerHTML = "";
    return;
  }
  form.innerHTML = RESOURCE_SCALAR_FIELDS.map((f) =>
    `<label class="field"><span>${f.label}</span>${inputHtml(f, root[f.key])}</label>`
  ).join("");
}

function applyResourceScalars() {
  if (!root) return;
  const form = $("resourceScalarForm");
  const next = {};
  for (const f of RESOURCE_SCALAR_FIELDS) {
    const el = form.querySelector(`[data-field="${f.key}"]`);
    if (!el) continue;
    const s = el.value.trim();
    const v = s === "" ? 0 : Number(s);
    if (!Number.isFinite(v)) {
      setStatus(f.label + " 不是有效数字。", "err");
      return;
    }
    next[f.key] = v;
  }
  pushHistory("编辑常用字段");
  Object.assign(root, next);
  renderFieldTab();
  setStatus("已应用常用字段。", "ok");
}

function renderShop() {
  const tbody = document.querySelector("#shopTable tbody");
  const ids = getArr("ag_player_daily_shop_id") || [];
  const buy = getArr("ag_player_daily_shop_buy") || [];
  const buyMax = getArr("ag_player_daily_shop_buy_max") || [];
  const type = getArr("ag_player_daily_shop_type") || [];
  const len = Math.max(ids.length, buy.length, buyMax.length, type.length);
  const rows = [];
  for (let i = 0; i < len; i++) rows.push({ i, id: ids[i] || 0, buy: buy[i] || 0, max: buyMax[i] || 0, type: type[i] || 0 });
  tbody.innerHTML = rows.map((r) =>
    `<tr><td>${r.i}</td>` +
    `<td><input class="shop-id" data-idx="${r.i}" type="number" step="1" value="${r.id}"></td>` +
    `<td><input class="shop-buy" data-idx="${r.i}" type="number" step="1" value="${r.buy}"></td>` +
    `<td><input class="shop-buy-max" data-idx="${r.i}" type="number" step="1" value="${r.max}"></td>` +
    `<td><input class="shop-type" data-idx="${r.i}" type="number" step="1" value="${r.type}"></td></tr>`
  ).join("");
}

function applyShop() {
  if (!root) return;
  const groups = [
    ["ag_player_daily_shop_id", ".shop-id"],
    ["ag_player_daily_shop_buy", ".shop-buy"],
    ["ag_player_daily_shop_buy_max", ".shop-buy-max"],
    ["ag_player_daily_shop_type", ".shop-type"]
  ];
  const all = [];
  for (const [key, sel] of groups) {
    for (const input of document.querySelectorAll("#shopTable " + sel)) {
      const idx = Number(input.dataset.idx);
      const s = input.value.trim();
      const v = s === "" ? 0 : Number(s);
      if (!Number.isInteger(v)) {
        setStatus("商店字段必须是整数。", "err");
        return;
      }
      all.push({ key, idx, v });
    }
  }
  pushHistory("编辑每日商店");
  for (const item of all) setArrVal(item.key, item.idx, item.v, INVENTORY_LEN);
  renderFieldTab();
  setStatus("已应用每日商店。", "ok");
}

function renderMiscTab() {
  const sel = $("miscKey");
  sel.innerHTML = MISC_KEYS.map(([k, label]) =>
    `<option value="${k}" ${k === miscKey ? "selected" : ""}>${label}</option>`
  ).join("");
  renderIntArraySimple("miscTable", miscKey, $("miscSearch").value);
  const form = $("formationNamesForm");
  const arr = getArr("ag_formation_preset_name") || [];
  form.innerHTML = arr.map((v, i) =>
    `<label class="field"><span>编队 ${i + 1}</span>` +
    `<input type="text" data-fname="${i}" value="${esc(v)}"></label>`
  ).join("") || `<div class="muted">存档中没有编队名称。</div>`;
}

function applyFormationNames() {
  if (!root) return;
  const inputs = document.querySelectorAll("#formationNamesForm input[data-fname]");
  const vals = [];
  for (const input of inputs) vals.push({ idx: Number(input.dataset.fname), v: input.value });
  pushHistory("编辑编队名称");
  for (const item of vals) setArrVal("ag_formation_preset_name", item.idx, item.v, INVENTORY_LEN);
  renderFieldTab();
  setStatus("已应用编队名称。", "ok");
}

function renderResourcesTab() {
  renderPlayerValuesForm();
  renderResourceScalars();
  renderShop();
}

function renderFieldTab() {
  document.querySelectorAll(".sub-tab").forEach((b) =>
    b.classList.toggle("active", b.dataset.fieldtab === fieldTab)
  );
  for (const name of ["cards", "missions", "resources", "misc"]) {
    $("fields-" + name).hidden = fieldTab !== name;
  }
  if (fieldTab === "cards") renderCards();
  else if (fieldTab === "missions") renderMissionTab();
  else if (fieldTab === "resources") renderResourcesTab();
  else renderMiscTab();
}

document.addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if (actionEl) {
    const action = actionEl.dataset.action;
    if (action === "apply-detail") applyDetail();
    else if (action === "reset-detail-form") resetDetailForm();
    else if (action === "copy-row") copyRow();
    else if (action === "clear-row") clearRow();
    else if (action === "reset-mods") resetMods();
    else if (action === "batch-set") batchSet();
    else if (action === "prev-page") changePage(-1);
    else if (action === "next-page") changePage(1);
    else if (action === "sync-raw") syncRaw();
    else if (action === "parse-raw") parseRaw();
    else if (action === "format-raw") formatRaw();
    else if (action === "apply-overview") applyOverview();
    else if (action === "save-loadout") saveLoadout();
    else if (action === "export-loadout") exportLoadout();
    else if (action === "import-loadout") $("loadoutFileInput").click();
    else if (action === "use-preset") usePreset(Number(actionEl.dataset.index));
    else if (action === "delete-preset") deletePreset(Number(actionEl.dataset.index));
    else if (action === "apply-cards") applyCards();
    else if (action === "apply-array") {
      if (fieldTab === "missions") applyArrayEdits("missionTable", missionKey);
      else if (fieldTab === "misc") applyArrayEdits("miscTable", miscKey);
    }
    else if (action === "mission-batch") missionBatch();
    else if (action === "apply-player-values") applyPlayerValues();
    else if (action === "apply-resource-scalars") applyResourceScalars();
    else if (action === "apply-shop") applyShop();
    else if (action === "apply-formation-names") applyFormationNames();
    return;
  }
  const tabBtn = e.target.closest(".tab-btn");
  if (tabBtn) {
    switchTab(tabBtn.dataset.tab);
    return;
  }
  const subTab = e.target.closest(".sub-tab");
  if (subTab) {
    fieldTab = subTab.dataset.fieldtab;
    renderFieldTab();
    return;
  }
  const cmpTab = e.target.closest(".cmp-tab");
  if (cmpTab) {
    compareKind = cmpTab.dataset.cmp;
    renderCompare();
    return;
  }
  const tr = e.target.closest("tr[data-slot]");
  if (tr && ["characters", "weapons", "modules"].includes(listKind)) {
    selected = { kind: listKind, slot: Number(tr.dataset.slot) };
    renderTable();
    renderDetail();
  }
});

searchInput.addEventListener("input", () => {
  searchText = searchInput.value;
  page = 0;
  renderTable();
});

langSelect.addEventListener("change", () => {
  currentLang = langSelect.value;
  renderTable();
  renderDetail();
});

filterSelect.addEventListener("change", () => {
  filter = filterSelect.value;
  page = 0;
  renderTable();
});

batchAction.addEventListener("change", () => {
  batchInput.hidden = batchAction.value === "clear";
});

$("missionKey").addEventListener("change", (e) => {
  missionKey = e.target.value;
  renderMissionTab();
});

$("miscKey").addEventListener("change", (e) => {
  miscKey = e.target.value;
  renderMiscTab();
});

$("cardSearch").addEventListener("input", () => renderCards());
$("missionSearch").addEventListener("input", () => renderMissionTab());
$("miscSearch").addEventListener("input", () => renderMiscTab());

btnOpen.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const f = fileInput.files && fileInput.files[0];
  if (!f) return;
  try {
    await openFile(f);
  } catch (e) {
    setStatus("打开失败：" + e.message, "err");
  }
  fileInput.value = "";
});
$("btnLoadCompare").addEventListener("click", () => $("compareFileInput").click());
$("compareFileInput").addEventListener("change", async () => {
  const f = $("compareFileInput").files && $("compareFileInput").files[0];
  if (!f) return;
  try {
    await loadCompareFile(f);
  } catch (e) {
    setStatus("加载对比存档失败：" + e.message, "err");
  }
  $("compareFileInput").value = "";
});
$("btnClearCompare").addEventListener("click", clearCompare);
$("loadoutFileInput").addEventListener("change", async () => {
  const f = $("loadoutFileInput").files && $("loadoutFileInput").files[0];
  if (!f) return;
  await importLoadoutFile(f);
  $("loadoutFileInput").value = "";
});
btnBackup.addEventListener("click", downloadBackup);
btnRestore.addEventListener("click", restoreOriginal);
btnUndo.addEventListener("click", undo);
btnRedo.addEventListener("click", redo);
btnPack.addEventListener("click", packSave);

window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", async (e) => {
  e.preventDefault();
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (!f) return;
  try {
    await openFile(f);
  } catch (err) {
    setStatus("打开失败：" + err.message, "err");
  }
});

document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === "z") {
    e.preventDefault();
    undo();
  } else if (k === "y") {
    e.preventDefault();
    redo();
  }
});

renderAll();
