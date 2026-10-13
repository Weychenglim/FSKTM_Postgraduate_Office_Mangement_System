/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A letter laid out on A4 sheets, scaled to fit the space it is shown in. A
// letter too long for one sheet continues on the next, as it would in print.

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { LETTERHEAD } from '../utils/letterDocument';
import { A4_CONTENT_WIDTH, A4_PAGE, paginateBlocks, splitLetterBlocks } from '../utils/letterPages';

interface LetterPagesProps {
  /** What "Our Ref" shows; the plain reference goes in each page footer. */
  reference: React.ReactNode;
  referenceText: string;
  date: string;
  /** Letter body already rendered with renderLetterBodyHtml. */
  bodyHtml: string;
  /** 1 fits the page to the width available; above 1 zooms in. */
  zoom?: number;
}

const Letterhead: React.FC = () => (
  <div className="border-b-2 border-double border-slate-800 pb-4 mb-7 flex items-center justify-between gap-6">
    <div className="flex items-center gap-4">
      <img src={LETTERHEAD.logoPath} alt="Universiti Malaya" className="h-[45px] w-auto object-contain" />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight block max-w-[170px]">
        {LETTERHEAD.faculty}
      </span>
    </div>
    <div className="text-right text-[10px] font-bold text-slate-400 leading-relaxed">
      {LETTERHEAD.addressLines.map((line) => (
        <span key={line} className="block">{line}</span>
      ))}
    </div>
  </div>
);

const Signature: React.FC = () => (
  <div className="pt-12">
    <div className="w-40 border-b border-slate-400 h-6" />
    <p className="mt-2 font-extrabold text-[14px] text-slate-900">{LETTERHEAD.signatoryName}</p>
    <p className="text-slate-400 uppercase tracking-wide text-[10px] font-black leading-none mt-1">{LETTERHEAD.signatoryOffice}</p>
    <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600">
      <Info aria-hidden="true" className="w-3 h-3" />
      Computer-generated. Verify with the PG Office.
    </p>
  </div>
);

export const LetterPages: React.FC<LetterPagesProps> = ({ reference, referenceText, date, bodyHtml, zoom = 1 }) => {
  const frame = useRef<HTMLDivElement>(null);
  const measurer = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(A4_PAGE.width);
  const [pages, setPages] = useState<number[][] | null>(null);

  const bodyBlocks = splitLetterBlocks(bodyHtml);
  const blocks: React.ReactNode[] = [
    <Letterhead key="letterhead" />,
    <div key="reference" className="flex flex-wrap justify-between items-baseline gap-x-6 gap-y-1 text-slate-600 mb-7">
      <div>Our Ref: <span className="font-mono font-bold text-slate-800">{reference}</span></div>
      <div>Date: <span className="font-bold text-slate-800">{date}</span></div>
    </div>,
    ...bodyBlocks.map((html, index) => <div key={`body-${index}`} dangerouslySetInnerHTML={{ __html: html }} />),
    <p key="disclaimer" className="text-slate-500 font-semibold text-[11.5px] leading-relaxed mt-2">{LETTERHEAD.disclaimer}</p>,
    <Signature key="signature" />,
  ];

  // Heights come from an unscaled, hidden copy of the content.
  const measure = useCallback(() => {
    const items = measurer.current?.children;
    if (!items) return;
    const heights = Array.from(items).map((item) => (item as HTMLElement).offsetHeight);
    setPages(paginateBlocks(heights));
  }, []);

  useLayoutEffect(() => {
    measure();
    let active = true;
    document.fonts?.ready.then(() => { if (active) measure(); });
    return () => { active = false; };
  }, [measure, bodyHtml, referenceText, date]);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const update = () => setWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(1, width / A4_PAGE.width) * zoom;
  const pageGroups = pages ?? [blocks.map((_, index) => index)];
  const contentClass = 'font-sans text-[14px] leading-[1.6] text-slate-700 text-left';

  return (
    <div ref={frame} className="relative w-full overflow-x-auto">
      {/* Hidden copy used only to measure each block at full size. */}
      <div
        ref={measurer}
        aria-hidden="true"
        className={`${contentClass} absolute -left-[10000px] top-0 invisible`}
        style={{ width: A4_CONTENT_WIDTH }}
      >
        {blocks.map((block, index) => (
          <div key={index} className="flow-root">{block}</div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4" style={{ minWidth: A4_PAGE.width * scale }}>
        {pageGroups.map((group, pageIndex) => (
          <section
            key={pageIndex}
            aria-label={`Page ${pageIndex + 1} of ${pageGroups.length}`}
            className="relative shrink-0 bg-white border border-slate-200 shadow-sm"
            style={{ width: A4_PAGE.width * scale, height: A4_PAGE.height * scale }}
          >
            <div
              className={`absolute left-0 top-0 ${contentClass}`}
              style={{
                width: A4_PAGE.width,
                height: A4_PAGE.height,
                padding: `${A4_PAGE.marginY}px ${A4_PAGE.marginX}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              {pageIndex > 0 && (
                <p className="text-[11px] font-semibold text-slate-400" style={{ height: A4_PAGE.continuation }}>
                  Our Ref: <span className="font-mono">{referenceText}</span> (continued)
                </p>
              )}
              {group.map((index) => (
                <div key={index} className="flow-root">{blocks[index]}</div>
              ))}
              <p
                className="absolute text-[10.5px] font-semibold text-slate-400 flex justify-between"
                style={{ left: A4_PAGE.marginX, right: A4_PAGE.marginX, bottom: A4_PAGE.marginY / 2 }}
              >
                <span className="font-mono">{referenceText}</span>
                <span>Page {pageIndex + 1} of {pageGroups.length}</span>
              </p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
