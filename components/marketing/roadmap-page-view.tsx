import Link from "next/link";
import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { ROADMAP_STATUS_TONE, RoadmapStatusPill } from "@/components/marketing/roadmap-status";
import type { RoadmapColumn, RoadmapTask } from "@/lib/marketing/roadmap";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function RoadmapPageView({ columns }: { columns: RoadmapColumn[] }) {
  const total = columns.reduce((sum, column) => sum + column.tasks.length, 0);

  return (
    <div className="strap-site">
      <StrapSiteHeader configured={isSupabaseConfigured()} current="roadmap" />

      <main>
        <StrapPageHero
          kicker={`Roadmap · ${total} ${total === 1 ? "item" : "items"} on the board`}
          kickerTone="skills"
          title="Roadmap"
          lede="A live view of what we're building, straight from our task board."
          actions={
            <>
              <Link className="strap-button strap-button-secondary" href="/changelog">
                What already shipped
              </Link>
              <Link className="strap-button strap-button-secondary" href="/bench">
                Benchmarks
              </Link>
            </>
          }
        />

        <div className="strap-wrap strap-page-main">
          {total === 0 ? (
            <div className="strap-card strap-card-offset strap-tone-skills strap-page-main-narrow">
              <div className="strap-card-head">
                <span>
                  <b>board</b> · syncing
                </span>
                <span className="strap-pill">Empty</span>
              </div>
              <div className="strap-card-body">
                <p>The roadmap is being updated. Check back shortly.</p>
              </div>
            </div>
          ) : (
            <div className="strap-board">
              {columns.map((column) => (
                <RoadmapColumnView key={column.id} column={column} />
              ))}
            </div>
          )}
        </div>
      </main>

      <StrapSiteFooter />
    </div>
  );
}

function RoadmapColumnView({ column }: { column: RoadmapColumn }) {
  return (
    <section className={`strap-board-column strap-tone-${ROADMAP_STATUS_TONE[column.id]}`} aria-label={column.label}>
      <div className="strap-board-column-head">
        <RoadmapStatusPill id={column.id} label={column.label} />
        <span className="strap-pill strap-pill-count">{column.tasks.length}</span>
      </div>

      {column.tasks.length === 0 ? (
        <div className="strap-board-empty">Nothing here yet</div>
      ) : (
        <div className="strap-board-cards">
          {column.tasks.map((task) => (
            <RoadmapCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </section>
  );
}

function RoadmapCard({ task }: { task: RoadmapTask }) {
  return (
    <article className="strap-board-card">
      {task.code ? <span className="strap-board-code">{task.code}</span> : null}
      <h3>{task.title}</h3>
      {task.description ? <p>{task.description}</p> : null}
      {task.labels.length > 0 ? (
        <div className="strap-board-labels">
          {task.labels.map((label) => (
            <span key={label} className="strap-pill strap-pill-count">
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
