import { AuthButton } from "@/components/buttons/auth-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignIn() {
  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Welcome to AllFreedo</CardTitle>
          <CardDescription>
            Sign in to manage your shared tasks with roommates
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <div className="w-full">
            <AuthButton />
          </div>
          <div className="text-center text-sm">
            Don't have an account? Sign in with Google to create one automatically
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
