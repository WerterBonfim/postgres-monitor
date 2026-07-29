using Microsoft.Extensions.Configuration;
using PostgresMonitor.Core.Services;
using System.Security.Cryptography;
using System.Text;

namespace PostgresMonitor.Infrastructure.Services;

public class CryptoService
{
    private readonly string _encryptionKey;

    public CryptoService(IConfiguration configuration)
    {
        _encryptionKey = configuration["Encryption:Key"]
            ?? Environment.GetEnvironmentVariable("ENCRYPTION_KEY")
            ?? "DefaultEncryptionKey12345678901234567890";
    }

    public string Encrypt(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
        aes.IV = new byte[16]; // Simple IV, in production use random IV

        using var encryptor = aes.CreateEncryptor();
        using var ms = new MemoryStream();
        using var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write);
        using var sw = new StreamWriter(cs);
        sw.Write(plainText);
        sw.Close();
        return Convert.ToBase64String(ms.ToArray());
    }

    public string Decrypt(string cipherText)
    {
        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
        aes.IV = new byte[16]; // Simple IV, in production use random IV

        using var decryptor = aes.CreateDecryptor();
        using var ms = new MemoryStream(Convert.FromBase64String(cipherText));
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs);
        return sr.ReadToEnd();
    }
}
