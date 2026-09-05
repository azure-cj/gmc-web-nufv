import React from "react";

export default function PublicFooter() {
  return (
    <footer className="mt-16 w-full rounded-[2rem] border border-[#2C4368]/20 bg-[#102040] text-slate-300 shadow-xl overflow-hidden">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* About Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#E0C07A]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-[#E0C07A]">
                About the System
              </h3>
            </div>
            <p className="text-xs leading-6 text-slate-300 sm:text-sm">
              The NU Fairview Good Moral Certificate Online Request System exists to help
              students request and receive their official certificates faster and more
              conveniently than the traditional in-person process. It reduces wait times and
              paperwork while keeping the Student Discipline Office&apos;s thorough review and
              verification process fully intact.
            </p>
          </div>

          {/* Contact Info Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#E0C07A]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-[#E0C07A]">
                Contact Info
              </h3>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-xs text-slate-300 sm:text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Email
                </dt>
                <dd className="mt-0.5">
                  <a
                    href="mailto:sdo@nu-fairview.edu.ph"
                    className="transition hover:text-[#E0C07A] underline decoration-slate-600 underline-offset-2"
                  >
                    sdo@nu-fairview.edu.ph
                  </a>
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Location
                </dt>
                <dd className="mt-0.5">
                  Student Discipline Office, 2nd Floor
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Office Hours
                </dt>
                <dd className="mt-0.5">
                  M-F 8:00 AM - 5:00 PM<br />
                  Saturday: 8:00 AM - 12:00 PM
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Bottom Closing Line */}
        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <p className="text-xs font-medium tracking-wide text-slate-400">
            Crafted for NU Fairview by C.J.V. Aureo.
          </p>
        </div>
      </div>
    </footer>
  );
}
