export function getClientIp(req: Request): string {
  // Check common headers for client IP
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return normalizeIp(ip);
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return normalizeIp(realIp.trim());

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return normalizeIp(cfConnectingIp.trim());

  // Check host header
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return "127.0.0.1";
  }

  return normalizeIp(hostname || "127.0.0.1");
}

export function normalizeIp(ip: string): string {
  // Normalize IPv6 localhost
  if (ip === "::1" || ip === "::ffff:127.0.0.1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
  return ip;
}

export function isLocalhost(req: Request): boolean {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  const clientIp = getClientIp(req);

  const isLocalHostName = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  const isLocalIp = clientIp === "127.0.0.1" || clientIp === "::1";

  return isLocalHostName && isLocalIp;
}

export function isIpAllowed(clientIp: string, allowedIpsStr: string): boolean {
  if (!allowedIpsStr || !allowedIpsStr.trim()) return false;

  const clientNormalized = normalizeIp(clientIp);
  const allowedList = allowedIpsStr
    .split(/[\n,;]+/)
    .map((s) => normalizeIp(s.trim()))
    .filter(Boolean);

  // If list contains 127.0.0.1, also consider localhost
  return allowedList.some((allowed) => {
    if (allowed === clientNormalized) return true;
    if (allowed === "localhost" && (clientNormalized === "127.0.0.1" || clientNormalized === "::1")) return true;
    if ((allowed === "127.0.0.1" || allowed === "::1") && (clientNormalized === "127.0.0.1" || clientNormalized === "::1")) return true;
    return false;
  });
}
