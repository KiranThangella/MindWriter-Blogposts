// src/components/StaticPages.tsx
//
// The pages required for basic site trust + Google AdSense approval:
// About, Contact, Privacy Policy, Terms & Conditions, Disclaimer, DMCA Policy.
//
// Content sourced from Kiran's drafted legal docs (AI-assisted first drafts —
// see the disclaimer note at the bottom of each page). Phone number and
// physical office address from those drafts were placeholders and have been
// removed; only the real contact email is used site-wide.

import React from "react";

const CONTACT_EMAIL = "mindwriter.contact@gmail.com";
const SITE_OWNER_NAME = "MindWriter Team";
const COUNTRY = "India";
const SITE_NAME = "MindWriter";
const SITE_URL = "https://mindwriter.in";
const LAST_UPDATED = "July 2026"; // Update this date whenever you materially change these pages

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg text-white px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm text-brand-purple hover:underline">&larr; Back to {SITE_NAME}</a>
        <h1 className="mt-6 mb-2 text-3xl sm:text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-xs text-zinc-500 mb-10">Last updated: {LAST_UPDATED}</p>
        <div className="prose prose-invert prose-sm sm:prose-base max-w-none space-y-6 text-zinc-300 leading-relaxed [&_h2]:text-white [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-white [&_h3]:font-semibold [&_h3]:text-base [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-brand-purple [&_a]:underline [&_table]:w-full [&_th]:text-left [&_th]:text-white [&_td]:align-top">
          {children}
        </div>
      </div>
    </div>
  );
}

function LegalDraftNotice() {
  return (
    <p className="mt-12 border-t border-zinc-800 pt-6 text-xs text-zinc-500">
      This page was drafted with AI assistance as a baseline and reviewed by {SITE_NAME}. It is provided
      for informational purposes and is not a substitute for advice from a licensed legal professional in
      your jurisdiction.
    </p>
  );
}

export function AboutPage() {
  return (
    <PageShell title="About Us">
      <p>
        Welcome to {SITE_NAME} ({SITE_URL}). In an era where artificial intelligence and digital
        technology evolve at breakneck speed, our mission is to serve as your reliable compass — bridging
        the gap between complex technological advancements and practical, real-world application.
      </p>

      <h2>Our Mission</h2>
      <p>
        {SITE_NAME} was founded on a simple belief: knowledge should be actionable. Our platform is built
        for students, professionals, developers, bloggers, and tech enthusiasts who want to stay current
        with fast-moving AI and technology news — not just read about it, but put it to use.
      </p>
      <p>
        We don't just report the news; we aim to translate it into productivity, through articles,
        tutorials, and analysis that help readers solve real problems and optimize their digital
        workflow.
      </p>

      <h2>Our Editorial Approach</h2>
      <p>
        Articles on {SITE_NAME} are researched and drafted with the help of AI-assisted tools, then
        reviewed for accuracy before publishing. We aim to keep our site free of thin, auto-generated
        filler, and to provide genuine, verifiable value in each piece we publish, in line with Google's
        Publisher Policies.
      </p>

      <h2>At a Glance</h2>
      <table>
        <tbody>
          <tr><td><strong>Brand Name</strong></td><td>{SITE_NAME}</td></tr>
          <tr><td><strong>Digital Domain</strong></td><td>{SITE_URL}</td></tr>
          <tr><td><strong>Primary Focus</strong></td><td>AI News, Tech Updates, Software Reviews &amp; Productivity Tools</td></tr>
          <tr><td><strong>Target Audience</strong></td><td>Students, Developers, Entrepreneurs, Tech Enthusiasts</td></tr>
          <tr><td><strong>Editorial Framework</strong></td><td>Fact-checked, AI-assisted with human review</td></tr>
          <tr><td><strong>Support Desk</strong></td><td><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></td></tr>
        </tbody>
      </table>

      <h2>Get in Touch</h2>
      <p>
        We welcome feedback, corrections, and questions. If you have a question about a review or a
        feature request, see our <a href="/contact">Contact page</a>.
      </p>

      <LegalDraftNotice />
    </PageShell>
  );
}

