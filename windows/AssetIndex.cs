using System.Text.Json;
using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace PowSaveEditor;

public sealed class ItemInfo
{
    public int Id { get; set; }
    public string Internal { get; set; }
    public string Display { get; set; }
    public string Icon { get; set; }
    public string SpriteFile { get; set; }
    public string Detail { get; set; }
}

public sealed class AssetIndex
{
    private readonly Dictionary<(string, int, string), string> _names = new();
    private readonly Dictionary<(string, int), string> _iconMap = new();
    private readonly Dictionary<string, string> _sprites = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<string> _allSprites = new();
    private readonly Dictionary<string, string> _compositeCache = new(StringComparer.OrdinalIgnoreCase);
    private readonly string _basePath;
    private readonly string[] _modResourcePrefix;
    private readonly float[][][] _wpnModPositions;
    private readonly float[][][] _wpnItemModPositions;
    private readonly int[][] _wpnDefaultModules;
    private readonly Dictionary<int, string> _moduleStatus = new();
    private readonly Dictionary<(int slot, int modId), float[]> _modUiPositionOverrides = new();

    public string CurrentLanguage { get; set; } = "en";
    public string BasePath => _basePath;

    public AssetIndex(string basePath)
    {
        _basePath = basePath;
        string namesJson = Path.Combine(basePath, "item_names.json");
        if (File.Exists(namesJson))
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(namesJson));
            foreach (var e in doc.RootElement.EnumerateArray())
            {
                string type = e.GetProperty("item_type").GetString();
                int id = e.GetProperty("item_id").GetInt32();
                string lang = e.GetProperty("lang").GetString();
                string display = e.GetProperty("display").GetString();
                if (!string.IsNullOrEmpty(type) && !string.IsNullOrEmpty(lang) && display != null)
                    _names[(type, id, lang)] = display;
            }
        }

        string iconMapJson = Path.Combine(basePath, "icon_map.json");
        if (File.Exists(iconMapJson))
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(iconMapJson));
            foreach (var e in doc.RootElement.EnumerateArray())
            {
                string type = e.GetProperty("item_type").GetString();
                int id = e.GetProperty("item_id").GetInt32();
                string file = e.TryGetProperty("sprite_file", out var sf) ? sf.GetString() : null;
                string status = e.TryGetProperty("status", out var st) ? st.GetString() : null;
                if (!string.IsNullOrEmpty(type) && !string.IsNullOrEmpty(file))
                    _iconMap[(type, id)] = file;
                if (type == "module" && !string.IsNullOrEmpty(status))
                    _moduleStatus[id] = status;
            }
        }

        string spriteJson = Path.Combine(basePath, "sprites", "all_index.json");
        if (File.Exists(spriteJson))
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(spriteJson));
            foreach (var e in doc.RootElement.EnumerateArray())
            {
                string name = e.GetProperty("name").GetString();
                string file = e.GetProperty("file").GetString();
                if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(file))
                {
                    _sprites[name.ToLowerInvariant()] = file;
                    _allSprites.Add(name);
                }
            }
        }

        _wpnPrefix = LoadStringArray(Path.Combine(basePath, "il2cpp_dump", "WpnData.json"), "wpn_prefix");
        _wpnIcon = LoadStringArray(Path.Combine(basePath, "il2cpp_dump", "WpnData.json"), "wpn_ico_pattern");
        _wpnType = LoadStringArray(Path.Combine(basePath, "il2cpp_dump", "WpnData.json"), "wpn_type");
        _wpnDamage = LoadIntArray(Path.Combine(basePath, "il2cpp_dump", "WpnData.json"), "wpn_damage");
        _wpnCost = LoadIntArray(Path.Combine(basePath, "il2cpp_dump", "WpnData.json"), "wpn_cost");
        _charPrefix = LoadStringArray(Path.Combine(basePath, "il2cpp_dump", "CharData.json"), "char_prefix");
        _charClass = LoadStringArray(Path.Combine(basePath, "il2cpp_dump", "CharData.json"), "char_class");
        _charHp = LoadIntArray(Path.Combine(basePath, "il2cpp_dump", "CharData.json"), "char_hp");
        _charCost = LoadIntArray(Path.Combine(basePath, "il2cpp_dump", "CharData.json"), "char_cost");

        var modList = new List<string>();
        string modJson = Path.Combine(basePath, "il2cpp_dump_recursive", "ModulData.json");
        if (File.Exists(modJson))
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(modJson));
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                if (prop.Value.ValueKind != JsonValueKind.Array)
                    continue;
                foreach (var item in prop.Value.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Object &&
                        item.TryGetProperty("prefix", out var p) &&
                        p.ValueKind == JsonValueKind.String)
                        modList.Add(p.GetString());
                }
                break;
            }
        }
        _modPrefix = modList.ToArray();
        _modResourcePrefix = LoadModuleResourcePrefixes(basePath);
        _wpnModPositions = LoadWpnModPositions(basePath);
        _wpnItemModPositions = LoadWpnItemModPositions(basePath);
        _wpnDefaultModules = LoadWpnIntMatrix(
            Path.Combine(basePath, "il2cpp_dump", "WpnData.json"),
            "ag_inv_wpn_modul_id_", 13);
        _modUiPositionOverrides = LoadModUiPositionOverrides(basePath);
    }

    private readonly string[] _wpnPrefix;
    private readonly string[] _wpnIcon;
    private readonly string[] _wpnType;
    private readonly int[] _wpnDamage;
    private readonly int[] _wpnCost;
    private readonly string[] _charPrefix;
    private readonly string[] _charClass;
    private readonly int[] _charHp;
    private readonly int[] _charCost;
    private readonly string[] _modPrefix;

    public ItemInfo Weapon(int id)
    {
        var info = new ItemInfo
        {
            Id = id,
            Internal = Get(_wpnPrefix, id),
            Icon = Get(_wpnIcon, id),
            Display = Name("weapon", id),
            Detail = $"type={Get(_wpnType, id)} damage={Get(_wpnDamage, id)} cost={Get(_wpnCost, id)}"
        };
        info.SpriteFile = _iconMap.TryGetValue(("weapon", id), out string iconFile)
            ? iconFile
            : FindSprite(info.Icon, Get(_wpnType, id));
        return info;
    }

    public ItemInfo Character(int id)
    {
        var info = new ItemInfo
        {
            Id = id,
            Internal = Get(_charPrefix, id),
            Icon = Get(_charPrefix, id),
            Display = Name("character", id),
            Detail = $"class={Get(_charClass, id)} hp={Get(_charHp, id)} cost={Get(_charCost, id)}"
        };
        info.SpriteFile = _iconMap.TryGetValue(("character", id), out string iconFile)
            ? iconFile
            : FindSprite(info.Icon, null);
        return info;
    }

    public ItemInfo Module(int id)
    {
        var info = new ItemInfo
        {
            Id = id,
            Internal = Get(_modPrefix, id),
            Icon = Get(_modPrefix, id),
            Display = Name("module", id),
            Detail = "module"
        };
        info.SpriteFile = _iconMap.TryGetValue(("module", id), out string iconFile)
            ? iconFile
            : FindSprite(info.Icon, null);
        return info;
    }

    public string CompositeWeaponSprite(int weaponId, int[] mods, string baseFile)
    {
        if (string.IsNullOrEmpty(baseFile) || !File.Exists(baseFile))
            return null;

        string key = "ui:" + weaponId + ":" + string.Join(",", mods);
        if (_compositeCache.TryGetValue(key, out string cached))
            return cached;

        try
        {
            string file = WeaponCompositeRenderer.RenderToFile(this, weaponId, mods, baseFile, "ui");
            if (file == null)
                return null;
            _compositeCache[key] = file;
            return file;
        }
        catch
        {
            return null;
        }
    }

    public string Name(string type, int id)
    {
        if (_names.TryGetValue((type, id, CurrentLanguage), out string display))
            return display;
        if (_names.TryGetValue((type, id, "en"), out string en))
            return en;
        return type switch
        {
            "weapon" => Get(_wpnPrefix, id),
            "module" => Get(_modPrefix, id),
            _ => Get(_charPrefix, id)
        };
    }

    private string FindSprite(string icon, string typeHint)
    {
        if (!string.IsNullOrEmpty(icon))
        {
            string low = icon.ToLowerInvariant();
            if (_sprites.TryGetValue(low, out string exact))
                return exact;
            if (low.Length >= 3)
            {
                foreach (var s in _allSprites)
                {
                    if (s.ToLowerInvariant().Contains(low))
                        return _sprites[s.ToLowerInvariant()];
                }
            }
        }
        if (!string.IsNullOrEmpty(typeHint) && typeHint.Length >= 3)
        {
            foreach (var s in _allSprites)
            {
                if (s.Equals(typeHint, StringComparison.OrdinalIgnoreCase))
                    return _sprites[s.ToLowerInvariant()];
            }
        }
        return null;
    }

    private static string[] LoadStringArray(string path, string key)
    {
        if (!File.Exists(path)) return Array.Empty<string>();
        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        if (!doc.RootElement.TryGetProperty(key, out JsonElement el) ||
            !el.TryGetProperty("items", out JsonElement items))
            return Array.Empty<string>();
        var list = new List<string>();
        foreach (var e in items.EnumerateArray())
            list.Add(e.ValueKind == JsonValueKind.String ? e.GetString() : null);
        return list.ToArray();
    }

    private static int[] LoadIntArray(string path, string key)
    {
        if (!File.Exists(path)) return Array.Empty<int>();
        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        if (!doc.RootElement.TryGetProperty(key, out JsonElement el) ||
            !el.TryGetProperty("items", out JsonElement items))
            return Array.Empty<int>();
        var list = new List<int>();
        foreach (var e in items.EnumerateArray())
            list.Add(e.ValueKind == JsonValueKind.Number ? e.GetInt32() : 0);
        return list.ToArray();
    }

    private static string[] LoadModuleResourcePrefixes(string basePath)
    {
        string path = Path.Combine(basePath, "il2cpp_dump_recursive", "ModulData_resolved.json");
        if (!File.Exists(path))
            path = Path.Combine(basePath, "il2cpp_dump_recursive", "ModulData.json");
        if (!File.Exists(path)) return Array.Empty<string>();

        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        var root = doc.RootElement;
        foreach (var prop in root.EnumerateObject())
        {
            if (prop.Value.ValueKind != JsonValueKind.Array) continue;
            var list = new List<string>();
            foreach (var item in prop.Value.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.Object &&
                    item.TryGetProperty("prefix", out var p) &&
                    p.ValueKind == JsonValueKind.String)
                    list.Add(p.GetString());
                else
                    list.Add(null);
            }
            return list.ToArray();
        }
        return Array.Empty<string>();
    }

    private static float[][][] LoadWpnModPositions(string basePath)
    {
        string path = Path.Combine(basePath, "il2cpp_dump", "WpnData.json");
        var result = new float[300][][];
        if (!File.Exists(path)) return result;

        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        for (int n = 1; n <= 13; n++)
        {
            string key = "ag_inv_wpn_modul_pos_ui_id_" + n;
            if (!doc.RootElement.TryGetProperty(key, out JsonElement el) ||
                !el.TryGetProperty("items", out JsonElement items))
                continue;
            int wid = 0;
            foreach (var e in items.EnumerateArray())
            {
                if (wid >= result.Length) break;
                if (e.ValueKind == JsonValueKind.Array && e.GetArrayLength() >= 2)
                {
                    result[wid] ??= new float[13][];
                    result[wid][n - 1] = new[]
                    {
                        e[0].GetSingle(),
                        e[1].GetSingle()
                    };
                }
                wid++;
            }
        }
        return result;
    }

    private static float[][][] LoadWpnItemModPositions(string basePath)
    {
        string path = Path.Combine(basePath, "il2cpp_dump", "WpnData.json");
        var result = new float[300][][];
        if (!File.Exists(path)) return result;

        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        for (int slot = 1; slot <= 13; slot++)
        {
            string key = slot == 1
                ? "ag_inv_wpn_modul_pos_item_id_0"
                : "ag_inv_wpn_modul_pos_item_id_" + slot;
            if (!doc.RootElement.TryGetProperty(key, out JsonElement el) ||
                !el.TryGetProperty("items", out JsonElement items))
                continue;
            int wid = 0;
            foreach (var e in items.EnumerateArray())
            {
                if (wid >= result.Length) break;
                if (e.ValueKind == JsonValueKind.Array && e.GetArrayLength() >= 2)
                {
                    result[wid] ??= new float[13][];
                    result[wid][slot - 1] = new[]
                    {
                        e[0].GetSingle(),
                        e[1].GetSingle()
                    };
                }
                wid++;
            }
        }
        return result;
    }

    private static int[][] LoadWpnIntMatrix(string path, string prefix, int count)
    {
        var result = new int[300][];
        if (!File.Exists(path)) return result;

        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        for (int n = 1; n <= count; n++)
        {
            string key = prefix + n;
            if (!doc.RootElement.TryGetProperty(key, out JsonElement el) ||
                !el.TryGetProperty("items", out JsonElement items))
                continue;
            int wid = 0;
            foreach (var e in items.EnumerateArray())
            {
                if (wid >= result.Length) break;
                if (e.ValueKind == JsonValueKind.Number)
                {
                    result[wid] ??= new int[count];
                    result[wid][n - 1] = e.GetInt32();
                }
                wid++;
            }
        }
        return result;
    }

    private static Dictionary<(int slot, int modId), float[]> LoadModUiPositionOverrides(string basePath)
    {
        var result = new Dictionary<(int, int), float[]>();
        string path = Path.Combine(basePath, "il2cpp_dump_recursive", "ModulData_resolved.json");
        if (!File.Exists(path)) return result;

        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        var root = doc.RootElement;
        foreach (var prop in root.EnumerateObject())
        {
            if (prop.Value.ValueKind != JsonValueKind.Array) continue;
            int modId = 0;
            foreach (var item in prop.Value.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object)
                {
                    modId++;
                    continue;
                }
                for (int slot = 1; slot <= 13; slot++)
                {
                    string key = "ag_inv_wpn_modul_pos_ui_id_" + slot;
                    if (!item.TryGetProperty(key, out JsonElement pos) ||
                        pos.ValueKind != JsonValueKind.Array || pos.GetArrayLength() < 2)
                        continue;
                    result[(slot, modId)] = new[]
                    {
                        pos[0].GetSingle(),
                        pos[1].GetSingle()
                    };
                }
                modId++;
            }
            break;
        }
        return result;
    }

    public float[] GetWeaponModPosition(int weaponId, int slot)
    {
        if (weaponId < 0 || weaponId >= _wpnModPositions.Length) return null;
        var row = _wpnModPositions[weaponId];
        if (row == null || slot < 1 || slot > 13) return null;
        return row[slot - 1];
    }

    public float[] GetWeaponItemModPosition(int weaponId, int slot)
    {
        if (weaponId < 0 || weaponId >= _wpnItemModPositions.Length) return null;
        var row = _wpnItemModPositions[weaponId];
        if (row == null || slot < 1 || slot > 13) return null;
        return row[slot - 1];
    }

    public float[] GetModuleUiPositionOverride(int modId, int slot)
    {
        return _modUiPositionOverrides.TryGetValue((slot, modId), out float[] pos) ? pos : null;
    }

    public int[] GetDefaultModules(int weaponId)
    {
        if (weaponId < 0 || weaponId >= _wpnDefaultModules.Length) return Array.Empty<int>();
        return _wpnDefaultModules[weaponId] ?? Array.Empty<int>();
    }

    public string GetModulePrefix(int modId)
    {
        return Get(_modPrefix, modId);
    }

    public int ModuleCount => _modPrefix?.Length ?? 0;

    public string GetModuleSpriteFile(int modId)
    {
        if (_iconMap.TryGetValue(("module", modId), out string file))
            return file;
        if (modId >= 0 && modId < _modResourcePrefix.Length &&
            !string.IsNullOrEmpty(_modResourcePrefix[modId]))
            return FindSprite(_modResourcePrefix[modId], null);
        return null;
    }

    public bool IsModuleSpriteExact(int modId)
    {
        return modId > 0 && _moduleStatus.TryGetValue(modId, out string status) &&
               string.Equals(status, "exact", StringComparison.OrdinalIgnoreCase);
    }

    public List<int> MissingModuleSprites(int[] mods)
    {
        var missing = new List<int>();
        if (mods == null) return missing;
        foreach (int modId in mods)
        {
            if (modId <= 0 || IsModuleSpriteExact(modId)) continue;
            if (!missing.Contains(modId))
                missing.Add(modId);
        }
        return missing;
    }

    private static string Get(string[] arr, int i)
    {
        return arr != null && i >= 0 && i < arr.Length ? arr[i] : null;
    }

    private static int Get(int[] arr, int i)
    {
        return arr != null && i >= 0 && i < arr.Length ? arr[i] : 0;
    }
}
