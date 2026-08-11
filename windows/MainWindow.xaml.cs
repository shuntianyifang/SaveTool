using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Windows;
using Microsoft.Win32;

namespace PowSaveEditor;

public partial class MainWindow : Window
{
    private readonly AssetIndex _index;
    private JsonObject _root;
    private JsonArray _wpnIds;
    private JsonArray _charIds;
    private List<ItemEntry> _weapons = new();
    private List<ItemEntry> _characters = new();
    private string _currentPath;

    public MainWindow()
    {
        InitializeComponent();
        string basePath = @"D:\POW\assets";
        _index = new AssetIndex(basePath);
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
            if (_wpnIds == null || _charIds == null)
                throw new InvalidDataException("ag_inv_wpn_id / ag_inv_char_id not found.");
            _currentPath = dlg.FileName;
            RefreshAll();
            Status("Loaded " + dlg.FileName);
        }
        catch (Exception ex)
        {
            Status("Error: " + ex.Message);
        }
    }

    private void RefreshAll()
    {
        _weapons = BuildEntries(_wpnIds, _index.Weapon, "weapon");
        _characters = BuildEntries(_charIds, _index.Character, "character");
        RefreshWeapons();
        RefreshCharacters();
    }

    private void RefreshWeapons()
    {
        string q = SearchBox.Text?.Trim().ToLowerInvariant();
        var list = _weapons.Where(x => string.IsNullOrEmpty(q) ||
            x.Display.ToLowerInvariant().Contains(q) ||
            (x.Internal ?? "").ToLowerInvariant().Contains(q)).ToList();
        WeaponList.ItemsSource = list;
    }

    private void RefreshCharacters()
    {
        string q = SearchBox.Text?.Trim().ToLowerInvariant();
        var list = _characters.Where(x => string.IsNullOrEmpty(q) ||
            x.Display.ToLowerInvariant().Contains(q) ||
            (x.Internal ?? "").ToLowerInvariant().Contains(q)).ToList();
        CharacterList.ItemsSource = list;
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
                SpritePath = File.Exists(info.SpriteFile) ? info.SpriteFile : null
            });
        }
        return result;
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

    private void ShowDetail(ItemEntry entry)
    {
        SlotBox.Text = entry.Slot.ToString();
        IdBox.Text = entry.Id.ToString();
        NameBox.Text = entry.Internal;
        NewIdBox.Text = entry.Id.ToString();
        PreviewImage.Source = string.IsNullOrEmpty(entry.SpritePath)
            ? null
            : new System.Windows.Media.Imaging.BitmapImage(new Uri(entry.SpritePath));
    }

    private void ApplyButton_Click(object sender, RoutedEventArgs e)
    {
        if (WeaponList.SelectedItem is not ItemEntry wep && CharacterList.SelectedItem is not ItemEntry ch)
        {
            Status("Select an item first.");
            return;
        }
        ItemEntry entry = WeaponList.SelectedItem as ItemEntry ?? CharacterList.SelectedItem as ItemEntry;
        if (!int.TryParse(NewIdBox.Text, out int newId) || newId < 0)
        {
            Status("Invalid ID.");
            return;
        }
        JsonArray arr = entry.Kind == "weapon" ? _wpnIds : _charIds;
        arr[entry.Slot] = JsonValue.Create(newId);
        entry.Id = newId;
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
    }

    private void LanguageBox_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (LanguageBox.SelectedItem is string lang && _index != null)
        {
            _index.CurrentLanguage = lang;
            RefreshAll();
        }
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
}
