/**
 * Page transition. Pure CSS (see .page-in in globals.css): the page is visible from the first paint instead of
 * waiting for JavaScript to hydrate, which keeps Largest Contentful Paint fast.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
