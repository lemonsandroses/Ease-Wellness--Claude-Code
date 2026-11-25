"""Build the counsel review pack PDF from the published legal pages.

The documents are rendered from docs/legal/*.html rather than a second copy of
the text, so the pack a lawyer marks up cannot drift from the pages that go
live. Paragraphs are numbered P<section>.<n> / T<section>.<n> so comments can
cite them.

    python3 scripts/build-legal-pack.py
"""
import io
import re
from html.parser import HTMLParser
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, HRFlowable, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
LEGAL = ROOT / "docs" / "legal"
OUT = LEGAL / "Ease-Counsel-Review-Pack.pdf"
DATE = "30 October 2026"

INK = colors.HexColor("#14110F")
TANGERINE = colors.HexColor("#C2540F")
MIST = colors.HexColor("#6B635C")
RULE = colors.HexColor("#D8D2CC")
FLAG = colors.HexColor("#FDF1E8")
NOTE = colors.HexColor("#EDF1F5")
GREY = colors.HexColor("#F6F3F0")

_ss = getSampleStyleSheet()


def _s(name, **kw):
    base = dict(fontName="Helvetica", fontSize=9.5, leading=14, textColor=INK, spaceAfter=6)
    base.update(kw)
    return ParagraphStyle(name, parent=_ss["Normal"], **base)


