using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;

namespace PowSaveEditor;

public partial class MainWindow : Window
{
    private const string PlaceholderSprite = @"D:\POW\assets\sprites\placeholder.png";
    private readonly AssetIndex _index;
    private JsonObject _root;
    private JsonArray _wpnIds;
    private JsonArray _charIds;
    private List<ItemEntry> _weapons = new();
    private List<ItemEntry> _characters = new();
    private List<ItemEntry> _modules = new();
    private JsonArray _modCounts;
    private readonly JsonArray[] _wpnMods = new JsonArray[13];
    private string _currentPath;
    private int _selectedWeaponSlot = -1;
    private bool _suppressModEvents;
    private TextBox[] _modBoxes = new TextBox[13];
    private TextBlock[] _modNameTexts = new TextBlock[13];

    public MainWindow()
    {
        InitializeComponent();
        string basePath = @"D:\POW\assets";
        _index = new AssetIndex(basePath);
        UpdateStats();
        foreach (var lang in new[] { "en", "ru", "zh", "ko" })
            LanguageBox.Items.Add(lang);
        LanguageBox.SelectedIndex = 0;
    }

    private void OpenButton_Click(object sender, RoutedEventArgs e)
    {
        var dlg = new OpenFileDialog
        {
            Filter = "Save files|save_file;save_gamefolder.json;*.json;*.bak;*|All files|*.*",
            InitialDirectory = @"D:\POW"
        };
        if (dlg.ShowDialog(this) != true) return;

        try
        {
            byte[] bytes = File.ReadAllBytes(dlg.FileName);
            string json = SaveCrypto.IsEncrypted(bytes)
                ? SaveCrypto.Decrypt(bytes)
                : File.ReadAllText(dlg.FileName);
            _root = JsonNode.Parse(json)?.AsObject()
                ?? throw new InvalidDataException("Save JSON is empty.");
            _wpnIds = _root["ag_inv_wpn_id"]?.AsArray();
            _charIds = _root["ag_inv_char_id"]?.AsArray();
            _modCounts = _root["ag_inv_modul_count"]?.AsArray();
            for (int n = 0; n < _wpnMods.Length; n++)
                _wpnMods[n] = _root["ag_inv_wpn_mod_" + (n + 1)]?.AsArray();
            if (_wpnIds == null || _charIds == null)
                throw new InvalidDataException("ag_inv_wpn_id / ag_inv_char_id not found.");
            _currentPath = dlg.FileName;
            RefreshAll();
            RawReload();
            Status("Loaded " + dlg.FileName);
        }
        catch (Exception ex)
        {
            Status("Error: " + ex.Message);
        }
    }

    private void RefreshAll()
    {
        ClearModuleSlots();
        _weapons = BuildWeaponEntries();
        _characters = BuildEntries(_charIds, _index.Character, "character");
        _modules = BuildModuleEntries();
        RefreshWeapons();
        RefreshCharacters();
        RefreshModules();
        UpdateStats();
    }

    private void RefreshWeapons()
    {
        string q = SearchBox.Text?.Trim();
        var list = _weapons.Where(x => MatchesSearch(x, q)).ToList();
        WeaponList.ItemsSource = list;
    }

    private void RefreshCharacters()
    {
        string q = SearchBox.Text?.Trim();
        var list = _characters.Where(x => MatchesSearch(x, q)).ToList();
        CharacterList.ItemsSource = list;
    }

    private void RefreshModules()
    {
        string q = SearchBox.Text?.Trim();
        var list = _modules.Where(x => MatchesSearch(x, q)).ToList();
        ModuleList.ItemsSource = list;
    }

    private static bool MatchesSearch(ItemEntry entry, string query)
    {
        if (string.IsNullOrEmpty(query)) return true;
        return (entry.Display ?? string.Empty).Contains(query, StringComparison.OrdinalIgnoreCase) ||
               (entry.Internal ?? string.Empty).Contains(query, StringComparison.OrdinalIgnoreCase);
    }

    private List<ItemEntry> BuildModuleEntries()
    {
        var result = new List<ItemEntry>();
        if (_modCounts == null) return result;
        for (int i = 0; i < _modCounts.Count; i++)
        {
            int count = _modCounts[i]?.GetValue<int>() ?? 0;
            var info = _index.Module(i);
            result.Add(new ItemEntry
            {
                Slot = i,
                Id = i,
                Count = count,
                Kind = "module",
                Internal = info.Internal,
                Display = string.IsNullOrEmpty(info.Display)
                    ? (string.IsNullOrEmpty(info.Internal) ? "Module slot " + (i + 1) : info.Internal)
                    : info.Display,
                Detail = "count=" + count,
                SpritePath = ResolveSprite(info.SpriteFile)
            });
        }
        return result;
    }

