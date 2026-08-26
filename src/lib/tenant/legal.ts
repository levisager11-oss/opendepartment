import type { Locale } from "@/lib/i18n/dictionary";
import type { Branding } from "./branding";
import { operator as platformOperator } from "@/lib/legal";

export type DeptLegalDoc = "terms" | "privacy" | "imprint";
export const DEPT_LEGAL_DOCS: DeptLegalDoc[] = ["terms", "privacy", "imprint"];

export type LegalSection = { heading: string; body: string[] };

/**
 * Legal text for ONE DEPARTMENT -- not for the platform.
 *
 * The split matters more here than anywhere else in the app. /legal/* speaks
 * for OpenDepartment, which holds a slug, a URL and a public anon key and can
 * read nobody's archive. These pages speak for the person who created *this*
 * department: they hold the files, they hold the member addresses, and they
 * are the ones a subject of the archive has to be able to write to.
 *
 * So everything below is built from the tenant's own `settings` row --
 * department name, operator name, operator contact -- which is also why
 * department_identity() publishes those two columns. Nothing about any
 * particular department is written into this file.
 *
 * Nothing here is legal advice. It says who is responsible and how to reach
 * them, which is the part an archive about real people cannot do without.
 */

/** Whether this department has named somebody answerable for it. */
export function hasOperator(branding: Branding): boolean {
  return Boolean(
    branding.operatorName?.trim() || branding.operatorContact?.trim()
  );
}

/**
 * The "write to this person" line.
 *
 * An operator who filled in neither field gets an honest sentence saying so
 * rather than an empty bullet -- and the platform's own address, because a
 * takedown request has to land somewhere even when a department has not
 * named anyone.
 */
function operatorLine(branding: Branding, locale: Locale): string {
  const name = branding.operatorName?.trim() ?? "";
  const contact = branding.operatorContact?.trim() ?? "";
  const both = [name, contact].filter(Boolean).join(" — ");

  if (both) return both;

  return locale === "de"
    ? `Diese Stelle hat keine verantwortliche Person angegeben. Wenden Sie sich an OpenDepartment: ${platformOperator.email}`
    : `This department has not named an operator. Write to OpenDepartment instead: ${platformOperator.email}`;
}