S = {
    "title": _s("title", fontName="Times-Bold", fontSize=26, leading=30, textColor=TANGERINE, spaceAfter=6),
    "h1": _s("h1", fontName="Times-Bold", fontSize=18, leading=22, textColor=TANGERINE, spaceBefore=6, spaceAfter=10),
    "h2": _s("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=15, spaceBefore=14, spaceAfter=5),
    "h3": _s("h3", fontName="Helvetica-Bold", fontSize=10, leading=14, spaceBefore=9, spaceAfter=3),
    "body": _s("body", alignment=TA_JUSTIFY),
    "num": _s("num", fontSize=7.5, leading=14, textColor=MIST),
    "li": _s("li", leftIndent=10, bulletIndent=1, spaceAfter=3),
    "meta": _s("meta", fontSize=8.5, textColor=MIST, spaceAfter=3),
    "note": _s("note", fontSize=9, leading=13, textColor=colors.HexColor("#30506E")),
    "flag": _s("flag", fontSize=9, leading=13, textColor=colors.HexColor("#8A3B08")),
    "th": _s("th", fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=colors.white, spaceAfter=0),
    "td": _s("td", fontSize=8, leading=11, spaceAfter=0),
}

esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def boxed(flows, bg, border, width=165 * mm):
    t = Table([[flows]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.6, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def grid(rows, widths):
    data = [[Paragraph(esc(c), S["th"]) for c in rows[0]]]
    data += [[Paragraph(c, S["td"]) for c in r] for r in rows[1:]]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY]),
        ("GRID", (0, 0), (-1, -1), 0.35, RULE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


class DocParser(HTMLParser):
    """Flattens a legal page into blocks the renderer understands."""

    INLINE = {"strong", "b", "em", "i"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks, self.buf, self.mode = [], "", None
        self.box, self.boxbuf, self.depth = None, [], 0
        self.row = self.table = self.cell = None
        self.in_toc, self.skip = False, 0

    def flush(self, kind):
        text = re.sub(r"\s+", " ", self.buf).strip()
        self.buf = ""
        if not text:
            return
        (self.boxbuf if self.box else self.blocks).append((kind, text))

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get("class", "")
        if tag in ("head", "script", "style"):
            self.skip += 1
        if self.skip:
            return
        if tag == "nav" and "toc" in cls:
            self.in_toc = True
        if self.in_toc:
            return
        if tag in ("div", "span") and cls in ("critical", "notice", "tofill", "summary") and not self.box:
            self.box, self.depth, self.boxbuf = cls, 1, []
        elif self.box and tag in ("div", "span"):
            # Nested element inside a callout: each is its own line, and the
            # depth counter stops the first closing tag ending the whole box.
            self.depth += 1
            self.flush("p")
        elif tag in ("h1", "h2", "h3", "p", "li"):
            self.mode, self.buf = tag, ""
        elif tag == "table":
            self.table = []
        elif tag == "tr":
            self.row = []
        elif tag in ("th", "td"):
            self.cell, self.mode = "", "cell"
        elif tag in self.INLINE:
            if self.box and tag == "b":
                self.flush("p")
            self.buf += "<b>" if tag in ("strong", "b") else "<i>"

    def handle_endtag(self, tag):
        if tag in ("head", "script", "style"):
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        if tag == "nav" and self.in_toc:
            self.in_toc = False
            return
        if self.in_toc:
            return
        if tag in ("div", "span") and self.box:
            self.depth -= 1
            self.flush("p")
            if self.depth <= 0:
                self.blocks.append((f"box:{self.box}", self.boxbuf))
                self.box, self.boxbuf = None, []
        elif tag in ("h1", "h2", "h3", "p", "li"):
            self.flush(tag)
            self.mode = None
        elif tag in ("th", "td"):
            self.row.append(re.sub(r"\s+", " ", self.cell or "").strip())
            self.cell = self.mode = None
        elif tag == "tr" and self.row is not None:
            self.table.append(self.row)
            self.row = None
        elif tag == "table" and self.table:
            self.blocks.append(("table", self.table))
            self.table = None
        elif tag in self.INLINE:
            self.buf += "</b>" if tag in ("strong", "b") else "</i>"

    def handle_data(self, data):
        if self.skip or self.in_toc:
            return
        if self.mode == "cell":
            self.cell = (self.cell or "") + esc(data)
        elif self.mode or self.box:
            self.buf += esc(data)


def read(path):
    p = DocParser()
    p.feed(io.open(path, encoding="utf-8").read())
    return p.blocks


def render(blocks, prefix):
    out, sec, para = [], 0, 0
    for kind, payload in blocks:
        if kind == "h1":
            out.append(Paragraph(payload, S["h1"]))
        elif kind == "h2":
            sec, para = sec + 1, 0
            out.append(Paragraph(payload, S["h2"]))
        elif kind == "h3":
            out.append(Paragraph(payload, S["h3"]))
        elif kind in ("p", "li"):
            para += 1
            t = Table([[Paragraph(f"{prefix}{sec}.{para}", S["num"]),
                        Paragraph(payload, S["li"] if kind == "li" else S["body"])]],
                      colWidths=[17 * mm, 148 * mm])
            t.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            out.append(t)
        elif kind == "table":
            n = len(payload[0])
            out.append(Spacer(1, 3))
            out.append(grid(payload, [55 * mm, 110 * mm] if n == 2 else [42 * mm, 62 * mm, 61 * mm]))
            out.append(Spacer(1, 7))
        elif kind.startswith("box:"):
            flavour = kind.split(":", 1)[1]
            loud = flavour in ("critical", "tofill", "summary")
            inner = []
            for _, txt in payload:
                para += 1
                inner.append(Paragraph(
                    f'<font size="7" color="#8A8178">{prefix}{sec}.{para}</font>&nbsp;&nbsp;{txt}',
                    S["flag"] if loud else S["note"]))
            out.append(boxed(inner, FLAG if loud else NOTE,
                             TANGERINE if loud else colors.HexColor("#9FB4C8")))
            out.append(Spacer(1, 8))
    return out


ASKS = [
    ("Children.", "The minimum age is <b>18</b>. Rather than operate a parental-consent mechanism we cannot presently "
     "support, the application refuses the account outright: date of birth is mandatory at onboarding and an under-18 "
     "date blocks completion. The intention is to stay outside the Child provisions of the DPDP Act entirely. Please "
     "confirm that declining the account suffices, and whether a self-declared date of birth meets the expected "
     "standard."),
    ("Consent mechanics.", "Processing relies on consent obtained at account creation. Please confirm the notice and "
     "consent satisfy ss. 5–6 of the DPDP Act, including itemised notice and withdrawal being as easy as giving."),
    ("Medical disclaimer and product category.", "Clause 1 of the Terms disclaims medical advice and states the app is "
     "not contraception. Please confirm this is adequate to keep the product outside medical-device regulation and to "
     "limit exposure on a reliance claim."),
    ("Liability cap and indemnity.", "The cap is the greater of twelve months' fees or ₹17,000. Please advise "
     "whether that is defensible at ₹699 per month, and whether the indemnity at clause 11 is enforceable "
     "against a consumer."),
    ("Consumer law interaction.", "Please confirm the subscription, cancellation and refund terms sit correctly with "
     "the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020, given Apple and Google process all payments "
     "and handle all refunds."),
    ("Grievance redressal.", "A named Grievance Officer is required. Please confirm the drafted process, the 30-day "
     "window and the escalation route to the Data Protection Board are correctly stated."),
    ("Apple minimum terms.", "Clause 13 reproduces Apple's required EULA provisions. Please confirm these are complete "
     "and that supplying our own terms in place of Apple's standard EULA creates no gap."),
    ("Retention and erasure.", "Account deletion erases all rows and the authentication record. Backups persist for "
     "the provider's retention window. Please confirm the drafted retention language is adequate."),
]

RISKS = [
    ("Closed", "The age floor was raised from 12 to 18 and is enforced in the application: date of birth is required "
     "at onboarding and an under-18 date prevents account creation. Verified by test, including the exact-birthday "
     "and leap-day boundaries."),
    ("Closed", "The production database is live in AWS ap-south-1 (Mumbai), confirmed by DNS resolution of the "
     "database host, so no personal data leaves India and the cross-border transfer provisions are not engaged."),
    ("Closed", "Earlier drafts referenced easewellness.app, a domain the client does not own and which hosts an "
     "unrelated third party's website. Every reference now points to easewellness.org, the client's own domain."),
    ("Closed", "The application's bundle identifier is com.easewellness.app across the iOS project, the Android "
     "manifest and namespace, and the Capacitor configuration. The Android main activity was moved to the "
     "matching package. It was changed before the App Store Connect record was created, which is the only "
     "point at which a bundle identifier can be changed at all."),
    ("Open", "easewellness.org must serve both documents before submission. The previous domain, easetracker.app, "
     "returned Hostinger's parked-domain placeholder under an HTTP 200 on every path, apex and www, and the "
     "apex additionally failed the TLS handshake. The 
     "documents were live on 10 November and the hosting has lapsed since. Until they are restored the "
     "application links to a privacy notice that does not exist, which is both an App Store submission "
     "blocker and a DPDP accessibility failure. Note that a 200 status code alone does not evidence "
     "publication; page content must be checked."),
    ("Open", "Backup retention remains to be confirmed against the hosting plan."),
    ("Noted", "Font licensing for Futura PT in the shipped app is unresolved; unrelated to these documents."),
]

INVENTORY = [
    ["Store", "Fields", "Character"],
    ["auth.users", "email, hashed credential, provider identity", "Identifying"],
    ["profiles", "name, birth_date, cycle_length, period_length, last_period_start, focus, baseline_symptoms, "
     "energy_rhythm, sleep_tendency, movement_style", "Identifying + health"],
    ["day_logs", "bleeding, symptoms (JSON), energy, mood, sleep_hours, sleep_quality, stress, water, movement, "
     "free-text notes", "<b>Health</b>"],
    ["meals", "name, slot, calories, protein, carbs, fats, fibre, note", "Health"],
    ["events", "title, date, times, location, notes, google_id", "Personal; may be imported from Google Calendar"],
    ["achievements", "achievement_id, earned_at", "Behavioural"],
    ["subscriptions", "plan, status, started_at, expires_at", "Commercial; written server-side only"],
]

PROCESSORS = [
    ["Recipient", "Receives", "Role"],
    ["Supabase", "All stores listed above", "Processor — database and authentication hosting"],
    ["RevenueCat", "Account identifier, subscription status", "Processor — subscription management"],
    ["Apple / Google", "Payment details, purchase record", "Independent controller — payment"],
    ["Apple / Google", "OIDC identity token at sign-in", "Independent controller — identity"],
    ["Google Calendar", "Nothing; read-only access", "Source only — no data sent"],
]

CONTROLS = [
    "Row-level security on every table; 20 policies across two migrations. Access is enforced by the database, not by "
    "application code. Re-verified adversarially against the live production project on 30 October 2026: across ten "
    "assertions a second account could not read, write or delete another's rows, could not grant itself a "
    "subscription, and was unaffected by the first account's erasure.",
    "The subscriptions table carries a SELECT-only policy, so entitlement cannot be self-granted. Confirmed live: an "
    "attempted insert was refused with HTTP 403.",
    "Account deletion runs server-side under a service role; the authentication record is removed first so the "
    "foreign-key cascade is atomic. Confirmed live — the account could no longer authenticate afterwards and a "
    "second account was untouched.",
    "Hosted in AWS ap-south-1 (Mumbai). No personal data leaves India.",
    "TLS in transit; encryption at rest by the provider.",
    "No advertising SDK, no analytics SDK, no tracking identifier. Dependencies touching user data are limited to "
    "Supabase, RevenueCat and the social sign-in plugin.",
    "No device permissions are declared in the iOS build, so the operating system cannot grant access to camera, "
    "microphone, location or photos. There is no HealthKit entitlement.",
    "The Google Calendar scope is calendar.readonly; the app cannot write to a user's calendar.",
    "Pattern analysis runs entirely on the device. Derived insights are never transmitted or stored server-side.",
]

NOT_DONE = [
    "No profiling for advertising; no automated decision-making with legal effect.",
    "No model training on user data.",
    "No collection of location, contacts, photos, microphone or camera.",
    "No integration with Apple Health or Google Fit.",
    "No sale or sharing of personal data with advertisers, brokers, insurers or employers.",
    "No writes to the user's Google Calendar; read access only, revocable by disconnecting.",
]


def memo():
    f = [Spacer(1, 14), Paragraph("Ease", S["title"]),
         Paragraph("Counsel review pack — privacy policy and terms of use",
                   _s("sub", fontSize=12, leading=16, spaceAfter=10)),
         HRFlowable(width="100%", thickness=0.8, color=RULE), Spacer(1, 10),
         boxed([Paragraph(
             "<b>Draft documents, prepared for legal review.</b> They have not been reviewed by a lawyer and are not "
             "published. Every factual statement about data handling was taken from the application's database schema "
             "and source code and is accurate as at the date below. The legal framing is what requires your opinion.",
             S["flag"])], FLAG, TANGERINE), Spacer(1, 12)]

    f.append(Paragraph("1 &nbsp; The product", S["h2"]))
    for t in [
        "Ease is a menstrual health and lifestyle application for iOS and Android, aimed at women managing PCOS "
        "symptoms. It records cycle and symptom data, shows the user where they are in their cycle, and offers "
        "nutrition, exercise, sleep and stress guidance.",
        "The product is pre-launch, with no users and no store submission. Launch is intended for <b>India only</b>; "
        "the drafts are written to the DPDP Act and Indian consumer law and deliberately carry no GDPR provisions.",
        "There is no monetisation. The application is free in full, with no in-app purchases, no subscription "
        "and no payment processor; every feature is available to every account. The auto-renewal, free-trial, "
        "refund and price-change clauses Apple requires of paid applications therefore do not apply and have "
        "been removed from the terms. Apple's own EULA minimum terms are retained verbatim, including its "
        "reference to refunding the purchase price, as those ship unchanged for free applications.",
        "The operator's website is easewellness.org.",
    ]:
        f.append(Paragraph(t, S["body"]))

    f.append(Paragraph("2 &nbsp; What we are asking you to do", S["h2"]))
    f.append(Paragraph("Review both drafts and advise on the following, ordered by our assessment of risk.", S["body"]))
    for i, (head, detail) in enumerate(ASKS, 1):
        f.append(KeepTogether([Paragraph(f"<b>{i}. {head}</b> {detail}", S["li"])]))
    f.append(Spacer(1, 4))
    f.append(Paragraph("Instructions are also needed on the items left blank in the drafts: registered entity name and "
                       "address, CIN, contact addresses, the named Grievance Officer, and the backup retention "
                       "period.", S["body"]))

    f.append(PageBreak())
    f.append(Paragraph("Annex A — factual basis", S["h1"]))
    f.append(Paragraph("Taken from the schema and source, not from the drafts. You may rely on it.", S["meta"]))
    f.append(Paragraph("A.1 &nbsp; Personal data held", S["h2"]))
    f.append(grid(INVENTORY, [27 * mm, 97 * mm, 41 * mm]))
    f.append(Paragraph("A.2 &nbsp; Recipients", S["h2"]))
    f.append(grid(PROCESSORS, [34 * mm, 62 * mm, 69 * mm]))
    f.append(Paragraph("A.3 &nbsp; Technical and organisational controls", S["h2"]))
    for c in CONTROLS:
        f.append(Paragraph(c, S["li"], bulletText="•"))
    f.append(Paragraph("A.4 &nbsp; What the application does not do", S["h2"]))
    for c in NOT_DONE:
        f.append(Paragraph(c, S["li"], bulletText="•"))
    f.append(Paragraph("A.5 &nbsp; Known gaps and risks", S["h2"]))
    f.append(grid([["Status", "Matter"]] + [[s, t] for s, t in RISKS], [20 * mm, 145 * mm]))
    f.append(PageBreak())
    return f


def build():
    def page(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MIST)
        canvas.drawString(22 * mm, 287 * mm, "EASE  ·  COUNSEL REVIEW PACK  ·  DRAFT, PRIVILEGED")
        canvas.drawRightString(188 * mm, 287 * mm, DATE)
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.4)
        canvas.line(22 * mm, 284.5 * mm, 188 * mm, 284.5 * mm)
        canvas.drawCentredString(105 * mm, 12 * mm, f"Page {doc.page}")
        canvas.restoreState()

    doc = BaseDocTemplate(
        str(OUT), pagesize=A4, leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=28 * mm, bottomMargin=18 * mm,
        title="Ease — Counsel Review Pack (draft, privileged)",
        author="Ease", subject="Privacy Policy and Terms of Use — for legal review")
    doc.addPageTemplates([PageTemplate(
        id="p", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")], onPage=page)])

    story = memo()
    story.append(Paragraph("Document 1 — Privacy Policy", S["h1"]))
    story.append(Paragraph("Paragraphs are numbered P&lt;section&gt;.&lt;paragraph&gt;.", S["meta"]))
    story.append(Spacer(1, 6))
    story += render(read(LEGAL / "privacy.html"), "P")
    story.append(PageBreak())
    story.append(Paragraph("Document 2 — Terms of Use", S["h1"]))
    story.append(Paragraph("Paragraphs are numbered T&lt;section&gt;.&lt;paragraph&gt;.", S["meta"]))
    story.append(Spacer(1, 6))
    story += render(read(LEGAL / "terms.html"), "T")
    doc.build(story)
    print("built", OUT)


if __name__ == "__main__":
    build()
