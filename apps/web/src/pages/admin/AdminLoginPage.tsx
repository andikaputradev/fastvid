import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { AdminNoIndex } from "../../components/admin/AdminNoIndex";
import { FormError } from "../../components/admin/FormError";
import { Button } from "../../components/ui/button";
import { useAdminLogin, useAdminSession } from "../../hooks/useAdminAuth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

type LoginForm = z.infer<typeof loginSchema>;

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAdminSession();
  const login = useAdminLogin();
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const redirectTo =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/admin";

  useEffect(() => {
    if (login.isSuccess) {
      navigate(redirectTo, { replace: true });
    }
  }, [login.isSuccess, navigate, redirectTo]);

  if (session.data !== undefined) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <AdminNoIndex title="Login" />
      <section className="w-full max-w-md rounded-md border border-border bg-card p-6 text-card-foreground shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-bold text-foreground">Admin Login</h1>
        </div>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((values) => {
            login.mutate(values);
          })}
        >
          {login.error ? <FormError error={login.error} /> : null}
          <label className="grid gap-1 text-sm font-medium text-foreground">
            Email
            <input
              type="email"
              autoComplete="username"
              className="h-11 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <span className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.email.message}</span>
            ) : null}
          </label>
          <label className="grid gap-1 text-sm font-medium text-foreground">
            Password
            <input
              type="password"
              autoComplete="current-password"
              className="h-11 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <span className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.password.message}</span>
            ) : null}
          </label>
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
