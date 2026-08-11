using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

internal static class Program
{
    private const string SaveMagic = "POWSAVE1";
    private const string MigrationMagic = "POWMIGR1";
    private const int HeaderSize = 14;
    private const int IvSize = 16;
    private const int HmacSize = 32;

    private static readonly byte[] MasterKey =
        HexToBytes("71A42C19D3588EB14FC625906D33FA07C25BE841169D74AB38F063CE8512D74A");

    private static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            PrintUsage();
            return 2;
        }

        string command = args[0].ToLowerInvariant();
        try
        {
            return command switch
            {
                "unpack" or "decrypt" => Unpack(args),
                "pack" or "encrypt" => Pack(args),
                "verify" or "check" => Verify(args),
                _ => UnknownCommand(command)
            };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Error: " + ex.Message);
            return 1;
        }
    }

    private static int Unpack(string[] args)
    {
        string input = args[1];
        string output = args.Length > 2 ? args[2] : "save_unpack.json";

        byte[] file = File.ReadAllBytes(input);
        var (magic, aesKey, hmacKey) = ResolveKeys(file);

        if (file.Length < HeaderSize + IvSize + HmacSize)
            throw new InvalidDataException("File is too small to be an encrypted save.");

        long storedPayloadLength = BitConverter.ToUInt32(file, 10);
        long expectedPayloadLength = file.Length - (HeaderSize + IvSize + HmacSize);
        if (storedPayloadLength != expectedPayloadLength)
            throw new InvalidDataException(
                $"Header length mismatch: header says {storedPayloadLength}, file implies {expectedPayloadLength}.");

        byte[] iv = file[HeaderSize..(HeaderSize + IvSize)];
        byte[] cipher = file[(HeaderSize + IvSize)..(HeaderSize + IvSize + (int)storedPayloadLength)];
        byte[] storedHmac = file[^HmacSize..];

        byte[] computedHmac;
        using (var hmac = new HMACSHA256(hmacKey))
            computedHmac = hmac.ComputeHash(file, 0, file.Length - HmacSize);

        if (!CryptographicOperations.FixedTimeEquals(computedHmac, storedHmac))
            throw new InvalidDataException("HMAC verification failed; the file is corrupt or was modified.");

        byte[] plain = AesTransform(cipher, iv, aesKey, decrypt: true);
        string json = new UTF8Encoding(false).GetString(plain);
        using (JsonDocument.Parse(json))
        {
        }

        File.WriteAllText(output, json, new UTF8Encoding(false));
        Console.WriteLine($"Unpacked OK: {output}");
        Console.WriteLine($"  magic    : {magic}");
        Console.WriteLine($"  payload  : {storedPayloadLength} bytes");
        Console.WriteLine($"  json     : {plain.Length} bytes");
        return 0;
    }

    private static int Pack(string[] args)
    {
        string input = args[1];
        string output = null;
        bool migration = false;
        foreach (string a in args.Skip(2))
        {
            if (a.Equals("--migration", StringComparison.OrdinalIgnoreCase))
                migration = true;
            else if (output == null)
                output = a;
            else
                throw new ArgumentException("Too many arguments.");
        }

        output ??= migration ? "render_cache.dat" : "save_file";
        string magic = migration ? MigrationMagic : SaveMagic;
        string aesPurpose = migration ? "POW_MIGRATION_AES_KEY" : "POW_SAVE_AES_KEY";
        string hmacPurpose = migration ? "POW_MIGRATION_HMAC_KEY" : "POW_SAVE_HMAC_KEY";

        string json = File.ReadAllText(input);
        using (JsonDocument.Parse(json))
        {
        }

        byte[] plain = new UTF8Encoding(false).GetBytes(json);
        byte[] iv = new byte[IvSize];
        RandomNumberGenerator.Fill(iv);
        byte[] cipher = AesTransform(plain, iv, DeriveKey(aesPurpose), decrypt: false);

        byte[] header = new byte[HeaderSize];
        Encoding.ASCII.GetBytes(magic, 0, magic.Length, header, 0);
        header[8] = 1;
        header[9] = 0x10;
        BitConverter.GetBytes((uint)cipher.Length).CopyTo(header, 10);

        byte[] body = new byte[header.Length + iv.Length + cipher.Length];
        Buffer.BlockCopy(header, 0, body, 0, header.Length);
        Buffer.BlockCopy(iv, 0, body, header.Length, iv.Length);
        Buffer.BlockCopy(cipher, 0, body, header.Length + iv.Length, cipher.Length);

        byte[] hmac;
        using (var h = new HMACSHA256(DeriveKey(hmacPurpose)))
            hmac = h.ComputeHash(body);

        byte[] result = new byte[body.Length + hmac.Length];
        Buffer.BlockCopy(body, 0, result, 0, body.Length);
        Buffer.BlockCopy(hmac, 0, result, body.Length, hmac.Length);
        File.WriteAllBytes(output, result);

        Console.WriteLine($"Packed OK: {output}");
        Console.WriteLine($"  magic    : {magic}");
        Console.WriteLine($"  json     : {plain.Length} bytes");
        Console.WriteLine($"  payload  : {cipher.Length} bytes");
        return 0;
    }

    private static int Verify(string[] args)
    {
        string input = args[1];
        byte[] file = File.ReadAllBytes(input);
        var (magic, _, hmacKey) = ResolveKeys(file);

        if (file.Length < HeaderSize + IvSize + HmacSize)
            throw new InvalidDataException("File is too small to be an encrypted save.");

        long storedPayloadLength = BitConverter.ToUInt32(file, 10);
        long expectedPayloadLength = file.Length - (HeaderSize + IvSize + HmacSize);
        if (storedPayloadLength != expectedPayloadLength)
            throw new InvalidDataException(
                $"Header length mismatch: header says {storedPayloadLength}, file implies {expectedPayloadLength}.");

        byte[] storedHmac = file[^HmacSize..];
        byte[] computedHmac;
        using (var hmac = new HMACSHA256(hmacKey))
            computedHmac = hmac.ComputeHash(file, 0, file.Length - HmacSize);

        if (!CryptographicOperations.FixedTimeEquals(computedHmac, storedHmac))
            throw new InvalidDataException("HMAC verification failed.");

        Console.WriteLine($"Verify OK: {input}");
        Console.WriteLine($"  magic    : {magic}");
        Console.WriteLine($"  payload  : {storedPayloadLength} bytes");
        return 0;
    }

    private static (string Magic, byte[] AesKey, byte[] HmacKey) ResolveKeys(byte[] file)
    {
        if (file.Length < 8)
            throw new InvalidDataException("File is too small.");

        string magic = Encoding.ASCII.GetString(file, 0, 8);
        if (magic == SaveMagic)
            return (SaveMagic, DeriveKey("POW_SAVE_AES_KEY"), DeriveKey("POW_SAVE_HMAC_KEY"));
        if (magic == MigrationMagic)
            return (MigrationMagic, DeriveKey("POW_MIGRATION_AES_KEY"), DeriveKey("POW_MIGRATION_HMAC_KEY"));

        throw new InvalidDataException($"Unrecognized magic '{magic}'. Expected {SaveMagic} or {MigrationMagic}.");
    }

    private static byte[] DeriveKey(string purpose)
    {
        using var hmac = new HMACSHA256(MasterKey);
        return hmac.ComputeHash(Encoding.UTF8.GetBytes(purpose));
    }

    private static byte[] AesTransform(byte[] data, byte[] iv, byte[] key, bool decrypt)
    {
        using var aes = Aes.Create();
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.Key = key;
        aes.IV = iv;

        using var transform = decrypt ? aes.CreateDecryptor() : aes.CreateEncryptor();
        return transform.TransformFinalBlock(data, 0, data.Length);
    }

    private static byte[] HexToBytes(string hex)
    {
        byte[] result = new byte[hex.Length / 2];
        for (int i = 0; i < result.Length; i++)
            result[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
        return result;
    }

    private static int UnknownCommand(string command)
    {
        Console.Error.WriteLine("Unknown command: " + command);
        PrintUsage();
        return 2;
    }

    private static void PrintUsage()
    {
        Console.WriteLine(
            """
            Pawns of War save tool

            Usage:
              SaveTool unpack <encrypted-file> [output.json]
              SaveTool pack <input.json> [output-file] [--migration]
              SaveTool verify <encrypted-file>

            Examples:
              SaveTool unpack save_file save_unpack.json
              SaveTool pack save_unpack.json          # writes save_file
              SaveTool pack save_unpack.json save_file.new
              SaveTool pack migration.json render_cache.dat --migration
              SaveTool verify save_file
            """);
    }
}
