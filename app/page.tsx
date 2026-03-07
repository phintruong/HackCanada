'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FeatureSteps } from '@/components/ui/feature-section';

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);

  // Track scroll progress for the entire page
  const { scrollYProgress } = useScroll();

  // Transform values based on scroll
  // Padding: 1.25rem -> 0rem (first 30% of scroll)
  const padding = useTransform(scrollYProgress, [0, 0.3], ['1.25rem', '0rem']);

  // Scale/Zoom: 1 -> 2.5 (zoom in significantly, first 50% of scroll)
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 2.5]);

  // White overlay opacity: fade in 0→1 then quickly fade out 1→0
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.45, 5], [0, 1, 0]);

  // Content: appear a bit after white overlay is full (55% to 72% of scroll), then stick and settle
  const contentOpacity = useTransform(scrollYProgress, [0.55, 0.72], [0, 1]);

  // Content translateY: "come down" into place as it fades in
  const contentY = useTransform(scrollYProgress, [0.55, 0.72], [24, 0]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const handleMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      hero.style.setProperty('--mx', `${x * 18}px`);
      hero.style.setProperty('--my', `${y * 12}px`);
    };

    hero.addEventListener('mousemove', handleMove);
    return () => hero.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div className="lp">
      {/* Top buttons */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center gap-4 pt-5">
        <Link
          href="/map"
          className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-full shadow-sm hover:shadow transition-all"
        >
          Explore
        </Link>
        <Link
          href="/editor"
          className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-white bg-[#dc2626] hover:bg-[#b91c1c] rounded-full shadow-sm hover:shadow transition-all"
        >
          Build
        </Link>
      </div>

      {/* Spacer so content reaches viewport when overlay is full (progress 0.5) */}
      <div style={{ height: '150vh' }} />

      {/* ───── HERO ───── */}
      <motion.section
        className="lp-hero-wrap-fixed"
        style={{ padding }}
      >
        <motion.div className="lp-hero" ref={heroRef} style={{ scale }}>
          <img src="/thumb.jpg" alt="" className="lp-hero-img" draggable={false} />
          <div className="lp-hero-vignette" />

          <h1 className="lp-hero-title">ClearPath.</h1>

          <Link href="/map" className="lp-hero-cta">
            See the Map&ensp;&rarr;
          </Link>

          {/* White overlay that fades in - pointer-events: none so it doesn't block button clicks */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#1e293b',
              opacity: overlayOpacity,
              zIndex: 10,
              pointerEvents: 'none',
            }}
          />
        </motion.div>
      </motion.section>

      {/* Content: sticky so it appears in view as overlay finishes, then normal scroll */}
      <motion.div
        className="lp-content-sticky"
        style={{
          opacity: contentOpacity,
          y: contentY,
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: '#1e293b',
          paddingRight: '1.5rem',
        }}
      >
        {/* ───── STATEMENT ───── */}
        <section className="lp-statement" style={{ paddingTop: '50rem' }}>
          <span className="lp-stmt-rule lp-fade" style={{ animationDelay: '0.1s' }} />

          <p className="lp-stmt-small lp-fade" style={{ animationDelay: '0.25s' }}>
            Every second in an ER matters. Better routing saves lives.
          </p>

          <div className="lp-stmt-block lp-fade" style={{ animationDelay: '0.5s' }}>
            <h2 className="lp-stmt-line">Canada&apos;s ERs are overwhelmed.</h2>
            <h2 className="lp-stmt-line">Let&apos;s fix that together.</h2>
          </div>

          <p className="lp-stmt-sub lp-fade" style={{ animationDelay: '0.75s' }}>
            Smarter placement. Faster triage. Shorter waits.
          </p>

          <h2 className="lp-stmt-main lp-fade" style={{ animationDelay: '0.95s' }}>
            See the problem. <span className="lp-stmt-gold">Place the solution.</span>
          </h2>

          <Link
            href="/map"
            className="lp-stmt-cta lp-fade"
            style={{ animationDelay: '1.35s' }}
          >
            Open the Map&ensp;&rarr;
          </Link>
        </section>

        {/* ───── YOUR JOURNEY ───── */}
<section className="bg-[#334155]" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
  <FeatureSteps
    title="How ClearPath Works"
    subtitle="Reducing ER congestion with data, simulation, and smart routing."
    features={[
      {
        step: 'Step 1',
        title: 'See Every ER at a Glance',
        content:
          "View a live 3D map of Toronto's emergency rooms. Congestion circles show real-time occupancy so you can instantly see which ERs are overwhelmed and which have capacity.",
        image: '/carousel/busy-hospital-corridor-stockcake.jpg',
      },
      {
        step: 'Step 2',
        title: 'Place a New ER, Watch Congestion Shift',
        content:
          'In Government mode, drop a proposed ER anywhere on the map, set its capacity, and run a Voronoi simulation to see how patient flow redistributes across the network.',
        image: '/carousel/NewmanRegional-Health2-600x400.jpg',
      },
      {
        step: 'Step 3',
        title: 'Get Routed to the Right ER',
        content:
          "In Civilian mode, answer a few triage questions and get a severity-based recommendation — nearest hospital for emergencies, least congested for non-urgent visits.",
        image: '/carousel/istockphoto-600073876-612x612.jpg',
      },
    ]}
    autoPlayInterval={4000}
    imageHeight="h-[500px]"
  />
</section>
        {/* ───── FOOTER ───── */}
        <footer className="lp-footer">
          <a href="https://github.com/Lemirq/qhacks" target="_blank" rel="noopener noreferrer">
            Source on GitHub
          </a>
        </footer>
      </motion.div>
    </div>
  );
}