export function ContactPage() {
  return (
    <PageShell title="Contact Us">
      <p>
        Welcome to {SITE_NAME} ({SITE_URL}). Whether you're a student, a professional developer, an
        aspiring blogger, or a fellow technology enthusiast, we're glad to have you here. If you have a
        question about one of our articles, spotted a bug, want to propose a partnership, or simply want
        to say hello, we're here to listen.
      </p>

      <h2>Email</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <br />
        We typically respond within 24–48 business hours.
      </p>

      <h2>What to Include</h2>
      <p>To help us route your message quickly, please mention what it's about in your subject line:</p>
      <ul>
        <li><strong>Editorial Correction</strong> — spotted an error in an article? Include a link to the piece and the source verifying your correction.</li>
        <li><strong>Technical Bug</strong> — include your browser/device and the steps to reproduce the issue.</li>
        <li><strong>Partnership Proposal</strong> — include your brand/organization name and what you have in mind.</li>
        <li><strong>DMCA / Copyright Notice</strong> — see our <a href="/dmca-policy">DMCA Policy</a> for what a valid notice needs to include.</li>
      </ul>

      <h2>Privacy</h2>
      <p>
        Any information you share with us when contacting us is used solely to respond to your inquiry.
        We do not sell or share it with third parties. See our <a href="/privacy-policy">Privacy Policy</a>{" "}
        for details.
      </p>

      <LegalDraftNotice />
    </PageShell>
  );
}

