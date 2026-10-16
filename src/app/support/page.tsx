import Link from "next/link";
import {buddyEnabled} from '@/lib/beta-buddy';
import {betaReadyLabel} from '@/components/BetaReadyLabel';
export default function SupportPage() {
  const beta=buddyEnabled();
  return <main className="p-8 max-w-xl mx-auto"><h1 className="text-2xl font-bold">Beta support</h1>
    {beta?<><p className="my-4">This is the isolated beta. Sign in, then use Beta Buddy to report a problem or read a repair update. Do not include client details, contracts or credentials.</p><p>Repair demonstration: <strong>{betaReadyLabel(true)}</strong></p><p className="my-4">This display is used for a controlled repair test. It does not mean the whole beta is ready. Reports outside the independently tested repair scope go to operator review.</p><Link className="underline" href="/login">Sign in to the beta</Link></>:<p className="my-4">A monitored support contact is not yet available. Do not submit private account information here. For account access, use password recovery.</p>}
    <p className="my-4"><Link className="underline" href="/forgot-password">Recover account access</Link></p><p><Link href="/">Return home</Link></p></main>;
}
