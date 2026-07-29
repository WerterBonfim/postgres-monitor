using System.Net;
using System.Net.Sockets;

namespace PostgresMonitor.Infrastructure.Helpers;

public static class PortHelper
{
    public static bool IsPortAvailable(int port)
    {
        try
        {
            using var listener = new TcpListener(IPAddress.Loopback, port);
            listener.Start();
            listener.Stop();
            return true;
        }
        catch (SocketException)
        {
            return false;
        }
    }

    public static bool IsPortAvailable(string portString, out int port)
    {
        if (!int.TryParse(portString, out port))
        {
            return false;
        }

        return IsPortAvailable(port);
    }
}
