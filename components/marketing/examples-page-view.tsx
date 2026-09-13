"use client";

// Public /examples page. The "what it looks like" companion to /docs and
// the learn library: short, concrete moments where one shared file changes the
// answer, grouped by the kind of work and life they fit (professional lanes
// first, everyday and health last). Reuses the /docs worktable index: a sticky
// chapter list with collapsible groups, scrollspy, and a one-open-at-a-time
// accordion (useOpenSections). Every group holds the same number of cards.
// Content is first-party constant data; each example anchors an index item.

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteNav,
  useStrapSiteCta,
} from "@/components/marketing/strap-site-shell";
import { useOpenSections } from "@/components/marketing/use-open-sections";
import { cn } from "@/lib/utils";

type Example = {
  group: string;
  id: string;
  label: string;
  title: string;
  scenario: string;
};

type ExampleGroup = {
  slug: string;
  name: string;
  intro: string;
  tone: "context" | "skills" | "secrets" | "environments" | "agents";
};

// Professional lanes lead; everyday and health and safety sit at the bottom.
const groups: ExampleGroup[] = [
  {
    slug: "builders",
    name: "Builders",
    intro: "Your stack and standards, carried across every coding agent.",
    tone: "context",
  },
  {
    slug: "writers",
    name: "Writers",
    intro: "One voice, in every tool you write with.",
    tone: "skills",
  },
  {
    slug: "researchers",
    name: "Researchers",
    intro: "The rules of your field, applied without a reminder.",
    tone: "secrets",
  },
  {
    slug: "operators",
    name: "Operators",
    intro: "How you decide and communicate, read before any draft.",
    tone: "environments",
  },
  {
    slug: "ownership",
    name: "Ownership",
    intro: "Plain Markdown you own, portable across tools and providers.",
    tone: "agents",
  },
  {
    slug: "boundaries",
    name: "Boundaries",
    intro:
      "Lines an agent reads first and never crosses, long after you set them.",
    tone: "context",
  },
  {
    slug: "everyday",
    name: "Everyday",
    intro: "The ordinary wins, for anyone.",
    tone: "skills",
  },
  {
    slug: "health",
    name: "Health and safety",
    intro:
      "Facts that have to hold in every tool, even ones with no medical context of their own.",
    tone: "secrets",
  },
];