export function PrivacyPolicyPage() {
  return (
    <PageShell title="Privacy Policy">
      <p>
        Welcome to {SITE_NAME} ({SITE_URL}), a technology-focused platform publishing AI news, software
        reviews, tutorials, productivity guides, and interactive web tools. This Privacy Policy explains
        how we ("we", "our", "us") collect, use, and protect information when you visit our site, use our
        tools, or interact with our content, and outlines your rights under data protection frameworks
        including the GDPR (EU), CCPA/CPRA (California), and COPPA.
      </p>

      <h2>Quick Summary</h2>
      <table>
        <tbody>
          <tr><td><strong>Data Controller</strong></td><td>{SITE_NAME}, India</td></tr>
          <tr><td><strong>Primary Contact</strong></td><td><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></td></tr>
          <tr><td><strong>Do we sell your data?</strong></td><td>No — never.</td></tr>
          <tr><td><strong>Affiliate tracking</strong></td><td>None.</td></tr>
          <tr><td><strong>Comments</strong></td><td>We log name, email, IP, and a Gravatar hash to combat spam.</td></tr>
          <tr><td><strong>Ad delivery</strong></td><td>Standard cookie-based advertising (Google AdSense).</td></tr>
          <tr><td><strong>Your rights</strong></td><td>Access, correction, erasure, restriction, objection, portability.</td></tr>
        </tbody>
      </table>

      <h2>Information We Collect</h2>
      <h3>A. Information You Provide Voluntarily</h3>
      <ul>
        <li><strong>Contact &amp; communications:</strong> when you email us, we receive your name, email address, and message content.</li>
        <li><strong>Comments:</strong> if you comment on an article, we collect the name, email, and website you enter, plus your IP address and browser user agent (for spam detection). An anonymized hash of your email may be sent to Gravatar to check for a profile photo — see Gravatar's <a href="https://automattic.com/privacy/" target="_blank" rel="noopener noreferrer">privacy policy</a>.</li>
        <li><strong>Tool inputs:</strong> text you enter into our free web/AI tools is processed to generate your output; we don't permanently store raw tool inputs unless a specific tool feature (e.g. saving a template) explicitly says otherwise.</li>
      </ul>
      <h3>B. Information Collected Automatically</h3>
      <p>
        Like most websites, we log standard technical information on each visit — IP address, browser
        type and version, referring/exit pages, date/time stamps, and click patterns. These logs are used
        to analyze traffic trends, secure the site, and improve our content and tools; they are not used
        to identify you personally.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies to remember your preferences (e.g. theme), understand how visitors use the site,
        and — where enabled — serve relevant advertising. You can control or disable cookies through your
        browser settings; some site features may not work correctly without them.
      </p>

      <h2>Legal Basis for Processing (GDPR)</h2>
      <table>
        <thead>
          <tr><th>Data / Action</th><th>Purpose</th><th>Legal Basis</th></tr>
        </thead>
        <tbody>
          <tr><td>Comments</td><td>Displaying community discussion</td><td>Consent</td></tr>
          <tr><td>Direct contact / email</td><td>Responding to inquiries</td><td>Legitimate interest</td></tr>
          <tr><td>Log data &amp; security</td><td>Fraud prevention, debugging, optimization</td><td>Legitimate interest</td></tr>
          <tr><td>Analytics</td><td>Improving content and tools</td><td>Consent (cookie banner)</td></tr>
        </tbody>
      </table>

      <h2>Google AdSense &amp; Advertising</h2>
      <p>
        We may display ads via Google AdSense. Google, as a third-party vendor, uses cookies to serve ads
        based on your prior visits to this and other sites. You can opt out of personalized advertising
        via{" "}
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
          Google Ads Settings
        </a>{" "}
        or manage tracking generally via the{" "}
        <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">
          Digital Advertising Alliance opt-out
        </a>.
      </p>

      <h2>No Sale of Your Data (CCPA/CPRA)</h2>
      <p>
        We do not sell, rent, trade, or lease your personal data to third parties. We don't run affiliate
        tracking. If you want to make sure your data isn't used for targeted advertising, you can enable
        your browser's Global Privacy Control (GPC) signal or use our cookie consent tool.
      </p>

      <h2>Third-Party Links</h2>
      <p>
        Our site links to external sites (documentation, tools, sources) for convenience. We don't control
        and aren't responsible for the content or privacy practices of those sites.
      </p>

      <h2>Your Rights</h2>
      <h3>EU/EEA (GDPR)</h3>
      <ul>
        <li>Access, rectification, erasure ("right to be forgotten"), restriction of processing, data portability, objection, and withdrawal of consent.</li>
        <li>You may also lodge a complaint with your local Data Protection Authority.</li>
      </ul>
      <h3>California (CCPA/CPRA)</h3>
      <ul>
        <li>Right to know, delete, correct, opt out of sale/sharing (we don't sell/share), and non-discrimination for exercising these rights.</li>
      </ul>
      <p>
        To exercise any of these rights, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with
        subject "Privacy Rights Request." We verify identity and respond within 30 days (GDPR) or 45 days
        (CCPA).
      </p>

      <h2>Data Retention</h2>
      <ul>
        <li><strong>Comments:</strong> retained indefinitely so follow-up comments from the same person can be recognized automatically.</li>
        <li><strong>Contact/email correspondence:</strong> retained up to 24 months, then deleted or anonymized.</li>
        <li><strong>Server logs:</strong> rotated automatically every 30–90 days.</li>
      </ul>

      <h2>Children's Privacy (COPPA)</h2>
      <p>
        {SITE_NAME} does not knowingly collect personal data from children under 13 (or under 16 in the
        EU). If you believe a child has provided us personal data, contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we'll remove it promptly.
      </p>

      <h2>International Data Transfers</h2>
      <p>
        Our services are hosted globally, so your data may be processed outside your home country
        (including India). Where required, we rely on Standard Contractual Clauses to keep an equivalent
        level of protection for data transferred out of the EEA.
      </p>

      <h2>Data Security</h2>
      <p>
        We use SSL/TLS encryption site-wide and standard security practices to protect your data. No
        method of transmission over the internet is 100% secure, so please avoid sharing sensitive
        personal information in public comment sections.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We'll update the "Last updated" date above whenever we make material changes to this policy.
        Continued use of the site after changes means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this Privacy Policy? Email {SITE_OWNER_NAME} at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <LegalDraftNotice />
    </PageShell>
  );
}

export function TermsOfUsePage() {
  return (
    <PageShell title="Terms and Conditions">
      <p>
        Welcome to {SITE_NAME} ({SITE_URL}). By accessing our website, using our tools, or reading our
        content, you agree to be bound by these Terms and Conditions. If you don't agree, please
        discontinue use of the site.
      </p>

      <h2>Acceptance of Terms</h2>
      <p>
        Using {SITE_NAME} means you've read, understood, and agreed to these Terms, our{" "}
        <a href="/privacy-policy">Privacy Policy</a>, and any other guidelines posted on the site. We may
        update these terms at any time; continued use after an update means you accept the revised terms.
      </p>

      <h2>Website Purpose</h2>
      <p>
        {SITE_NAME} publishes AI news, technology updates, software reviews, tutorials, and productivity
        guides, and hosts AI-powered tools to help readers with their digital workflows. Content is
        provided for informational and educational purposes; while we aim for accuracy, we don't
        guarantee completeness or reliability.
      </p>

      <h2>User Obligations</h2>
      <ul>
        <li>Use the site only for lawful purposes.</li>
        <li>Don't attempt unauthorized access to our servers, software, or data.</li>
        <li>Keep comments and contributions respectful, relevant, and free of spam or malware.</li>
        <li>Don't use our tools for illegal activity, automated scraping, or to disrupt the service for others.</li>
      </ul>

      <h2>Intellectual Property</h2>
      <p>
        All text, graphics, logos, and tool code on {SITE_URL} belong to {SITE_NAME} unless stated
        otherwise. You're welcome to share our content with attribution and a link back; reproducing our
        tools' logic or reselling our content without permission is prohibited.
      </p>

      <h2>Third-Party Links &amp; Ads</h2>
      <p>
        We may link to third-party sites and display ads (e.g. via Google AdSense). We're not responsible
        for third-party content, privacy practices, or products. {SITE_NAME} does not currently use
        affiliate links; if that changes, we'll update these terms accordingly.
      </p>

      <h2>Comments &amp; User Content</h2>
      <p>
        By posting a comment, you grant us a non-exclusive, royalty-free license to display it on the
        site. We may moderate, edit, or remove comments that violate our community standards (hate
        speech, spam, harassment, etc).
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        {SITE_NAME} and {SITE_OWNER_NAME} are not liable for any direct, indirect, incidental, or
        consequential damages arising from your use of, or inability to use, this site or its tools. The
        site is provided "as is" and "as available" without warranties of any kind.
      </p>

      <h2>Governing Law</h2>
      <p>
        These Terms are governed by the laws of {COUNTRY}. Disputes will first be handled through
        amicable negotiation, failing which they'll be subject to the competent courts having
        jurisdiction over {SITE_NAME}'s operations.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <LegalDraftNotice />
    </PageShell>
  );
}

export function DisclaimerPage() {
  return (
    <PageShell title="Disclaimer">
      <p>
        Welcome to {SITE_NAME} ({SITE_URL}). Before you dive into our tutorials, tools, or news updates,
        here are a few important notes about how we create content and what to keep in mind while using
        the site. By using {SITE_NAME}, you agree to the terms below.
      </p>

      <h2>Educational and Informational Purpose Only</h2>
      <p>
        Our AI news, tech updates, software reviews, and tutorials are created for general informational
        and educational purposes. They do not constitute professional technical, financial, or legal
        advice. Technology changes fast — what's a best practice today may be outdated tomorrow, and we
        can't guarantee that every step or code snippet will work perfectly on your specific setup. Any
        action you take based on our content is at your own risk; we recommend testing code or tool
        output in a safe environment before using it in production.
      </p>

      <h2>Interactive AI &amp; Productivity Tools</h2>
      <p>
        Our web tools and AI-powered utilities are provided "as-is" and "as-available," without
        warranties of any kind. We don't guarantee their output is error-free or suited to your specific
        needs — please review and fact-check anything generated before relying on it. We're not liable
        for temporary downtime, interruptions, or loss of unsaved input.
      </p>

      <h2>No Affiliate Links</h2>
      <p>
        {SITE_NAME} does not currently participate in affiliate marketing. Our software recommendations
        and reviews are editorial and based on our own assessment, not commission-driven.
      </p>

      <h2>No Sale of Personal Data</h2>
      <p>
        We don't sell, lease, rent, or trade your personal information to third parties. See our{" "}
        <a href="/privacy-policy">Privacy Policy</a> for details.
      </p>

      <h2>Comments &amp; User-Generated Content</h2>
      <p>
        Comments reflect the views of their individual authors, not {SITE_NAME}'s editorial team. We
        reserve the right to moderate, edit, or delete comments containing hate speech, spam, harassment,
        or malicious content. Please avoid posting sensitive personal information (passwords, API keys,
        phone numbers) in public comments.
      </p>

      <h2>External Links</h2>
      <p>
        Our articles link out to external sites, repositories, and documentation for convenience. We
        don't control or endorse the content, privacy practices, or safety of third-party sites — visit
        them at your own discretion.
      </p>

      <h2>Intellectual Property &amp; Fair Use</h2>
      <p>
        Original articles, graphics, and tool code on {SITE_NAME} are our intellectual property unless
        stated otherwise; you're welcome to share snippets with clear attribution and a link back. We may
        reference brand names, logos, or screenshots for educational reviews under fair use — trademarks
        belong to their respective owners.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, {SITE_NAME} and its contributors are not liable for any
        damages or losses arising from your access to, or inability to access, the site, your reliance on
        its content, or any bugs, downtime, or data loss encountered while using our tools.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or corrections? Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We
        aim to respond within 24–48 business hours.
      </p>

      <LegalDraftNotice />
    </PageShell>
  );
}

export function DmcaPolicyPage() {
  return (
    <PageShell title="DMCA Policy">
      <p>
        At {SITE_NAME} ({SITE_URL}), we respect the intellectual property rights of others and expect our
        users to do the same. This policy outlines how we handle claims of copyright infringement.
      </p>

      <h2>Reporting a Claim</h2>
      <p>
        If you believe your copyrighted work has been used on our site in a way that infringes your
        copyright, send a written notice to our designated contact including:
      </p>
      <ul>
        <li>Identification of the copyrighted work you claim has been infringed.</li>
        <li>The specific URL(s) of the material on our site.</li>
        <li>Your name, address, phone number, and email address.</li>
        <li>A statement that you have a good-faith belief the use isn't authorized by the copyright owner, its agent, or the law.</li>
        <li>A statement, under penalty of perjury, that the notice is accurate and that you're the copyright owner or authorized to act on their behalf.</li>
        <li>Your physical or electronic signature.</li>
      </ul>
      <p>
        Send notices to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the subject line
        "DMCA Notice of Infringement."
      </p>

      <h2>Our Response</h2>
      <ol>
        <li>We acknowledge receipt of a valid notice within 24–48 business hours.</li>
        <li>We promptly remove or disable access to the material identified as infringing.</li>
        <li>We take reasonable steps to notify the user who posted the material, if applicable.</li>
      </ol>

      <h2>Counter-Notification</h2>
      <p>
        If you believe your content was removed by mistake or misidentification, you may file a
        counter-notice including identification of the removed material, a good-faith statement under
        penalty of perjury, your contact details, and your signature.
      </p>

      <h2>Repeat Infringers</h2>
      <p>
        We reserve the right to restrict access for users found to be repeat infringers of copyrighted
        material, in accordance with applicable law.
      </p>

      <h2>Our Content Standards</h2>
      <p>
        Our own content is produced through in-house research, AI-assisted drafting, and editorial
        review. We don't scrape or republish others' content without permission, and we don't rely on
        automated, thin, or deceptive content.
      </p>

      <LegalDraftNotice />
    </PageShell>
  );
}
