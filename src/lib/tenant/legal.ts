import type { Locale } from "@/lib/i18n/dictionary";
import { operator as platformOperator } from "@/lib/legal";
import type { Branding } from "./branding";

export type DeptLegalDoc = "terms" | "privacy" | "imprint";

export const DEPT_LEGAL_DOCS: DeptLegalDoc[] = ["terms", "privacy", "imprint"];

export type LegalSection = { heading: string; body: string[] };

/**
 * Legal text for ONE DEPARTMENT -- distinct from src/lib/legal.ts, which
 * speaks for the OpenDepartment platform.
 *
 * The split matters and is the reason these pages have to exist at all. The
 * platform holds a slug, a Supabase URL and a public anon key; it has no
 * service_role key for anybody's project and cannot read a single file. So the
 * platform's notice can honestly say "we hold nothing", and it is the
 * department's own operator who is answerable for the archive -- which means
 * they are the one who owes readers an imprint and a privacy notice, naming
 * themselves.
 *
 * Everything specific comes from the tenant's own settings row (operator_name,
 * operator_contact) through department_identity(), which is `security definer`
 * and readable without a session. That last part is not incidental: an imprint
 * that only members can read is not an imprint.
 *
 * Nothing here is legal advice, and a department that has not filled in its
 * operator fields gets a page that says so rather than a page with a blank
 * where a name should be.
 */
