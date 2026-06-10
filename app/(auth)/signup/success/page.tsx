import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="w-full max-w-sm">
      <Card className="border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Check your email</CardTitle>
          <CardDescription>
            We sent you a confirmation link
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please check your email and click the confirmation link to activate your account. Once confirmed, you can sign in.
          </p>
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
