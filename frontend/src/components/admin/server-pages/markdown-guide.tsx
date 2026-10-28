import type { ReactNode } from "react"

function Sample({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs leading-5 text-slate-200">{children}</pre>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-b border-white/10 py-2 last:border-b-0">
      <summary className="cursor-pointer list-none font-semibold text-slate-100 [&::-webkit-details-marker]:hidden">
        <span className="mr-2 text-slate-500 group-open:text-[#F042FA]">▸</span>
        {title}
      </summary>
      <div className="space-y-3 pb-2 pl-5 pt-2 text-sm leading-6 text-slate-400">{children}</div>
    </details>
  )
}

export function MarkdownGuide() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <details>
        <summary className="cursor-pointer px-4 py-3 font-semibold text-slate-100">Markdown reference</summary>
        <div className="max-h-[32rem] overflow-auto px-4 pb-4">
          <Section title="Headings">
            <Sample>{`# Overview
## Features
### Permissions
#### Command options
##### Additional details
###### Small heading`}</Sample>
            <p>Put a space after the # characters. On the published page, click a level 1 or 2 heading to put its link in the address bar.</p>
            <p>You can also put === beneath a line for a level 1 heading, or --- for level 2.</p>
          </Section>

          <Section title="Text formatting">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-200">
                    <th className="py-1 pr-4 font-semibold">Write</th>
                    <th className="py-1 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="py-1 pr-4 font-mono">**Custom presets** or __Custom presets__</td><td>Custom presets</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">*Optional setting* or _Optional setting_</td><td><em>Optional setting</em></td></tr>
                  <tr><td className="py-1 pr-4 font-mono">***Important*** or ___Important___</td><td><strong><em>Important</em></strong></td></tr>
                  <tr><td className="py-1 pr-4 font-mono">~~Old command~~</td><td><s>Old command</s></td></tr>
                  <tr><td className="py-1 pr-4 font-mono">**Bold with *italic* inside**</td><td><strong>Bold with <em>italic</em> inside</strong></td></tr>
                  <tr><td className="py-1 pr-4 font-mono">`example.use`</td><td><code>example.use</code></td></tr>
                </tbody>
              </table>
            </div>
            <p>To include a backtick inside inline code, use two around it: ``Use `reload` here``.</p>
          </Section>

          <Section title="Paragraphs and line breaks">
            <p>Leave a blank line between paragraphs. A single newline produces a line break. In this box, Enter does that. Two trailing spaces or a backslash at the end of a line also create a line break.</p>
            <Sample>{`A short description of what the product does.

A separate paragraph explaining how players use it.

First line.
Second line.`}</Sample>
          </Section>

          <Section title="Lists">
            <Sample>{`Features
- Custom presets
- Permission groups
  - Default players
  - VIP players
    - Separate limits`}</Sample>
            <p>* and + also work as bullet markers. Indent to nest items.</p>
            <Sample>{`Installation steps
1. Upload the plugin.
2. Edit the configuration.
   - Set the default limit.
   - Choose the enabled features.
3. Grant the required permissions.`}</Sample>
            <p>1) also works. Start with 3. or 3) to begin at three.</p>
            <p>For another paragraph within an item, leave a blank line and indent the paragraph under its text:</p>
            <Sample>{`- Upload the plugin.

  Keep the original filename.
- Edit the configuration.`}</Sample>
          </Section>

          <Section title="Checklists">
            <Sample>{`- [x] Configuration examples included
- [x] Permissions documented
- [ ] Additional presets planned`}</Sample>
            <p>Use [ ] for incomplete and [x] or [X] for complete. These are display-only markers.</p>
          </Section>

          <Section title="Quotes">
            <Sample>{`> **Configuration**
>
> Save your changes before reloading the plugin.
>
> > Keep a copy of your previous settings.`}</Sample>
            <p>Use &gt; for a quote and &gt;&gt; for a nested quote. Quotes can contain lists and other Markdown.</p>
          </Section>

          <Section title="Links">
            <Sample>{`[Documentation](https://example.com/docs)
[Documentation](https://example.com/docs "Setup guide")
[Jump to code blocks](#code-blocks)
[Email support](mailto:creator@example.com)`}</Sample>
            <p>Full URLs and email addresses also become links on their own or inside angle brackets: &lt;https://codefling.com&gt; and &lt;creator@example.com&gt;.</p>
            <p>For links you reuse, put the URL in a reference definition:</p>
            <Sample>{`[Documentation][docs]
[Support][]
[Changelog]

[docs]: https://example.com/docs "Setup guide"
[Support]: https://example.com/support
[Changelog]: https://example.com/changelog`}</Sample>
          </Section>

          <Section title="Images">
            <p>Use a direct image URL. The text in brackets describes the image. The title is optional.</p>
            <Sample>{`![Settings menu](https://example.com/settings.png "Settings preview")`}</Sample>
            <p>Make an image clickable:</p>
            <Sample>{`[![View the gallery](https://example.com/preview.png)](https://example.com/gallery)`}</Sample>
            <p>Reference images work too:</p>
            <Sample>{`![Settings menu][preview]

[preview]: https://example.com/settings.png "Settings preview"`}</Sample>
          </Section>

          <Section title="Code blocks">
            <p>Put three backticks and a language on their own line. Close with three backticks on another line.</p>
            <Sample>{`\`\`\`cs
Puts("Plugin loaded.");
\`\`\`

\`\`\`json
{
    "Enabled": true,
    "Cooldown": 30
}
\`\`\``}</Sample>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-200">
                    <th className="py-1 pr-4 font-semibold">Language</th>
                    <th className="py-1 font-semibold">Labels</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["C#", "cs, csharp, c#"],
                    ["C / C++", "c, cpp, c++"],
                    ["JSON", "json"],
                    ["JavaScript", "javascript, js"],
                    ["TypeScript", "typescript, ts"],
                    ["Python", "python, py"],
                    ["Ruby", "ruby, rb"],
                    ["PHP", "php"],
                    ["CSS", "css"],
                    ["HTML", "html"],
                    ["XML", "xml"],
                    ["SQL", "sql"],
                    ["Lua", "lua"],
                    ["Swift", "swift"],
                    ["Perl", "perl"],
                    ["LaTeX", "latex"],
                    ["Plain text", "text, txt, plain, plaintext"],
                    ["Automatic highlighting", "auto or no label"],
                  ].map(([language, labels]) => (
                    <tr key={language}><td className="py-1 pr-4">{language}</td><td className="font-mono">{labels}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>~~~ also works as a fence. Use a longer fence when the example contains shorter fences. After a blank line, four leading spaces or a tab creates an indented code block.</p>
          </Section>

          <Section title="Tables">
            <Sample>{`| Feature | Status | Limit |
| :--- | :---: | ---: |
| Presets | Included | 5 |
| Permission groups | Included | 10 |
| Custom messages | Optional | 20 |`}</Sample>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-200">
                    <th className="py-1 pr-4 font-semibold">Alignment</th>
                    <th className="py-1 font-semibold">Separator</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="py-1 pr-4">Left</td><td className="font-mono">:---</td></tr>
                  <tr><td className="py-1 pr-4">Center</td><td className="font-mono">:---:</td></tr>
                  <tr><td className="py-1 pr-4">Right</td><td className="font-mono">---:</td></tr>
                  <tr><td className="py-1 pr-4">Default</td><td className="font-mono">---</td></tr>
                </tbody>
              </table>
            </div>
            <p>Cells support bold, italic, strikethrough, inline code, and links. Escape a literal pipe as \|, including inside inline code in a cell. The outside | characters are optional.</p>
          </Section>

          <Section title="Callouts and spoilers">
            <p>Put the opener and closing ::: on separate lines. Markdown works inside each box.</p>
            <Sample>{`::: warning
**Back up your configuration** before updating.
:::`}</Sample>
            <p><strong className="text-slate-200">Note</strong> — ::: note — usage notes, included files, and configuration details.</p>
            <p><strong className="text-slate-200">Tip</strong> — ::: tip — shortcuts and recommended settings.</p>
            <p><strong className="text-slate-200">Warning</strong> — ::: warning — breaking changes or setup steps readers must follow.</p>
            <p><strong className="text-slate-200">Spoiler</strong> — ::: spoiler for details readers can expand. The summary reads “Reveal hidden contents” unless you add a title after the type.</p>
            <p>For nested boxes, use more colons around the outer box:</p>
            <Sample>{`:::: note
**Optional setup**

::: tip
Keep separate presets for each permission group.
:::
::::`}</Sample>
          </Section>

          <Section title="Dividers">
            <p>Leave a blank line on either side. *** and ___ also create dividers.</p>
            <Sample>{`Features and overview.

---

Installation and configuration.`}</Sample>
          </Section>

          <Section title="Footnotes">
            <Sample>{`Add extra detail without interrupting the main description.[^1]

Includes five presets.[^presets]

[^1]: Extra detail.
[^presets]: Each preset can be edited separately.`}</Sample>
            <p>Reuse [^presets] to link to the same note. For a note written directly in the sentence:</p>
            <Sample>{`Optional logging.^[Disabled by default.]`}</Sample>
            <p>A footnote can contain multiple paragraphs. Indent each additional paragraph by four spaces.</p>
          </Section>

          <Section title="Literal characters">
            <p>Put a backslash before Markdown punctuation to display it normally:</p>
            <Sample>{`\\*Visible asterisks\\*
\\# Not a heading
\\[Not a link\\]
\\\`Not inline code\\\`
\\\\`}</Sample>
            <p>Character entities work too: &amp;copy; becomes ©, &amp;amp; becomes &amp;, and &amp;#128512; or &amp;#x1F600; becomes an emoji. Raw HTML is displayed as text.</p>
          </Section>
        </div>
      </details>
    </div>
  )
}