    private List<ItemEntry> BuildWeaponEntries()
    {
        var result = new List<ItemEntry>();
        if (_wpnIds == null) return result;
        for (int i = 0; i < _wpnIds.Count; i++)
        {
            int id = _wpnIds[i]?.GetValue<int>() ?? 0;
            var info = _index.Weapon(id);
            int[] mods = new int[13];
            for (int n = 0; n < _wpnMods.Length; n++)
            {
                if (_wpnMods[n] != null && i < _wpnMods[n].Count)
                    mods[n] = _wpnMods[n][i]?.GetValue<int>() ?? 0;
            }
            string sprite = _index.CompositeWeaponSprite(id, mods, info.SpriteFile);
            List<int> missing = _index.MissingModuleSprites(mods);
            string detail = info.Detail + (missing.Count > 0
                ? " | fallback:" + string.Join(",", missing)
                : string.Empty);
            result.Add(new ItemEntry
            {
                Slot = i,
                Id = id,
                Kind = "weapon",
                Internal = info.Internal,
                Display = string.IsNullOrEmpty(info.Display) ? info.Internal : info.Display,
                Detail = detail,
                SpritePath = ResolveSprite(sprite ?? info.SpriteFile)
            });
        }
        return result;
    }

    private static List<ItemEntry> BuildEntries(JsonArray ids, Func<int, ItemInfo> resolver, string kind)
    {
        var result = new List<ItemEntry>();
        if (ids == null) return result;
        for (int i = 0; i < ids.Count; i++)
        {
            int id = ids[i]?.GetValue<int>() ?? 0;
            var info = resolver(id);
            result.Add(new ItemEntry
            {
                Slot = i,
                Id = id,
                Kind = kind,
                Internal = info.Internal,
                Display = string.IsNullOrEmpty(info.Display) ? info.Internal : info.Display,
                Detail = info.Detail,
                SpritePath = ResolveSprite(info.SpriteFile)
            });
        }
        return result;
    }

    private static string ResolveSprite(string spriteFile)
    {
        return !string.IsNullOrEmpty(spriteFile) && File.Exists(spriteFile)
            ? spriteFile
            : PlaceholderSprite;
    }

