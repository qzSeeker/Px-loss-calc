"use client";
// @ts-ignore React type declarations are missing in this project.
import { useState } from "react";
import { calculate, inr, type Inputs } from "@/lib/calc";

const DEFAULTS: Record<keyof Inputs, string> = {
  booking: "1299", charges: "146", credits: "60", creditValue: "1",
  commissionPct: "26", cancelFee: "0", creditsRefunded: "0",
};

const FIELDS: { key: keyof Inputs; label: string; hint?: string; prefix?: string }[] = [
  { key: "booking", label: "Booking amount", prefix: "₹" },
  { key: "charges", label: "Customer taxes and other charges", hint: "Paid by customer, not part of partner earnings", prefix: "₹" },
  { key: "credits", label: "Credits deducted for this job" },
  { key: "creditValue", label: "Value of 1 credit", hint: "Change if credits are not 1:1 with rupees", prefix: "₹" },
  { key: "commissionPct", label: "UC commission on booking amount", prefix: "%" },
  { key: "cancelFee", label: "Cancellation fee paid to partner", prefix: "₹" },
  { key: "creditsRefunded", label: "Credits refunded to partner" },
];

export default function Page() {
  const [raw, setRaw] = useState(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const inputs = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, parseFloat(v)])
  ) as Inputs;
  const r = calculate(inputs);
  const loss = r.cancelledNet < 0;

  const summary = [
    `Booking ${inr(inputs.booking || 0)} + charges ${inr(inputs.charges || 0)} = customer total ${inr(r.customerTotal)}`,
    `Credits deducted: ${inputs.credits || 0} (${inr(r.creditCost)}), refunded: ${inr(r.refund)}`,
    `If cancelled: partner ${loss ? "loss" : "net"} ${inr(r.cancelledNet)}`,
    loss ? `Compensation needed to make partner whole: ${inr(r.compensation)}` : "No compensation needed",
    `If completed: partner net ${inr(r.completedNet)} after ${inputs.commissionPct || 0}% commission (${inr(r.commission)})`,
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      <header className="mb-10 max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Partner cancellation calculator</h1>
        <p className="mt-3 text-neutral-600">
          Enter the booking details. See what the partner loses if the job cancels, and what they would earn if it completes.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <section aria-label="Booking details" className="space-y-5">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
            <span className="text-sm font-medium">{f.label}</span>
            {f.hint && <span className="block text-sm text-neutral-500">{f.hint}</span>}
            <div className="mt-1.5 flex items-center rounded-lg border border-neutral-300 transition-colors focus-within:border-black focus-within:ring-1 focus-within:ring-black">
              <span className="pl-3 text-neutral-500">{f.prefix ?? "#"}</span>
              <input
                type="number" inputMode="decimal" min={0} step="any"
                value={raw[f.key]}
                onChange={(e) => setRaw({ ...raw, [f.key]: e.target.value })}
                className="w-full rounded-lg bg-transparent px-2 py-2.5 outline-none focus:outline-none"
              />
            </div>
          </label>
          ))}
          <button onClick={() => setRaw(DEFAULTS)} className="text-sm underline underline-offset-4">
            Reset to example
          </button>
        </section>

        <section aria-live="polite" className="space-y-6">
          <div className={`rounded-2xl p-7 ${loss ? "bg-black text-white" : "border border-black"}`}>
            <p className="text-sm opacity-70">If the booking is cancelled</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">
              {loss ? "Loss " : "Net "}{inr(Math.abs(r.cancelledNet))}
            </p>
            <p className="mt-3 text-sm opacity-80">
              {loss
                ? `Partner paid ${inr(r.netCreditCost)} in credits and got ${inr(inputs.cancelFee || 0)} back. Compensate ${inr(r.compensation)} to make them whole.`
                : "Partner is not out of pocket on this cancellation."}
            </p>
          </div>

          <table className="w-full text-sm">
            <tbody className="divide-y divide-neutral-200">
              <Row k="Customer total" v={inr(r.customerTotal)} />
              <Row k="Credits spent" v={`-${inr(r.creditCost)}`} />
              <Row k="Credits refunded" v={`+${inr(r.refund)}`} />
              <Row k="Cancellation fee to partner" v={`+${inr(inputs.cancelFee || 0)}`} />
              <Row k="Partner net if cancelled" v={inr(r.cancelledNet)} bold />
              <Row k={`UC commission (${inputs.commissionPct || 0}% of booking)`} v={`-${inr(r.commission)}`} />
              <Row k="Partner net if completed" v={inr(r.completedNet)} bold />
              <Row k="Fee needed for zero loss on cancel" v={inr(r.breakEvenFee)} />
            </tbody>
          </table>

          <button onClick={copy} className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
            {copied ? "Copied" : "Copy summary for ticket"}
          </button>
        </section>
      </div>
    </main>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <tr className={bold ? "font-semibold" : ""}>
      <td className="py-3 pr-4">{k}</td>
      <td className="py-3 text-right tabular-nums">{v}</td>
    </tr>
  );
}
