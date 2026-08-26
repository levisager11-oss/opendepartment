export type Locale = "de" | "en";

export const LOCALES: Locale[] = ["de", "en"];

/**
 * Every user-facing string lives here. `en` is the reference; `de` uses Swiss
 * High German conventions (no eszett -- always "ss").
 */
export const dictionary = {
  en: {
    // --- chrome ---------------------------------------------------------
    "gov.official": "An official website of {name}",
    "gov.parody": "PARODY",
    "gov.disclaimer":
      "This is a satirical student project. It is not affiliated with any government agency.",
    "site.department": "Department of Justice",
    "site.office": "Office of Records",
    "site.name": "{name}",
    "site.tagline": "Declassified Document Repository",

    // --- nav ------------------------------------------------------------
    "nav.vault": "The Vault",
    "nav.upload": "Submit Evidence",
    "nav.admin": "Administration",
    "nav.signout": "Sign out",
    "nav.signedInAs": "Signed in as",
    "nav.language": "Language",
    "nav.home": "Home",
    "common.and": "and",
    "setup.tooMany":
      "You have reached the maximum of 3 departments for one account. Remove one under Your departments first.",
    "setup.next1":
      "Open your department and create the first account. Whoever signs up first becomes the administrator, so make sure it is you.",
    "setup.next2":
      "Go to Administration, then Invites, and create a code. That is how everybody else gets in.",
    "setup.next3":
      "Share the invite link. Nobody can join without a code, and you can revoke one at any time.",
    "setup.next2Open":
      "Your department is public, so anybody can create an account. Go to Administration, then Invites, if you want to close that door or hand somebody administrator rights.",
    "setup.next3Open":
      "Share the address. Anybody who opens it can sign up, and you can require an invite code again at any time.",
    "account.acceptPre": "I accept the",
    "account.acceptPost":
      ", and I understand that I am responsible for everything in the departments I create.",
    "account.acceptRequired":
      "Please accept the terms and the privacy notice to create an account.",
    "admin.tab.invites": "Invites",
    "invite.maxUses": "Maximum uses",
    "invite.expiresDays": "Expires in (days)",
    "invite.note": "Note",
    "invite.notePlaceholder": "e.g. handed out in the group chat",
    "invite.regenerate": "Generate a new code",
    "invite.duplicate": "That code already exists.",
    "invite.status": "Status",
    "invite.active": "Active",
    "invite.none": "No invite codes yet. Create one and share the link.",
    "invite.revokeConfirm":
      "Revoke this invite code? Anyone who has not used it yet will be turned away. People who already joined with it keep their accounts.",
    "invite.grantsAdminWarning":
      "Anyone who redeems this code becomes an administrator: they can see every member e-mail address, delete any document and ban anyone. Use a low usage limit.",
    "access.title": "Who can join",
    "access.help":
      "Enforced inside your own database, not by this page -- so it holds even against somebody calling the API by hand.",
    "access.closed": "Invite code required",
    "access.closedHelp":
      "Nobody can create an account without a code you handed out. This is how a new department starts.",
    "access.open": "Anyone can join",
    "access.openHelp":
      "Visitors can sign up without a code. Codes still work, and are still the only way to hand out administrator rights.",
    "admin.users.notSelf": "You cannot change your own administrator or ban status.",
    "setup.noControlPlane": "This deployment has no directory configured",
    "setup.noControlPlaneBody":
      "Registering an address writes to OpenDepartment own control-plane database, and NEXT_PUBLIC_CONTROL_SUPABASE_URL is not set here. Your Supabase project is fine -- there is just nowhere to file the address. To test the department itself without a control plane, put this line in .env.local and open the slug directly:",

    // --- e-mail configuration (the single biggest setup gotcha) ---------
    "email.step": "Set up e-mail",
    "email.why": "Supabase will not deliver mail to your members yet",
    "email.whyBody":
      "A new Supabase project can only send a handful of messages an hour, and it delivers them only to addresses on your own Supabase team. Your members will never receive a confirmation or a password-reset mail until you change one of the two settings below. This catches almost everyone, so do it now rather than after you have invited thirty people.",
    "email.optionA": "Option A -- turn confirmation off (small private group)",
    "email.optionABody":
      "In your project: Authentication, then Sign In / Providers, then Email. Switch off \"Confirm email\". People join with an invite code instead, and no mail ever needs to arrive. Password resets will not work -- members who forget one ask you to reset it.",
    "email.optionB": "Option B -- connect your own SMTP (proper e-mail)",
    "email.optionBBody":
      "In your project: Project Settings, then Authentication, then SMTP Settings. Resend, Brevo and Postmark all have free tiers big enough for a class. Confirmations, password resets and magic links then all work normally.",
    "email.recommend":
      "For a class or a friend group, Option A is the one that just works.",
    "email.confirm": "I have chosen one of these",
    "email.reminder":
      "Reminder: if you skipped the e-mail step, your members cannot confirm their address or reset a password.",

    // --- support --------------------------------------------------------
    "od.support": "Support OpenDepartment",
    "od.supportBody":
      "OpenDepartment is free and stores nothing of yours. If it is useful to you, you can buy me a coffee.",

    // --- department chrome (OpenDepartment additions) -------------------
    "dept.hostedNotice":
      "{name} is created and run by its own administrators, who are responsible for everything in it. It is hosted on",
    "dept.reportThis": "Report this department",
    "dept.frontDoor": "Restricted archive",
    "dept.frontDoorOpen": "Open archive",
    "dept.needInvite": "You need an invite code to join this archive.",
    "dept.haveInvite": "I have an invite code",
    "dept.openJoinNote":
      "This archive is open, so a code is optional -- use one only if somebody sent you one.",
    "dept.joinOpen": "Create an account",
    "dept.notSetUp": "This department has not finished its setup yet.",
    "dept.notSetUpBody":
      "The owner still needs to install the schema in their Supabase project. If this is your department, open the setup guide to finish it.",

    // --- invites --------------------------------------------------------
    "invite.title": "Join {name}",
    "invite.code": "Invite code",
    "invite.codeOptional": "Invite code (optional)",
    "invite.codePlaceholder": "e.g. FIELD-AGENT-7",
    "invite.invalid": "That invite code is not valid.",
    "invite.expired": "That invite code has expired.",
    "invite.used": "That invite code has been used up.",
    "invite.required": "An invite code is required to join this department.",
    "invite.create": "Create invite",
    "invite.link": "Invite link",
    "invite.copied": "Copied",
    "invite.uses": "Uses",
    "invite.unlimited": "Unlimited",
    "invite.expires": "Expires",
    "invite.never": "Never",
    "invite.revoke": "Revoke",
    "invite.grantsAdmin": "Grants administrator rights",

    // --- OpenDepartment marketing --------------------------------------
    "od.name": "OpenDepartment",
    "od.tagline": "Run your own files.",
    "od.hero":
      "Build a mock government archive for your class, your team or your group chat. Members upload exhibits, vote on them and argue in the comments. You decide who gets in.",
    "od.yourData": "Your database, not ours",
    "od.yourDataBody":
      "Every department stores its files, members and comments in a Supabase project you own. We keep a name and a URL. Nothing you upload ever touches our servers, and we cannot read it.",
    "od.private": "Invite only by default",
    "od.privateBody":
      "A new department is unlisted and closed. People get in with an invite code you hand out, or an e-mail address you add. You can ban, delete and see every report.",
    "od.free": "Free to run",
    "od.freeBody":
      "Supabase free tier covers a group of thirty comfortably. If you outgrow it, you upgrade your own project -- there is no plan to buy from us.",
    "od.create": "Create a department",
    "od.browse": "Browse public departments",
    "od.needSupabase":
      "You will need a free Supabase account. Setup takes about five minutes.",
    "od.directory": "Public departments",
    "od.directoryEmpty": "No department has made itself public yet.",
    "od.directoryNote":
      "These are archives whose owners chose to be listed. Most departments are unlisted and reachable only by invitation.",

    // --- setup wizard ---------------------------------------------------
    "setup.title": "Create a department",
    "setup.step": "Step {n} of {total}",
    "setup.step1": "Name it",
    "setup.step2": "Create a Supabase project",
    "setup.step3": "Install the schema",
    "setup.step4": "Connect it",
    "setup.name": "Department name",
    "setup.namePlaceholder": "The Lorenzo Files",
    "setup.nameHelp": "What your members will see at the top of every page.",
    "setup.slug": "Address",
    "setup.slugHelp":
      "Letters, numbers and hyphens. This cannot be changed later.",
    "setup.slugTaken": "That address is already taken.",
    "setup.slugInvalid":
      "Use 3-32 characters: lowercase letters, numbers and hyphens.",
    "setup.slugFree": "Available",
    "setup.subjectLabel": "What are the files about?",
    "setup.subjectHelp":
      "Used in headings. Case gives you Case File 0001.",
    "setup.docket": "Docket prefix",
    "setup.docketHelp": "Two or three letters. LF gives you LF-0001.",
    "setup.supabaseIntro":
      "Your department needs its own database. Supabase gives you one free.",
    "setup.supabaseSteps":
      "Open supabase.com, sign up, and create a new project. Choose a region near your members. Wait for it to finish provisioning -- it takes a minute or two.",
    "setup.openSupabase": "Open Supabase",
    "setup.sqlIntro":
      "Copy this SQL, open the SQL Editor in your project, paste it and press Run. It creates every table, policy and function your department needs.",
    "setup.copySql": "Copy SQL",
    "setup.sqlCopied": "Copied to clipboard",
    "setup.sqlDone": "I have run the SQL",
    "setup.credsIntro":
      "Last step. In your Supabase project, open Project Settings then API, and copy these two values.",
    "setup.url": "Project URL",
    "setup.anonKey": "Anon / publishable key",
    "setup.keyWarning":
      "Use the anon key, never the service_role key. OpenDepartment does not need it and will refuse it.",
    "setup.serviceKeyRejected":
      "That looks like a service_role key. Paste the anon / publishable key instead.",
    "setup.redirectNote":
      "One more thing in Supabase: under Authentication, URL Configuration, add this to your Redirect URLs.",
    "setup.verify": "Verify and create",
    "setup.verifying": "Checking your project...",
    "setup.schemaMissing":
      "Your project answered, but the schema is not installed. Go back and run the SQL.",
    "setup.unreachable":
      "Could not reach that project. Check the URL and the key.",
    "setup.claimed":
      "That project already has an administrator. Connect a fresh Supabase project instead.",
    "setup.done": "Your department is live",
    "setup.doneBody":
      "Open it and create the first account -- the first person to sign up becomes the administrator, so make sure it is you.",
    "setup.openDept": "Open your department",
    "setup.visibility": "Listing",
    "setup.unlisted": "Unlisted -- reachable only with the link",
    "setup.unlistedHelp":
      "Nobody finds it by browsing, and nobody joins without an invite code you hand out.",
    "setup.public": "Public -- listed in the directory",
    "setup.publicHelp":
      "Listed in the directory, and anybody who opens it can create an account without a code.",
    "account.listingOnly":
      "Changes the directory listing only. Who may join is set inside the department, under Administration.",

    // --- OpenDepartment account -----------------------------------------
    "account.title": "Your departments",
    "account.none": "You have not created a department yet.",
    "account.signIn": "Sign in to OpenDepartment",
    "account.signInBody":
      "This account only manages your department listings. It is separate from your membership inside any department.",
    "account.manage": "Manage",
    "account.visit": "Visit",
    "account.delist": "Remove listing",
    "account.delistConfirm":
      "Remove this department from OpenDepartment? Its address stops working. The data stays in your own Supabase project and is not touched.",

    // --- landing --------------------------------------------------------
    "landing.title": "{name}",
    "landing.subtitle":
      "Access to this repository is restricted to authorised personnel.",
    "landing.body":
      "Documents held in this repository have been submitted by cleared members. Access requires a valid invite code.",
    "landing.cta": "Request access",
    "landing.stat.files": "Documents on file",
    "landing.stat.subjects": "Subjects indexed",
    "landing.stat.members": "Cleared personnel",

    // --- auth -----------------------------------------------------------
    "auth.title": "Personnel Authentication",
    "auth.subtitle": "Restricted system. Authorised access only.",
    "auth.google": "Continue with Google",
    "auth.or": "or",
    "auth.email": "E-mail address",
    "auth.password": "Password",
    "auth.signin": "Sign in",
    "auth.signup": "Create account",
    "auth.toSignup": "No account yet? Register",
    "auth.toSignin": "Already registered? Sign in",
    "auth.forgot": "Forgot your password?",
    "auth.reset": "Send reset link",
    "auth.resetSent":
      "If that address belongs to a member, a reset link is on its way.",
    "auth.checkEmail":
      "Check your inbox and confirm your e-mail address to finish registration.",
    "auth.notAllowed":
      "This e-mail address is not on the access list. Contact the administrator to be added.",
    "auth.invalidCredentials": "E-mail address or password is incorrect.",
    "auth.passwordTooShort": "Password must be at least 8 characters.",
    "auth.genericError": "Authentication failed. Please try again.",
    "auth.working": "Verifying...",

    // --- onboarding -----------------------------------------------------
    "onboarding.title": "Assign Your Cover Name",
    "onboarding.body":
      "Choose the name other personnel will see next to your submissions. Your e-mail address stays hidden from everyone except the administrator.",
    "onboarding.label": "Cover name",
    "onboarding.placeholder": "e.g. DEEP_THROAT",
    "onboarding.rules": "3-20 characters. Letters, digits, underscore and dash.",
    "onboarding.submit": "Confirm identity",
    "onboarding.taken": "That name is already assigned to another operative.",
    "onboarding.invalid":
      "Invalid name. Use 3-20 letters, digits, underscores or dashes.",

    // --- vault ----------------------------------------------------------
    "vault.title": "Document Repository",
    "vault.count_one": "{n} document on file",
    "vault.count_other": "{n} documents on file",
    "vault.search": "Search titles, descriptions, file names...",
    "vault.sort": "Sort by",
    "vault.sort.top": "Highest rated",
    "vault.sort.new": "Most recent",
    "vault.sort.worst": "Lowest rated",
    "vault.sort.views": "Most viewed",
    "vault.sort.discussed": "Most discussed",
    "vault.filter.subject": "Subject",
    "vault.filter.category": "Classification",
    "vault.filter.kind": "Media type",
    "vault.filter.all": "All",
    "vault.filter.mine": "My submissions only",
    "vault.clear": "Clear filters",
    "vault.empty": "No documents match the current filters.",
    "vault.emptyAll":
      "The repository is empty. Be the first to submit evidence.",
    "vault.loading": "Retrieving records...",

    // --- file card / detail ---------------------------------------------
    "file.case": "Case",
    "file.submittedBy": "Filed by",
    "file.submittedOn": "Filed on",
    "file.views": "views",
    "file.comments": "comments",
    "file.size": "Size",
    "file.type": "Type",
    "file.subjects": "Subjects",
    "file.category": "Classification",
    "file.download": "Download",
    "file.open": "Open document",
    "file.delete": "Delete",
    "file.report": "Report",
    "file.back": "Back to repository",
    "file.notFound": "Document not found or already destroyed.",
    "file.uploaderEmail": "Uploader e-mail (admin only)",
    "file.deleteConfirm":
      "Permanently destroy this document? This cannot be undone.",
    "file.deleted": "Document destroyed.",
    "file.unsupported":
      "This format cannot be previewed in the browser. Use the download button.",
    "file.loadingPreview": "Loading document...",

    // --- voting ---------------------------------------------------------
    "vote.up": "Corroborate",
    "vote.down": "Dispute",
    "vote.score": "Rating",

    // --- comments -------------------------------------------------------
    "comments.title": "Case Notes",
    "comments.placeholder": "Add a note to the case file...",
    "comments.submit": "File note",
    "comments.empty": "No notes have been filed on this document.",
    "comments.delete": "Delete note",
    "comments.deleteConfirm": "Delete this note?",
    "comments.tooLong": "Notes are limited to 2000 characters.",

    // --- upload ---------------------------------------------------------
    "upload.title": "Submit Evidence",
    "upload.subtitle": "All submissions are logged and attributed.",
    "upload.dropzone": "Drop a file here or click to select",
    "upload.dropzoneHint":
      "Images, PDFs, video and audio. Maximum {mb} MB per file.",
    "upload.fileTitle": "Document title",
    "upload.fileTitlePlaceholder": "e.g. Surveillance photograph, 14 March",
    "upload.description": "Description (optional)",
    "upload.descriptionPlaceholder": "Context, source, anything worth noting...",
    "upload.category": "Classification",
    "upload.subjects": "Subjects",
    "upload.subjectsHint":
      "Select every subject this document relates to. Subjects are maintained by the administrator.",
    "upload.noSubjects":
      "No subjects have been defined yet. Ask the administrator to add some.",
    "upload.submit": "Submit to repository",
    "upload.submitting": "Transmitting...",
    "upload.success": "Document filed successfully.",
    "upload.errorSize": "File exceeds the {mb} MB limit.",
    "upload.errorType": "That file type is not accepted.",
    "upload.errorTitle": "A document title is required.",
    "upload.errorNoFile": "Select a file first.",
    "upload.errorGeneric": "Upload failed. Please try again.",
    "upload.progress": "Uploading",

    // --- accountability notice -----------------------------------------
    "notice.title": "Submitter Accountability",
    "notice.body":
      "You are solely and personally responsible for everything you upload. By submitting a file you confirm that you hold the necessary rights to it, that it contains no unlawful content, and that it does not violate the personality rights of any person. The operator of this site hosts submissions only and accepts no responsibility for user-submitted content. Unlawful content is removed as soon as the operator becomes aware of it, and the submitting account is identifiable to the administrator.",
    "notice.checkbox":
      "I have read the above and take full responsibility for this submission.",
    "notice.short":
      "Uploaders are accountable for their own submissions. The operator accepts no responsibility for user-submitted content.",

    // --- report ---------------------------------------------------------
    "report.title": "Report Document",
    "report.body":
      "Tell the administrator what is wrong with this document. Reports are reviewed and acted on.",
    "report.reason": "Reason",
    "report.reason.illegal": "Unlawful content",
    "report.reason.personal": "Personal rights / privacy violation",
    "report.reason.copyright": "Copyright infringement",
    "report.reason.sexual": "Sexual or explicit content",
    "report.reason.harassment": "Harassment or bullying",
    "report.reason.other": "Something else",
    "report.details": "Details (optional)",
    "report.submit": "Send report",
    "report.sent": "Report received. The administrator has been notified.",
    "report.alreadySent": "You have already reported this document.",

    // --- admin ----------------------------------------------------------
    "admin.title": "Administration",
    "admin.subtitle": "Restricted to designated administrators.",
    "admin.tab.files": "Documents",
    "admin.tab.reports": "Reports",
    "admin.tab.users": "Personnel",
    "admin.tab.allowlist": "Access list",
    "admin.tab.subjects": "Subjects",
    "admin.tab.audit": "Audit log",
    "admin.storage": "Storage used",
    "admin.storageOf": "of {total}",
    "admin.files.uploader": "Uploader",
    "admin.files.email": "E-mail",
    "admin.reports.open": "Open reports",
    "admin.reports.none": "No open reports.",
    "admin.reports.resolve": "Mark resolved",
    "admin.reports.dismiss": "Dismiss",
    "admin.reports.deleteFile": "Delete document",
    "admin.reports.reportedBy": "Reported by",
    "admin.users.username": "Cover name",
    "admin.users.email": "E-mail",
    "admin.users.files": "Documents",
    "admin.users.joined": "Registered",
    "admin.users.admin": "Administrator",
    "admin.users.ban": "Suspend",
    "admin.users.unban": "Reinstate",
    "admin.users.makeAdmin": "Grant admin",
    "admin.users.revokeAdmin": "Revoke admin",
    "admin.allowlist.add": "Add address",
    "admin.allowlist.placeholder": "name@example.com",
    "admin.allowlist.note": "Note (optional)",
    "admin.allowlist.remove": "Remove",
    "admin.allowlist.empty": "No addresses on the access list yet.",
    "admin.allowlist.bulk": "Paste several addresses, one per line",
    "admin.allowlist.added": "{n} address(es) added.",
    "admin.subjects.add": "Add subject",
    "admin.subjects.name": "Subject name",
    "admin.subjects.description": "Description (optional)",
    "admin.subjects.remove": "Delete",
    "admin.subjects.files": "documents",
    "admin.subjects.removeConfirm":
      "Delete this subject? It will be removed from every document.",
    "admin.audit.action": "Action",
    "admin.audit.actor": "By",
    "admin.audit.when": "When",
    "admin.notAdmin": "You do not have administrator clearance.",

    // --- legal ----------------------------------------------------------
    "legal.terms": "Terms of use",
    "legal.privacy": "Privacy notice",
    "legal.imprint": "Legal notice",
    "legal.takedown": "Report content",
    "legal.contact": "Contact",

    // --- misc -----------------------------------------------------------
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.close": "Close",
    "common.yes": "Yes",
    "common.no": "No",
    "common.error": "Something went wrong.",
    "common.retry": "Try again",
    "common.loading": "Loading...",
    "common.none": "None",
    "common.you": "you",
    "error.accessDenied": "Access Denied",
    "error.accessDeniedBody":
      "This account is not a member of this archive. Joining needs a valid invite code -- ask an administrator for one.",
    "error.banned": "Your access has been suspended by an administrator.",
    "error.notFound": "Page not found.",
    "error.crashed": "This page did not load",
    "error.crashedBody":
      "Something failed while assembling this page. Trying again usually works -- the archive itself is untouched.",
    "error.deptCrashedBody":
      "This department's Supabase project did not answer, or its schema is not installed yet. Nothing has been lost: the files live in that project, not here.",
    "error.deptNotFound": "No such department",
    "error.deptNotFoundBody":
      "Nothing is registered at this address. Check the link, or browse the departments that chose to be listed.",
    "error.reference": "Reference",
    "error.fileNotFound": "Exhibit not found",
    "error.fileNotFoundBody":
      "This exhibit is not in the archive. It may have been withdrawn by its owner or removed by an administrator.",
  },

  de: {
    // --- chrome ---------------------------------------------------------
    "gov.official": "Eine offizielle Website von {name}",
    "gov.parody": "PARODIE",
    "gov.disclaimer":
      "Dies ist ein satirisches Schulprojekt. Es steht in keiner Verbindung zu einer Behörde.",
    "site.department": "Justizdepartement",
    "site.office": "Amt für Aktenführung",
    "site.name": "{name}",
    "site.tagline": "Archiv freigegebener Dokumente",

    // --- nav ------------------------------------------------------------
    "nav.vault": "Das Archiv",
    "nav.upload": "Beweismittel einreichen",
    "nav.admin": "Verwaltung",
    "nav.signout": "Abmelden",
    "nav.signedInAs": "Angemeldet als",
    "nav.language": "Sprache",
    "nav.home": "Startseite",
    "common.and": "und",
    "setup.tooMany":
      "Sie haben das Maximum von 3 Departementen pro Konto erreicht. Entfernen Sie zuerst eines unter «Ihre Departemente».",
    "setup.next1":
      "Öffnen Sie Ihr Departement und erstellen Sie das erste Konto. Wer sich zuerst registriert, wird zur Administration — stellen Sie sicher, dass Sie das sind.",
    "setup.next2":
      "Gehen Sie zu Verwaltung, dann Einladungen, und erstellen Sie einen Code. So kommen alle anderen hinein.",
    "setup.next3":
      "Teilen Sie den Einladungslink. Ohne Code kommt niemand hinein, und Sie können ihn jederzeit widerrufen.",
    "setup.next2Open":
      "Ihr Departement ist öffentlich, alle können also ein Konto erstellen. Gehen Sie zu Verwaltung, dann Einladungen, wenn Sie diese Tür schliessen oder jemandem Administrationsrechte geben möchten.",
    "setup.next3Open":
      "Teilen Sie die Adresse. Wer sie öffnet, kann sich registrieren, und Sie können jederzeit wieder einen Einladungscode verlangen.",
    "account.acceptPre": "Ich akzeptiere die",
    "account.acceptPost":
      " und verstehe, dass ich für alle Inhalte der von mir erstellten Departemente verantwortlich bin.",
    "account.acceptRequired":
      "Bitte akzeptieren Sie die Nutzungsbedingungen und die Datenschutzerklärung, um ein Konto zu erstellen.",
    "admin.tab.invites": "Einladungen",
    "invite.maxUses": "Maximale Verwendungen",
    "invite.expiresDays": "Läuft ab in (Tagen)",
    "invite.note": "Notiz",
    "invite.notePlaceholder": "z. B. im Gruppenchat verteilt",
    "invite.regenerate": "Neuen Code erzeugen",
    "invite.duplicate": "Diesen Code gibt es bereits.",
    "invite.status": "Status",
    "invite.active": "Aktiv",
    "invite.none":
      "Noch keine Einladungscodes. Erstellen Sie einen und teilen Sie den Link.",
    "invite.revokeConfirm":
      "Diesen Einladungscode widerrufen? Wer ihn noch nicht verwendet hat, wird abgewiesen. Bereits beigetretene Personen behalten ihr Konto.",
    "invite.grantsAdminWarning":
      "Wer diesen Code einlöst, wird zur Administration: sieht alle E-Mail-Adressen der Mitglieder, kann jedes Dokument löschen und jede Person sperren. Verwenden Sie ein niedriges Verwendungslimit.",
    "access.title": "Wer beitreten kann",
    "access.help":
      "Wird in Ihrer eigenen Datenbank durchgesetzt, nicht auf dieser Seite — gilt also auch gegenüber einem von Hand abgesetzten API-Aufruf.",
    "access.closed": "Einladungscode erforderlich",
    "access.closedHelp":
      "Ohne einen von Ihnen verteilten Code kann niemand ein Konto erstellen. So beginnt jedes neue Departement.",
    "access.open": "Alle können beitreten",
    "access.openHelp":
      "Besucherinnen und Besucher können sich ohne Code registrieren. Codes funktionieren weiterhin und bleiben der einzige Weg, Administrationsrechte zu vergeben.",
    "admin.users.notSelf": "Sie können Ihren eigenen Administrations- oder Sperrstatus nicht ändern.",
    "setup.noControlPlane": "Für diese Installation ist kein Verzeichnis konfiguriert",
    "setup.noControlPlaneBody":
      "Das Registrieren einer Adresse schreibt in die eigene Control-Plane-Datenbank von OpenDepartment, und NEXT_PUBLIC_CONTROL_SUPABASE_URL ist hier nicht gesetzt. Mit Ihrem Supabase-Projekt ist alles in Ordnung -- es gibt nur keinen Ort, an dem die Adresse abgelegt werden könnte. Um das Departement ohne Control Plane zu testen, tragen Sie diese Zeile in .env.local ein und öffnen Sie den Slug direkt:",

    // --- E-Mail-Konfiguration (die häufigste Stolperfalle) -------------
    "email.step": "E-Mail einrichten",
    "email.why": "Supabase stellt Ihren Mitgliedern noch keine E-Mails zu",
    "email.whyBody":
      "Ein neues Supabase-Projekt kann nur wenige Nachrichten pro Stunde versenden, und zwar ausschliesslich an Adressen Ihres eigenen Supabase-Teams. Ihre Mitglieder erhalten also weder eine Bestätigungs- noch eine Passwort-Zurücksetzungs-Mail, solange Sie nicht eine der beiden folgenden Einstellungen ändern. Das übersehen fast alle -- erledigen Sie es jetzt und nicht erst, nachdem Sie dreissig Personen eingeladen haben.",
    "email.optionA":
      "Variante A -- Bestätigung ausschalten (kleine private Gruppe)",
    "email.optionABody":
      "In Ihrem Projekt: Authentication, dann Sign In / Providers, dann Email. Schalten Sie \"Confirm email\" aus. Der Beitritt erfolgt stattdessen über einen Einladungscode, und es muss nie eine Mail ankommen. Das Zurücksetzen von Passwörtern funktioniert dann nicht -- wer seines vergisst, wendet sich an Sie.",
    "email.optionB": "Variante B -- eigenes SMTP verbinden (richtige E-Mail)",
    "email.optionBBody":
      "In Ihrem Projekt: Project Settings, dann Authentication, dann SMTP Settings. Resend, Brevo und Postmark bieten kostenlose Kontingente, die für eine Klasse reichen. Bestätigungen, Passwort-Zurücksetzungen und Magic Links funktionieren danach normal.",
    "email.recommend":
      "Für eine Klasse oder einen Freundeskreis ist Variante A die, die einfach funktioniert.",
    "email.confirm": "Ich habe eine der Varianten gewählt",
    "email.reminder":
      "Hinweis: Wenn Sie den E-Mail-Schritt übersprungen haben, können Ihre Mitglieder ihre Adresse nicht bestätigen und kein Passwort zurücksetzen.",

    // --- Unterstützung -------------------------------------------------
    "od.support": "OpenDepartment unterstützen",
    "od.supportBody":
      "OpenDepartment ist kostenlos und speichert nichts von Ihnen. Wenn es Ihnen nützt, können Sie mir einen Kaffee ausgeben.",

    // --- department chrome (OpenDepartment additions) -------------------
    "dept.hostedNotice":
      "{name} wird von der eigenen Administration erstellt und betrieben, die für sämtliche Inhalte verantwortlich ist. Gehostet auf",
    "dept.reportThis": "Dieses Departement melden",
    "dept.frontDoor": "Geschütztes Archiv",
    "dept.frontDoorOpen": "Offenes Archiv",
    "dept.needInvite": "Für dieses Archiv wird ein Einladungscode benötigt.",
    "dept.haveInvite": "Ich habe einen Einladungscode",
    "dept.openJoinNote":
      "Dieses Archiv ist offen, ein Code ist also freiwillig — verwenden Sie einen nur, wenn Ihnen jemand einen geschickt hat.",
    "dept.joinOpen": "Konto erstellen",
    "dept.notSetUp": "Dieses Departement wurde noch nicht fertig eingerichtet.",
    "dept.notSetUpBody":
      "Die Administration muss das Schema noch im eigenen Supabase-Projekt installieren. Falls dies Ihr Departement ist, öffnen Sie die Einrichtung.",

    // --- invites --------------------------------------------------------
    "invite.title": "{name} beitreten",
    "invite.code": "Einladungscode",
    "invite.codeOptional": "Einladungscode (optional)",
    "invite.codePlaceholder": "z. B. FIELD-AGENT-7",
    "invite.invalid": "Dieser Einladungscode ist ungültig.",
    "invite.expired": "Dieser Einladungscode ist abgelaufen.",
    "invite.used": "Dieser Einladungscode wurde bereits aufgebraucht.",
    "invite.required": "Für den Beitritt wird ein Einladungscode benötigt.",
    "invite.create": "Einladung erstellen",
    "invite.link": "Einladungslink",
    "invite.copied": "Kopiert",
    "invite.uses": "Verwendungen",
    "invite.unlimited": "Unbegrenzt",
    "invite.expires": "Läuft ab",
    "invite.never": "Nie",
    "invite.revoke": "Widerrufen",
    "invite.grantsAdmin": "Erteilt Administrationsrechte",

    // --- OpenDepartment marketing --------------------------------------
    "od.name": "OpenDepartment",
    "od.tagline": "Führen Sie Ihre eigenen Akten.",
    "od.hero":
      "Erstellen Sie ein fiktives Behördenarchiv für Ihre Klasse, Ihr Team oder Ihren Gruppenchat. Mitglieder laden Beweismittel hoch, stimmen darüber ab und diskutieren in den Kommentaren. Sie bestimmen, wer hineinkommt.",
    "od.yourData": "Ihre Datenbank, nicht unsere",
    "od.yourDataBody":
      "Jedes Departement speichert Dateien, Mitglieder und Kommentare in einem Supabase-Projekt, das Ihnen gehört. Wir behalten einen Namen und eine URL. Nichts, was Sie hochladen, berührt unsere Server, und wir können es nicht lesen.",
    "od.private": "Standardmässig nur auf Einladung",
    "od.privateBody":
      "Ein neues Departement ist nicht gelistet und geschlossen. Der Zugang erfolgt über einen Einladungscode oder eine E-Mail-Adresse, die Sie hinzufügen. Sie können sperren, löschen und alle Meldungen einsehen.",
    "od.free": "Kostenlos im Betrieb",
    "od.freeBody":
      "Der kostenlose Tarif von Supabase reicht für eine Gruppe von dreissig Personen bequem aus. Wird es mehr, erweitern Sie Ihr eigenes Projekt -- bei uns gibt es nichts zu kaufen.",
    "od.create": "Departement erstellen",
    "od.browse": "Öffentliche Departemente ansehen",
    "od.needSupabase":
      "Sie benötigen ein kostenloses Supabase-Konto. Die Einrichtung dauert etwa fünf Minuten.",
    "od.directory": "Öffentliche Departemente",
    "od.directoryEmpty": "Noch kein Departement hat sich öffentlich gelistet.",
    "od.directoryNote":
      "Dies sind Archive, deren Administration eine Listung gewählt hat. Die meisten Departemente sind nicht gelistet und nur auf Einladung erreichbar.",

    // --- setup wizard ---------------------------------------------------
    "setup.title": "Departement erstellen",
    "setup.step": "Schritt {n} von {total}",
    "setup.step1": "Benennen",
    "setup.step2": "Supabase-Projekt erstellen",
    "setup.step3": "Schema installieren",
    "setup.step4": "Verbinden",
    "setup.name": "Name des Departements",
    "setup.namePlaceholder": "Die Lorenzo-Akten",
    "setup.nameHelp": "Was Ihre Mitglieder oben auf jeder Seite sehen.",
    "setup.slug": "Adresse",
    "setup.slugHelp":
      "Buchstaben, Ziffern und Bindestriche. Später nicht mehr änderbar.",
    "setup.slugTaken": "Diese Adresse ist bereits vergeben.",
    "setup.slugInvalid":
      "Verwenden Sie 3-32 Zeichen: Kleinbuchstaben, Ziffern und Bindestriche.",
    "setup.slugFree": "Verfügbar",
    "setup.subjectLabel": "Worum geht es in den Akten?",
    "setup.subjectHelp":
      "Wird in Überschriften verwendet. Fall ergibt die Fallakte 0001.",
    "setup.docket": "Aktenzeichen-Präfix",
    "setup.docketHelp": "Zwei oder drei Buchstaben. LF ergibt LF-0001.",
    "setup.supabaseIntro":
      "Ihr Departement benötigt eine eigene Datenbank. Supabase stellt eine kostenlos bereit.",
    "setup.supabaseSteps":
      "Öffnen Sie supabase.com, registrieren Sie sich und erstellen Sie ein neues Projekt. Wählen Sie eine Region in der Nähe Ihrer Mitglieder. Warten Sie, bis die Bereitstellung abgeschlossen ist -- das dauert ein bis zwei Minuten.",
    "setup.openSupabase": "Supabase öffnen",
    "setup.sqlIntro":
      "Kopieren Sie dieses SQL, öffnen Sie den SQL-Editor Ihres Projekts, fügen Sie es ein und klicken Sie auf Run. Damit werden alle Tabellen, Richtlinien und Funktionen erstellt.",
    "setup.copySql": "SQL kopieren",
    "setup.sqlCopied": "In die Zwischenablage kopiert",
    "setup.sqlDone": "Ich habe das SQL ausgeführt",
    "setup.credsIntro":
      "Letzter Schritt. Öffnen Sie in Ihrem Supabase-Projekt Project Settings, dann API, und kopieren Sie diese beiden Werte.",
    "setup.url": "Projekt-URL",
    "setup.anonKey": "Anon- / Publishable-Key",
    "setup.keyWarning":
      "Verwenden Sie den Anon-Key, niemals den service_role-Key. OpenDepartment benötigt ihn nicht und weist ihn ab.",
    "setup.serviceKeyRejected":
      "Das sieht nach einem service_role-Key aus. Fügen Sie stattdessen den Anon- / Publishable-Key ein.",
    "setup.redirectNote":
      "Noch etwas in Supabase: Fügen Sie unter Authentication, URL Configuration diese Adresse zu den Redirect URLs hinzu.",
    "setup.verify": "Prüfen und erstellen",
    "setup.verifying": "Ihr Projekt wird geprüft...",
    "setup.schemaMissing":
      "Ihr Projekt antwortet, aber das Schema ist nicht installiert. Gehen Sie zurück und führen Sie das SQL aus.",
    "setup.unreachable":
      "Dieses Projekt ist nicht erreichbar. Prüfen Sie URL und Key.",
    "setup.claimed":
      "Dieses Projekt hat bereits eine Administration. Verbinden Sie stattdessen ein neues Supabase-Projekt.",
    "setup.done": "Ihr Departement ist online",
    "setup.doneBody":
      "Öffnen Sie es und erstellen Sie das erste Konto -- die erste Person, die sich registriert, wird zur Administration. Stellen Sie sicher, dass Sie das sind.",
    "setup.openDept": "Departement öffnen",
    "setup.visibility": "Listung",
    "setup.unlisted": "Nicht gelistet -- nur mit dem Link erreichbar",
    "setup.unlistedHelp":
      "Niemand findet es beim Stöbern, und niemand tritt ohne einen von Ihnen verteilten Einladungscode bei.",
    "setup.public": "Öffentlich -- im Verzeichnis gelistet",
    "setup.publicHelp":
      "Im Verzeichnis gelistet, und wer es öffnet, kann ohne Code ein Konto erstellen.",
    "account.listingOnly":
      "Ändert nur die Listung im Verzeichnis. Wer beitreten darf, wird im Departement selbst unter Verwaltung festgelegt.",

    // --- OpenDepartment-Konto -------------------------------------------
    "account.title": "Ihre Departemente",
    "account.none": "Sie haben noch kein Departement erstellt.",
    "account.signIn": "Bei OpenDepartment anmelden",
    "account.signInBody":
      "Dieses Konto verwaltet nur Ihre Departements-Einträge. Es ist von Ihrer Mitgliedschaft innerhalb eines Departements getrennt.",
    "account.manage": "Verwalten",
    "account.visit": "Öffnen",
    "account.delist": "Eintrag entfernen",
    "account.delistConfirm":
      "Dieses Departement von OpenDepartment entfernen? Die Adresse funktioniert dann nicht mehr. Die Daten bleiben in Ihrem eigenen Supabase-Projekt unangetastet.",

    // --- landing --------------------------------------------------------
    "landing.title": "{name}",
    "landing.subtitle":
      "Der Zugang zu diesem Archiv ist auf befugtes Personal beschränkt.",
    "landing.body":
      "Die hier abgelegten Dokumente wurden von freigegebenen Mitgliedern eingereicht. Für den Zugang wird ein gültiger Einladungscode benötigt.",
    "landing.cta": "Zugang beantragen",
    "landing.stat.files": "Erfasste Dokumente",
    "landing.stat.subjects": "Erfasste Betreffe",
    "landing.stat.members": "Befugtes Personal",

    // --- auth -----------------------------------------------------------
    "auth.title": "Personalauthentifizierung",
    "auth.subtitle": "Geschütztes System. Nur für befugten Zugriff.",
    "auth.google": "Weiter mit Google",
    "auth.or": "oder",
    "auth.email": "E-Mail-Adresse",
    "auth.password": "Passwort",
    "auth.signin": "Anmelden",
    "auth.signup": "Konto erstellen",
    "auth.toSignup": "Noch kein Konto? Registrieren",
    "auth.toSignin": "Bereits registriert? Anmelden",
    "auth.forgot": "Passwort vergessen?",
    "auth.reset": "Link zum Zurücksetzen senden",
    "auth.resetSent":
      "Falls diese Adresse zu einem Mitglied gehört, ist ein Link unterwegs.",
    "auth.checkEmail":
      "Prüfen Sie Ihren Posteingang und bestätigen Sie Ihre E-Mail-Adresse, um die Registrierung abzuschliessen.",
    "auth.notAllowed":
      "Diese E-Mail-Adresse steht nicht auf der Zugangsliste. Wenden Sie sich an die Administration.",
    "auth.invalidCredentials": "E-Mail-Adresse oder Passwort ist falsch.",
    "auth.passwordTooShort": "Das Passwort muss mindestens 8 Zeichen haben.",
    "auth.genericError":
      "Die Authentifizierung ist fehlgeschlagen. Bitte erneut versuchen.",
    "auth.working": "Wird geprüft...",

    // --- onboarding -----------------------------------------------------
    "onboarding.title": "Decknamen festlegen",
    "onboarding.body":
      "Wählen Sie den Namen, den anderes Personal neben Ihren Einreichungen sieht. Ihre E-Mail-Adresse bleibt für alle ausser der Administration verborgen.",
    "onboarding.label": "Deckname",
    "onboarding.placeholder": "z. B. DEEP_THROAT",
    "onboarding.rules":
      "3-20 Zeichen. Buchstaben, Ziffern, Unterstrich und Bindestrich.",
    "onboarding.submit": "Identität bestätigen",
    "onboarding.taken": "Dieser Name ist bereits vergeben.",
    "onboarding.invalid":
      "Ungültiger Name. Verwenden Sie 3-20 Buchstaben, Ziffern, Unterstriche oder Bindestriche.",

    // --- vault ----------------------------------------------------------
    "vault.title": "Dokumentenarchiv",
    "vault.count_one": "{n} erfasstes Dokument",
    "vault.count_other": "{n} erfasste Dokumente",
    "vault.search": "Titel, Beschreibungen, Dateinamen durchsuchen...",
    "vault.sort": "Sortieren nach",
    "vault.sort.top": "Beste Bewertung",
    "vault.sort.new": "Neueste zuerst",
    "vault.sort.worst": "Schlechteste Bewertung",
    "vault.sort.views": "Meistgesehen",
    "vault.sort.discussed": "Meistdiskutiert",
    "vault.filter.subject": "Betreff",
    "vault.filter.category": "Einstufung",
    "vault.filter.kind": "Medientyp",
    "vault.filter.all": "Alle",
    "vault.filter.mine": "Nur meine Einreichungen",
    "vault.clear": "Filter zurücksetzen",
    "vault.empty": "Keine Dokumente entsprechen den aktuellen Filtern.",
    "vault.emptyAll":
      "Das Archiv ist leer. Reichen Sie als Erste oder Erster Beweismittel ein.",
    "vault.loading": "Datensätze werden abgerufen...",

    // --- file card / detail ---------------------------------------------
    "file.case": "Fall",
    "file.submittedBy": "Eingereicht von",
    "file.submittedOn": "Eingereicht am",
    "file.views": "Aufrufe",
    "file.comments": "Notizen",
    "file.size": "Grösse",
    "file.type": "Typ",
    "file.subjects": "Betreffe",
    "file.category": "Einstufung",
    "file.download": "Herunterladen",
    "file.open": "Dokument öffnen",
    "file.delete": "Löschen",
    "file.report": "Melden",
    "file.back": "Zurück zum Archiv",
    "file.notFound": "Dokument nicht gefunden oder bereits vernichtet.",
    "file.uploaderEmail": "E-Mail der einreichenden Person (nur Administration)",
    "file.deleteConfirm":
      "Dieses Dokument endgültig vernichten? Das kann nicht rückgängig gemacht werden.",
    "file.deleted": "Dokument vernichtet.",
    "file.unsupported":
      "Dieses Format kann im Browser nicht angezeigt werden. Bitte herunterladen.",
    "file.loadingPreview": "Dokument wird geladen...",

    // --- voting ---------------------------------------------------------
    "vote.up": "Bestätigen",
    "vote.down": "Anzweifeln",
    "vote.score": "Bewertung",

    // --- comments -------------------------------------------------------
    "comments.title": "Aktennotizen",
    "comments.placeholder": "Notiz zur Akte hinzufügen...",
    "comments.submit": "Notiz ablegen",
    "comments.empty": "Zu diesem Dokument wurden keine Notizen abgelegt.",
    "comments.delete": "Notiz löschen",
    "comments.deleteConfirm": "Diese Notiz löschen?",
    "comments.tooLong": "Notizen sind auf 2000 Zeichen begrenzt.",

    // --- upload ---------------------------------------------------------
    "upload.title": "Beweismittel einreichen",
    "upload.subtitle": "Alle Einreichungen werden protokolliert und zugeordnet.",
    "upload.dropzone": "Datei hierher ziehen oder klicken zum Auswählen",
    "upload.dropzoneHint":
      "Bilder, PDFs, Video und Audio. Maximal {mb} MB pro Datei.",
    "upload.fileTitle": "Dokumenttitel",
    "upload.fileTitlePlaceholder": "z. B. Überwachungsfoto, 14. März",
    "upload.description": "Beschreibung (optional)",
    "upload.descriptionPlaceholder":
      "Kontext, Quelle, alles Erwähnenswerte...",
    "upload.category": "Einstufung",
    "upload.subjects": "Betreffe",
    "upload.subjectsHint":
      "Wählen Sie alle Betreffe, die dieses Dokument betrifft. Die Betreffe werden von der Administration gepflegt.",
    "upload.noSubjects":
      "Es wurden noch keine Betreffe definiert. Bitten Sie die Administration, welche anzulegen.",
    "upload.submit": "An das Archiv übermitteln",
    "upload.submitting": "Wird übermittelt...",
    "upload.success": "Dokument erfolgreich abgelegt.",
    "upload.errorSize": "Die Datei überschreitet das Limit von {mb} MB.",
    "upload.errorType": "Dieser Dateityp wird nicht akzeptiert.",
    "upload.errorTitle": "Ein Dokumenttitel ist erforderlich.",
    "upload.errorNoFile": "Wählen Sie zuerst eine Datei aus.",
    "upload.errorGeneric":
      "Das Hochladen ist fehlgeschlagen. Bitte erneut versuchen.",
    "upload.progress": "Wird hochgeladen",

    // --- accountability notice -----------------------------------------
    "notice.title": "Verantwortlichkeit der einreichenden Person",
    "notice.body":
      "Sie sind allein und persönlich für alles verantwortlich, was Sie hochladen. Mit dem Einreichen einer Datei bestätigen Sie, dass Sie die erforderlichen Rechte daran besitzen, dass sie keine rechtswidrigen Inhalte enthält und dass sie die Persönlichkeitsrechte keiner Person verletzt. Die Betreiberin oder der Betreiber dieser Seite stellt lediglich den Speicherplatz zur Verfügung und übernimmt keine Verantwortung für von Nutzenden eingereichte Inhalte. Rechtswidrige Inhalte werden entfernt, sobald die Betreiberin oder der Betreiber davon Kenntnis erhält; das einreichende Konto ist für die Administration identifizierbar.",
    "notice.checkbox":
      "Ich habe das Obenstehende gelesen und übernehme die volle Verantwortung für diese Einreichung.",
    "notice.short":
      "Einreichende Personen sind für ihre Inhalte selbst verantwortlich. Die Betreiberin oder der Betreiber übernimmt keine Verantwortung für Nutzerinhalte.",

    // --- report ---------------------------------------------------------
    "report.title": "Dokument melden",
    "report.body":
      "Teilen Sie der Administration mit, was mit diesem Dokument nicht stimmt. Meldungen werden geprüft und bearbeitet.",
    "report.reason": "Grund",
    "report.reason.illegal": "Rechtswidriger Inhalt",
    "report.reason.personal": "Verletzung von Persönlichkeitsrechten",
    "report.reason.copyright": "Urheberrechtsverletzung",
    "report.reason.sexual": "Sexueller oder expliziter Inhalt",
    "report.reason.harassment": "Belästigung oder Mobbing",
    "report.reason.other": "Etwas anderes",
    "report.details": "Details (optional)",
    "report.submit": "Meldung senden",
    "report.sent": "Meldung eingegangen. Die Administration wurde informiert.",
    "report.alreadySent": "Sie haben dieses Dokument bereits gemeldet.",

    // --- admin ----------------------------------------------------------
    "admin.title": "Verwaltung",
    "admin.subtitle": "Nur für bezeichnete Administratorinnen und Administratoren.",
    "admin.tab.files": "Dokumente",
    "admin.tab.reports": "Meldungen",
    "admin.tab.users": "Personal",
    "admin.tab.allowlist": "Zugangsliste",
    "admin.tab.subjects": "Betreffe",
    "admin.tab.audit": "Protokoll",
    "admin.storage": "Belegter Speicher",
    "admin.storageOf": "von {total}",
    "admin.files.uploader": "Eingereicht von",
    "admin.files.email": "E-Mail",
    "admin.reports.open": "Offene Meldungen",
    "admin.reports.none": "Keine offenen Meldungen.",
    "admin.reports.resolve": "Als erledigt markieren",
    "admin.reports.dismiss": "Verwerfen",
    "admin.reports.deleteFile": "Dokument löschen",
    "admin.reports.reportedBy": "Gemeldet von",
    "admin.users.username": "Deckname",
    "admin.users.email": "E-Mail",
    "admin.users.files": "Dokumente",
    "admin.users.joined": "Registriert",
    "admin.users.admin": "Administration",
    "admin.users.ban": "Sperren",
    "admin.users.unban": "Entsperren",
    "admin.users.makeAdmin": "Adminrechte erteilen",
    "admin.users.revokeAdmin": "Adminrechte entziehen",
    "admin.allowlist.add": "Adresse hinzufügen",
    "admin.allowlist.placeholder": "name@example.com",
    "admin.allowlist.note": "Notiz (optional)",
    "admin.allowlist.remove": "Entfernen",
    "admin.allowlist.empty": "Noch keine Adressen auf der Zugangsliste.",
    "admin.allowlist.bulk": "Mehrere Adressen einfügen, eine pro Zeile",
    "admin.allowlist.added": "{n} Adresse(n) hinzugefügt.",
    "admin.subjects.add": "Betreff hinzufügen",
    "admin.subjects.name": "Bezeichnung",
    "admin.subjects.description": "Beschreibung (optional)",
    "admin.subjects.remove": "Löschen",
    "admin.subjects.files": "Dokumente",
    "admin.subjects.removeConfirm":
      "Diesen Betreff löschen? Er wird von allen Dokumenten entfernt.",
    "admin.audit.action": "Aktion",
    "admin.audit.actor": "Durch",
    "admin.audit.when": "Zeitpunkt",
    "admin.notAdmin": "Sie haben keine Administrationsberechtigung.",

    // --- legal ----------------------------------------------------------
    "legal.terms": "Nutzungsbedingungen",
    "legal.privacy": "Datenschutzerklärung",
    "legal.imprint": "Impressum",
    "legal.takedown": "Inhalt melden",
    "legal.contact": "Kontakt",

    // --- misc -----------------------------------------------------------
    "common.cancel": "Abbrechen",
    "common.confirm": "Bestätigen",
    "common.save": "Speichern",
    "common.saving": "Wird gespeichert...",
    "common.close": "Schliessen",
    "common.yes": "Ja",
    "common.no": "Nein",
    "common.error": "Etwas ist schiefgelaufen.",
    "common.retry": "Erneut versuchen",
    "common.loading": "Wird geladen...",
    "common.none": "Keine",
    "common.you": "Sie",
    "error.accessDenied": "Zugang verweigert",
    "error.accessDeniedBody":
      "Dieses Konto ist kein Mitglied dieses Archivs. Für den Beitritt wird ein gültiger Einladungscode benötigt -- fragen Sie die Administration danach.",
    "error.banned": "Ihr Zugang wurde von der Administration gesperrt.",
    "error.notFound": "Seite nicht gefunden.",
    "error.crashed": "Diese Seite wurde nicht geladen",
    "error.crashedBody":
      "Beim Zusammenstellen dieser Seite ist etwas fehlgeschlagen. Ein zweiter Versuch genügt meistens -- am Archiv selbst hat sich nichts geändert.",
    "error.deptCrashedBody":
      "Das Supabase-Projekt dieser Abteilung hat nicht geantwortet, oder das Schema ist noch nicht installiert. Es ist nichts verloren: Die Dateien liegen in jenem Projekt, nicht bei uns.",
    "error.deptNotFound": "Keine solche Abteilung",
    "error.deptNotFoundBody":
      "Unter dieser Adresse ist nichts registriert. Prüfen Sie den Link, oder sehen Sie sich die Abteilungen an, die öffentlich gelistet sind.",
    "error.reference": "Referenz",
    "error.fileNotFound": "Dokument nicht gefunden",
    "error.fileNotFoundBody":
      "Dieses Dokument liegt nicht im Archiv. Es wurde möglicherweise von der Eigentümerin oder dem Eigentümer zurückgezogen oder von der Administration entfernt.",
  },
} as const;

export type TranslationKey = keyof (typeof dictionary)["en"];

/** Look up a key, substituting {placeholders} from `vars`. */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const table = dictionary[locale] as Record<string, string>;
  let value = table[key] ?? (dictionary.en as Record<string, string>)[key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }
  return value;
}
