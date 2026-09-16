import type { Locale } from "./i18n/dictionary";

export type LegalDoc = "terms" | "privacy" | "imprint";

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
 * database the department's own operator controls. Rendering private pages
 * uses the visitor's authorized session, so the platform processes that data
 * without retaining a permanent department administrator credential.
 *
 * Each department states its own operator in its own settings and footer.
 *
 * Nothing here is legal advice. Have an adult read it before going live.
 */
export function getLegalDoc(
  doc: LegalDoc,
  locale: Locale
): {
  title: string;
  updated: string;
  /** Meta description only -- never rendered on the page. */
  description: string;
  sections: LegalSection[];
} {
  const contact = contactLine();

  if (locale === "de") {
    if (doc === "imprint") {
      return {
        title: "Impressum",
        updated: "Angaben zur Plattform",
        description:
          "Betreiberangaben für OpenDepartment. Einzelne Departemente führen ihr eigenes Impressum.",
        sections: [
          {
            heading: "Verantwortlich für diese Plattform",
            body: [
              contact ||
                "Für diese Installation sind keine Betreiberangaben hinterlegt. Sie werden über die Umgebungsvariablen NEXT_PUBLIC_OPERATOR_NAME, NEXT_PUBLIC_OPERATOR_ADDRESS, NEXT_PUBLIC_OPERATOR_COUNTRY und NEXT_PUBLIC_CONTACT_EMAIL gesetzt.",
              "Diese Angaben betreffen die Plattform OpenDepartment. Sie betreffen nicht die einzelnen Departemente: Für deren Inhalte ist jeweils die Stelle verantwortlich, die das Departement betreibt.",
            ],
          },
          {
            heading: "Was diese Plattform ist",
            body: [
              "OpenDepartment ist ein Werkzeug zum Aufsetzen satirischer, fiktiver Archive. Die Aufmachung parodiert behördliche Websites; es besteht keinerlei Verbindung zu einer staatlichen Stelle.",
              "Die Plattform betreibt selbst kein Archiv. Dateien, Kommentare und Mitgliederkonten eines Departements liegen in der Supabase-Datenbank der jeweils verantwortlichen Stelle.",
            ],
          },
          {
            heading: "Beschwerden über ein Departement",
            body: [
              "Wenden Sie sich zuerst an die im Impressum des betreffenden Departements genannte Stelle. Jedes Departement führt sein eigenes Impressum unter /d/<name>/legal/imprint.",
              `Führt das zu nichts, melden Sie das Departement über die Meldeseite dieser Plattform oder schreiben Sie an ${operator.email}. Die Plattform kann einen Verzeichniseintrag sperren; über die Inhalte in einer fremden Datenbank verfügt sie nicht.`,
            ],
          },
        ],
      };
    }

    if (doc === "terms") {
      return {
        title: "Nutzungsbedingungen",
        updated: "Stand: 8. September 2026",
        description:
          "OpenDepartment ist ein Werkzeug für satirische, fiktive Archive und betreibt selbst keines. Wer ein Departement anlegt, verantwortet dessen Inhalt.",
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
              "OpenDepartment hält keinen dauerhaften Administrator-Schlüssel für Ihr Departement. Zur Seitendarstellung verarbeitet der Server die Sitzung und die dadurch zugänglichen Daten des jeweiligen Mitglieds. Die Moderation im Departement liegt bei dessen Administration.",
            ],
          },
          {
            heading: "3. Was die Plattform tun kann",
            body: [
              "Die Plattform kann die Adresse eines Departements abschalten, sodass es unter opendepartment nicht mehr erreichbar ist. Die Daten bleiben dabei unverändert im Supabase-Projekt der betreibenden Person.",
              "Ein Anspruch auf Verfügbarkeit des Dienstes besteht nicht. Wird die Plattform eingestellt, bleiben die Archivinhalte in Ihrem eigenen Supabase-Projekt, solange dieses weiter betrieben wird.",
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
      updated: "Stand: 8. September 2026",
      description:
        "Was OpenDepartment speichert: Adresse, Supabase-URL, öffentlicher anon-Key und Anzeigename eines Departements. Dateien, Kommentare und Mitglieder liegen ausschliesslich in Ihrem eigenen Projekt.",
      sections: [
        {
          heading: "1. Was wir speichern",
          body: [
            "Für ein registriertes Departement: die gewählte Adresse (Slug), die URL Ihres Supabase-Projekts, dessen öffentlichen anon-Key, den Anzeigenamen und die Angabe, ob es gelistet ist.",
            "Für ein OpenDepartment-Konto: Ihre E-Mail-Adresse und Ihr Passwort-Hash, verwaltet durch Supabase Auth.",
            "Wir speichern auch eingereichte Missbrauchsmeldungen mit den freiwillig angegebenen Kontaktdaten. Wir fragen keinen service_role-Key ab. Zur Seitendarstellung verarbeitet der Server Mitgliedssitzungen, autorisierte Metadaten und zeitlich begrenzte Datei-Links. Bei optionaler Supabase-Verbindung verarbeitet er vorübergehend einen verschlüsselt gespeicherten Management-API-Token.",
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
          heading: "3. Cookies",
          body: [
            "Cookies speichern Ihre Anmeldung am OpenDepartment-Konto, die gewählte Sprache und den gelesenen Cookie-Hinweis. Die optionale Supabase-Einrichtung verwendet ausserdem kurzlebige Cookies für den Verbindungsablauf und einen verschlüsselten, kontogebundenen Management-API-Token.",
            "Die App bindet Vercel Analytics für Zugriffsstatistiken ein; dieses Skript setzt keine Cookies. Die Startseite enthält einen gewöhnlichen Link zu Ko-fi -- kein Skript und kein Widget von dort, Ihr Browser verbindet sich mit Ko-fi erst, wenn Sie den Link anklicken. Ein besuchtes Departement setzt ein eigenes Sitzungs-Cookie, das auf seinen URL-Pfad beschränkt ist.",
          ],
        },
        {
          heading: "4. Ihre Rechte",
          body: [
            "Sie können einen nicht gesperrten Verzeichniseintrag entfernen. Dies löscht weder Ihr Plattformkonto noch gespeicherte Missbrauchsmeldungen. Für Auskunft oder Löschung wenden Sie sich an die untenstehende Adresse.",
            contact,
          ],
        },
      ],
    };
  }

  if (doc === "imprint") {
    return {
      title: "Imprint",
      updated: "Platform operator",
      description:
        "Who runs OpenDepartment. Individual departments publish their own imprint.",
      sections: [
        {
          heading: "Responsible for this platform",
          body: [
            contact ||
              "This installation has published no operator details. They are set through the NEXT_PUBLIC_OPERATOR_NAME, NEXT_PUBLIC_OPERATOR_ADDRESS, NEXT_PUBLIC_OPERATOR_COUNTRY and NEXT_PUBLIC_CONTACT_EMAIL environment variables.",
            "These details are for the OpenDepartment platform. They are not the details for any department on it: each department is answerable for its own contents, through whoever runs it.",
          ],
        },
        {
          heading: "What this platform is",
          body: [
            "OpenDepartment is a tool for setting up satirical, fictional archives. It parodies the presentation of government websites and is not connected to any public authority.",
            "The platform runs no archive of its own. A department's files, comments and member accounts live in the Supabase database of whoever is responsible for it.",
          ],
        },
        {
          heading: "Complaints about a department",
          body: [
            "Start with the department itself: each one publishes its own imprint at /d/<name>/legal/imprint, naming who answers for it.",
            `If that leads nowhere, report the department through this platform's report page, or write to ${operator.email}. The platform can suspend a directory listing; it has no power over the contents of somebody else's database.`,
          ],
        },
      ],
    };
  }

  if (doc === "terms") {
    return {
      title: "Terms of use",
      updated: "Last updated: 8 September 2026",
      description:
        "OpenDepartment is a tool for building satirical, fictional archives and runs none of them itself. Whoever creates a department is responsible for what is in it.",
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
            "OpenDepartment holds no permanent tenant administrator key. To render pages, its server processes the current member's session and the data that session can access. Department administrators manage their archive's moderation.",
          ],
        },
        {
          heading: "3. What the platform can do",
          body: [
            "The platform can stop a department's address from resolving, so it is no longer reachable through OpenDepartment. The data itself is untouched and remains in its operator's own Supabase project.",
            "There is no guarantee of availability. If the platform is discontinued, archive content remains in your own Supabase project while that project is maintained.",
          ],
        },
        { heading: "4. Contact", body: [contact] },
      ],
    };
  }

  return {
    title: "Privacy notice",
    updated: "Last updated: 8 September 2026",
    description:
      "What OpenDepartment stores: a department's address, Supabase URL, public anon key and display name. Files, comments and member accounts live only in your own project.",
    sections: [
      {
        heading: "1. What we store",
        body: [
          "For a registered department: the chosen address (slug), your Supabase project URL, its public anon key, the display name, and whether it is listed.",
          "For an OpenDepartment account: your e-mail address and password hash, handled by Supabase Auth.",
          "We also store submitted abuse reports and any contact details you choose to include. We do not request a service_role key. To render pages, our server processes member sessions, authorized metadata and temporary file links. Optional Supabase connection temporarily uses an encrypted Management API token.",
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
        heading: "3. Cookies",
        body: [
          "Cookies keep your OpenDepartment account session, chosen language and dismissed notice. Optional Supabase setup also uses short-lived cookies for its connection flow and an encrypted, account-bound Management API token.",
          "The app includes Vercel Analytics for traffic statistics; that script sets no cookies. The homepage carries an ordinary link to Ko-fi -- no script and no widget from them, and your browser only reaches Ko-fi if you follow the link. A department you visit sets its own session cookie, scoped to that department's URL path.",
        ],
      },
      {
        heading: "4. Your rights",
        body: [
          "You can remove a listing that is not suspended. This does not delete your platform account or stored abuse reports. For access or deletion requests, write to the address below.",
          contact,
        ],
      },
    ],
  };
}