const examples: Example[] = [
  // Builders
  {
    group: "builders",
    id: "plan-build",
    label: "Plan to build",
    title: "Plan in one tool, build in another",
    scenario:
      "You sketch a service in ChatGPT, then build it in Claude Code. Both use your house style and your default stack.",
  },
  {
    group: "builders",
    id: "prune-goal",
    label: "Goals prune",
    title: "Shipped goals prune themselves",
    scenario:
      "You tell an agent v1 is live. It proposes removing the old goal and promoting the next one, so your goals never rot into a graveyard.",
  },
  {
    group: "builders",
    id: "banned",
    label: "Banned tools",
    title: "It stops suggesting tools you banned",
    scenario:
      "An ORM burned you once, so your file rules it out. No agent, in any repo, opens a pull request that adds it again.",
  },
  {
    group: "builders",
    id: "swap",
    label: "Swap agents",
    title: "Swap coding agents mid-task",
    scenario:
      "You hit a limit in one agent and move to another. It already knows your commit style and PR rules, so nothing resets to defaults.",
  },
  {
    group: "builders",
    id: "teach-once",
    label: "Teach once",
    title: "Teach one agent, fix them all",
    scenario:
      "You correct Cursor once on how you log. It saves the rule, and Claude Code respects it weeks later without being told.",
  },
  {
    group: "builders",
    id: "conventions",
    label: "New repos",
    title: "Your conventions in every new repo",
    scenario:
      "Open a fresh repo and the agent scaffolds it your way: your router, your syntax, your defaults. There is nothing to copy over.",
  },

  // Writers
  {
    group: "writers",
    id: "voice",
    label: "Your voice",
    title: "Your voice survives the switch",
    scenario:
      "Draft in one tool, edit in another. Both know your tense, your rhythm, and your rules, so the edit still sounds like you.",
  },
  {
    group: "writers",
    id: "tics",
    label: "Verbal tics",
    title: "It drops the tics you keep cutting",
    scenario:
      "You keep deleting the same filler opener. The agent proposes a rule, you accept, and it stops appearing in every tool.",
  },
  {
    group: "writers",
    id: "brand",
    label: "Brand rules",
    title: "Brand rules no agent forgets",
    scenario:
      "Banned words, no exclamation marks, your spelling rules. Every draft from every tool comes back already obeying them.",
  },
  {
    group: "writers",
    id: "two-voices",
    label: "Client voices",
    title: "Two client voices, kept apart",
    scenario:
      "Warm for one client, clipped for another. The agent picks the right register from the first line and never blends them.",
  },
  {
    group: "writers",
    id: "degrade",
    label: "Tool switch",
    title: "Jump tools when one gets worse",
    scenario:
      "Your usual AI degrades after an update. You move to another mid-draft and it continues in your voice, with no re-briefing.",
  },
  {
    group: "writers",
    id: "formats",
    label: "Formats",
    title: "Formats it already knows",
    scenario:
      "Your newsletter, your release notes, your pitch each have a shape. Any agent fills it in instead of inventing a new layout every time.",
  },

  // Researchers
  {
    group: "researchers",
    id: "citations",
    label: "Citations",
    title: "Every agent cites your way",
    scenario:
      "Draft, gather sources, and polish across three tools. All of them return citations in your required style, unprompted.",
  },
  {
    group: "researchers",
    id: "rejected",
    label: "Exclusions",
    title: "A rejected source stays rejected",
    scenario:
      "You exclude a paper in one tool. Weeks later another leaves it out and notes why, because the exclusion lives in your file.",
  },
  {
    group: "researchers",
    id: "depth",
    label: "Right depth",
    title: "Explained at your level",
    scenario:
      "You are an immunology PhD. Assistants skip the textbook basics and engage at your level, in your field and outside it.",
  },
  {
    group: "researchers",
    id: "stats",
    label: "Stats tools",
    title: "It speaks your stats stack",
    scenario:
      "You work in R, not Python. Every agent gives you code and examples in the tools you actually use.",
  },
  {
    group: "researchers",
    id: "methods",
    label: "Methods",
    title: "Your methods, respected",
    scenario:
      "Your methodological commitments are in your file, so no agent proposes an approach you have already ruled out.",
  },
  {
    group: "researchers",
    id: "jargon",
    label: "Field terms",
    title: "Field terms it gets right",
    scenario:
      "A word means something specific in your field. Every assistant uses it correctly instead of the popular-science version.",
  },

  // Operators
  {
    group: "operators",
    id: "decide",
    label: "Decision bar",
    title: "Every agent knows how you decide",
    scenario:
      "Ask two tools for a recommendation. Both lead with the call, not a both-sides memo, because your file records how you decide.",
  },
  {
    group: "operators",
    id: "board",
    label: "Board voice",
    title: "Drafts in your board voice",
    scenario:
      "Ask for a board email and it opens with the number that moved, the risk you watch, and the decision you need. It reads like you.",
  },
  {
    group: "operators",
    id: "lean",
    label: "Lean team",
    title: "Advice that fits a lean team",
    scenario:
      "Ask how to fix a slow queue and it proposes tooling before headcount, because your file says you stay lean this round.",
  },
  {
    group: "operators",
    id: "hiring",
    label: "Hiring bar",
    title: "Your hiring bar, across tools",
    scenario:
      "One agent screens a resume, another writes interview questions. Both apply the same bar, because your file records how you hire.",
  },
  {
    group: "operators",
    id: "risk",
    label: "Risk bar",
    title: "Advice tuned to your risk bar",
    scenario:
      "Recommendations match how much risk you take this year, because your file records your appetite instead of a generic default.",
  },
  {
    group: "operators",
    id: "deep-work",
    label: "Deep work",
    title: "It protects your deep-work block",
    scenario:
      "No agent schedules a meeting before noon, because your file blocks your mornings for focused work.",
  },

  // Ownership
  {
    group: "ownership",
    id: "leave",
    label: "Leave a vendor",
    title: "Leave a vendor, keep everything",
    scenario:
      "Cancel one AI and open another the same day. It already knows you, because your context never lived inside the subscription. Export it anytime.",
  },
  {
    group: "ownership",
    id: "instant",
    label: "Instant setup",
    title: "A new agent knows you instantly",
    scenario:
      "Connect a brand-new tool, click Allow, and its first reply is already tuned to you. No setup chat, no priming prompt.",
  },
  {
    group: "ownership",
    id: "fix-once",
    label: "Fix once",
    title: "Fix it once, every agent updates",
    scenario:
      "Tell one agent you go by Sam. The next morning every other tool opens with Sam too. One file, not four memories that forget separately.",
  },
  {
    group: "ownership",
    id: "history",
    label: "Version history",
    title: "Version history you own",
    scenario:
      "Push your file to GitHub and see every change: a career switch, a closed goal, a move. Diff it, or roll back a bad edit.",
  },
  {
    group: "ownership",
    id: "self-host",
    label: "Self-hosted",
    title: "Run it on a model you host",
    scenario:
      "Export your file and feed it to a model on your own machine. The same context works with no vendor in the loop.",
  },
  {
    group: "ownership",
    id: "reconnect",
    label: "After a gap",
    title: "Back in seconds after months away",
    scenario:
      "You step away for six months and come back. Your file is exactly as you left it, and a reconnected agent picks up where you stopped.",
  },

  // Boundaries
  {
    group: "boundaries",
    id: "grief",
    label: "Grief",
    title: "The topic AI never raises",
    scenario:
      "After losing your father, you wrote one line: do not use him as an example. Months later, no assistant ever wanders into it.",
  },
  {
    group: "boundaries",
    id: "sober",
    label: "No alcohol",
    title: "No alcohol, ever, no awkwardness",
    scenario:
      "You are sober. No assistant suggests a wine pairing or a bar, and you never have to explain why to a new tool.",
  },
  {
    group: "boundaries",
    id: "private",
    label: "Private facts",
    title: "Private stays private",
    scenario:
      "Your wellbeing agent knows your diagnosis. Your work drafts never mention it, because the line is set once and every tool reads it.",
  },
  {
    group: "boundaries",
    id: "ask-first",
    label: "Ask first",
    title: "Ask before the irreversible thing",
    scenario:
      "Agents can draft and send for you, but never to your manager or investors. Those drafts stop and wait for your eyes first.",
  },
  {
    group: "boundaries",
    id: "approve-limits",
    label: "Approve changes",
    title: "Limits move only when you approve",
    scenario:
      "An agent thinks a rule about your kid is out of date. It proposes the change and waits. The boundary moves only when you say so.",
  },
  {
    group: "boundaries",
    id: "settled",
    label: "Settled calls",
    title: "It won't reopen a settled decision",
    scenario:
      "You decided not to rebrand. When an agent drifts back to it, it stops, because your file marks the call as closed.",
  },

  // Everyday
  {
    group: "everyday",
    id: "kids-ages",
    label: "Kids' ages",
    title: "Your kids' ages stay current",
    scenario:
      "Your daughter turns five, an assistant proposes the update, and you approve it. Months later a different tool suggests age-five gifts on its own.",
  },
  {
    group: "everyday",
    id: "bio",
    label: "Your bio",
    title: "Never paste your bio again",
    scenario:
      "The intro you used to paste into every tool is just there in your file. A new laptop or a new app changes nothing.",
  },
  {
    group: "everyday",
    id: "meals",
    label: "Meals",
    title: "Meals that fit your diet and budget",
    scenario:
      "Ask for a week of dinners and it lands pescatarian, dairy-light, and on budget. A new agent gets it right the first time.",
  },
  {
    group: "everyday",
    id: "training",
    label: "Training",
    title: "Training that respects your injury",
    scenario:
      "Ask any assistant for next week's runs. It caps the long run and works around your bad knee, because it read your goal and schedule first.",
  },
  {
    group: "everyday",
    id: "travel",
    label: "Travel",
    title: "Trips booked the way you fly",
    scenario:
      "Ask any travel agent for a weekend away and it picks an aisle seat, skips the red-eye, and finds a hotel near transit, because your travel habits are in your file.",
  },
  {
    group: "everyday",
    id: "dates",
    label: "Dates that matter",
    title: "It remembers the dates that matter",
    scenario:
      "Birthdays, anniversaries, and how you like to mark them live in your file. Any assistant plans ahead for them without you flagging the calendar.",
  },

  // Health and safety
  {
    group: "health",
    id: "allergy",
    label: "Allergies",
    title: "Your allergy follows every assistant",
    scenario:
      "You plan dinner with one AI, shop with another, and scale the recipe with a third. None suggest the shrimp, because all three read your allergy first.",
  },
  {
    group: "health",
    id: "meds",
    label: "Medications",
    title: "Medications checked before advice",
    scenario:
      "Ask about a cold remedy or a cheese board and the assistant flags the conflict with your medication instead of handing you the thing that harms you.",
  },
  {
    group: "health",
    id: "screen-reader",
    label: "Screen reader",
    title: "Built for how you actually read",
    scenario:
      "You use a screen reader. Every agent describes charts in words and explains code in prose, without being told again in each new tool.",
  },
  {
    group: "health",
    id: "triggers",
    label: "Triggers",
    title: "Plans that avoid your triggers",
    scenario:
      "Your migraines come from strobing light and long screens. A scheduler adds breaks and an events agent skips the laser show, because both read how to help.",
  },
  {
    group: "health",
    id: "adhd",
    label: "Small steps",
    title: "Plans broken into small steps",
    scenario:
      "Long plans come back as short, ordered steps with one next action, because your file says that is how you work best.",
  },
  {
    group: "health",
    id: "sleep",
    label: "Sleep window",
    title: "It respects your sleep window",
    scenario:
      "No assistant suggests a task past 10pm or schedules one before 7am, because your sleep window is in your file.",
  },
];

