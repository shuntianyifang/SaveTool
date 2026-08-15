using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace PowSaveEditor;

public sealed class CompositeRenderResult
{
    public BitmapSource Bitmap { get; set; }
    public List<int> MissingModuleIds { get; set; } = new();
}

public static class WeaponCompositeRenderer
{
    // Order follows AG_Func.Spawn_Ico_WPN_v3: slot 6 first, then body,
    // then 12, 11, 4, 2, 9, 7, 8, 10, 3, 5, 13. Slot 1 is drawn last so the
    // magazine/ammo overlay lands on top, matching the in-game icon.
    private static readonly int[] ModuleDrawOrder = { 6, 12, 11, 4, 2, 9, 7, 8, 10, 3, 5, 13, 1 };

    private static readonly BitmapSource TransparentPixel = CreateTransparentPixel();

    public static string RenderToFile(
        AssetIndex index, int weaponId, int[] mods, string baseFile, string mode = "ui")
    {
        CompositeRenderResult result = Render(index, weaponId, mods, baseFile, mode);
        if (result == null) return null;

        string dir = Path.Combine(index.BasePath, "sprites", "composite");
        Directory.CreateDirectory(dir);
        string sig = string.Join("_", mods ?? Array.Empty<int>());
        string modeTag = string.Equals(mode, "item", StringComparison.OrdinalIgnoreCase)
            ? "_item"
            : string.Empty;
        string file = Path.Combine(dir, "wpn_" + weaponId + modeTag + "_" + sig + ".png");

        var encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(result.Bitmap));
        using var stream = File.Create(file);
        encoder.Save(stream);
        return file;
    }

    public static CompositeRenderResult Render(
        AssetIndex index, int weaponId, int[] mods, string baseFile, string mode = "ui")
    {
        if (index == null || mods == null) return null;

        var items = new List<RenderItem>();
        var missing = new List<int>();

        AddModule(index, items, missing, weaponId, mods, ModuleDrawOrder[0], mode);
        AddBase(index, items, baseFile);
        for (int i = 1; i < ModuleDrawOrder.Length; i++)
            AddModule(index, items, missing, weaponId, mods, ModuleDrawOrder[i], mode);

        if (items.Count == 0) return null;

        double minX = double.MaxValue, minY = double.MaxValue;
        double maxX = double.MinValue, maxY = double.MinValue;
        foreach (RenderItem item in items)
        {
            double left = item.CenterX - item.Image.PixelWidth / 2d;
            double right = item.CenterX + item.Image.PixelWidth / 2d;
            double top = item.CenterY - item.Image.PixelHeight / 2d;
            double bottom = item.CenterY + item.Image.PixelHeight / 2d;
            minX = Math.Min(minX, left);
            minY = Math.Min(minY, top);
            maxX = Math.Max(maxX, right);
            maxY = Math.Max(maxY, bottom);
        }

        minX -= 1;
        minY -= 1;
        maxX += 1;
        maxY += 1;
        int canvasW = Math.Max(1, (int)Math.Ceiling(maxX - minX));
        int canvasH = Math.Max(1, (int)Math.Ceiling(maxY - minY));

        var visual = new DrawingVisual();
        using (DrawingContext dc = visual.RenderOpen())
        {
            foreach (RenderItem item in items)
            {
                double x = item.CenterX - minX - item.Image.PixelWidth / 2d;
                double y = item.CenterY - minY - item.Image.PixelHeight / 2d;
                dc.DrawImage(item.Image, new Rect(x, y, item.Image.PixelWidth, item.Image.PixelHeight));
            }
        }

        var bitmap = new RenderTargetBitmap(canvasW, canvasH, 96, 96, PixelFormats.Pbgra32);
        bitmap.Render(visual);
        return new CompositeRenderResult { Bitmap = bitmap, MissingModuleIds = missing };
    }

    private static void AddBase(AssetIndex index, List<RenderItem> items, string baseFile)
    {
        BitmapSource image = LoadImage(baseFile) ?? LoadPlaceholder(index);
        items.Add(new RenderItem
        {
            Image = image,
            CenterX = 0,
            CenterY = 0,
            Slot = 0
        });
    }

    private static void AddModule(
        AssetIndex index,
        List<RenderItem> items,
        List<int> missing,
        int weaponId,
        int[] mods,
        int slot,
        string mode)
    {
        if (slot < 1 || slot > 13 || mods.Length < slot) return;
        int modId = mods[slot - 1];
        if (modId <= 0) return;

        float[] pos = index.GetModuleUiPositionOverride(modId, slot);
        if (pos == null)
        {
            pos = string.Equals(mode, "item", StringComparison.OrdinalIgnoreCase)
                ? index.GetWeaponItemModPosition(weaponId, slot)
                : index.GetWeaponModPosition(weaponId, slot);
        }
        if (pos == null || pos.Length < 2) return;

        BitmapSource image = LoadImage(index.GetModuleSpriteFile(modId)) ?? LoadPlaceholder(index);
        if (!index.IsModuleSpriteExact(modId) && !missing.Contains(modId))
            missing.Add(modId);

        items.Add(new RenderItem
        {
            Image = image,
            CenterX = pos[0],
            CenterY = -pos[1],
            Slot = slot,
            ModId = modId
        });
    }

    private static BitmapSource LoadPlaceholder(AssetIndex index)
    {
        string path = Path.Combine(index.BasePath, "sprites", "placeholder.png");
        return LoadImage(path) ?? TransparentPixel;
    }

    private static BitmapSource LoadImage(string path)
    {
        if (string.IsNullOrEmpty(path) || !File.Exists(path)) return null;
        try
        {
            var image = new BitmapImage();
            image.BeginInit();
            image.CacheOption = BitmapCacheOption.OnLoad;
            image.UriSource = new Uri(path);
            image.EndInit();
            image.Freeze();
            return image;
        }
        catch
        {
            return null;
        }
    }

    private static BitmapSource CreateTransparentPixel()
    {
        var pixel = BitmapSource.Create(
            1, 1, 96, 96, PixelFormats.Pbgra32, null,
            new byte[] { 0, 0, 0, 0 }, 4);
        pixel.Freeze();
        return pixel;
    }

    private sealed class RenderItem
    {
        public BitmapSource Image { get; set; }
        public double CenterX { get; set; }
        public double CenterY { get; set; }
        public int Slot { get; set; }
        public int ModId { get; set; }
    }
}