    private void WeaponList_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (WeaponList.SelectedItem is ItemEntry entry)
            ShowDetail(entry);
    }

    private void CharacterList_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (CharacterList.SelectedItem is ItemEntry entry)
            ShowDetail(entry);
    }

    private void ModuleList_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (ModuleList.SelectedItem is ItemEntry entry)
            ShowDetail(entry);
    }

    private void ShowDetail(ItemEntry entry)
    {
        SlotBox.Text = entry.Slot.ToString();
        IdBox.Text = entry.Id.ToString();
        NameBox.Text = entry.Internal;
        NewIdBox.Text = entry.Id.ToString();
        if (entry.Kind == "module")
        {
            SlotBox.Text = "Module ID: " + entry.Slot;
            NewIdBox.Text = entry.Count.ToString();
        }
        PreviewImage.Source = string.IsNullOrEmpty(entry.SpritePath)
            ? null
            : new System.Windows.Media.Imaging.BitmapImage(new Uri(entry.SpritePath));
        if (entry.Kind == "weapon")
        {
            RefreshModuleSlots(entry);
            UpdateModWarning(entry, ReadMods(entry.Slot));
        }
        else
        {
            ClearModuleSlots();
        }
    }

    private int[] ReadMods(int weaponSlot)
    {
        var mods = new int[13];
        for (int n = 0; n < mods.Length; n++)
            mods[n] = GetMod(weaponSlot, n);
        return mods;
    }

    private int GetMod(int weaponSlot, int slotIndex)
    {
        if (_wpnMods[slotIndex] == null || weaponSlot >= _wpnMods[slotIndex].Count)
            return 0;
        return _wpnMods[slotIndex][weaponSlot]?.GetValue<int>() ?? 0;
    }

    private void ClearModuleSlots()
    {
        _selectedWeaponSlot = -1;
        ModSlotsPanel.Children.Clear();
        ModWarningText.Text = string.Empty;
        ResetModsButton.IsEnabled = false;
    }

    private void RefreshModuleSlots(ItemEntry entry)
    {
        ModSlotsPanel.Children.Clear();
        _selectedWeaponSlot = entry.Slot;
        _modBoxes = new TextBox[13];
        _modNameTexts = new TextBlock[13];
        ResetModsButton.IsEnabled = true;

        for (int n = 0; n < 13; n++)
        {
            var row = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Margin = new Thickness(0, 2, 0, 2)
            };
            row.Children.Add(new TextBlock
            {
                Text = "Slot " + (n + 1),
                Width = 46,
                VerticalAlignment = VerticalAlignment.Center
            });

            var box = new TextBox { Width = 72, Tag = n, VerticalContentAlignment = VerticalAlignment.Center };
            box.TextChanged += ModSlotBox_TextChanged;
            var name = new TextBlock
            {
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(6, 0, 0, 0),
                Text = string.Empty
            };
            _modBoxes[n] = box;
            _modNameTexts[n] = name;
            row.Children.Add(box);
            row.Children.Add(name);
            ModSlotsPanel.Children.Add(row);
        }

        _suppressModEvents = true;
        try
        {
            for (int n = 0; n < 13; n++)
                _modBoxes[n].Text = GetMod(entry.Slot, n).ToString();
        }
        finally
        {
            _suppressModEvents = false;
        }
        UpdateModNames(entry.Id);
    }

    private void UpdateModNames(int weaponId)
    {
        for (int n = 0; n < 13; n++)
        {
            int modId = GetMod(_selectedWeaponSlot, n);
            string prefix = modId > 0 ? _index.GetModulePrefix(modId) : null;
            _modNameTexts[n].Text = string.IsNullOrEmpty(prefix) ? "(none)" : prefix;
        }
    }

    private void ModSlotBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        if (_suppressModEvents || _selectedWeaponSlot < 0) return;
        if (sender is not TextBox box || box.Tag is not int slotIndex) return;

        if (!int.TryParse(box.Text, out int modId) || modId < 0 || modId >= _index.ModuleCount)
        {
            UpdateModNames(_weapons.FirstOrDefault(w => w.Slot == _selectedWeaponSlot)?.Id ?? 0);
            Status("Module ID must be 0.." + (_index.ModuleCount - 1));
            return;
        }

        if (_wpnMods[slotIndex] == null)
        {
            _wpnMods[slotIndex] = new JsonArray();
            _root["ag_inv_wpn_mod_" + (slotIndex + 1)] = _wpnMods[slotIndex];
        }
        if (_selectedWeaponSlot < _wpnMods[slotIndex].Count)
            _wpnMods[slotIndex][_selectedWeaponSlot] = JsonValue.Create(modId);
        else
            _wpnMods[slotIndex].Add(JsonValue.Create(modId));

        var entry = _weapons.FirstOrDefault(w => w.Slot == _selectedWeaponSlot);
        if (entry != null)
        {
            UpdateModNames(entry.Id);
            RebuildSelectedWeaponPreview(entry);
        }
    }

    private void RebuildSelectedWeaponPreview(ItemEntry entry)
    {
        int[] mods = ReadMods(entry.Slot);
        var info = _index.Weapon(entry.Id);
        string sprite = _index.CompositeWeaponSprite(entry.Id, mods, info.SpriteFile);
        entry.SpritePath = ResolveSprite(sprite ?? info.SpriteFile);
        PreviewImage.Source = string.IsNullOrEmpty(entry.SpritePath)
            ? null
            : new System.Windows.Media.Imaging.BitmapImage(new Uri(entry.SpritePath));
        WeaponList.Items.Refresh();
        UpdateModWarning(entry, mods);
    }

    private void UpdateModWarning(ItemEntry entry, int[] mods)
    {
        List<int> missing = _index.MissingModuleSprites(mods);
        ModWarningText.Text = missing.Count == 0
            ? string.Empty
            : "Fallback sprites (module " + string.Join(", ", missing) + ")";
    }

    private void ResetModsButton_Click(object sender, RoutedEventArgs e)
    {
        if (_selectedWeaponSlot < 0) return;
        var entry = _weapons.FirstOrDefault(w => w.Slot == _selectedWeaponSlot);
        if (entry == null) return;

        int[] defaults = _index.GetDefaultModules(entry.Id);
        if (defaults.Length < 13) return;

        _suppressModEvents = true;
        try
        {
            for (int n = 0; n < 13; n++)
            {
                if (_wpnMods[n] == null)
                {
                    _wpnMods[n] = new JsonArray();
                    _root["ag_inv_wpn_mod_" + (n + 1)] = _wpnMods[n];
                }
                while (_wpnMods[n].Count <= _selectedWeaponSlot)
                    _wpnMods[n].Add(JsonValue.Create(0));
                _wpnMods[n][_selectedWeaponSlot] = JsonValue.Create(defaults[n]);
                _modBoxes[n].Text = defaults[n].ToString();
            }
        }
        finally
        {
            _suppressModEvents = false;
        }
        UpdateModNames(entry.Id);
        RebuildSelectedWeaponPreview(entry);
        Status("Reset weapon " + entry.Internal + " to default modules.");
    }

    private void ApplyButton_Click(object sender, RoutedEventArgs e)
    {
        if (WeaponList.SelectedItem is not ItemEntry wep &&
            CharacterList.SelectedItem is not ItemEntry ch &&
            ModuleList.SelectedItem is not ItemEntry mod)
        {
            Status("Select an item first.");
            return;
        }
        ItemEntry entry = WeaponList.SelectedItem as ItemEntry ??
                          CharacterList.SelectedItem as ItemEntry ??
                          ModuleList.SelectedItem as ItemEntry;
        if (!int.TryParse(NewIdBox.Text, out int newId) || newId < 0)
        {
            Status("Invalid ID.");
            return;
        }
        JsonArray arr = entry.Kind == "weapon" ? _wpnIds :
                        entry.Kind == "character" ? _charIds : _modCounts;
        arr[entry.Slot] = JsonValue.Create(newId);
        entry.Id = newId;
        if (entry.Kind == "module")
        {
            entry.Count = newId;
            entry.Detail = "count=" + newId;
        }
        RefreshAll();
        Status($"Slot {entry.Slot} -> ID {newId}");
    }

    private void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        if (_root == null || _currentPath == null)
        {
            Status("Open a save first.");
            return;
        }
        try
        {
            string json = _root.ToJsonString(new JsonSerializerOptions { WriteIndented = false });
            byte[] encrypted = SaveCrypto.Encrypt(json);
            string backup = _currentPath + ".bak";
            if (File.Exists(_currentPath) && !File.Exists(backup))
                File.Copy(_currentPath, backup);
            File.WriteAllBytes(_currentPath, encrypted);
            Status("Saved and encrypted: " + _currentPath);
        }
        catch (Exception ex)
        {
            Status("Error: " + ex.Message);
        }
    }

    private void SearchBox_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
    {
        RefreshWeapons();
        RefreshCharacters();
        RefreshModules();
    }

    private void LanguageBox_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (LanguageBox.SelectedItem is string lang && _index != null)
        {
            _index.CurrentLanguage = lang;
            RefreshAll();
        }
    }

    private void UpdateStats()
    {
        if (_wpnIds == null || _charIds == null)
        {
            StatsText.Text = "Asset index ready. Open a save file to start.";
            return;
        }
        int missing = _weapons.Count(x => x.SpritePath == PlaceholderSprite) +
                      _characters.Count(x => x.SpritePath == PlaceholderSprite) +
                      _modules.Count(x => x.SpritePath == PlaceholderSprite);
        StatsText.Text =
            $"Weapons: {_weapons.Count} | Characters: {_characters.Count} | Modules: {_modules.Count} | Placeholder icons: {missing}";
    }

    private void RawApply_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            _root = JsonNode.Parse(RawBox.Text)?.AsObject()
                ?? throw new InvalidDataException("Raw JSON is empty.");
            _wpnIds = _root["ag_inv_wpn_id"]?.AsArray();
            _charIds = _root["ag_inv_char_id"]?.AsArray();
            _modCounts = _root["ag_inv_modul_count"]?.AsArray();
            for (int n = 0; n < _wpnMods.Length; n++)
                _wpnMods[n] = _root["ag_inv_wpn_mod_" + (n + 1)]?.AsArray();
            if (_wpnIds == null || _charIds == null)
                throw new InvalidDataException("ag_inv_wpn_id / ag_inv_char_id not found.");
            RefreshAll();
            RawReload();
            Status("Applied raw JSON.");
        }
        catch (Exception ex)
        {
            Status("Error: " + ex.Message);
        }
    }

    private void RawReload_Click(object sender, RoutedEventArgs e)
    {
        RawReload();
    }

    private void RawReload()
    {
        if (_root == null)
        {
            Status("Open a save file first.");
            return;
        }
        RawBox.Text = _root.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
    }

    private void Status(string message) => StatusText.Text = message;
}

public sealed class ItemEntry
{
    public int Slot { get; set; }
    public int Id { get; set; }
    public string Kind { get; set; }
    public string Internal { get; set; }
    public string Display { get; set; }
    public string Detail { get; set; }
    public string SpritePath { get; set; }
    public int Count { get; set; }
}