// Index groups: each group header is a collapsible dropdown; each example
// under it is a scroll target with a short label. Built from the data so the
// two can't drift.
const navGroups = groups.map((group) => ({
  slug: group.slug,
  name: group.name,
  tone: group.tone,
  items: examples
    .filter((example) => example.group === group.slug)
    .map((example) => ({ id: example.id, label: example.label })),
}));

const exampleGroupById = new Map(
  examples.map((example) => [example.id, example.group]),
);
const examplesByGroup = new Map(
  groups.map((group) => [
    group.slug,
    examples.filter((example) => example.group === group.slug),
  ]),
);

export function ExamplesPageView({ configured = true }: { configured?: boolean }) {
  const cta = useStrapSiteCta(configured);
  const [activeId, setActiveId] = useState(examples[0]?.id ?? "");
  // One group open at a time so the index stays compact.
  const { isOpen, toggle } = useOpenSections(
    groups.map((group) => group.slug),
    1,
  );

  const activeGroup = exampleGroupById.get(activeId);

  // While a click-driven smooth scroll is in flight, the scrollspy is locked so
  // the highlight jumps straight to the clicked item instead of ticking through
  // every example the scroll passes on the way.
  const lockedRef = useRef(false);
  const unlockTimerRef = useRef<number | null>(null);

  const exampleIds = useMemo(() => examples.map((example) => example.id), []);

  useEffect(() => {
    const elements = exampleIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (lockedRef.current) return;
        // Topmost intersecting card, not the highest ratio, so a short card on
        // the right of a grid row doesn't win over the taller one on its left.
        const topmost = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];

        if (topmost?.target?.id) {
          setActiveId(topmost.target.id);
        }
      },
      {
        rootMargin: "-96px 0px -65% 0px",
        threshold: 0,
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [exampleIds]);

  function scrollToExample(id: string) {
    const target = document.getElementById(id);
    if (!target) return;

    setActiveId(id);
    lockedRef.current = true;
    if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);

    const unlock = () => {
      lockedRef.current = false;
      window.removeEventListener("scrollend", unlock);
      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
    };
    window.addEventListener("scrollend", unlock, { once: true });
    unlockTimerRef.current = window.setTimeout(unlock, 1200);
  }

  function renderIndex(highlight: boolean) {
    return (
      <nav aria-label="Example groups">
        {navGroups.map((entry) => {
          const open = isOpen(entry.slug);
          const isActiveGroup = highlight && entry.slug === activeGroup;
          return (
            <div key={entry.slug} className={cn("strap-docs-nav-group", `strap-docs-tone-${entry.tone}`)}>
              <button
                type="button"
                onClick={() => toggle(entry.slug)}
                aria-expanded={open}
                className={cn("strap-docs-nav-toggle", isActiveGroup && "is-active")}
              >
                <span className="strap-docs-nav-label">
                  <span className="strap-docs-nav-swatch" aria-hidden="true" />
                  {entry.name}
                </span>
                <ChevronDown
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                    open ? "" : "-rotate-90",
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    key="items"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="strap-docs-nav-items">
                      {entry.items.map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            scrollToExample(item.id);
                          }}
                          className={cn(
                            "strap-docs-nav-link",
                            highlight && activeId === item.id && "is-active",
                          )}
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="strap-site strap-docs">
      <StrapSiteNav cta={cta} current="examples" />

      <StrapPageHero
        kicker={`Examples · ${examples.length} moments`}
        kickerTone="skills"
        title="What changes when every AI reads the same file"
        lede="You write your Strap once, each agent reads it before it replies, and it stays plain Markdown you own. These are the moments where that shows."
        actions={
          <>
            <Link className="strap-button strap-button-primary" href={cta.appHref}>
              {cta.appLabel}
            </Link>
            <Link className="strap-button strap-button-secondary" href="/docs">
              Read the docs
            </Link>
          </>
        }
        aside={
          <div className="strap-card strap-card-offset strap-tone-skills">
            <div className="strap-card-head">
              <span>
                <b>example groups</b> · {groups.length} lanes
              </span>
              <span className="strap-pill">Index</span>
            </div>
            <ul className="strap-index-list">
              {groups.map((group) => (
                <li key={group.slug} className={`strap-tone-${group.tone}`}>
                  <a
                    href={`#${group.slug}`}
                    className="strap-index-row"
                    onClick={(event) => {
                      event.preventDefault();
                      const first = examplesByGroup.get(group.slug)?.[0]?.id;
                      if (first) scrollToExample(first);
                    }}
                  >
                    <span>
                      <span className="strap-index-swatch" aria-hidden="true" />
                      {group.name}
                    </span>
                    <span className="strap-text-soft">
                      {examplesByGroup.get(group.slug)?.length ?? 0} examples
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        }
      />

      <main className="strap-wrap strap-docs-main">
        {/* Below the desktop sidebar breakpoint, the same collapsible index as
            desktop (one group open at a time, click to scroll), without the
            scrollspy highlight since this index isn't on screen while you
            scroll. */}
        <div className="strap-docs-mobile-index">
          <div className="strap-docs-index-title">
            <span>On this page</span>
            <span>{examples.length} examples</span>
          </div>
          {renderIndex(false)}
        </div>

        <div className="strap-docs-layout">
          <aside className="strap-docs-sidebar">
            <div className="strap-docs-index">
              <div className="strap-docs-index-title">
                <span>On this page</span>
                <span>{examples.length} examples</span>
              </div>
              {renderIndex(true)}
            </div>
          </aside>

          <div className="strap-docs-content">
            {groups.map((group) => (
              <section
                key={group.slug}
                id={group.slug}
                className={cn("strap-example-group", `strap-tone-${group.tone}`)}
                aria-labelledby={`${group.slug}-title`}
              >
                <div className="strap-example-group-head">
                  <span className="strap-pill strap-pill-solid">{group.name}</span>
                  <h2 id={`${group.slug}-title`}>{group.intro}</h2>
                </div>
                <div className="strap-examples-grid">
                  {(examplesByGroup.get(group.slug) ?? []).map((example) => (
                    <article key={example.id} id={example.id} className="strap-example">
                      <h3>{example.title}</h3>
                      <p>{example.scenario}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            <div className="strap-closing-box" style={{ marginTop: "3rem" }}>
              <h2>Write it once. Every agent reads it.</h2>
              <p>Create your Strap and connect the tools you already use.</p>
              <Link className="strap-button strap-button-secondary" href={cta.appHref}>
                {cta.appLabel}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <StrapSiteFooter />
    </div>
  );
}
