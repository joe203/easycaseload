"use client"

import { sendPhoneCode, verifyPhoneCode } from "@/lib/actions/phone-verification"
import { normalizeUsPhone, maskPhone } from "@/lib/phone"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const RESEND_COOLDOWN_SECONDS = 60

export function VerifyPhoneForm({ initialPhone }: { initialPhone: string }) {
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [phone, setPhone] = useState(initialPhone)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const normalized = normalizeUsPhone(phone)
    if (!normalized) {
      setError("Enter a valid US mobile number")
      return
    }
    setIsLoading(true)
    setError(null)

    const { error } = await sendPhoneCode(normalized)
    setIsLoading(false)
    if (error) {
      setError(error)
      return
    }
    setCode("")
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setStep("code")
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    setIsLoading(true)
    setError(null)

    const { error } = await verifyPhoneCode(code)
    setIsLoading(false)
    if (error) {
      setError(error)
      setCode("")
      return
    }
    router.push("/app/dashboard")
  }

  return (
    <div className="w-full max-w-sm">
      <Card className="border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Verify your phone</CardTitle>
          <CardDescription>
            {step === "phone"
              ? "EasyCaseload works over text — log sessions by texting us between visits. Confirm your mobile number to continue."
              : `We texted a 6-digit code to ${maskPhone(normalizeUsPhone(phone) ?? phone)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendCode}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Mobile number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(555) 123-4567"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending code..." : "Text me a code"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <div className="flex flex-col gap-4">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <p className="text-center text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
                  {isLoading ? "Verifying..." : "Verify"}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => {
                      setStep("phone")
                      setError(null)
                    }}
                  >
                    Change number
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={cooldown > 0 || isLoading}
                    onClick={() => handleSendCode()}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
