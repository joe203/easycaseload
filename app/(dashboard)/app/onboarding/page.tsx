import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import Link from "next/link"

export default function OnboardingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome to EasyCaseload
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let&apos;s get your caseload set up.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
            <MessageCircle className="h-5 w-5 text-accent" />
          </div>
          <CardTitle className="text-base font-medium">
            Savannah will meet you right here
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            Very soon, this is where you&apos;ll simply talk — tell Savannah
            your name, your schools, and your students, and she&apos;ll set
            everything up for you. Until she arrives, you can add schools and
            students yourself:
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/app/schools">Add a school</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/app/students">Add students</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
