import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getRoomieByAuthId } from "@/app/actions/roomies";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    
    // Exchange the auth code for user session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Get user from session to check if they have a profile
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Session: ", user);
      if (user) {
        // Check if user has a roomie profile
        const { data: roomie } = await getRoomieByAuthId(user.id);
        console.log("Roomie: ", roomie);
        // Redirect to create profile if no roomie exists
        if (!roomie) {
          return NextResponse.redirect(new URL("/create-profile", requestUrl.origin));
        }
      }
    }
  }

  // If there is no roomie profile check needed or the user already has a profile, 
  // redirect to the dashboard
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
