import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser();

    // Define public paths that don't require authentication
    const publicPaths = ['/sign-in', '/auth'];
    const isPublicPath = publicPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    );

    // If user is not authenticated and trying to access protected route
    if (!user && !isPublicPath) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // If user is authenticated and trying to access auth pages
    if (user && isPublicPath) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return response;
  } catch (e) {
    // If there's an error, allow the request to continue
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
