import { isDemoSignInAllowed } from "@/lib/supabase/server";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <SignInForm devMode={isDemoSignInAllowed()} next={(await searchParams).next ?? "/"} />;
}
