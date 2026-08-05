import AuthForm from "@/components/auth-form";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/40 p-6">
      {children}
    </div>
  );
}
