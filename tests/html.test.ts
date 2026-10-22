import { describe, expect, test } from 'vitest';
import { autop, extractImages, htmlToMarkdown, rewriteUploadUrls, stripImages } from '../scripts/lib/html';

const UP = 'https://olegs.be/wp-content/uploads';

describe('extractImages', () => {
  test('ordered upload paths, size suffix stripped', () => {
    expect(
      extractImages(`<img src="${UP}/2012/08/a-768x512.jpg"><img src="${UP}/2012/08/b.jpg">`),
    ).toEqual(['2012/08/a.jpg', '2012/08/b.jpg']);
  });

  test('skips non-uploads, keeps duplicates', () => {
    expect(
      extractImages(
        `<img src="https://example.com/x.jpg"><img class="x" src="${UP}/2012/08/a.jpg" alt="q"><img src='${UP}/2012/08/a-300x200.jpg'>`,
      ),
    ).toEqual(['2012/08/a.jpg', '2012/08/a.jpg']);
  });
});

describe('stripImages', () => {
  test('removes img tags and clearfix separators', () => {
    expect(
      stripImages(`Text <img src="${UP}/2012/08/a.jpg" alt="x" /> more<div class="clearfix"></div>\n<img src="y.jpg">end`),
    ).toBe('Text  more\nend');
  });
});

describe('rewriteUploadUrls', () => {
  test('img src becomes the 960 jpg variant', () => {
    expect(rewriteUploadUrls('<img src="http://olegs.be/wp-content/uploads/2016/05/c-1024x683.jpg">')).toContain(
      'https://img.olegs.be/uploads/2016/05/c-960.jpg',
    );
  });

  test('a href to an upload becomes the original', () => {
    expect(rewriteUploadUrls(`<a href="${UP}/2016/05/c-1024x683.jpg"><img src="${UP}/2016/05/c-1024x683.jpg"></a>`)).toBe(
      '<a href="https://img.olegs.be/uploads/2016/05/c.jpg"><img src="https://img.olegs.be/uploads/2016/05/c-960.jpg"></a>',
    );
  });

  test('everything else is untouched', () => {
    const html = '<a href="https://example.com/x.jpg"><img src="https://example.com/x.jpg"></a><a href="https://olegs.be/about">a</a>';
    expect(rewriteUploadUrls(html)).toBe(html);
  });
});

describe('autop', () => {
  test('wraps text chunks in p, keeps block chunks', () => {
    expect(autop('Ciao\n\n<h2>T</h2>\n<ul>\n\t<li>L</li>\n</ul>\n\nFine')).toBe(
      '<p>Ciao</p>\n\n<h2>T</h2>\n<ul>\n\t<li>L</li>\n</ul>\n\n<p>Fine</p>',
    );
  });

  test('inline-starting chunks are wrapped, embeds are not', () => {
    expect(autop('<strong>Hi</strong> there\n\n<iframe src="x"></iframe>\n\n<script src="y"></script>')).toBe(
      '<p><strong>Hi</strong> there</p>\n\n<iframe src="x"></iframe>\n\n<script src="y"></script>',
    );
  });

  test('blank-looking lines with whitespace also split', () => {
    expect(autop('A\n  \nB')).toBe('<p>A</p>\n\n<p>B</p>');
  });
});

