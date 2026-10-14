
from pathlib import Path
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

# Updated output path to your Windows Downloads folder
OUT = r"C:\Users\KIIT\Downloads\VerityFlow_AI_Builder_Cup_Required_Sections.pptx"

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Palette
NAVY = RGBColor(10, 20, 39)
NAVY2 = RGBColor(17, 32, 57)
PANEL = RGBColor(23, 42, 69)
PANEL2 = RGBColor(28, 51, 80)
TEAL = RGBColor(48, 213, 190)
CYAN = RGBColor(87, 185, 255)
WHITE = RGBColor(242, 247, 252)
MUTED = RGBColor(166, 184, 205)
AMBER = RGBColor(255, 190, 92)
GREEN = RGBColor(117, 222, 168)
RED = RGBColor(255, 111, 125)
LINE = RGBColor(52, 75, 105)
FONT = "Aptos"
HEAD = "Aptos Display"


def bg(slide, color=NAVY):
  slide.background.fill.solid()
  slide.background.fill.fore_color.rgb = color


def shape(slide, x, y, w, h, fill=PANEL, line=LINE, rounded=True):
  typ = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
  sh = slide.shapes.add_shape(typ, Inches(x), Inches(y), Inches(w), Inches(h))
  sh.fill.solid()
  sh.fill.fore_color.rgb = fill
  sh.line.color.rgb = line
  if rounded:
    try:
      sh.adjustments[0] = 0.12
    except Exception:
      pass
  return sh


def txt(
    slide,
    x,
    y,
    w,
    h,
    text,
    size=14,
    color=WHITE,
    bold=False,
    align=PP_ALIGN.LEFT,
    valign=MSO_ANCHOR.TOP,
    font=FONT,
    margin=0.05,
):
  box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
  tf = box.text_frame
  tf.clear()
  tf.word_wrap = True
  tf.margin_left = Inches(margin)
  tf.margin_right = Inches(margin)
  tf.margin_top = Inches(margin)
  tf.margin_bottom = Inches(margin)
  tf.vertical_anchor = valign
  for i, line in enumerate(str(text).split("\n")):
    p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
    p.text = line
    p.font.name = font
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.alignment = align
    p.space_after = Pt(4)
  return box


def card(slide, x, y, w, h, title, body, accent=TEAL, body_size=11):
  shape(slide, x, y, w, h, PANEL, LINE)
  shape(slide, x, y, 0.055, h, accent, accent, False)
  txt(slide, x + 0.18, y + 0.12, w - 0.3, 0.32, title, 13, WHITE, True)
  txt(slide, x + 0.18, y + 0.5, w - 0.32, h - 0.58, body, body_size, MUTED)


def base(section, title, subtitle=None, num=None):
  s = prs.slides.add_slide(prs.slide_layouts[6])
  bg(s)
  txt(s, 0.55, 0.25, 8.8, 0.25, section.upper(), 9, TEAL, True)
  txt(s, 0.55, 0.55, 12.0, 0.5, title, 24, WHITE, True, font=HEAD)
  if subtitle:
    txt(s, 0.58, 1.08, 12.0, 0.38, subtitle, 10, MUTED)
  txt(
      s,
      0.58,
      7.12,
      5.5,
      0.16,
      "Google Cloud AI Builder Cup 2026 • BFSI",
      7,
      MUTED,
  )
  if num:
    txt(s, 12.25, 7.1, 0.45, 0.18, f"{num:02d}", 8, MUTED, align=PP_ALIGN.RIGHT)
  return s


def bullets(slide, x, y, w, h, items, size=12, color=WHITE, gap=7):
  txt(slide, x, y, w, h, "\n".join("•  " + i for i in items), size, color)


# 1 Cover
s = prs.slides.add_slide(prs.slide_layouts[6])
bg(s)
shape(s, 8.95, 0.55, 3.8, 6.2, NAVY2, LINE)
nodes = [
    (9.55, 1.35, "TRANSACTION", CYAN),
    (10.75, 2.35, "ML SIGNAL", TEAL),
    (9.55, 3.45, "EVIDENCE", AMBER),
    (10.85, 4.55, "GEMINI", CYAN),
    (9.9, 5.65, "ANALYST", GREEN),
]
for i in range(len(nodes) - 1):
  x1, y1, _, _ = nodes[i]
  x2, y2, _, _ = nodes[i + 1]
  c = s.shapes.add_connector(
      MSO_CONNECTOR.STRAIGHT,
      Inches(x1 + 0.55),
      Inches(y1 + 0.24),
      Inches(x2 + 0.55),
      Inches(y2 + 0.24),
  )
  c.line.color.rgb = LINE
  c.line.width = Pt(2)
