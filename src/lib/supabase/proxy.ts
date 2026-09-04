import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          if (headersToSet) {
            Object.entries(headersToSet).forEach(([name, value]) => {
              response.headers.set(name, value);
            });
          }
        },
      },
    },
  );

  // Refresh/verify the cookie-backed session. Authorization is still checked
  // in Server Components / Actions / Route Handlers and by PostgreSQL RLS.
  await supabase.auth.getClaims();

  return response;
}