describe('htmlToMarkdown', () => {
  test('headings and lists', () => {
    expect(htmlToMarkdown('Ciao\n\n<h2>T</h2>\n<ul>\n\t<li><a href="https://x">L</a></li>\n</ul>')).toBe(
      'Ciao\n\n## T\n\n- [L](https://x)',
    );
  });

  test('blank-line separated text becomes paragraphs', () => {
    expect(htmlToMarkdown('Primo paragrafo.\n\nSecondo <strong>paragrafo</strong>.')).toBe(
      'Primo paragrafo.\n\nSecondo **paragrafo**.',
    );
  });

  test('emphasis uses asterisks', () => {
    expect(htmlToMarkdown('Un <em>po</em>.')).toBe('Un *po*.');
  });

  test('iframe survives verbatim', () => {
    expect(htmlToMarkdown('<iframe src="https://www.youtube.com/embed/x"></iframe>')).toContain(
      '<iframe src="https://www.youtube.com/embed/x"></iframe>',
    );
  });

  test('script survives', () => {
    expect(htmlToMarkdown('<script src="https://gist.github.com/x.js"></script>')).toContain('<script src=');
  });

  test('gfm strikethrough and tables', () => {
    expect(htmlToMarkdown('Via <del>questo</del>.')).toBe('Via ~questo~.');
    expect(
      htmlToMarkdown('<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>'),
    ).toBe('| A | B |\n| --- | --- |\n| 1 | 2 |');
  });

  test('does not touch URLs', () => {
    expect(htmlToMarkdown(`<a href="${UP}/2012/08/a.jpg">x</a>`)).toBe(`[x](${UP}/2012/08/a.jpg)`);
  });
});

describe('htmlToMarkdown lists', () => {
  test('ordered and nested lists', () => {
    expect(htmlToMarkdown('<ol><li>Uno</li><li>Due</li></ol>')).toBe('1. Uno\n2. Due');
    expect(htmlToMarkdown('<ul><li>A<ul><li>B</li></ul></li><li>C</li></ul>')).toBe('- A\n  - B\n- C');
  });
});

describe('raw-text blocks pass through untouched', () => {
  test('autop keeps blank lines inside pre', () => {
    expect(autop('<pre>a\n\nb</pre>')).toBe('<pre>a\n\nb</pre>');
    expect(autop('Intro\n\n<pre>a\n\nb</pre>\n\nOutro')).toBe('<p>Intro</p>\n\n<pre>a\n\nb</pre>\n\n<p>Outro</p>');
  });

  test('autop keeps blank lines inside script', () => {
    const script = '<script>\nvar a=1;\n\nvar b=2;\n</script>';
    expect(autop(script)).toBe(script);
  });

  test('htmlToMarkdown keeps every line of a code block', () => {
    expect(htmlToMarkdown('<pre><code>a\n\nb</code></pre>')).toBe('```\na\n\nb\n```');
  });

  test('htmlToMarkdown keeps script content byte for byte', () => {
    const script = '<script>\nvar a=1;\n\nvar b=2;\n</script>';
    expect(htmlToMarkdown(script)).toBe(script);
    expect(htmlToMarkdown(`Prima\n\n${script}\n\nDopo`)).toBe(`Prima\n\n${script}\n\nDopo`);
  });

  test('blank-line runs inside fenced code are not collapsed', () => {
    expect(htmlToMarkdown('<pre><code>a\n\n\n\nb</code></pre>')).toBe('```\na\n\n\n\nb\n```');
    expect(htmlToMarkdown('<script>\nx\n\n\n\ny\n</script>')).toBe('<script>\nx\n\n\n\ny\n</script>');
  });
});

describe('list indentation follows the marker width', () => {
  test('ul inside ol', () => {
    expect(htmlToMarkdown('<ol><li>A<ul><li>B</li></ul></li><li>C</li></ol>')).toBe('1. A\n   - B\n2. C');
  });

  test('ol inside ol', () => {
    expect(htmlToMarkdown('<ol><li>A<ol><li>B</li></ol></li><li>C</li></ol>')).toBe('1. A\n   1. B\n2. C');
  });

  test('two-digit markers indent by four', () => {
    expect(htmlToMarkdown('<ol start="10"><li>A<ul><li>B</li></ul></li></ol>')).toBe('10. A\n    - B');
  });

  test('multi-paragraph list item', () => {
    expect(htmlToMarkdown('<ol><li><p>A</p><p>B</p></li><li><p>C</p></li></ol>')).toBe('1. A\n\n   B\n\n2. C');
    expect(htmlToMarkdown('<ul><li><p>A</p><p>B</p></li></ul>')).toBe('- A\n\n  B');
  });
});
