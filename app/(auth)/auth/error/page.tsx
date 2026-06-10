import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="w-full max-w-sm">
      <Card className="border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {params?.error ? (
            <p className="text-sm text-muted-foreground">
              Error: {params.error}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred during authentication.
            </p>
          )}
          <Link
            href="/signin"
            className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
