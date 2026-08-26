import type { Locale } from "./i18n/dictionary";

export type LegalDoc = "terms" | "privacy";

export type LegalSection = { heading: string; body: string[] };

export const operator = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME || "",
  address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS || "",
  country: process.env.NEXT_PUBLIC_OPERATOR_COUNTRY || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "notausgang09@gmail.com",
};

/**
 * The contact line, built from whatever is actually configured.
 *
 * The postal parts are optional: an operator who has only published an e-mail
 * address should get a clean "write to X", not a line full of unfilled
 * placeholders like "[Your full name], [Street, ZIP, Town]". Whether a postal
 * address is legally required depends on where the operator is; the fields
 * exist so it can be added without touching this file.
 */
export function contactLine(): string {
  const postal = [operator.name, operator.address, operator.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  if (postal && operator.email) return `${postal} — ${operator.email}`;
  return postal || operator.email;
}

/**
 * Legal text for the OPENDEPARTMENT PLATFORM -- not for any department.
 *
 * The distinction is the whole point. OpenDepartment stores a slug, a Supabase
 * URL and a public anon key. Every file, comment and member address lives in a
 * database the department's own operator controls, and the platform holds no
 * key that can read it. So the platform's privacy notice is short and its
 * terms mostly say "the person who made that archive is answerable for it".
 *
 * Each department states its own operator in its own settings and footer.
 *
 * Nothing here is legal advice. Have an adult read it before going live.
 */
export function getLegalDoc(
  doc: LegalDoc,
  locale: Locale
): { title: string; updated: string; sections: LegalSection[] } {
  const contact = contactLine();

  if (locale === "de") {
    if (doc === "terms") {
      return {
        title: "Nutzungsbedingungen",
        updated: "Stand: 25. August 2026",
        sections: [
          {
            heading: "1. Was OpenDepartment ist",
            body: [
              "OpenDepartment ist ein Werkzeug, mit dem Sie ein satirisches, fiktives «Behördenarchiv» aufsetzen können. Die Plattform parodiert die Aufmachung behördlicher Websites. Sie steht in keinerlei Verbindung zu einer staatlichen Stelle und gibt nicht vor, echte Dokumente zu veröffentlichen.",
              "OpenDepartment betreibt selbst kein Archiv und speichert keine Inhalte. Wer ein Departement erstellt, verbindet seine eigene Supabase-Datenbank; sämtliche Dateien, Kommentare und Mitgliederkonten liegen dort.",
            ],
          },
          {
            heading: "2. Verantwortlichkeit für ein Departement",
            body: [
              "Wer ein Departement erstellt, ist für dessen Inhalt allein verantwortlich. Das umfasst insbesondere die Persönlichkeitsrechte betroffener Personen (Art. 28 ZGB) und die Pflichten als verantwortliche Person im Sinne des revDSG.",
              "Wenn Sie ein Departement über eine reale Person erstellen, benennen Sie diese Person in einem öffentlich einsehbaren Archiv. Holen Sie deren Einverständnis ein, bevor Sie das tun.",
              "OpenDepartment hat keinen Schlüssel, mit dem sich der Inhalt eines Departements lesen liesse, und kann Inhalte daher weder prüfen noch entfernen.",
            ],
          },
          {
            heading: "3. Was die Plattform tun kann",
            body: [
              "Die Plattform kann die Adresse eines Departements abschalten, sodass es unter opendepartment nicht mehr erreichbar ist. Die Daten bleiben dabei unverändert im Supabase-Projekt der betreibenden Person.",
              "Ein Anspruch auf Verfügbarkeit des Dienstes besteht nicht. Der Betrieb kann jederzeit eingestellt werden; Ihre Daten bleiben Ihnen, weil sie nie bei uns lagen.",
            ],
          },
          {
            heading: "4. Kontakt",
            body: [contact],
          },
        ],
      };
    }

    return {
      title: "Datenschutzerklärung",
      updated: "Stand: 25. August 2026",
      sections: [
        {
          heading: "1. Was wir speichern",
          body: [
            "Für ein registriertes Departement: die gewählte Adresse (Slug), die URL Ihres Supabase-Projekts, dessen öffentlichen anon-Key, den Anzeigenamen und die Angabe, ob es gelistet ist.",
            "Für ein OpenDepartment-Konto: Ihre E-Mail-Adresse und Ihr Passwort-Hash, verwaltet durch Supabase Auth.",
            "Das ist alles. Wir erhalten niemals Ihren service_role-Key und können den Inhalt Ihres Departements nicht lesen.",
          ],
        },
        {
          heading: "2. Was wir nicht speichern",
          body: [
            "Keine hochgeladenen Dateien, keine Kommentare, keine Stimmen, keine Mitgliederkonten Ihres Departements und keine E-Mail-Adressen Ihrer Mitglieder. All das liegt ausschliesslich in Ihrem eigenen Supabase-Projekt.",
            "Die Daten Ihrer Mitglieder unterliegen der Datenschutzerklärung, die Sie als betreibende Person Ihres Departements verantworten.",
          ],
        },
        {
          heading: "3. Ihre Rechte",
          body: [
            "Sie können Ihr Departement jederzeit aus dem Verzeichnis entfernen; damit sind alle bei uns gespeicherten Angaben dazu gelöscht. Für Auskunft oder Löschung Ihres OpenDepartment-Kontos wenden Sie sich an die untenstehende Adresse.",
            contact,
          ],
        },
      ],
    };
  }

  if (doc === "terms") {
    return {
      title: "Terms of use",
      updated: "Last updated: 25 August 2026",
      sections: [
        {
          heading: "1. What OpenDepartment is",
          body: [
            "OpenDepartment is a tool for setting up a satirical, fictional “government archive”. The platform parodies the look of official websites. It is not affiliated with any government agency and does not claim to publish real documents.",
            "OpenDepartment does not run any archive itself and stores no content. Whoever creates a department connects their own Supabase database; every file, comment and member account lives there.",
          ],
        },
        {
          heading: "2. Responsibility for a department",
          body: [
            "Whoever creates a department is solely responsible for what is in it, including the personality rights of anyone named in it and any data-protection duties that follow from holding other people's information.",
            "If you build a department about a real person, you are naming that person in an archive other people can read. Get their agreement before you do it.",
            "OpenDepartment holds no key capable of reading a department's contents, and therefore cannot review or remove them.",
          ],
        },
        {
          heading: "3. What the platform can do",
          body: [
            "The platform can stop a department's address from resolving, so it is no longer reachable through OpenDepartment. The data itself is untouched and remains in its operator's own Supabase project.",
            "There is no guarantee of availability. The service may be discontinued at any time; your data survives that, because it was never held here.",
          ],
        },
        { heading: "4. Contact", body: [contact] },
      ],
    };
  }

  return {
    title: "Privacy notice",
    updated: "Last updated: 25 August 2026",
    sections: [
      {
        heading: "1. What we store",
        body: [
          "For a registered department: the chosen address (slug), your Supabase project URL, its public anon key, the display name, and whether it is listed.",
          "For an OpenDepartment account: your e-mail address and password hash, handled by Supabase Auth.",
          "That is the complete list. We never receive your service_role key and cannot read your department's contents.",
        ],
      },
      {
        heading: "2. What we do not store",
        body: [
          "No uploaded files, no comments, no votes, no member accounts of your department, and none of your members' e-mail addresses. All of that sits only in your own Supabase project.",
          "Your members' data is covered by whatever privacy notice you, as your department's operator, are responsible for.",
        ],
      },
      {
        heading: "3. Your rights",
        body: [
          "You can remove your department from the directory at any time, which deletes everything we hold about it. For access to or deletion of your OpenDepartment account, write to the address below.",
          contact,
        ],
      },
    ],
  };
}