export function getDeptLegalDoc(
  doc: DeptLegalDoc,
  locale: Locale,
  branding: Branding
): { title: string; updated: string; description: string; sections: LegalSection[] } {
  const name = branding.departmentName;
  const who = branding.operatorName?.trim() || null;
  const contact = branding.operatorContact?.trim() || null;

  if (locale === "de") {
    const unnamed =
      "Diese Stelle hat noch keine Betreiberangaben hinterlegt. Die Administration dieses Departements kann sie unter Verwaltung, «Wer dieses Departement betreibt», eintragen.";
    const responsible = who
      ? contact
        ? `Verantwortlich für dieses Departement: ${who}. Kontakt: ${contact}.`
        : `Verantwortlich für dieses Departement: ${who}.`
      : unnamed;

    if (doc === "imprint") {
      return {
        title: "Impressum",
        updated: `Angaben zu ${name}`,
        description: `Betreiberangaben für ${name}.`,
        sections: [
          { heading: "Verantwortlich", body: [responsible] },
          {
            heading: "Was dieses Departement ist",
            body: [
              `${name} ist ein satirisches, fiktives Archiv. Es steht in keinerlei Verbindung zu einer staatlichen Stelle und veröffentlicht keine echten behördlichen Dokumente.`,
              "Die Aufmachung parodiert behördliche Websites. Sämtliche Inhalte sind erfunden oder als Parodie gemeint.",
            ],
          },
          {
            heading: "Beschwerden",
            body: [
              contact
                ? `Wenden Sie sich zuerst an die oben genannte Kontaktadresse: ${contact}.`
                : "Wenden Sie sich zuerst an die Administration dieses Departements.",
              `Führt das zu nichts, kann die Plattform, auf der dieses Departement gehostet wird, erreicht werden unter ${platformOperator.email}. Die Plattform kann ein Departement abschalten; auf dessen Daten hat sie keinen Zugriff.`,
            ],
          },
        ],
      };
    }

    if (doc === "privacy") {
      return {
        title: "Datenschutzerklärung",
        updated: `Für ${name}`,
        description: `Wie ${name} mit Daten umgeht.`,
        sections: [
          { heading: "Verantwortliche Stelle", body: [responsible] },
          {
            heading: "Wo diese Daten liegen",
            body: [
              `${name} läuft in einer eigenen Supabase-Datenbank, die von der oben genannten Stelle kontrolliert wird. Dateien, Kommentare, Stimmen und Mitgliederkonten liegen dort.`,
              "OpenDepartment, die Plattform, speichert von diesem Departement nur die Adresse, die Projekt-URL und einen öffentlichen Anon-Key. Die Plattform besitzt keinen Schlüssel, mit dem sie Inhalte dieses Departements lesen könnte.",
            ],
          },
          {
            heading: "Was erhoben wird",
            body: [
              "Bei der Anmeldung: Ihre E-Mail-Adresse und ein Passwort-Hash. Die Adresse ist für die Administration dieses Departements sichtbar, für andere Mitglieder nicht.",
              "Bei der Nutzung: Ihr gewählter Deckname, Ihre hochgeladenen Dateien, Kommentare, Stimmen und Meldungen. Löschungen und Moderationsentscheide werden protokolliert.",
            ],
          },
          {
            heading: "Cookies",
            body: [
              `${name} setzt nur technisch notwendige Cookies: eines hält Sie in diesem Departement angemeldet und wird ausschliesslich an dessen Adresse gesendet, eines merkt sich die gewählte Sprache, eines den gelesenen Cookie-Hinweis.`,
              "Es gibt keine Werbe-, Profiling- oder Drittanbieter-Tracking-Cookies.",
            ],
          },
          {
            heading: "Ihre Rechte",
            body: [
              contact
                ? `Auskunft, Berichtigung und Löschung verlangen Sie bei der verantwortlichen Stelle: ${contact}.`
                : "Auskunft, Berichtigung und Löschung verlangen Sie bei der Administration dieses Departements.",
            ],
          },
        ],
      };
    }

    return {
      title: "Nutzungsbedingungen",
      updated: `Für ${name}`,
      description: `Regeln für die Nutzung von ${name}.`,
      sections: [
        { heading: "Wer diese Regeln setzt", body: [responsible] },
        {
          heading: "Parodie, nicht Wirklichkeit",
          body: [
            `${name} ist ein satirisches, fiktives Archiv. Laden Sie nichts hoch, das den Anschein erwecken soll, ein echtes behördliches Dokument zu sein.`,
          ],
        },
        {
          heading: "Was Sie nicht hochladen dürfen",
          body: [
            "Nichts Rechtswidriges. Keine echten personenbezogenen Daten über reale Personen, die dem nicht zugestimmt haben. Keine sexuellen Inhalte. Nichts, das dazu dient, jemanden zu schikanieren, blosszustellen oder einzuschüchtern.",
            "Wer etwas hochlädt, verantwortet es. Die Administration dieses Departements kann Beiträge entfernen und Konten sperren.",
          ],
        },
        {
          heading: "Meldungen",
          body: [
            "Jedes Dokument lässt sich über die Schaltfläche «Melden» beanstanden. Meldungen landen mit Zeitstempel bei der Administration dieses Departements.",
          ],
        },
      ],
    };
  }

  const unnamed =
    "This department has not published its operator details yet. Its administrators can add them under Administration, “Who runs this department”.";
  const responsible = who
    ? contact
      ? `Responsible for this department: ${who}. Contact: ${contact}.`
      : `Responsible for this department: ${who}.`
    : unnamed;

  if (doc === "imprint") {
    return {
      title: "Legal notice",
      updated: `Operator details for ${name}`,
      description: `Who runs ${name}.`,
      sections: [
        { heading: "Responsible", body: [responsible] },
        {
          heading: "What this department is",
          body: [
            `${name} is a satirical, fictional archive. It is not affiliated with any government agency and publishes no real official documents.`,
            "The presentation parodies the look of official websites. Everything in it is invented or meant as parody.",
          ],
        },
        {
          heading: "Complaints",
          body: [
            contact
              ? `Write to the address above first: ${contact}.`
              : "Write to this department's administrators first.",
            `If that leads nowhere, the platform hosting this department can be reached at ${platformOperator.email}. The platform can take a department offline; it cannot read its data.`,
          ],
        },
      ],
    };
  }

  if (doc === "privacy") {
    return {
      title: "Privacy notice",
      updated: `For ${name}`,
      description: `How ${name} handles data.`,
      sections: [
        { heading: "Who is responsible", body: [responsible] },
        {
          heading: "Where this data lives",
          body: [
            `${name} runs on its own Supabase database, controlled by the party named above. Files, comments, votes and member accounts live there.`,
            "OpenDepartment, the platform, stores only this department's address, its project URL and a public anon key. The platform holds no key that could read anything inside this department.",
          ],
        },
        {
          heading: "What is collected",
          body: [
            "When you sign up: your e-mail address and a password hash. The address is visible to this department's administrators and to no other member.",
            "As you use it: the cover name you chose, the files you upload, your comments, votes and reports. Deletions and moderation actions are recorded in an audit log.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            `${name} sets only the cookies it needs to work: one keeps you signed in to this department and is sent to this department's address alone, one remembers your chosen language, one remembers that you have read the cookie notice.`,
            "There are no advertising, profiling or third-party tracking cookies.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            contact
              ? `Ask the responsible party for access, correction or deletion: ${contact}.`
              : "Ask this department's administrators for access, correction or deletion.",
          ],
        },
      ],
    };
  }

  return {
    title: "Terms of use",
    updated: `For ${name}`,
    description: `Rules for using ${name}.`,
    sections: [
      { heading: "Whose rules these are", body: [responsible] },
      {
        heading: "Parody, not reality",
        body: [
          `${name} is a satirical, fictional archive. Do not upload anything meant to pass as a genuine official document.`,
        ],
      },
      {
        heading: "What you may not upload",
        body: [
          "Nothing unlawful. No real personal data about real people who have not agreed to it. No sexual content. Nothing whose purpose is to harass, expose or intimidate somebody.",
          "Whoever uploads something answers for it. This department's administrators can remove documents and suspend accounts.",
        ],
      },
      {
        heading: "Reports",
        body: [
          "Every document has a Report button. Reports reach this department's administrators with a timestamp.",
        ],
      },
    ],
  };
}
