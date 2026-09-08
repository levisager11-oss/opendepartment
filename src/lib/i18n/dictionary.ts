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
    // --- the platform's own takedown path -------------------------------
    "abuse.link": "Report a department",
    "abuse.title": "Report a department",
    "abuse.intro":
      "This goes to whoever runs OpenDepartment, not to the department's own administrator -- use it when the administrator is the problem. Suspending a department stops its address working; its data stays in its owner's own Supabase project and is not touched. To report a single document to the people who run that archive, use the report button on the document itself.",
    "abuse.which": "Which department",
    "abuse.whichHelp":
      "The address, or the part after /d/. Pasting the whole link works too.",
    "abuse.reason": "What is wrong",
    "abuse.reason.illegal": "Illegal content",
    "abuse.reason.personal": "Personal information about a real person",
    "abuse.reason.harassment": "Targeted harassment",
    "abuse.reason.sexual": "Sexual content involving a real person",
    "abuse.reason.impersonation": "Impersonating a real organisation",
    "abuse.reason.copyright": "Copyright",
    "abuse.reason.other": "Something else",
    "abuse.details": "What should we know?",
    "abuse.detailsPlaceholder":
      "What is on the page, and who it is about. Links help.",
    "abuse.contact": "Your e-mail (optional)",
    "abuse.contactHelp":
      "Only so we can come back to you. Leave it empty to report anonymously.",
    "abuse.submit": "Send the report",
    "abuse.slugRequired": "Please say which department this is about.",
    "abuse.unknownSlug":
      "No department resolves at that address. Check the spelling, or paste the link.",
    "abuse.sent": "Report received",
    "abuse.sentBody":
      "Somebody will read it. If you left an address we may come back to you; either way the department is not told who filed this.",

    "admin.tab.invites": "Invites",
    "admin.tab.settings": "Settings",

    // --- the settings screen --------------------------------------------
    "settings.intro":
      "Everything on this page is a row in your own database. Nothing about this department is compiled into OpenDepartment, which is why you can rename it into something else entirely and the app will not notice.",
    "settings.identity": "Identity",
    "settings.name": "Department name",
    "settings.tagline": "Tagline",
    "settings.directoryNote":
      "The name changes here immediately. The public directory shows the name you registered with OpenDepartment, which is a separate list and keeps its own copy.",
    "settings.vocabulary": "Vocabulary",
    "settings.subjectLabel": "What the files are about",
    "settings.subjectLabelHint":
      "The noun for one entry in the archive. \"Case\" gives you a case file index.",
    "settings.docket": "Docket prefix",
    "settings.docketHint": "Documents are numbered {example}.",
    "settings.seal": "The seal",
    "settings.sealTop": "Around the top",
    "settings.sealBottom": "Around the bottom",
    "settings.accent": "Accent colour",
    "settings.accentInvalid": "Use a six-digit hex colour, like #b8860b.",
    "settings.categories": "Categories",
    "settings.categoriesHint":
      "One per line, in the order they should appear. Existing documents keep the category they were filed under even if you remove it here.",
    "settings.categoriesEmpty": "Keep at least one category.",
    "settings.memberQuota": "Storage per member",
    "settings.memberQuotaHint":
      "Megabytes one member may keep in total. Leave empty for no limit. A free Supabase project holds about a gigabyte, and the per-file limit above does not stop one person filling it.",
    "settings.memberQuotaNone": "No limit",
    "settings.quotaInvalid":
      "Storage per member must be a whole number of megabytes, or empty for no limit.",
    "settings.storage": "Storage",
    "settings.orphans": "Objects with no document",
    "settings.orphansHint":
      "Deleting a document removes its row and then its file, which is two steps. A browser closed in between leaves the file behind: nothing in the archive can see it, and it still counts against your Supabase storage.",
    "settings.orphansNone": "Nothing left behind.",
    "settings.orphansPurge": "Delete these files",
    "settings.orphansPurged": "Removed {n} file(s).",
    "settings.orphansUnavailable":
      "Could not read the storage listing. Re-run db/tenant-schema.sql in your project if you have not since this was added.",
    "settings.usage": "What each member is keeping",
    "settings.upload": "Largest upload",
    "settings.uploadHint":
      "Megabytes, up to {cap}. Your storage bucket is resized to match when you save.",
    "settings.operator": "Who runs this department",
    "settings.operatorHint":
      "Shown in the footer. The person named here is the one answerable for what is in the archive, which is the point of naming them.",
    "settings.operatorName": "Name",
    "settings.operatorContact": "Contact",
    "settings.nameRequired": "A department needs a name.",
    "settings.saved": "Saved.",
    "common.save": "Save",
    "invite.maxUses": "Maximum uses",
    "invite.expiresDays": "Expires in (days)",
    "invite.note": "Note",
    "invite.notePlaceholder": "e.g. handed out in the group chat",
    "invite.regenerate": "Generate a new code",
    "invite.duplicate": "That code already exists.",
    "invite.tooShort":
      "Too short, or not in capitals. Use at least eight characters -- a code can grant administrator rights, so a guessable one hands out more than access.",
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
    "od.supportBody":
      "OpenDepartment is free and stores nothing of yours. If it is useful to you, you can buy me a coffee.",

    // --- department chrome (OpenDepartment additions) -------------------
    "dept.hostedNotice":
      "{name} is created and run by its own administrators, who are responsible for everything in it. It is hosted on",
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
    // --- one-click setup (only when this deployment registered an OAuth app)
    "setup.oauthNotConfigured":
      "One-click setup is not configured on this deployment.",
    "setup.oauthDeclined":
      "Supabase sent you back without an authorisation code -- usually the Cancel button, or a consent screen that was closed. Nothing was created.",
    "setup.oauthState":
      "The security token from the start of that round trip did not come back. This is usually a browser blocking cookies on the return from Supabase, or a different tab having started the flow. Try again in this tab.",
    "setup.oauthExpiredFlow":
      "That authorisation took longer than ten minutes and the one-time code for it expired. Start it again.",
    "setup.oauthSession":
      "Your OpenDepartment sign-in changed during the round trip, so the authorisation could not be matched to your account. Sign in again and retry.",
    "setup.oauthExchange":
      "Supabase would not exchange the authorisation code. The usual cause is a mismatch between the OAuth app and this deployment -- check that its callback URL is exactly this site plus /api/setup/oauth/callback, and that the client ID and secret in the environment belong to that same app.",
    "setup.oauthScope":
      "Supabase accepted the authorisation and then refused the first request ({status}). If Supabase names a scope, the OAuth app needs Organizations read, Projects read and write, Database write, Secrets read and Auth write. After changing them, connect again -- an existing authorisation keeps the scopes it was granted.",

    "setup.autoTitle": "Let OpenDepartment set it up for you",
    "setup.autoBody":
      "Connect your Supabase account and we will create the project, install the schema, switch off e-mail confirmation and allow your department's sign-in address -- the next three steps, done. You still own the project; it is created in your own Supabase organisation.",
    "setup.autoTrust":
      "You will be asked to authorise OpenDepartment on Supabase. The access token that comes back is kept encrypted in your own browser, never in our database, and is deleted the moment setup finishes. It is used for exactly one thing: creating this project and putting the schema in it.",
    "setup.autoConnect": "Connect Supabase",
    "setup.autoNeedsAccount":
      "You will be asked to sign in to OpenDepartment first.",
    "setup.signInLink": "Sign in or create an account.",
    "setup.autoOrg": "Which Supabase organisation",
    "setup.autoGo": "Create my project",
    "setup.autoResume": "Carry on where it stopped",
    "setup.autoPatience":
      "Creating a Supabase project takes a minute or two. Leave this tab open.",
    "setup.autoConfigured":
      "E-mail confirmation is off and your sign-in address is already allowed -- both were set on your project during setup. Nothing to do in the Supabase dashboard.",
    "setup.manualTitle": "Or do it yourself",
    "setup.oauthFailed":
      "That did not complete. Nothing was created, and you can either try again or set the project up by hand below.",
    "setup.oauthRefused":
      "Supabase accepted the sign-in and then refused this request. The details below are its own words. If they mention a permission or a scope, the app needs Organizations read, Projects read and write, Database write, Secrets read and Auth write -- change them in the Supabase dashboard and connect again, since an existing authorisation keeps the scopes it was granted. If they mention something else, that is the real cause and the scopes are not the problem.",
    "setup.oauthUnreachable":
      "Supabase could not be reached to confirm the connection. Try again in a moment, or set the project up by hand below.",
    "setup.oauthExpired":
      "The Supabase authorisation has expired. Connect again to carry on.",
    "setup.noOrganisation":
      "That Supabase account has no organisation to create a project in. Make one in the Supabase dashboard and try again.",
    "setup.stillStarting":
      "Your project was created and is still starting up. Wait a moment and press the button again -- it will carry on with the same project rather than making another.",
    "setup.projectGone":
      "The project this was carrying on from no longer exists in your Supabase account -- it was removed, or it never finished being created. That has been forgotten; press the button again and a new one will be created from scratch.",
    "setup.schemaFailedAuto":
      "The project was created, but the schema did not install. Open it in the Supabase dashboard and paste the SQL from the next step by hand.",
    "setup.provisionCreating": "Creating your project...",

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
    "setup.redirectTitle": "Do not skip this one",
    "setup.redirectNote":
      "In Supabase, under Authentication, URL Configuration, add this to your Redirect URLs. Without it every confirmation and password-reset link in your department lands on an error page.",
    "setup.copyCallback": "Copy this address",
    "setup.operator": "Who runs this department",
    "setup.operatorHelp":
      "Shown on your department's own imprint, terms and privacy pages. You can leave these blank and fill them in later under Administration -- but those pages exist either way, and an imprint that names nobody is not an imprint.",
    "setup.operatorName": "Your name or organisation",
    "setup.operatorNamePlaceholder": "Alex Muster",
    "setup.operatorContact": "Contact address",
    "setup.paste": "Paste from Supabase",
    "setup.pastePlaceholder":
      "Paste your project URL and anon key here -- together, separately, or as a whole .env block.",
    "setup.pasteHelp":
      "Anything with a Supabase URL or key in it will do. A legacy anon key names its own project, so pasting the key alone usually fills in both fields.",
    "setup.pasteFound": "Found it -- check the two fields below.",
    "setup.pasteDerived":
      "Found the key, and worked out the project URL from it. Check both below.",
    "setup.pasteNothing":
      "No Supabase URL or key in that. Paste the values from Project Settings, API.",
    "setup.openSqlEditor": "Open the SQL editor",
    "setup.openApiSettings": "Open Project Settings, API",
    "setup.downloadSql": "Download it as a file instead",
    "setup.copyFailed":
      "Your browser would not let the page use the clipboard. Download the file instead, or select the SQL above by hand.",
    "setup.probeFailed":
      "Could not reach OpenDepartment to run the check. Your answers are kept -- try again in a moment.",
    "setup.verify": "Verify and create",
    "setup.verifying": "Checking your project...",
    "setup.schemaMissing":
      "Your project answered, but the schema is not installed. Go back and run the SQL.",
    "setup.unreachable":
      "Could not reach that project. Check the URL and the key.",
    "setup.claimed":
      "That project already has an administrator. Connect a fresh Supabase project instead.",
    "setup.signInFirst":
      "Sign in to your OpenDepartment account before connecting a project.",
    "setup.rateLimited":
      "That is a lot of checks in a short time. Wait a minute and try again.",
    "setup.done": "Your department is live",
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
    "account.visit": "Visit",
    "account.refresh": "Refresh name",
    "account.refreshing": "Reading...",
    "account.refreshed": "Updated",
    "account.refreshFailed": "Could not read that department",
    "account.refreshHint":
      "Reads the name and tagline from the department's own settings and updates its directory entry.",

    // --- deleting a department ------------------------------------------
    // Three things carry a department and they live in three different
    // places, so the copy here names all three every time. "Delete" that
    // quietly means "delist" is how somebody ends up believing their archive
    // is gone while every document in it is still sitting in a project they
    // have stopped thinking about.
    "delete.open": "Delete",
    "delete.title": "Delete this department",
    "delete.intro":
      "Two separate things carry this department, and they are not in the same place.",
    "delete.layerListing":
      "The listing here: the address /d/{slug} and its entry in the directory. Removing it stops the address working, permanently, and frees the slug for somebody else.",
    "delete.layerProject":
      "Your Supabase project: every document, comment, member account and e-mail address the department ever held. It is yours, and it stays exactly where it is unless it is deleted too.",
    "delete.alsoProject": "Delete the Supabase project as well",
    "delete.alsoProjectHint":
      "Deletes project {ref} and everything in it. There is no undo and no export afterwards -- download anything you want to keep first.",
    "delete.listingOnly":
      "The listing will go. Your Supabase project and everything in it stays where it is.",
    "delete.connect": "Connect Supabase",
    "delete.connectHint":
      "To delete the project for you, OpenDepartment needs your permission once. You come straight back here afterwards -- then press Delete again.",
    "delete.noOauth":
      "This deployment cannot delete Supabase projects for you. Delete the project yourself in the Supabase dashboard, or everything in it stays where it is.",
    "delete.confirm": "Type {slug} to confirm",
    "delete.go": "Delete department",
    "delete.working": "Deleting...",
    "delete.mismatch": "That is not this department's address.",
    "delete.suspended":
      "This department is suspended. Its listing cannot be removed while a report about it is open, and deleting the project would not change that -- write to whoever runs this deployment instead.",
    // Outcomes. Shown in place of the row, so they survive the refresh that
    // takes the row away.
    "delete.doneListing": "Done. The listing is gone.",
    "delete.doneProject": "The Supabase project has been deleted.",
    "delete.projectGone":
      "That Supabase project no longer exists -- somebody had already deleted it.",
    "delete.listingFailed":
      "The listing could not be removed. Try again, or reload the page.",
    "delete.manualTitle": "Your data is still in Supabase",
    "delete.manualBody":
      "Project {ref} and everything in it still exists: every document, comment, member account and e-mail address this department held. Nothing else will delete it -- open it in the Supabase dashboard and use Settings, then General, then Delete project.",
    "delete.manualOpen": "Open the project in Supabase",
    "delete.reconnect":
      "Your Supabase authorisation has run out. Connect again, then press Delete once more.",
    "delete.refused":
      "Supabase would not delete the project: {detail}",
    "delete.failed":
      "The project could not be deleted: {detail}",
    "delete.dismiss": "Done",

    // --- erasing a department from inside it -----------------------------
    "danger.title": "Erase this department",
    "danger.intro":
      "Deletes every document, comment, vote, report, subject, invite code and member account in this archive -- everything except your own account, which stays so that you can finish and see that it worked. There is no undo.",
    "danger.scopeProject":
      "This does not delete the Supabase project itself. The project keeps existing, empty, and only its owner can delete it: whoever registered this department does that under Your departments, or from the Supabase dashboard.",
    "danger.confirm": "Type {name} to confirm",
    "danger.go": "Erase everything",
    "danger.working": "Erasing...",
    "danger.mismatch": "That is not this department's name.",
    "danger.unavailable":
      "This department's project has not run the current schema, so it has nothing to do this with. Re-run db/tenant-schema.sql in its SQL editor first.",
    "danger.doneFiles_one": "{n} document deleted.",
    "danger.doneFiles_other": "{n} documents deleted.",
    "danger.doneMembers_one": "{n} member account deleted.",
    "danger.doneMembers_other": "{n} member accounts deleted.",
    "danger.doneObjects_one": "{n} stored file removed from the bucket.",
    "danger.doneObjects_other": "{n} stored files removed from the bucket.",
    "danger.objectsLeft":
      "Some stored files could not be removed and are still in the bucket. Storage, then the department-files bucket, in the Supabase dashboard.",
    "danger.accountsKept":
      "The member logins themselves could not be deleted from this project. Nobody can reach the archive with them any more, but the addresses are still under Authentication in the Supabase dashboard.",
    "danger.nextTitle": "The project is still there",
    "danger.nextBody":
      "The archive is empty and its door is shut. The Supabase project it lives in still exists -- delete that too if you are finished with it.",
    "danger.nextProject": "Open the project in Supabase",
    "danger.nextListing": "Remove the listing",

    // --- landing --------------------------------------------------------
    "landing.subtitle":
      "Access to this repository is restricted to authorised personnel.",
    "landing.cta": "Request access",
    "landing.stat.files": "Documents on file",
    "landing.stat.subjects": "Subjects indexed",
    "landing.stat.members": "Cleared personnel",

    // --- auth -----------------------------------------------------------
    "auth.title": "Personnel Authentication",
    "auth.subtitle": "Restricted system. Authorised access only.",
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
    "auth.invalidCredentials": "E-mail address or password is incorrect.",
    "auth.passwordTooShort": "Password must be at least 8 characters.",
    "auth.genericError": "Authentication failed. Please try again.",
    "auth.working": "Verifying...",

    // --- setting a new password after a reset link ----------------------
    "auth.updateTitle": "Choose a new password",
    "auth.updateBody":
      "You arrived here from a reset link, so you are signed in for the moment. Pick a new password before you go any further.",
    "auth.newPassword": "New password",
    "auth.repeatPassword": "Repeat it",
    "auth.passwordMismatch": "Those two do not match.",
    "auth.updateSubmit": "Set the password",
    "auth.updateDone":
      "Your password has been changed. You are signed in.",
    "auth.linkExpired": "This link has expired",
    "auth.linkExpiredBody":
      "Reset links are good for one use and a short while. Ask for a fresh one and it will work.",

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
    "file.delete": "Delete",
    "file.report": "Report",
    "file.back": "Back to repository",
    "file.uploaderEmail": "Uploader e-mail (admin only)",
    "file.deleteConfirm":
      "Permanently destroy this document? This cannot be undone.",
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
    "upload.errorSize": "File exceeds the {mb} MB limit.",
    "upload.errorType": "That file type is not accepted.",
    "upload.errorQuota":
      "You have reached the storage limit for this department. Delete something you filed earlier, or ask an administrator to raise the limit.",
    "upload.metadataStripped":
      "Location and camera details were removed from this image before upload.",
    "upload.metadataUnsupported":
      "This image format cannot be cleaned in the browser, so it will be uploaded as it is -- including any location the camera recorded. Convert it to JPEG or PNG first if that matters.",
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
    "admin.tab.subjects": "Subjects",
    "admin.tab.audit": "Audit log",
    "admin.storage": "Storage used",
    "admin.storageOf": "of {total}",
    "admin.files.uploader": "Uploader",
    "admin.files.email": "E-mail",
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

    // --- legal ----------------------------------------------------------
    "legal.terms": "Terms of use",
    "legal.privacy": "Privacy notice",
    "legal.imprint": "Legal notice",
    "cookies.title": "About the cookies here",
    "cookies.body":
      "This site sets only the cookies it needs to work: one that keeps you " +
      "signed in, one that remembers your language, and one that remembers " +
      "you have read this. There is no advertising or tracking cookie, and " +
      "nothing here is shared with a third party.",
    "cookies.more": "Read the privacy notice",
    "cookies.ok": "Understood",

    // --- misc -----------------------------------------------------------
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.saving": "Saving...",
    "common.close": "Close",
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
    // --- Meldeweg der Plattform -----------------------------------------
    "abuse.link": "Departement melden",
    "abuse.title": "Departement melden",
    "abuse.intro":
      "Das geht an den Betreiber von OpenDepartment, nicht an die Administration des Departements -- nutzen Sie es, wenn die Administration das Problem ist. Eine Sperrung legt die Adresse still; die Daten bleiben im eigenen Supabase-Projekt der Betreiberin unangetastet. Um ein einzelnes Dokument den Leuten zu melden, die das Archiv führen, nutzen Sie die Meldefunktion beim Dokument selbst.",
    "abuse.which": "Welches Departement",
    "abuse.whichHelp":
      "Die Adresse oder der Teil nach /d/. Der ganze Link geht auch.",
    "abuse.reason": "Was ist das Problem",
    "abuse.reason.illegal": "Rechtswidrige Inhalte",
    "abuse.reason.personal": "Persönliche Daten einer realen Person",
    "abuse.reason.harassment": "Gezielte Belästigung",
    "abuse.reason.sexual": "Sexuelle Inhalte mit einer realen Person",
    "abuse.reason.impersonation": "Vortäuschen einer realen Organisation",
    "abuse.reason.copyright": "Urheberrecht",
    "abuse.reason.other": "Etwas anderes",
    "abuse.details": "Was sollten wir wissen?",
    "abuse.detailsPlaceholder":
      "Was auf der Seite steht und um wen es geht. Links helfen.",
    "abuse.contact": "Ihre E-Mail (optional)",
    "abuse.contactHelp":
      "Nur für Rückfragen. Leer lassen, um anonym zu melden.",
    "abuse.submit": "Meldung senden",
    "abuse.slugRequired": "Bitte geben Sie an, um welches Departement es geht.",
    "abuse.unknownSlug":
      "Unter dieser Adresse gibt es kein Departement. Bitte Schreibweise prüfen oder den Link einfügen.",
    "abuse.sent": "Meldung erhalten",
    "abuse.sentBody":
      "Jemand wird sie lesen. Wenn Sie eine Adresse hinterlassen haben, melden wir uns unter Umständen; dem Departement wird in keinem Fall mitgeteilt, wer die Meldung gemacht hat.",

    "admin.tab.invites": "Einladungen",
    "admin.tab.settings": "Einstellungen",

    // --- die Einstellungsseite ------------------------------------------
    "settings.intro":
      "Alles auf dieser Seite ist eine Zeile in Ihrer eigenen Datenbank. Nichts an diesem Departement steckt fest in OpenDepartment -- deshalb können Sie es in etwas völlig anderes umbenennen, ohne dass die App davon Notiz nimmt.",
    "settings.identity": "Identität",
    "settings.name": "Name des Departements",
    "settings.tagline": "Untertitel",
    "settings.directoryNote":
      "Der Name ändert sich hier sofort. Das öffentliche Verzeichnis zeigt den Namen, den Sie bei OpenDepartment registriert haben; das ist eine eigene Liste mit einer eigenen Kopie.",
    "settings.vocabulary": "Wortwahl",
    "settings.subjectLabel": "Worum es in den Akten geht",
    "settings.subjectLabelHint":
      "Das Wort für einen einzelnen Eintrag im Archiv. «Fall» ergibt ein Fallakten-Verzeichnis.",
    "settings.docket": "Aktenkürzel",
    "settings.docketHint": "Dokumente werden {example} nummeriert.",
    "settings.seal": "Das Siegel",
    "settings.sealTop": "Oben herum",
    "settings.sealBottom": "Unten herum",
    "settings.accent": "Akzentfarbe",
    "settings.accentInvalid":
      "Verwenden Sie eine sechsstellige Hex-Farbe, etwa #b8860b.",
    "settings.categories": "Kategorien",
    "settings.categoriesHint":
      "Eine pro Zeile, in der gewünschten Reihenfolge. Bestehende Dokumente behalten ihre Kategorie, auch wenn Sie sie hier entfernen.",
    "settings.categoriesEmpty": "Behalten Sie mindestens eine Kategorie.",
    "settings.memberQuota": "Speicher pro Mitglied",
    "settings.memberQuotaHint":
      "Megabyte, die ein Mitglied insgesamt belegen darf. Leer lassen für kein Limit. Ein kostenloses Supabase-Projekt fasst etwa ein Gigabyte, und das Limit pro Datei hindert eine einzelne Person nicht daran, es zu füllen.",
    "settings.memberQuotaNone": "Kein Limit",
    "settings.quotaInvalid":
      "Speicher pro Mitglied muss eine ganze Zahl in Megabyte sein oder leer für kein Limit.",
    "settings.storage": "Speicher",
    "settings.orphans": "Dateien ohne Dokument",
    "settings.orphansHint":
      "Beim Löschen eines Dokuments wird zuerst der Datensatz und dann die Datei entfernt -- zwei Schritte. Wird der Browser dazwischen geschlossen, bleibt die Datei liegen: im Archiv ist sie unsichtbar, Ihren Supabase-Speicher belegt sie trotzdem.",
    "settings.orphansNone": "Nichts liegen geblieben.",
    "settings.orphansPurge": "Diese Dateien löschen",
    "settings.orphansPurged": "{n} Datei(en) entfernt.",
    "settings.orphansUnavailable":
      "Die Speicherliste konnte nicht gelesen werden. Führen Sie db/tenant-schema.sql in Ihrem Projekt erneut aus, falls seit dieser Neuerung noch nicht geschehen.",
    "settings.usage": "Was die Mitglieder belegen",
    "settings.upload": "Grösster Upload",
    "settings.uploadHint":
      "Megabyte, höchstens {cap}. Ihr Storage-Bucket wird beim Speichern entsprechend angepasst.",
    "settings.operator": "Wer dieses Departement betreibt",
    "settings.operatorHint":
      "Erscheint im Fussbereich. Die hier genannte Person verantwortet den Inhalt des Archivs -- genau darum wird sie genannt.",
    "settings.operatorName": "Name",
    "settings.operatorContact": "Kontakt",
    "settings.nameRequired": "Ein Departement braucht einen Namen.",
    "settings.saved": "Gespeichert.",
    "common.save": "Speichern",
    "invite.maxUses": "Maximale Verwendungen",
    "invite.expiresDays": "Läuft ab in (Tagen)",
    "invite.note": "Notiz",
    "invite.notePlaceholder": "z. B. im Gruppenchat verteilt",
    "invite.regenerate": "Neuen Code erzeugen",
    "invite.duplicate": "Diesen Code gibt es bereits.",
    "invite.tooShort":
      "Zu kurz oder nicht in Grossbuchstaben. Mindestens acht Zeichen -- ein Code kann Administratorrechte vergeben, ein erratbarer gibt also mehr her als nur Zugang.",
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
    "od.supportBody":
      "OpenDepartment ist kostenlos und speichert nichts von Ihnen. Wenn es Ihnen nützt, können Sie mir einen Kaffee ausgeben.",

    // --- department chrome (OpenDepartment additions) -------------------
    "dept.hostedNotice":
      "{name} wird von der eigenen Administration erstellt und betrieben, die für sämtliche Inhalte verantwortlich ist. Gehostet auf",
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
    // --- Ein-Klick-Einrichtung (nur mit registrierter OAuth-App) ---------
    "setup.oauthNotConfigured":
      "Die Ein-Klick-Einrichtung ist auf dieser Installation nicht konfiguriert.",
    "setup.oauthDeclined":
      "Supabase hat Sie ohne Autorisierungscode zurückgeschickt -- meist die Schaltfläche Abbrechen oder ein geschlossenes Zustimmungsfenster. Es wurde nichts angelegt.",
    "setup.oauthState":
      "Das Sicherheitstoken vom Beginn des Vorgangs kam nicht zurück. Meist blockiert der Browser Cookies bei der Rückkehr von Supabase, oder der Vorgang wurde in einem anderen Tab gestartet. Bitte in diesem Tab erneut versuchen.",
    "setup.oauthExpiredFlow":
      "Die Autorisierung hat länger als zehn Minuten gedauert, der einmalige Code dafür ist abgelaufen. Bitte neu starten.",
    "setup.oauthSession":
      "Ihre OpenDepartment-Anmeldung hat sich während des Vorgangs geändert, die Autorisierung liess sich Ihrem Konto nicht zuordnen. Bitte neu anmelden und erneut versuchen.",
    "setup.oauthExchange":
      "Supabase hat den Autorisierungscode nicht eingelöst. Meist passen OAuth-App und Installation nicht zusammen -- prüfen Sie, ob die Callback-URL exakt diese Website plus /api/setup/oauth/callback ist und ob Client-ID und Secret in der Umgebung zu genau dieser App gehören.",
    "setup.oauthScope":
      "Supabase hat die Autorisierung angenommen und dann die erste Anfrage abgelehnt ({status}). Nennt Supabase einen Scope, braucht die OAuth-App Organizations lesen, Projects lesen und schreiben, Database schreiben, Secrets lesen und Auth schreiben. Verbinden Sie danach erneut -- eine bestehende Freigabe behält die Berechtigungen, mit denen sie erteilt wurde.",

    "setup.autoTitle": "OpenDepartment richtet es für Sie ein",
    "setup.autoBody":
      "Verbinden Sie Ihr Supabase-Konto, und wir legen das Projekt an, installieren das Schema, schalten die E-Mail-Bestätigung ab und tragen die Anmeldeadresse Ihres Departements ein -- die nächsten drei Schritte, erledigt. Das Projekt gehört weiterhin Ihnen; es entsteht in Ihrer eigenen Supabase-Organisation.",
    "setup.autoTrust":
      "Sie werden bei Supabase um eine Freigabe für OpenDepartment gebeten. Das Zugriffstoken bleibt verschlüsselt in Ihrem eigenen Browser, nie in unserer Datenbank, und wird gelöscht, sobald die Einrichtung fertig ist. Es dient genau einem Zweck: dieses Projekt anzulegen und das Schema hineinzuschreiben.",
    "setup.autoConnect": "Supabase verbinden",
    "setup.autoNeedsAccount":
      "Sie werden zuerst nach einer Anmeldung bei OpenDepartment gefragt.",
    "setup.signInLink": "Anmelden oder Konto erstellen.",
    "setup.autoOrg": "Welche Supabase-Organisation",
    "setup.autoGo": "Projekt anlegen",
    "setup.autoResume": "Dort weitermachen, wo es aufgehört hat",
    "setup.autoPatience":
      "Ein Supabase-Projekt anzulegen dauert ein bis zwei Minuten. Lassen Sie diesen Tab offen.",
    "setup.autoConfigured":
      "Die E-Mail-Bestätigung ist aus und Ihre Anmeldeadresse ist bereits freigegeben -- beides wurde bei der Einrichtung gesetzt. Im Supabase-Dashboard ist nichts zu tun.",
    "setup.manualTitle": "Oder selber machen",
    "setup.oauthFailed":
      "Das wurde nicht abgeschlossen. Es wurde nichts angelegt; Sie können es erneut versuchen oder das Projekt unten von Hand einrichten.",
    "setup.oauthRefused":
      "Supabase hat die Anmeldung angenommen und diese Anfrage dann abgelehnt. Die Angaben unten sind der Wortlaut von Supabase. Ist dort von einer Berechtigung oder einem Scope die Rede, braucht die App Organizations lesen, Projects lesen und schreiben, Database schreiben, Secrets lesen und Auth schreiben -- ändern Sie das im Supabase-Dashboard und verbinden Sie danach erneut, denn eine bestehende Freigabe behält die Berechtigungen, mit denen sie erteilt wurde. Steht dort etwas anderes, ist das die eigentliche Ursache und die Scopes sind nicht das Problem.",
    "setup.oauthUnreachable":
      "Supabase war nicht erreichbar, um die Verbindung zu bestätigen. Versuchen Sie es gleich noch einmal oder richten Sie das Projekt unten von Hand ein.",
    "setup.oauthExpired":
      "Die Supabase-Freigabe ist abgelaufen. Bitte erneut verbinden.",
    "setup.noOrganisation":
      "Dieses Supabase-Konto hat keine Organisation, in der ein Projekt entstehen könnte. Legen Sie im Supabase-Dashboard eine an und versuchen Sie es erneut.",
    "setup.stillStarting":
      "Ihr Projekt wurde angelegt und startet noch. Warten Sie einen Moment und drücken Sie die Schaltfläche erneut -- es wird mit demselben Projekt weitergemacht, kein zweites angelegt.",
    "setup.projectGone":
      "Das Projekt, an dem hier weitergemacht wurde, existiert in Ihrem Supabase-Konto nicht mehr -- es wurde entfernt oder nie fertig angelegt. Das ist jetzt vergessen; drücken Sie die Schaltfläche erneut, dann wird ein neues Projekt von Grund auf angelegt.",
    "setup.schemaFailedAuto":
      "Das Projekt wurde angelegt, das Schema aber nicht installiert. Öffnen Sie es im Supabase-Dashboard und fügen Sie das SQL aus dem nächsten Schritt von Hand ein.",
    "setup.provisionCreating": "Ihr Projekt wird angelegt...",

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
    "setup.redirectTitle": "Diesen Schritt bitte nicht überspringen",
    "setup.redirectNote":
      "In Supabase unter Authentication, URL Configuration diese Adresse zu den Redirect URLs hinzufügen. Ohne sie landet in Ihrem Departement jeder Bestätigungs- und Passwort-Link auf einer Fehlerseite.",
    "setup.copyCallback": "Adresse kopieren",
    "setup.operator": "Wer dieses Departement betreibt",
    "setup.operatorHelp":
      "Erscheint im Impressum sowie auf den AGB- und Datenschutzseiten Ihres Departements. Sie können die Felder leer lassen und später unter Administration ergänzen -- die Seiten gibt es trotzdem, und ein Impressum ohne Namen ist keines.",
    "setup.operatorName": "Ihr Name oder Ihre Organisation",
    "setup.operatorNamePlaceholder": "Alex Muster",
    "setup.operatorContact": "Kontaktadresse",
    "setup.paste": "Aus Supabase einfügen",
    "setup.pastePlaceholder":
      "Projekt-URL und Anon-Key hier einfügen -- zusammen, einzeln oder als ganzer .env-Block.",
    "setup.pasteHelp":
      "Alles, worin eine Supabase-URL oder ein Schlüssel vorkommt, genügt. Ein klassischer Anon-Key nennt sein eigenes Projekt, deshalb füllt der Schlüssel allein meist beide Felder.",
    "setup.pasteFound": "Gefunden -- bitte die beiden Felder unten prüfen.",
    "setup.pasteDerived":
      "Schlüssel gefunden und die Projekt-URL daraus abgeleitet. Bitte beides unten prüfen.",
    "setup.pasteNothing":
      "Darin steckt weder eine Supabase-URL noch ein Schlüssel. Bitte die Werte aus Project Settings, API einfügen.",
    "setup.openSqlEditor": "SQL-Editor öffnen",
    "setup.openApiSettings": "Project Settings, API öffnen",
    "setup.downloadSql": "Stattdessen als Datei herunterladen",
    "setup.copyFailed":
      "Ihr Browser hat der Seite den Zugriff auf die Zwischenablage verweigert. Laden Sie die Datei herunter oder markieren Sie das SQL oben von Hand.",
    "setup.probeFailed":
      "OpenDepartment war für die Prüfung nicht erreichbar. Ihre Eingaben bleiben erhalten -- bitte gleich noch einmal versuchen.",
    "setup.verify": "Prüfen und erstellen",
    "setup.verifying": "Ihr Projekt wird geprüft...",
    "setup.schemaMissing":
      "Ihr Projekt antwortet, aber das Schema ist nicht installiert. Gehen Sie zurück und führen Sie das SQL aus.",
    "setup.unreachable":
      "Dieses Projekt ist nicht erreichbar. Prüfen Sie URL und Key.",
    "setup.claimed":
      "Dieses Projekt hat bereits eine Administration. Verbinden Sie stattdessen ein neues Supabase-Projekt.",
    "setup.signInFirst":
      "Melden Sie sich bei Ihrem OpenDepartment-Konto an, bevor Sie ein Projekt verbinden.",
    "setup.rateLimited":
      "Das sind viele Prüfungen in kurzer Zeit. Warten Sie eine Minute und versuchen Sie es erneut.",
    "setup.done": "Ihr Departement ist online",
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
    "account.visit": "Öffnen",
    "account.refresh": "Namen aktualisieren",
    "account.refreshing": "Wird gelesen...",
    "account.refreshed": "Aktualisiert",
    "account.refreshFailed": "Dieses Departement konnte nicht gelesen werden",
    "account.refreshHint":
      "Liest Name und Untertitel aus den Einstellungen des Departements und aktualisiert den Verzeichniseintrag.",

    // --- Departement löschen ---------------------------------------------
    "delete.open": "Löschen",
    "delete.title": "Dieses Departement löschen",
    "delete.intro":
      "Dieses Departement besteht aus zwei getrennten Teilen, und die liegen nicht am selben Ort.",
    "delete.layerListing":
      "Der Eintrag hier: die Adresse /d/{slug} und ihr Verzeichniseintrag. Wird er entfernt, funktioniert die Adresse dauerhaft nicht mehr und wird für jemand anderen frei.",
    "delete.layerProject":
      "Ihr Supabase-Projekt: jedes Dokument, jeder Kommentar, jedes Mitgliedskonto und jede E-Mail-Adresse, die dieses Departement je hatte. Es gehört Ihnen und bleibt unverändert bestehen, solange es nicht ebenfalls gelöscht wird.",
    "delete.alsoProject": "Das Supabase-Projekt ebenfalls löschen",
    "delete.alsoProjectHint":
      "Löscht das Projekt {ref} und alles darin. Danach gibt es kein Zurück und keinen Export mehr -- laden Sie vorher herunter, was Sie behalten wollen.",
    "delete.listingOnly":
      "Nur der Eintrag verschwindet. Ihr Supabase-Projekt und alles darin bleibt, wo es ist.",
    "delete.connect": "Supabase verbinden",
    "delete.connectHint":
      "Um das Projekt für Sie zu löschen, braucht OpenDepartment einmal Ihre Erlaubnis. Sie kommen danach direkt hierher zurück -- drücken Sie dann erneut auf Löschen.",
    "delete.noOauth":
      "Diese Installation kann keine Supabase-Projekte für Sie löschen. Löschen Sie das Projekt selbst im Supabase-Dashboard, sonst bleibt alles darin bestehen.",
    "delete.confirm": "Tippen Sie {slug} zur Bestätigung",
    "delete.go": "Departement löschen",
    "delete.working": "Wird gelöscht...",
    "delete.mismatch": "Das ist nicht die Adresse dieses Departements.",
    "delete.suspended":
      "Dieses Departement ist gesperrt. Sein Eintrag kann nicht entfernt werden, solange eine Meldung dazu offen ist, und das Löschen des Projekts ändert daran nichts -- wenden Sie sich stattdessen an den Betreiber dieser Installation.",
    "delete.doneListing": "Erledigt. Der Eintrag ist entfernt.",
    "delete.doneProject": "Das Supabase-Projekt wurde gelöscht.",
    "delete.projectGone":
      "Dieses Supabase-Projekt existiert nicht mehr -- es war bereits gelöscht.",
    "delete.listingFailed":
      "Der Eintrag konnte nicht entfernt werden. Versuchen Sie es erneut oder laden Sie die Seite neu.",
    "delete.manualTitle": "Ihre Daten liegen weiterhin in Supabase",
    "delete.manualBody":
      "Das Projekt {ref} und alles darin besteht weiter: jedes Dokument, jeder Kommentar, jedes Mitgliedskonto und jede E-Mail-Adresse dieses Departements. Nichts sonst löscht es -- öffnen Sie es im Supabase-Dashboard und wählen Sie Settings, dann General, dann Delete project.",
    "delete.manualOpen": "Projekt in Supabase öffnen",
    "delete.reconnect":
      "Ihre Supabase-Autorisierung ist abgelaufen. Verbinden Sie erneut und drücken Sie dann nochmals auf Löschen.",
    "delete.refused":
      "Supabase hat das Löschen des Projekts abgelehnt: {detail}",
    "delete.failed":
      "Das Projekt konnte nicht gelöscht werden: {detail}",
    "delete.dismiss": "Fertig",

    // --- Departement von innen leeren -------------------------------------
    "danger.title": "Dieses Departement leeren",
    "danger.intro":
      "Löscht jedes Dokument, jeden Kommentar, jede Stimme, jede Meldung, jeden Betreff, jeden Einladungscode und jedes Mitgliedskonto in diesem Archiv -- alles ausser Ihrem eigenen Konto, das bleibt, damit Sie zu Ende führen und sehen können, dass es funktioniert hat. Es gibt kein Zurück.",
    "danger.scopeProject":
      "Das Supabase-Projekt selbst wird dabei nicht gelöscht. Es besteht leer weiter, und nur seine Besitzerin oder sein Besitzer kann es löschen: wer dieses Departement registriert hat, tut das unter Ihre Departemente oder im Supabase-Dashboard.",
    "danger.confirm": "Tippen Sie {name} zur Bestätigung",
    "danger.go": "Alles löschen",
    "danger.working": "Wird gelöscht...",
    "danger.mismatch": "Das ist nicht der Name dieses Departements.",
    "danger.unavailable":
      "Das Projekt dieses Departements hat das aktuelle Schema nicht eingespielt und kann das deshalb nicht. Führen Sie zuerst db/tenant-schema.sql erneut in seinem SQL-Editor aus.",
    "danger.doneFiles_one": "{n} Dokument gelöscht.",
    "danger.doneFiles_other": "{n} Dokumente gelöscht.",
    "danger.doneMembers_one": "{n} Mitgliedskonto gelöscht.",
    "danger.doneMembers_other": "{n} Mitgliedskonten gelöscht.",
    "danger.doneObjects_one": "{n} gespeicherte Datei aus dem Bucket entfernt.",
    "danger.doneObjects_other": "{n} gespeicherte Dateien aus dem Bucket entfernt.",
    "danger.objectsLeft":
      "Einige gespeicherte Dateien konnten nicht entfernt werden und liegen weiterhin im Bucket. Storage, dann der Bucket department-files, im Supabase-Dashboard.",
    "danger.accountsKept":
      "Die Mitglieder-Logins selbst konnten in diesem Projekt nicht gelöscht werden. Mit ihnen kommt niemand mehr ins Archiv, aber die Adressen stehen weiterhin unter Authentication im Supabase-Dashboard.",
    "danger.nextTitle": "Das Projekt besteht weiter",
    "danger.nextBody":
      "Das Archiv ist leer und seine Tür ist zu. Das Supabase-Projekt, in dem es liegt, existiert weiterhin -- löschen Sie auch das, wenn Sie damit fertig sind.",
    "danger.nextProject": "Projekt in Supabase öffnen",
    "danger.nextListing": "Eintrag entfernen",

    // --- landing --------------------------------------------------------
    "landing.subtitle":
      "Der Zugang zu diesem Archiv ist auf befugtes Personal beschränkt.",
    "landing.cta": "Zugang beantragen",
    "landing.stat.files": "Erfasste Dokumente",
    "landing.stat.subjects": "Erfasste Betreffe",
    "landing.stat.members": "Befugtes Personal",

    // --- auth -----------------------------------------------------------
    "auth.title": "Personalauthentifizierung",
    "auth.subtitle": "Geschütztes System. Nur für befugten Zugriff.",
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
    "auth.invalidCredentials": "E-Mail-Adresse oder Passwort ist falsch.",
    "auth.passwordTooShort": "Das Passwort muss mindestens 8 Zeichen haben.",
    "auth.genericError":
      "Die Authentifizierung ist fehlgeschlagen. Bitte erneut versuchen.",
    "auth.working": "Wird geprüft...",

    // --- neues Passwort nach einem Reset-Link ---------------------------
    "auth.updateTitle": "Neues Passwort wählen",
    "auth.updateBody":
      "Sie sind über einen Link zum Zurücksetzen hierhergekommen und deshalb vorläufig angemeldet. Wählen Sie zuerst ein neues Passwort.",
    "auth.newPassword": "Neues Passwort",
    "auth.repeatPassword": "Wiederholen",
    "auth.passwordMismatch": "Die beiden stimmen nicht überein.",
    "auth.updateSubmit": "Passwort setzen",
    "auth.updateDone":
      "Ihr Passwort wurde geändert. Sie sind angemeldet.",
    "auth.linkExpired": "Dieser Link ist abgelaufen",
    "auth.linkExpiredBody":
      "Links zum Zurücksetzen gelten einmal und nur kurz. Fordern Sie einen neuen an, dann klappt es.",

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
    "file.delete": "Löschen",
    "file.report": "Melden",
    "file.back": "Zurück zum Archiv",
    "file.uploaderEmail": "E-Mail der einreichenden Person (nur Administration)",
    "file.deleteConfirm":
      "Dieses Dokument endgültig vernichten? Das kann nicht rückgängig gemacht werden.",
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
    "upload.errorSize": "Die Datei überschreitet das Limit von {mb} MB.",
    "upload.errorType": "Dieser Dateityp wird nicht akzeptiert.",
    "upload.errorQuota":
      "Sie haben das Speicherlimit dieses Departements erreicht. Löschen Sie etwas Früheres oder bitten Sie eine Administratorin, das Limit zu erhöhen.",
    "upload.metadataStripped":
      "Standort- und Kameradaten wurden vor dem Hochladen aus diesem Bild entfernt.",
    "upload.metadataUnsupported":
      "Dieses Bildformat lässt sich im Browser nicht bereinigen und wird unverändert hochgeladen -- samt allfälligem Standort aus der Kamera. Wandeln Sie es vorher in JPEG oder PNG um, falls das eine Rolle spielt.",
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
    "admin.tab.subjects": "Betreffe",
    "admin.tab.audit": "Protokoll",
    "admin.storage": "Belegter Speicher",
    "admin.storageOf": "von {total}",
    "admin.files.uploader": "Eingereicht von",
    "admin.files.email": "E-Mail",
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

    // --- legal ----------------------------------------------------------
    "legal.terms": "Nutzungsbedingungen",
    "legal.privacy": "Datenschutzerklärung",
    "legal.imprint": "Impressum",
    "cookies.title": "Zu den Cookies auf dieser Seite",
    "cookies.body":
      "Diese Seite setzt nur die Cookies, die für den Betrieb nötig sind: " +
      "eines hält Sie angemeldet, eines merkt sich Ihre Sprache, eines merkt " +
      "sich, dass Sie diesen Hinweis gelesen haben. Es gibt keine Werbe- oder " +
      "Tracking-Cookies, und nichts davon wird an Dritte weitergegeben.",
    "cookies.more": "Zur Datenschutzerklärung",
    "cookies.ok": "Verstanden",

    // --- misc -----------------------------------------------------------
    "common.cancel": "Abbrechen",
    "common.confirm": "Bestätigen",
    "common.saving": "Wird gespeichert...",
    "common.close": "Schliessen",
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
