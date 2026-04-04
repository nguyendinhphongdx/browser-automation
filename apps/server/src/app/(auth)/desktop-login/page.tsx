"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Globe, CheckCircle, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DesktopLoginPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const rawCallback = searchParams.get("callback") || "browserauto://auth";
  // Only allow browserauto:// scheme to prevent open redirect attacks
  const callback = rawCallback.startsWith("browserauto://") ? rawCallback : "browserauto://auth";

  // Nếu đã có session (NextAuth), tạo JWT và redirect
  useEffect(() => {
    if (session?.user?.email && !success) {
      exchangeSessionForToken();
    }
  }, [session]);

  async function exchangeSessionForToken() {
    try {
      const res = await fetch("/api/auth/desktop-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session?.user?.email }),
      });

      if (!res.ok) throw new Error("Không thể tạo token");

      const { token, user } = await res.json();
      setSuccess(true);

      // Redirect về desktop app qua deep link
      const redirectUrl = `${callback}?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || "")}`;
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCredentialLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // Dùng custom API thay vì NextAuth credentials để lấy JWT trực tiếp
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      const { token, user } = await res.json();
      setSuccess(true);

      const redirectUrl = `${callback}?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || "")}`;
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-muted/50">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Đăng nhập thành công!</CardTitle>
            <CardDescription>
              Đang chuyển hướng về BrowserAuto Desktop...
              <br />
              Bạn có thể đóng tab này.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-muted/50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="h-6 w-6" />
            <span className="font-bold text-xl">BrowserAuto</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1 mx-auto w-fit">
            <Monitor className="h-3 w-3" />
            Đăng nhập cho Desktop App
          </div>
          <CardTitle className="mt-3">Đăng nhập</CardTitle>
          <CardDescription>
            Đăng nhập để kết nối với Desktop App
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCredentialLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="********"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">hoặc</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              signIn("google", {
                callbackUrl: `/desktop-login?callback=${encodeURIComponent(callback)}`,
              })
            }
          >
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              signIn("github", {
                callbackUrl: `/desktop-login?callback=${encodeURIComponent(callback)}`,
              })
            }
          >
            Continue with GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
