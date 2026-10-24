import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="site-container flex min-h-[70vh] flex-col justify-center pt-24">
      <p className="eyebrow">404</p>
      <h1 className="display-lg mt-4">This page could not be found.</h1>
      <Link href="/artworks" className="link-underline mt-8 w-fit text-[12px] font-medium uppercase tracking-[0.22em]">Browse the works</Link>
    </div>
  );
}