export function getDeptLegalDoc(
  doc: DeptLegalDoc,
  branding: Branding,
  locale: Locale
): { title: string; sections: LegalSection[] } {
  const name = branding.departmentName;
  const who = operatorLine(branding, locale);
  const subject = branding.subjectLabel.toLowerCase();

  if (locale === "de") {
    if (doc === "imprint") {
      return {
        title: "Impressum",
        sections: [
          {
            heading: `Verantwortlich für ${name}`,
            body: [who],
          },
          {
            heading: "Was diese Stelle ist",
            body: [
              `${name} ist ein satirisches, fiktives Archiv. Es steht in keiner Verbindung zu einer staatlichen Stelle und veröffentlicht keine echten amtlichen Dokumente.`,
              "Die Aufmachung parodiert behördliche Websites. Das Archiv wird auf OpenDepartment gehostet, dessen Betreiber weder den Inhalt bestimmt noch lesen kann.",
            ],
          },
        ],
      };
    }

    if (doc === "terms") {
      return {
        title: "Nutzungsbedingungen",
        sections: [
          {
            heading: "1. Wer diese Bedingungen stellt",
            body: [
              `Diese Bedingungen gelten für ${name} und stammen von der Person, die diese Stelle betreibt: ${who}`,
              "Für OpenDepartment als Plattform gelten separate Bedingungen; sie regeln nur die Bereitstellung der Adresse, nicht den Inhalt dieses Archivs.",
            ],
          },
          {
            heading: "2. Was hier gilt",
            body: [
              `Wer hier ein Dokument einreicht, verantwortet es. Laden Sie nichts hoch, was Sie nicht zeigen dürfen: keine Bilder Dritter ohne deren Einverständnis, nichts Vertrauliches, nichts Rechtswidriges.`,
              `Es handelt sich um ein Parodiearchiv. Ein ${subject}-Eintrag ist eine Erfindung und keine Tatsachenbehauptung über eine reale Person.`,
            ],
          },
          {
            heading: "3. Meldung und Entfernung",
            body: [
              "Jedes Dokument lässt sich melden. Eine Meldung landet mit Zeitstempel bei der Administration dieser Stelle und wird von ihr, nicht von OpenDepartment, bearbeitet.",
              `Wer sich in diesem Archiv wiederfindet und die Entfernung verlangt, wendet sich an: ${who}`,
            ],
          },
        ],
      };
    }

    return {
      title: "Datenschutzerklärung",
      sections: [
        {
          heading: "1. Verantwortliche Person",
          body: [
            `Für die Bearbeitung der Daten in ${name} verantwortlich: ${who}`,
            "Die Daten liegen in einem Supabase-Projekt, das dieser Person gehört. OpenDepartment besitzt keinen Schlüssel, mit dem sich dieser Inhalt lesen liesse.",
          ],
        },
        {
          heading: "2. Was gespeichert wird",
          body: [
            "Ihre E-Mail-Adresse und Ihr Passwort-Hash für die Anmeldung, Ihr gewählter Deckname, die von Ihnen hochgeladenen Dokumente, Ihre Kommentare, Ihre Stimmen und Ihre Meldungen.",
            "Die Administration dieser Stelle sieht die E-Mail-Adressen aller Mitglieder. Andere Mitglieder sehen nur den Decknamen.",
            "Stimmen sind für andere Mitglieder nicht einsehbar; sichtbar ist nur die Summe.",
          ],
        },
        {
          heading: "3. Auskunft und Löschung",
          body: [
            "Eigene Dokumente und Kommentare können Sie selbst entfernen. Für die Löschung Ihres Kontos oder für Auskunft wenden Sie sich an die oben genannte Person.",
            "Diese Erklärung beschreibt ausschliesslich diese Stelle. Was OpenDepartment als Plattform speichert, steht in dessen eigener Datenschutzerklärung.",
          ],
        },
      ],
    };
  }

  if (doc === "imprint") {
    return {
      title: "Legal notice",
      sections: [
        { heading: `Responsible for ${name}`, body: [who] },
        {
          heading: "What this department is",
          body: [
            `${name} is a satirical, fictional archive. It is not affiliated with any government agency and publishes no real official documents.`,
            "Its presentation parodies the look of official websites. The archive is hosted on OpenDepartment, whose operator neither chooses nor can read its contents.",
          ],
        },
      ],
    };
  }

  if (doc === "terms") {
    return {
      title: "Terms of use",
      sections: [
        {
          heading: "1. Whose terms these are",
          body: [
            `These terms cover ${name} and come from the person who runs it: ${who}`,
            "OpenDepartment, the platform, has its own separate terms. They cover providing the address and nothing about what is in this archive.",
          ],
        },
        {
          heading: "2. What applies here",
          body: [
            "If you submit a document, you answer for it. Do not upload anything you are not free to show: no pictures of other people without their agreement, nothing confidential, nothing unlawful.",
            `This is a parody archive. A ${subject} entry is an invention, not a statement of fact about a real person.`,
          ],
        },
        {
          heading: "3. Reporting and removal",
          body: [
            "Every document can be reported. A report reaches this department's administration with a timestamp and is handled by them, not by OpenDepartment.",
            `If you find yourself in this archive and want out, write to: ${who}`,
          ],
        },
      ],
    };
  }

  return {
    title: "Privacy notice",
    sections: [
      {
        heading: "1. Who is responsible",
        body: [
          `Responsible for the data held in ${name}: ${who}`,
          "The data sits in a Supabase project that person owns. OpenDepartment holds no key capable of reading it.",
        ],
      },
      {
        heading: "2. What is stored",
        body: [
          "Your e-mail address and password hash for signing in, the cover name you chose, the documents you upload, your comments, your votes and any reports you file.",
          "This department's administration can see every member's e-mail address. Other members see only the cover name.",
          "Votes are not visible to other members; only the total is.",
        ],
      },
      {
        heading: "3. Access and deletion",
        body: [
          "You can remove your own documents and comments yourself. For deletion of your account, or for a copy of what is held about you, write to the person named above.",
          "This notice covers this department only. What OpenDepartment stores as a platform is in its own privacy notice.",
        ],
      },
    ],
  };
}
