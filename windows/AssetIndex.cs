using System.Text.Json;
using System.IO;

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

    public string CurrentLanguage { get; set; } = "en";

    public AssetIndex(string basePath)
    {
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
                if (!string.IsNullOrEmpty(type) && !string.IsNullOrEmpty(file))
                    _iconMap[(type, id)] = file;
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

    public string Name(string type, int id)
    {
        if (_names.TryGetValue((type, id, CurrentLanguage), out string display))
            return display;
        if (_names.TryGetValue((type, id, "en"), out string en))
            return en;
        return type == "weapon" ? Get(_wpnPrefix, id) : Get(_charPrefix, id);
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

    private static string Get(string[] arr, int i)
    {
        return arr != null && i >= 0 && i < arr.Length ? arr[i] : null;
    }

    private static int Get(int[] arr, int i)
    {
        return arr != null && i >= 0 && i < arr.Length ? arr[i] : 0;
    }
}
