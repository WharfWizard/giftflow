import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 text-sm leading-relaxed">
      <Link href="/" className="text-xs text-navy underline">← Back to GiftFlow</Link>

      <h1 className="text-xl font-medium text-navy">Important Information</h1>
      <p className="text-xs text-[#5f5e5a]">GiftFlow™ — Academy of Life Planning Limited</p>

      <p><strong>What GiftFlow™ is</strong><br />
      GiftFlow™ is a record-keeping tool designed to help you track lifetime gifts, income and expenditure, tax
      year by tax year, in a structure that mirrors HMRC&apos;s IHT403 form. It is built to help you keep an
      organised, evidence-linked record — the kind an executor may later need — while the record is being made,
      rather than reconstructed afterwards.</p>

      <p>GiftFlow™ is designed to help you stay organised and keep good records. It does not decide whether a
      gift qualifies for exemption, and it does not determine what tax may be due.</p>

      <p><strong>What GiftFlow™ is not</strong></p>
      <ul className="list-disc pl-5 space-y-1">
        <li>GiftFlow™ is not a regulated financial planning service and does not constitute financial, tax, or
        legal advice under the Financial Services and Markets Act 2000.</li>
        <li>GiftFlow™ does not calculate Inheritance Tax liability, does not apply taper relief, and does not
        determine whether any gift qualifies for an exemption. These are matters for HMRC, and for your
        professional advisers, to determine based on your full circumstances.</li>
        <li>GiftFlow™ does not incorporate real-time updates for changes in UK tax legislation, exemption
        thresholds, or IHT rules. Figures such as the annual gift exemption and small gifts allowance should be
        verified against current HMRC guidance before you rely on them.</li>
      </ul>

      <p><strong>No AI-generated figures</strong><br />
      GiftFlow™ does not use AI to generate calculations, recommendations, or figures of any kind. Every total,
      balance, and summary shown in the app is calculated directly and only from the information you have
      entered. Nothing in GiftFlow™ is generated, estimated, or inferred by an AI model.</p>

      <p><strong>Estimates and unconfirmed figures</strong><br />
      Where GiftFlow™ shows a figure as estimated or unconfirmed, this reflects information you have not yet
      finalised — for example, income before a P60 or tax certificate has been received. These figures are
      clearly marked and should not be treated as confirmed until you have reviewed and confirmed them
      yourself.</p>

      <p><strong>When to seek professional advice</strong><br />
      For decisions involving whether a gift qualifies for an exemption, how Inheritance Tax may apply to your
      estate, or any matter requiring regulated advice, please consult a qualified professional — an accountant,
      solicitor, or a financial adviser authorised by the Financial Conduct Authority (FCA) as appropriate.</p>

      <p>GiftFlow™ can help you prepare clear, organised records for that conversation, and for an executor to
      use after your lifetime. It is not a substitute for professional advice, and it is not a substitute for
      HMRC&apos;s own determination of any tax due.</p>

      <p><strong>Data controller</strong><br />
      Academy of Life Planning Limited<br />
      Registered in England and Wales (Co. No. 8016568)<br />
      9 Franklin Way, Spilsby, Lincolnshire, PE23 5GG<br />
      ICO Registration: ZA502687<br />
      Contact: <a href="mailto:info@aolp.co" className="underline text-navy">info@aolp.co</a></p>

      <p className="text-xs text-[#5f5e5a] pt-2">Last updated: July 2026</p>

      <Link href="/" className="text-xs text-navy underline">← Back to GiftFlow</Link>
    </div>
  );
}
