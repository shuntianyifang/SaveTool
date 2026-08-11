using System.Security.Cryptography;
using System.Text;
using System.IO;

namespace PowSaveEditor;

public static class SaveCrypto
{
    private static readonly byte[] FileMagic = Encoding.ASCII.GetBytes("POWSAVE1");
    private static readonly byte[] MasterKey = HexToBytes(
        "71A42C19D3588EB14FC625906D33FA07C25BE841169D74AB38F063CE8512D74A");
    private static readonly byte[] AesKey = Derive("POW_SAVE_AES_KEY");
    private static readonly byte[] HmacKey = Derive("POW_SAVE_HMAC_KEY");

    public static bool IsEncrypted(byte[] data)
    {
        return data != null && data.Length >= 62 &&
               data.AsSpan(0, 8).SequenceEqual(FileMagic);
    }

    public static string Decrypt(byte[] data)
    {
        if (!IsEncrypted(data))
            throw new InvalidDataException("Not a POWSAVE1 save file.");

        int cipherLen = BitConverter.ToInt32(data, 10);
        int expected = 14 + 16 + cipherLen + 32;
        if (cipherLen <= 0 || cipherLen % 16 != 0 || data.Length != expected)
            throw new InvalidDataException("Invalid encrypted payload length.");

        byte[] expectedHmac = data.AsSpan(data.Length - 32).ToArray();
        byte[] actualHmac;
        using (var hmac = new HMACSHA256(HmacKey))
            actualHmac = hmac.ComputeHash(data, 0, data.Length - 32);
        if (!CryptographicOperations.FixedTimeEquals(expectedHmac, actualHmac))
            throw new InvalidDataException("HMAC verification failed.");

        byte[] iv = data.AsSpan(14, 16).ToArray();
        byte[] cipher = data.AsSpan(30, cipherLen).ToArray();
        using var aes = Aes.Create();
        aes.Key = AesKey;
        aes.IV = iv;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        using var dec = aes.CreateDecryptor();
        byte[] plain = dec.TransformFinalBlock(cipher, 0, cipher.Length);
        return Encoding.UTF8.GetString(plain);
    }

    public static byte[] Encrypt(string json)
    {
        byte[] plain = Encoding.UTF8.GetBytes(json);
        using var aes = Aes.Create();
        aes.Key = AesKey;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.GenerateIV();
        byte[] iv = aes.IV;
        using var enc = aes.CreateEncryptor();
        byte[] cipher = enc.TransformFinalBlock(plain, 0, plain.Length);

        byte[] body = new byte[30 + cipher.Length];
        FileMagic.CopyTo(body, 0);
        body[8] = 1;
        body[9] = 0x10;
        BitConverter.GetBytes(cipher.Length).CopyTo(body, 10);
        iv.CopyTo(body, 14);
        cipher.CopyTo(body, 30);

        using var hmac = new HMACSHA256(HmacKey);
        byte[] sig = hmac.ComputeHash(body);
        byte[] result = new byte[body.Length + 32];
        body.CopyTo(result, 0);
        sig.CopyTo(result, body.Length);
        return result;
    }

    private static byte[] Derive(string purpose)
    {
        using var hmac = new HMACSHA256(MasterKey);
        return hmac.ComputeHash(Encoding.UTF8.GetBytes(purpose));
    }

    private static byte[] HexToBytes(string hex)
    {
        byte[] bytes = new byte[hex.Length / 2];
        for (int i = 0; i < bytes.Length; i++)
            bytes[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
        return bytes;
    }
}
