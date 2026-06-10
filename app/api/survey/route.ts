export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      q1_reality,
      q2_overwhelm,
      q3_remove,
      q4_no_stress,
      q5_must_do,
      q6_dealbreaker,
      q7_early_access,
      q8_willing_to_test,
      q9_email,
      source,
    } = body

    // --- Validation ---

    // Q1: must be array with 1-2 selections
    if (!Array.isArray(q1_reality) || q1_reality.length === 0 || q1_reality.length > 2) {
      return Response.json(
        { success: false, message: "Please select 1-2 options for question 1." },
        { status: 400 }
      )
    }

    // Q2: integer 1-10
    const score = Number(q2_overwhelm)
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      return Response.json(
        { success: false, message: "Please rate your overwhelm level (1-10)." },
        { status: 400 }
      )
    }

    // Q3-Q6: allow empty strings per spec
    const trimQ3 = typeof q3_remove === "string" ? q3_remove.trim() : ""
    const trimQ4 = typeof q4_no_stress === "string" ? q4_no_stress.trim() : ""
    const trimQ5 = typeof q5_must_do === "string" ? q5_must_do.trim() : ""
    const trimQ6 = typeof q6_dealbreaker === "string" ? q6_dealbreaker.trim() : ""

    // Q7 & Q8: must be answered
    if (!q7_early_access || typeof q7_early_access !== "string") {
      return Response.json(
        { success: false, message: "Please answer question 7." },
        { status: 400 }
      )
    }
    if (!q8_willing_to_test || typeof q8_willing_to_test !== "string") {
      return Response.json(
        { success: false, message: "Please answer question 8." },
        { status: 400 }
      )
    }

    // Q9: optional email, but if present must be valid format
    const trimEmail = typeof q9_email === "string" ? q9_email.trim() : ""
    if (trimEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      return Response.json(
        { success: false, message: "Please enter a valid email address or leave it blank." },
        { status: 400 }
      )
    }

    // --- Map booleans for respondent block ---
    const wantsUpdates =
      q7_early_access === "Yes -- I'd love to see it." ||
      q7_early_access === "Maybe -- depends on what it does."
    const wantsBeta =
      q8_willing_to_test === "Yes" || q8_willing_to_test === "Maybe"

    // --- Build payload per spec ---
    const payload = {
      product: "easycaseload",
      event: "survey_submission",
      schema_version: "1.0",
      survey_id: "easycaseload_itinerant_v1",
      survey_version: "v1.0",
      submitted_at: new Date().toISOString(),
      source: {
        origin: source?.origin || "",
        page_path: source?.page_path || "",
        referrer: source?.referrer || "",
        ...(source?.utm ? { utm: source.utm } : {}),
      },
      answers: {
        pain_themes: q1_reality as string[],
        overwhelm_score_1_10: score,
        remove_tomorrow: trimQ3,
        life_without_paperwork: trimQ4,
        must_do: trimQ5,
        would_not_use_if: trimQ6,
      },
      respondent: {
        wants_updates: wantsUpdates,
        wants_beta: wantsBeta,
        email: trimEmail,
      },
      raw: {
        q1_which_statement_feels_most_true: q1_reality,
        q2_overwhelm_scale_1_10: score,
        q3_remove_one_part_of_workload: trimQ3,
        q4_life_without_paperwork_stress: trimQ4,
        q5_tool_must_do: trimQ5,
        q6_would_not_use_if: trimQ6,
        q7_early_access: q7_early_access,
        q8_willing_to_test: q8_willing_to_test,
        q9_email: trimEmail,
      },
    }

    const webhookUrl = process.env.SURVEY_WEBHOOK_URL
    const apiKey = process.env.SURVEY_WEBHOOK_API_KEY

    if (!webhookUrl) {
      console.error("Missing SURVEY_WEBHOOK_URL environment variable")
      return Response.json(
        { success: false, message: "Server configuration error. Please try again later." },
        { status: 500 }
      )
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (apiKey) {
      headers["x-api-key"] = apiKey
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      let data
      try {
        data = await response.json()
      } catch {
        // Some webhooks return empty body on success
        data = { success: true }
      }

      if (data.success !== false) {
        return Response.json({
          success: true,
          message:
            data.message ||
            "Thank you for completing the survey! Your feedback is invaluable.",
        })
      }

      return Response.json(data)
    }

    return Response.json(
      {
        success: false,
        message: "Something went wrong. Please try again.",
      },
      { status: response.status }
    )
  } catch {
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
