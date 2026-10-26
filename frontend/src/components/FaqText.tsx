/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router';
import { parseFaqText, type FaqInline } from '../utils/faqText';

const LINK = 'font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 [overflow-wrap:anywhere]';

const Inline: React.FC<{ parts: FaqInline[] }> = ({ parts }) => (
  <>
    {parts.map((part, index) => {
      if (part.kind === 'break') return <br key={index} />;
      if (part.kind === 'bold') return <strong key={index} className="font-bold text-slate-900">{part.text}</strong>;
      if (part.kind === 'link') {
        return part.internal ? (
          <Link key={index} to={part.href} className={LINK}>{part.text}</Link>
        ) : (
          <a key={index} href={part.href} className={LINK} target="_blank" rel="noopener noreferrer">{part.text}</a>
        );
      }
      return <React.Fragment key={index}>{part.text}</React.Fragment>;
    })}
  </>
);

/** An FAQ answer with its light formatting. Never renders raw HTML. */
export const FaqText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {parseFaqText(text).map((block, index) =>
      block.kind === 'list' ? (
        <ul key={index} className="list-disc space-y-1 pl-5">
          {block.items.map((item, itemIndex) => <li key={itemIndex}><Inline parts={item} /></li>)}
        </ul>
      ) : (
        <p key={index}><Inline parts={block.parts} /></p>
      ),
    )}
  </div>
);
