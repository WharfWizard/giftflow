import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 text-sm leading-relaxed">
      <Link href="/" className="text-xs text-navy underline">← Back to GiftFlow</Link>

      <h1 className="text-xl font-medium text-navy">Privacy Notice</h1>
      <p className="text-xs text-[#5f5e5a]">Academy of Life Planning Limited</p>

      <h2 className="text-base font-medium text-navy pt-2">General Privacy Notice</h2>

      <p><strong>Who we are</strong><br />
      Academy of Life Planning Limited, registered in England and Wales (Company No. 8016568)<br />
      9 Franklin Way, Spilsby, Lincolnshire, PE23 5GG<br />
      ICO Registration: ZA502687<br />
      Contact: <a href="mailto:info@aolp.co" className="underline text-navy">info@aolp.co</a></p>

      <p><strong>Data we collect and how we use it</strong><br />
      We collect personal data that you provide directly to us when using our services, including name, contact
      details, and financial information. We use this data to provide our life planning services, communicate
      with you, and improve our offerings.</p>

      <p><strong>Legal basis for processing</strong><br />
      We process your personal data on the basis of your consent, the performance of a contract, and our
      legitimate interests in providing financial planning education services.</p>

      <p><strong>Your rights under UK GDPR</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Right of access — request a copy of your personal data</li>
        <li>Right to rectification — request correction of inaccurate data</li>
        <li>Right to erasure — request deletion of your data</li>
        <li>Right to data portability — receive your data in a machine-readable format</li>
        <li>Right to object — object to certain types of processing</li>
        <li>Right to complain — lodge a complaint with the ICO at ico.org.uk</li>
      </ul>

      <p><strong>How to exercise your rights</strong><br />
      Contact us at <a href="mailto:info@aolp.co" className="underline text-navy">info@aolp.co</a> to exercise
      any of your data rights. We will respond within 30 days.</p>

      <hr className="border-[#e5e0d3]" />

      <h2 className="text-base font-medium text-navy pt-2">GiftFlow™ Specific Privacy Information</h2>
      <p>When you use GiftFlow™, the following applies.</p>

      <p><strong>Data storage</strong><br />
      Your household record is stored as a file on your own device, in the location you choose. Academy of Life
      Planning does not store your gift, income, or expenditure data on our servers, and this data is never
      transmitted to us as part of normal use of the app.</p>

      <p>You may choose to protect this file with a password. If you do, the file is encrypted on your device
      before it is saved; the password itself is never stored or transmitted anywhere, including to us. If it is
      lost, the file cannot be recovered — we hold no copy and no means of resetting it.</p>

      <p><strong>No AI processing of your data</strong><br />
      Unlike some other Academy of Life Planning tools, GiftFlow™ does not currently send your data to any AI
      model, including Claude by Anthropic, or to any other third party. Every figure shown in GiftFlow™ is
      calculated directly from what you enter, on your own device. If this changes in a future version, this
      notice will be updated in advance and the change will be made clear within the app itself.</p>

      <p><strong>Data you enter</strong><br />
      Names of household members and gift recipients, dates of birth, financial information including income,
      expenditure, gift values and pension or account details, and family relationships. This constitutes
      sensitive personal data under UK GDPR, and it is handled accordingly — it never leaves your device through
      normal use of the app.</p>

      <p><strong>Sharing your data</strong><br />
      GiftFlow™ does not share your data with anyone automatically. If you choose to export or download a copy
      of your household file, or share it with a family member, executor, or professional adviser, that sharing
      is done entirely by you, outside the app, using channels of your own choosing.</p>

      <p><strong>Your rights</strong><br />
      You may edit or delete any entry within GiftFlow™ at any time. Because your data is stored in a file under
      your own control, you may also delete that file directly from your device whenever you choose — this
      removes your GiftFlow™ data completely, since no copy exists anywhere else. For any other data rights
      requests, please contact <a href="mailto:info@aolp.co" className="underline text-navy">info@aolp.co</a>.</p>

      <p className="text-xs text-[#5f5e5a] pt-2">Last updated: July 2026</p>

      <Link href="/" className="text-xs text-navy underline">← Back to GiftFlow</Link>
    </div>
  );
}
