/** Route-transition skeleton: the page's modules, breathing, so a slow network never shows a blank. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-48" />
      <div className="skeleton mt-5 h-10 w-full max-w-xl" />
      <div className="skeleton mt-3 h-5 w-full max-w-lg" />
      <div className="module mt-8 grid gap-6 p-5 sm:p-8 lg:grid-cols-[5fr_7fr]">
        <div className="space-y-4">
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
        </div>
        <div className="space-y-3">
          <div className="skeleton h-36 rounded-[22px]" />
          <div className="grid grid-cols-2 gap-2.5">
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
