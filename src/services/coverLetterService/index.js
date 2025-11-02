const { axios, config, logger } = require("../chatgptService/dependencies");

const SYSTEM_PROMPT = `You are an expert recruiter and career coach in 2025. Generate an ATS-friendly, one-page cover letter in semantic HTML (no external CSS, no images, single column). Use standard fonts (Arial/Calibri/Times), 10-12pt equivalent. Follow structure: header (candidate + employer details), greeting, intro, 2 short body paragraphs or bullet list with quantified achievements, closing, professional sign-off. Strictly avoid tables, complex styling, or non-standard characters. Keep 250-400 words. Ensure keywords from JD are mirrored naturally. Return ONLY valid HTML snippet inside <section>...</section>.`;

function buildUserPrompt({
  mode,
  resumeText,
  jobDescription,
  targetJobTitle,
  companyName,
}) {
  const common = `Target Job Title: ${targetJobTitle || ""}\nCompany: ${
    companyName || ""
  }`;
  if (mode === "resume") {
    return `${common}\nCreate a tailored cover letter using ONLY this resume. Extract top 3-4 achievements that match the target role.\nResume:\n"""${resumeText}"""`;
  }
  if (mode === "jd") {
    return `${common}\nCreate a tailored cover letter using ONLY this job description. Mirror the language and selection criteria.\nJob Description:\n"""${jobDescription}"""`;
  }
  return `${common}\nCreate a tailored cover letter by combining the resume with the job description. Emphasize overlap and keywords.\nResume:\n"""${resumeText}"""\nJob Description:\n"""${jobDescription}"""`;
}

async function callOpenAI(messages) {
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
  const body = {
    model: config.model || "gpt-4o-mini",
    messages,
    temperature: 0.2,
    max_tokens: 1200,
  };
  const { data } = await axios.post(config.baseURL, body, { headers });
  const choice = data.choices && data.choices[0];
  const content = choice && choice.message && choice.message.content;
  return content || "";
}

exports.buildCoverLetterHtml = async (params) => {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(params) },
  ];
  try {
    const html = await callOpenAI(messages);
    return html;
  } catch (error) {
    logger.error("Cover letter generation failed", { error: error.message });
    const err = new Error("Failed to generate cover letter");
    err.statusCode = 502;
    throw err;
  }
};
