import { SignInForm } from "./SignInForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const devMode = !process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV !== "production";
  return <SignInForm devMode={devMode} next={(await searchParams).next ?? "/"} />;
}
