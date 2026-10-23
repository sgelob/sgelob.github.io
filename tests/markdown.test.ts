import { expect, test } from 'vitest';
import { renderInline } from '../src/lib/markdown';

test('plain text passes through', () => { expect(renderInline('Lying – Sam Harris')).toBe('Lying – Sam Harris'); });
test('link', () => { expect(renderInline('[Miro](https://miro.com/?a=1&b=2) – Online')).toBe('<a href="https://miro.com/?a=1&amp;b=2">Miro</a> – Online'); });
test('italic', () => { expect(renderInline('Rework – *Jason Fried*')).toBe('Rework – <em>Jason Fried</em>'); });
test('bold', () => { expect(renderInline('**Get in touch** now')).toBe('<strong>Get in touch</strong> now'); });
test('ampersand and angle brackets are escaped', () => { expect(renderInline('UX & <Product>')).toBe('UX &amp; &lt;Product&gt;'); });
test('an escaped asterisk stays literal', () => { expect(renderInline('Giving a F\\*ck – *Mark Manson*')).toBe('Giving a F*ck – <em>Mark Manson</em>'); });
test('italic inside a link label and a link inside bold', () => {
  expect(renderInline('**[Get in touch](mailto:a@b.c) now**')).toBe('<strong><a href="mailto:a@b.c">Get in touch</a> now</strong>');
});
test('only web, mail, site and anchor links become links; other schemes keep their text', () => {
  expect(renderInline('[a](https://x.org) [b](http://x.org) [c](mailto:a@b.c) [d](/books/) [e](#top)')).toBe('<a href="https://x.org">a</a> <a href="http://x.org">b</a> <a href="mailto:a@b.c">c</a> <a href="/books/">d</a> <a href="#top">e</a>');
  expect(renderInline('[click](javascript:alert%281%29)')).toBe('click');
  expect(renderInline('[x](data:text/html,hi)')).toBe('x');
  expect(renderInline('[x](JavaScript:void)')).toBe('x');
  expect(renderInline('[x](//evil.example/)')).toBe('x'); // protocol-relative: not a site path
});
