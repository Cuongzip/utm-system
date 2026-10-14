import type { Metadata } from "next";
import SignInCard from "@/components/auth/SignInCard";

export const metadata: Metadata = {
  title: "Đăng nhập - UTM System",
  description: "Đăng nhập hệ thống điều hành không gian bay không người lái UTM",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-[#f8fafc] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-200/50 via-slate-100/20 to-transparent" />
      <div className="relative z-10 w-full flex items-center justify-center">
        <SignInCard />
      </div>
    </main>
  );
}