for x, y, label, col in nodes:
  shape(s, x, y, 1.65, 0.48, PANEL2, col)
  txt(
      s,
      x + 0.05,
      y + 0.12,
      1.55,
      0.2,
      label,
      8,
      col,
      True,
      PP_ALIGN.CENTER,
      MSO_ANCHOR.MIDDLE,
      margin=0,
  )
txt(
    s,
    0.8,
    0.75,
    7.6,
    0.3,
    "GOOGLE CLOUD AI BUILDER CUP 2026  /  BFSI",
    10,
    TEAL,
    True,
)
txt(s, 0.8, 1.55, 7.6, 0.8, "VerityFlow AI", 36, WHITE, True, font=HEAD)
txt(
    s,
    0.82,
    2.55,
    7.5,
    0.65,
    "Evidence-first fraud investigation",
    22,
    CYAN,
    True,
    font=HEAD,
)
txt(s, 0.85, 3.35, 7.3, 0.75, "Every financial risk, connected to its evidence.", 17, MUTED)
bullets(
    s,
    0.85,
    4.35,
    7.4,
    1.25,
    [
        "ML transaction-risk scoring with explainable findings",
        "Gemini investigation copilot grounded in retrieved evidence",
        "Human-reviewed cases with a documented rationale",
    ],
    13,
)
txt(s, 0.85, 6.15, 7.5, 0.3, "Team: [TEAM NAME]  •  Lead: [NAME]", 10, MUTED)
txt(
    s,
    0.85,
    6.52,
    7.6,
    0.28,
    "GitHub: [PUBLIC REPOSITORY URL]  |  Demo: [VIDEO / LIVE URL]",
    9,
    TEAL,
    True,
)

# 2 Brief idea
s = base(
    "01 • Idea",
    "Brief about the idea",
    "A transaction-fraud investigation workspace that connects risk signals to"
    " verifiable evidence.",
    2,
)
card(
    s,
    0.7,
    1.75,
    3.8,
    1.7,
    "Detect",
    "Score transactions with a trained ML model and deterministic rules.",
    CYAN,
)
card(
    s,
    4.78,
    1.75,
    3.8,
    1.7,
    "Investigate",
    "Retrieve transaction facts, model output, and rule results through"
    " controlled tools.",
    TEAL,
)
card(
    s,
    8.86,
    1.75,
    3.8,
    1.7,
    "Explain & document",
    "Use Gemini to summarize supported findings; analysts retain decision"
    " authority.",
    AMBER,
)
shape(s, 0.75, 4.1, 11.85, 1.55, NAVY2, LINE)
txt(s, 1.05, 4.38, 11.2, 0.45, "Core principle", 11, TEAL, True)
txt(
    s,
    1.05,
    4.82,
    11.15,
    0.55,
    "A prediction is an alert—not proof of fraud. Every explanation should"
    " distinguish facts, model signals, and unverified hypotheses.",
    15,
    WHITE,
    True,
    font=HEAD,
)

# 3 Opportunities / differentiation / USP
s = base(
    "02 • Opportunities",
    "Opportunity, differentiation & USP",
    "Move beyond a risk score to an evidence-backed investigation workflow.",
    3,
)
card(
    s,
    0.7,
    1.75,
    3.8,
    1.75,
    "Current gap",
    "Scores can be opaque; context is fragmented; analysts repeatedly gather"
    " facts manually.",
    TEAL,
)
card(
    s,
    4.78,
    1.75,
    3.8,
    1.75,
    "How we solve it",
    "Join ML outputs, deterministic rules, transaction details, and case notes in"
    " one flow.",
    CYAN,
)
card(
    s,
    8.86,
    1.75,
    3.8,
    1.75,
    "Why different",
    "Tool-using AI retrieves evidence before writing an explanation and exposes"
    " source references.",
    AMBER,
)
txt(s, 0.8, 4.0, 2.0, 0.3, "USP", 10, TEAL, True)
shape(s, 0.75, 4.42, 11.85, 1.25, PANEL2, LINE)
txt(
    s,
    1.0,
    4.68,
    11.3,
    0.55,
    "“Evidence before explanation” — grounded AI assistance, transparent risk"
    " signals, and a human-recorded final decision.",
    16,
    WHITE,
    True,
    font=HEAD,
    align=PP_ALIGN.CENTER,
)
txt(
    s,
    0.85,
    5.95,
    11.5,
    0.35,
    "Opportunity: reduce repetitive context gathering and improve consistency."
    " These are intended benefits to validate, not proven savings.",
    10,
    MUTED,
)

