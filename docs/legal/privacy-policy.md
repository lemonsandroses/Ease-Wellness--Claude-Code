# Privacy Policy

**Last updated: 4 October 2026**

> **Draft — not yet reviewed by a lawyer.** This describes what the Ease app
> actually does, derived from its database schema and code. Every factual claim
> below is accurate as of this date. The legal framing still needs review by
> counsel familiar with India's DPDP Act and the GDPR, and the items marked
> **[CONFIRM]** are decisions only you can make.

**The short version:** Ease stores your cycle and health logs in your own
account so they survive a new phone. Only you can read them. We have never sold
this data, we never will, and no advertiser or data broker receives any of it.
You can delete everything, permanently, from inside the app.

---

## 1. Who we are

Ease Wellness ("Ease", "we", "our", "us") operates the **Ease** menstrual health
and lifestyle app and the website easewellness.org.

**[CONFIRM]** Registered entity name, registered address, and CIN.

For any privacy question, or to exercise the rights in section 9, contact
**easetrackerapp@gmail.com**.

**Grievance Officer (India, DPDP Act 2023):** **[CONFIRM — name]**,
easetrackerapp@gmail.com. We respond to grievances within 30 days.

## 2. What this policy covers

The Ease mobile app on iOS and Android, and easewellness.org. It does not cover
Apple, Google or any other service you reach from the app, each of which has its
own policy.

## 3. What we collect

**Everything below is given to us by you.** Ease has no advertising SDK, no
analytics SDK, no tracking pixel, and does not collect your location, contacts,
photos, microphone or camera.

### Account information

- Email address
- Name, if you give one during onboarding
- Date of birth, if you give one (optional)
- A randomly generated account identifier

If you sign in with Apple or Google, we receive only the identity token they
issue — your email address (or Apple's private relay address, if you chose to
hide it) and, where provided, your name. We never receive your Apple or Google
password.

### Health information

This is **special-category personal data** under GDPR Article 9 and sensitive
personal data under the DPDP Act, and we treat it accordingly. It includes what
you choose to log:

- Menstrual bleeding days and flow level
- Symptoms you record and their severity
- Your typical cycle length, period length, and last period start date
- Energy, mood, stress and sleep entries
- Movement and exercise entries
- Meals and their nutritional breakdown
- Free-text notes you write on any day
- Health focus areas and baseline symptoms chosen during onboarding

### Calendar information

Only if you connect Google Calendar. We read upcoming events so the app can show
them alongside your cycle, and we store the event title, date, time, location
and notes. We never write to, modify or delete anything in your Google Calendar.
Disconnecting stops all further access. See section 6 for the limits we accept
on this data.

## 4. Why we process it, and on what legal basis

| What | Why | Legal basis (GDPR) |
|---|---|---|
| Account information | To create and secure your account | Contract (Art. 6(1)(b)) |
| Health information | To calculate your cycle, show patterns and personalise guidance | **Explicit consent** (Art. 9(2)(a)) |
| Calendar information | To show your plans beside your cycle | Consent (Art. 6(1)(a)) |

Under the DPDP Act we rely on your consent, which you give when you create an
account and may withdraw at any time by deleting your account.

**We do not profile you, make automated decisions with legal effect, or use your
data to train machine learning models.**

## 5. Where it is stored, and how it is protected

Your data is held in a Postgres database operated by **Supabase**
hosted in the **AWS Asia Pacific (Mumbai) region, ap-south-1**. Personal data of
users in India therefore stays within India.

- **Row-level security on every table.** Database policy, not application code,
  enforces that a signed-in account can only ever read or write its own rows.
  This has been verified by adversarial testing: one account could not read,
  modify or delete another's data under any tested condition.
- Encrypted in transit (TLS) and at rest.
- The key embedded in the app grants no access without a valid session, and a
  session only ever unlocks that one account's data.

A copy is also kept on your device so the app works offline.

## 6. Who else receives it

| Service | What they receive | Why |
|---|---|---|
| **Supabase** | All account and health data | Database and authentication hosting |
| **Apple / Google** | Identity token, if you use their sign-in | Authentication |
| **Google Calendar** | Nothing — we only read | Showing your events beside your cycle |

Supabase acts as a processor under our instructions. Apple and Google, as
identity providers, act as independent controllers under their own policies.

**Ease contains no in-app purchases.** We use no payment processor and no
subscription-management service, and no third party receives data about you for
billing purposes.

**Google Calendar — Limited Use.** Ease's use of information received from
Google APIs adheres to the
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
including the Limited Use requirements. Calendar data is used only to display
your events alongside your cycle, is never sold, never used for advertising, and
never read by a human except with your explicit permission to resolve a support
issue you have raised.

**We have never sold personal data, and we do not share it with advertisers,
data brokers, insurers or employers.** We will not do so. If we are ever
compelled to disclose data by a lawful order, we will notify you unless legally
prohibited from doing so.

## 7. Health data and the law

Reproductive health data is sensitive in a way that goes beyond regulation.
Specific commitments:

- It is never used for advertising or marketing, by us or anyone else.
- It is never shared with insurers, employers, or any data broker.
- Access is restricted to the account holder. Our staff cannot browse it.
- We hold no more than the app needs to work.

## 8. How long we keep it

- **While your account is open:** your logs are kept so your history stays
  intact — that is the point of the app.
- **When you delete your account:** every row we hold about you is erased
  immediately, along with your authentication record. This is a real deletion,
  not a flag. It has been verified by test.
- **Backups:** deleted data persists in encrypted database backups for up to
  **[CONFIRM — check your Supabase plan's backup retention, typically 7 days]**
  before being overwritten.
- **Support emails:** up to 12 months.

## 9. Your rights

Under the GDPR, the DPDP Act and other applicable laws you may:

- **Access** the data we hold about you
- **Correct** anything inaccurate — most of it is editable in the app
- **Delete** your account and all associated data — Settings → Delete my account
- **Withdraw consent** at any time, by deleting your account
- **Port** your data to another service
- **Object** to processing, or ask us to restrict it
- **Complain** to a supervisory authority (in the EU/UK, your local data
  protection authority; in India, the Data Protection Board)

Most of these you can exercise yourself inside the app. For anything else, email
easetrackerapp@gmail.com and we will respond within 30 days.

## 10. Children

**Ease is available only to people aged 18 and over.** Date of birth is required
at onboarding and an account cannot be created with a date of birth under 18.
If you believe someone under 18 has an account, contact easetrackerapp@gmail.com
and we will delete it.

> Many people begin menstruating well before 16, so a lower age may serve your
> users better — but processing special-category health data about minors raises
> obligations (parental consent under GDPR Art. 8, and verifiable parental
> consent plus a prohibition on tracking under the DPDP Act) that need deliberate
> handling. Decide this with counsel, then make the app's age gate match whatever
> this section says.

## 11. International transfers

Your data may be processed outside your country. Where it leaves the EEA or UK we
rely on Standard Contractual Clauses. **[CONFIRM]** with counsel once the
Supabase region is fixed, and note the DPDP Act's restrictions on transfers to
notified countries.

## 12. Changes

If we make a material change we will update the date above and tell you in the
app before it takes effect. For changes affecting how we process health data we
will ask for your consent again.

## 13. Contact

- **Privacy:** easetrackerapp@gmail.com
- **Grievances (India):** easetrackerapp@gmail.com
- **Post:** **[CONFIRM — registered address]**
