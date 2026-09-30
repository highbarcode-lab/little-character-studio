(() => {
  'use strict';
  const form = document.getElementById('brief-form');
  const status = document.getElementById('form-status');
  const preview = document.getElementById('brief-preview');
  const previewText = document.getElementById('brief-text');
  if (!form || !status || !preview || !previewText) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const value = key => String(data.get(key) || '').trim();
    const brief = [
      'CHARACTER SOCIAL STARTER — DRAFT BRIEF',
      'This file was prepared locally in your browser. It was not sent or submitted.',
      '',
      `Brand or shop: ${value('brand')}`,
      `Main social platform: ${value('platform')}`,
      `Product and audience: ${value('offer')}`,
      `Character feeling and visual direction: ${value('direction')}`,
      `One short message or line: ${value('message') || '(not supplied)'}`,
      `Reference link: ${value('reference') || '(not supplied)'}`,
      'Permission to share supplied materials: confirmed by the person preparing this brief',
      '',
      'Proposed service: one character direction, three expression PNGs, one 10–15 second silent vertical illustrated cut-motion MP4, one thumbnail PNG, and one minor revision.',
      'Proposed Fiverr test price: US$150. Proposed timing: 7 calendar days after complete requirements, subject to the live order timer and confirmed scope.',
      'AI-assisted images are part of the process. No lip-sync, fluid animation, vector logo, exclusive rights guarantee, or trademark clearance is included.',
      '',
      'Next: review this brief and confirm scope and a simple scene outline in the approved ordering channel before any order starts.'
    ].join('\n');

    const safeName = value('brand').normalize('NFKD').replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'brand';
    previewText.value = brief;
    preview.hidden = false;
    const url = URL.createObjectURL(new Blob([brief], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName.toLowerCase()}-character-brief.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Brief prepared below. A download was requested; if your browser blocked it, you can copy the text. Nothing was sent or ordered.';
  });
})();