# 4 Features
s = base(
    "03 • Product",
    "Features offered by the solution",
    "Core features are listed here; align implementation labels with the"
    " current deployed build.",
    4,
)
features = [
    (
        "01 • Overview dashboard",
        (
            "Risk distribution, alert counts, category breakdowns, and trends"
            " from loaded data."
        ),
    ),
    (
        "02 • Transaction explorer",
        "Search, filter, sort, paginate, and inspect transaction details.",
    ),
    (
        "03 • Explainable risk",
        (
            "Model score, threshold, supported feature contributions, and"
            " deterministic rule findings."
        ),
    ),
    (
        "04 • Gemini copilot",
        (
            "Natural-language questions with controlled tool calls and"
            " evidence-grounded responses."
        ),
    ),
    (
        "05 • Evidence ledger",
        (
            "Source IDs, observed values, calculations, relevance, and"
            " limitations."
        ),
    ),
    (
        "06 • Case workflow",
        (
            "Review status, analyst rationale, escalation, closure, and action"
            " history."
        ),
    ),
]
for i, (t, b) in enumerate(features):
  card(
      s,
      0.65 + (i % 3) * 4.12,
      1.72 + (i // 3) * 2.15,
      3.82,
      1.78,
      t,
      b,
      [TEAL, CYAN, AMBER, GREEN, TEAL, CYAN][i],
      10,
  )

# 5 Process flow
s = base(
    "04 • Process flow",
    "From transaction signal to documented action",
    "Each stage should be visible in a single end-to-end prototype walkthrough.",
    5,
)
steps = [
    ("1", "INGEST", "Load transaction"),
    ("2", "VALIDATE", "Check schema"),
    ("3", "PREDICT", "Score risk"),
    ("4", "DETECT", "Apply rules"),
    ("5", "RETRIEVE", "Fetch evidence"),
    ("6", "EXPLAIN", "Gemini summary"),
    ("7", "REVIEW", "Human action"),
]
for i, (n, t, b) in enumerate(steps):
  x = 0.52 + i * 1.82
  shape(s, x, 2.25, 1.55, 1.45, PANEL, LINE)
  txt(s, x + 0.12, 2.42, 0.4, 0.25, n, 13, TEAL, True)
  txt(s, x + 0.12, 2.78, 1.3, 0.27, t, 10, WHITE, True)
  txt(s, x + 0.12, 3.18, 1.3, 0.3, b, 9, MUTED)
  if i < 6:
    txt(s, x + 1.56, 2.78, 0.22, 0.3, "›", 18, CYAN, True, PP_ALIGN.CENTER)
shape(s, 0.75, 4.35, 11.85, 1.1, NAVY2, LINE)
txt(
    s,
    1.0,
    4.66,
    11.3,
    0.45,
    "Evidence references must resolve to real API records or calculations. A"
    " human confirms consequential actions.",
    12,
    WHITE,
    True,
    align=PP_ALIGN.CENTER,
)

# 6 Wireframes
s = base(
    "05 • Wireframes",
    "Proposed investigation workspace",
    "Illustrative mockup — replace sample values and labels with real"
    " application screenshots before submission.",
    6,
)
shape(s, 0.65, 1.65, 8.1, 4.95, RGBColor(14, 27, 47), LINE)
shape(s, 0.85, 1.88, 7.7, 0.42, PANEL2, LINE)
txt(s, 1.0, 1.99, 4.7, 0.18, "TRANSACTION INVESTIGATION  /  TX-10482", 9, WHITE, True)
shape(s, 6.85, 1.93, 1.35, 0.3, PANEL2, RED)
txt(
    s,
    6.9,
    1.99,
    1.25,
    0.15,
    "HIGH RISK",
    8,
    RED,
    True,
    PP_ALIGN.CENTER,
    margin=0,
)
shape(s, 0.9, 2.5, 2.15, 1.1, PANEL, LINE)
txt(s, 1.08, 2.65, 1.8, 0.2, "MODEL RISK", 8, MUTED, True)
txt(s, 1.08, 2.93, 1.8, 0.35, "0.87*", 22, AMBER, True)
txt(s, 1.08, 3.31, 1.8, 0.15, "Illustrative only", 7, MUTED)
shape(s, 3.2, 2.5, 5.1, 1.1, PANEL, LINE)
txt(s, 3.38, 2.65, 4.7, 0.2, "SUPPORTED SIGNALS", 9, TEAL, True)
txt(s, 3.38, 2.97, 4.65, 0.35, "Amount pattern • Time feature • Rule R-03", 10, WHITE, True)
shape(s, 0.9, 3.82, 4.0, 2.1, PANEL, LINE)
txt(s, 1.08, 4.0, 3.6, 0.22, "EVIDENCE LEDGER", 9, TEAL, True)
bullets(
    s,
    1.08,
    4.35,
    3.5,
    1.2,
    [
        "EV-01 → transaction amount",
        "EV-02 → derived time feature",
        "EV-03 → triggered rule result",
    ],
    9,
)
shape(s, 5.05, 3.82, 3.25, 2.1, PANEL, LINE)
txt(s, 5.22, 4.0, 2.8, 0.22, "INVESTIGATION COPILOT", 9, CYAN, True)
txt(
    s,
    5.22,
    4.4,
    2.75,
    1.1,
    "“Here is what retrieved evidence supports—and what remains unverified.”",
    10,
    WHITE,
)
card(s, 9.0, 1.8, 3.55, 1.2, "Risk at a glance", "Score, threshold, and model version.", TEAL, 10)
card(
    s,
    9.0,
    3.25,
    3.55,
    1.2,
    "Evidence beside claims",
    "Inspect source records from each finding.",
    AMBER,
    10,
)
card(
    s,
    9.0,
    4.7,
    3.55,
    1.2,
    "Close the loop",
    "Record status, rationale, and next step.",
    GREEN,
    10,
)
txt(s, 0.85, 6.25, 7.7, 0.2, "*Mockup values are illustrative, not measured model output.", 8, AMBER)

# 7 Architecture
s = base(
    "06 • Architecture",
    "Proposed solution architecture",
    "React frontend, Go application API, Python ML inference, and Gemini"
    " investigation assistance.",
    7,
)
arch = [
    (0.9, 1.65, 11.55, 0.7, "USER EXPERIENCE  •  React + Vite + TypeScript", PANEL2, CYAN),
    (
        1.35,
        2.65,
        10.65,
        0.7,
        "APPLICATION LAYER  •  Go REST API / validation / controlled tools",
        PANEL,
        TEAL,
    ),
    (1.35, 3.65, 5.05, 0.7, "ML INFERENCE  •  Python model service", PANEL, CYAN),
    (
        6.95,
        3.65,
        5.05,
        0.7,
        "GENERATIVE AI  •  Gemini tool-using investigation",
        PANEL,
        AMBER,
    ),
    (
        1.35,
        4.65,
        10.65,
        0.7,
        "DEPLOYMENT  •  Google Cloud Run / health checks / logs",
        PANEL2,
        GREEN,
    ),
]
for x, y, w, h, label, fill, accent in arch:
  shape(s, x, y, w, h, fill, accent)
  txt(s, x + 0.15, y + 0.18, w - 0.3, 0.28, label, 11, WHITE, True, PP_ALIGN.CENTER)
txt(
    s,
    0.9,
    5.75,
    11.5,
    0.4,
    "Optional only if implemented: Firestore for case persistence • Firebase Auth"
    " for identity • Secret Manager for secrets.",
    10,
    MUTED,
)
txt(
    s,
    0.9,
    6.15,
    11.5,
    0.35,
    "Use least-privilege service accounts; keep credentials out of source code"
    " and container images.",
    10,
    AMBER,
    True,
)

# 8 Technologies
s = base(
    "07 • Technology stack",
    "Technologies to be used",
    "Keep this list aligned with actual dependencies and deployed services.",
    8,
)
tech = [
    (
        "Frontend",
        "React • Vite • TypeScript • Recharts",
        "Dashboard, explorer, investigation UI",
    ),
    (
        "Application backend",
        "Go • net/http or chosen router • JSON REST",
        "Validation, orchestration, case and evidence endpoints",
    ),
    (
        "Machine learning",
        "Python • pandas • scikit-learn • SHAP (if used)",
        "Training, evaluation, inference, explainability",
    ),
    (
        "Generative AI",
        "Gemini API • function/tool calling",
        "Grounded summaries and follow-up checks",
    ),
    (
        "Cloud & delivery",
        "Google Cloud Run • Cloud Logging • Secret Manager (if used)",
        "Hosting, diagnostics, secret management",
    ),
    (
        "Data & testing",
        "Kaggle fraud-detection dataset • Go/Python tests",
        "Prototype data, API validation, regression tests",
    ),
]
for i, (a, b, c) in enumerate(tech):
  card(
      s,
      0.7,
      1.65 + (i // 2) * 1.55,
      5.85,
      1.28,
      a,
      b + "\n" + c,
      [TEAL, CYAN, AMBER, GREEN, TEAL, CYAN][i],
      10,
  )
shape(s, 6.95, 6.25, 5.6, 0.4, NAVY2, LINE)
txt(
    s,
    7.08,
    6.34,
    5.3,
    0.18,
    "Dataset scope: simulated US card transactions",
    9,
    AMBER,
    True,
    PP_ALIGN.CENTER,
)

# 9 Cost (optional)
s = base(
    "08 • Estimated cost",
    "Estimated implementation cost (optional)",
    "Indicative prototype planning ranges only; actual costs depend on usage,"
    " region, quotas, and free-tier eligibility.",
    9,
)
costs = [
    ("Frontend hosting", "₹0–₹1,500 / month", "Static hosting / bandwidth"),
    (
        "Go + Python services",
        "₹0–₹5,000 / month",
        "Low-traffic Cloud Run prototype",
    ),
    (
        "Gemini API",
        "₹0–₹3,000 / month",
        "Depends on model, tokens, and request volume",
    ),
    ("Storage & logs", "₹0–₹1,500 / month", "Small prototype usage"),
]
for i, (a, b, c) in enumerate(costs):
  card(
      s,
      0.7 + (i % 2) * 6.05,
      1.8 + (i // 2) * 1.75,
      5.7,
      1.42,
      a,
      b + "\n" + c,
      [TEAL, CYAN, AMBER, GREEN][i],
      10,
  )
shape(s, 0.75, 5.55, 11.85, 0.75, NAVY2, LINE)
txt(
    s,
    1.0,
    5.77,
    11.3,
    0.3,
    "Budget placeholder: roughly ₹0–₹11,000/month for a small demo footprint;"
    " verify current pricing before submission.",
    11,
    WHITE,
    True,
    PP_ALIGN.CENTER,
)

# 10 Snapshots / prototype
s = base(
    "09 • Prototype snapshots",
    "Prototype snapshots",
    "Replace these placeholders with authentic screenshots from the current"
    " working build.",
    10,
)
for i, (title, desc) in enumerate([
    (
        "01 • Overview dashboard",
        "Insert screenshot: alert counts, trends, distribution",
    ),
    (
        "02 • Transaction explorer",
        "Insert screenshot: selected transaction and risk result",
    ),
    (
        "03 • Evidence + copilot",
        "Insert screenshot: evidence IDs and Gemini response",
    ),
]):
  x = 0.7 + i * 4.12
  shape(s, x, 1.8, 3.8, 3.25, NAVY2, LINE)
  shape(s, x + 0.18, 2.0, 3.44, 2.35, PANEL, LINE)
  txt(
      s,
      x + 0.38,
      2.72,
      3.04,
      0.5,
      "ADD REAL\nSCREENSHOT",
      14,
      MUTED,
      True,
      PP_ALIGN.CENTER,
      MSO_ANCHOR.MIDDLE,
  )
  txt(s, x + 0.2, 4.58, 3.4, 0.25, title, 11, WHITE, True)
  txt(s, x + 0.2, 4.92, 3.4, 0.45, desc, 9, MUTED)
txt(
    s,
    0.85,
    5.65,
    11.5,
    0.4,
    "Do not present mockups as deployed screenshots. Label any illustrative UI"
    " clearly.",
    11,
    AMBER,
    True,
)

# 11 Benchmarking
s = base(
    "10 • Performance report",
    "Prototype performance & benchmarking",
    "Fill in actual results after running a held-out evaluation and repeatable"
    " API/agent tests.",
    10,
)
headers = [
    ("Metric", 0.85, 2.2),
    ("Meaning", 3.15, 4.8),
    ("Actual result", 8.15, 1.8),
    ("Status", 10.15, 2.0),
]
for a, x, w in headers:
  txt(s, x, 1.72, w, 0.25, a, 10, TEAL, True)
rows = [
    ("Precision", "Correct alerts / all predicted alerts", "[ACTUAL]", "Not measured"),
    (
        "Recall",
        "Detected labelled fraud / all labelled fraud",
        "[ACTUAL]",
        "Not measured",
    ),
    ("PR-AUC", "Ranking quality under class imbalance", "[ACTUAL]", "Not measured"),
    (
        "Evidence validity",
        "Cited evidence IDs that resolve successfully",
        "[ACTUAL]",
        "Not measured",
    ),
    (
        "Median latency",
        "End-to-end investigation response time",
        "[ACTUAL]",
        "Not measured",
    ),
]
for i, r in enumerate(rows):
  y = 2.08 + i * 0.68
  shape(s, 0.75, y, 11.85, 0.52, PANEL if i % 2 == 0 else NAVY2, LINE)
  txt(s, 0.9, y + 0.13, 2.1, 0.2, r[0], 10, WHITE, True)
  txt(s, 3.2, y + 0.13, 4.75, 0.2, r[1], 9, MUTED)
  txt(s, 8.2, y + 0.13, 1.7, 0.2, r[2], 9, AMBER, True)
  txt(s, 10.2, y + 0.13, 2.1, 0.2, r[3], 9, AMBER)
txt(
    s,
    0.85,
    5.9,
    11.4,
    0.5,
    "Protocol: held-out labelled data • fixed threshold • no test-set tuning •"
    " fixed agent questions • manually reviewed claims.",
    10,
    MUTED,
)

# 12 Future development
s = base(
    "11 • Future development",
    "Additional details & future roadmap",
    "Prioritize reliability, measurable evaluation, and responsible deployment"
    " before expanding scope.",
    11,
)
card(
    s,
    0.7,
    1.75,
    3.8,
    1.55,
    "Known limitations",
    "Synthetic data may not generalize to real institutions; models and rules"
    " can produce false alerts.",
    AMBER,
)
card(
    s,
    4.78,
    1.75,
    3.8,
    1.55,
    "Safeguards",
    "Human review, evidence validation, uncertainty labels, minimal sensitive"
    " logging, access control.",
    TEAL,
)
card(
    s,
    8.86,
    1.75,
    3.8,
    1.55,
    "Next improvements",
    "Persistent cases, authentication, drift monitoring, stronger agent"
    " evaluation, model monitoring.",
    CYAN,
)
bullets(
    s,
    0.85,
    4.0,
    11.5,
    1.7,
    [
        "Add account-level and cross-transaction relationship analysis.",
        (
            "Extend to MSME invoice-to-bank reconciliation only with a separately"
            " sourced and labelled dataset."
        ),
        (
            "Add role-based access, audit logs, retention controls, and"
            " deployment hardening."
        ),
        (
            "Run analyst usability tests and measure investigation time against"
            " a baseline."
        ),
    ],
    11,
)
txt(
    s,
    0.85,
    6.15,
    11.4,
    0.3,
    "Current scope: transaction-fraud investigation using a simulated US"
    " card-transaction dataset.",
    10,
    AMBER,
    True,
)

# 13 Links
s = prs.slides.add_slide(prs.slide_layouts[6])
bg(s)
txt(
    s,
    0.8,
    0.6,
    11.8,
    0.3,
    "12 • SUBMISSION LINKS",
    10,
    TEAL,
    True,
    PP_ALIGN.CENTER,
)
txt(
    s,
    0.8,
    1.25,
    11.8,
    0.7,
    "Explore VerityFlow AI",
    30,
    WHITE,
    True,
    PP_ALIGN.CENTER,
    font=HEAD,
)
txt(
    s,
    0.8,
    2.0,
    11.8,
    0.45,
    "Replace each placeholder with a verified, publicly accessible link.",
    12,
    MUTED,
    align=PP_ALIGN.CENTER,
)
link_items = [
    ("GitHub Public Repository", "[PUBLIC GITHUB REPOSITORY URL]", CYAN),
    ("3-Minute Demo Video", "[DEMO VIDEO URL]", TEAL),
    ("Final Product / Live Prototype", "[DEPLOYED APPLICATION URL]", GREEN),
]
for i, (a, b, c) in enumerate(link_items):
  y = 2.85 + i * 1.0
  shape(s, 1.35, y, 10.65, 0.72, PANEL, c)
  txt(s, 1.65, y + 0.12, 3.25, 0.28, a, 12, WHITE, True)
  txt(s, 4.85, y + 0.12, 6.75, 0.3, b, 11, c, True)
txt(
    s,
    1.0,
    6.35,
    11.3,
    0.3,
    "Team: [TEAM NAME]  •  Contact: [EMAIL / CONTACT]",
    10,
    MUTED,
    align=PP_ALIGN.CENTER,
)

prs.save(OUT)
print(f"Created: {OUT}")
print(f"Slides: {len(prs.slides)}")
